# -*- coding: utf-8 -*-
"""
@文件: flow_diagram_controller.py
@說明: 流程圖控制器 (Flow Diagram Service)
@時間: 2025-01-09
@作者: LiDong
"""

import json
import uuid
import secrets
import traceback
from datetime import datetime, timezone
from typing import Tuple, Dict, Any, Optional, List
from flask import request, g

from dbs.mongodb.models import FlowDiagramModel, FlowSimulationHistoryModel
from loggers import logger
from cache import redis_client


class FlowDiagramController:
    """流程圖控制器"""
    
    # 類級別的單例緩存
    _instance = None
    _initialized = False
    
    def __new__(cls, db_instance=None):
        if cls._instance is None:
            cls._instance = super(FlowDiagramController, cls).__new__(cls)
        return cls._instance
    
    def __init__(self, db_instance=None):
        # 避免重複初始化
        if FlowDiagramController._initialized:
            return
            
        self.db = db_instance
        self.diagram_model = FlowDiagramModel()
        self.simulation_model = FlowSimulationHistoryModel()
        
        # 支持的流程圖類型
        self.supported_types = [
            "business_process", "system_flow", "user_journey", 
            "workflow", "decision_tree"
        ]
        
        # 支持的節點類型
        self.supported_node_types = [
            "start", "process", "decision", "end", "parallel", 
            "timer", "gateway"
        ]
        
        FlowDiagramController._initialized = True
        logger.info("流程圖控制器初始化完成")
    
    # ==================== 流程圖管理 ====================
    
    def create_flow_diagram(self, project_id: str, name: str, description: str = None,
                           diagram_type: str = "business_process", flow_data: Dict = None,
                           validation_rules: Dict = None, created_by: str = None) -> Tuple[bool, Any]:
        """創建流程圖"""
        try:
            # 驗證輸入
            if not project_id or not name:
                return False, "項目ID和流程圖名稱不能為空"
            
            if diagram_type not in self.supported_types:
                return False, f"不支持的流程圖類型: {diagram_type}"
            
            # 驗證流程數據
            if flow_data:
                flag, msg = self._validate_flow_data(flow_data)
                if not flag:
                    return False, f"流程數據驗證失敗: {msg}"
            
            return self.diagram_model.create_diagram(
                project_id=project_id,
                name=name,
                description=description,
                diagram_type=diagram_type,
                flow_data=flow_data,
                validation_rules=validation_rules,
                created_by=created_by
            )
            
        except Exception as e:
            logger.error(f"創建流程圖失敗: {str(e)}")
            logger.error(traceback.format_exc())
            return False, "創建流程圖失敗"
    
    def get_flow_diagram(self, diagram_id: str, include_full_data: bool = True) -> Tuple[bool, Any]:
        """獲取流程圖詳情"""
        try:
            flag, result = self.diagram_model.get_diagram_by_id(diagram_id)
            if not flag:
                return False, result
            
            # 如果不需要完整數據，移除大型字段
            if not include_full_data:
                result.pop("flow_data", None)
                result.pop("simulation_results", None)
            
            return True, result
            
        except Exception as e:
            logger.error(f"獲取流程圖失敗: {str(e)}")
            return False, "獲取流程圖失敗"
    
    def get_project_flow_diagrams(self, project_id: str, diagram_type: str = None,
                                 page: int = 1, limit: int = 20) -> Tuple[bool, Any]:
        """獲取項目流程圖列表"""
        try:
            return self.diagram_model.get_diagrams_by_project(
                project_id=project_id,
                diagram_type=diagram_type,
                page=page,
                limit=limit
            )
            
        except Exception as e:
            logger.error(f"獲取項目流程圖列表失敗: {str(e)}")
            return False, "獲取流程圖列表失敗"
    
    def update_flow_diagram(self, diagram_id: str, updates: Dict) -> Tuple[bool, Any]:
        """更新流程圖"""
        try:
            # 驗證更新數據
            if "type" in updates and updates["type"] not in self.supported_types:
                return False, f"不支持的流程圖類型: {updates['type']}"
            
            if "flow_data" in updates:
                flag, msg = self._validate_flow_data(updates["flow_data"])
                if not flag:
                    return False, f"流程數據驗證失敗: {msg}"
            
            return self.diagram_model.update_diagram(diagram_id, updates)
            
        except Exception as e:
            logger.error(f"更新流程圖失敗: {str(e)}")
            return False, "更新流程圖失敗"
    
    def delete_flow_diagram(self, diagram_id: str) -> Tuple[bool, str]:
        """刪除流程圖"""
        try:
            return self.diagram_model.delete_diagram(diagram_id)
            
        except Exception as e:
            logger.error(f"刪除流程圖失敗: {str(e)}")
            return False, "刪除流程圖失敗"
    
    def duplicate_flow_diagram(self, diagram_id: str, new_name: str, 
                              created_by: str) -> Tuple[bool, Any]:
        """複製流程圖"""
        try:
            return self.diagram_model.duplicate_diagram(diagram_id, new_name, created_by)
            
        except Exception as e:
            logger.error(f"複製流程圖失敗: {str(e)}")
            return False, "複製流程圖失敗"
    
    # ==================== 驗證和分析 ====================
    
    def validate_flow_diagram(self, diagram_id: str) -> Tuple[bool, Any]:
        """驗證流程圖"""
        try:
            # 獲取流程圖
            flag, diagram = self.get_flow_diagram(diagram_id)
            if not flag:
                return False, diagram
            
            flow_data = diagram.get("flow_data", {})
            validation_rules = diagram.get("validation_rules", {})
            
            # 執行驗證
            validation_result = self._perform_validation(flow_data, validation_rules)
            
            return True, validation_result
            
        except Exception as e:
            logger.error(f"驗證流程圖失敗: {str(e)}")
            return False, "驗證流程圖失敗"
    
    def simulate_flow_diagram(self, diagram_id: str, simulation_config: Dict = None,
                             save_history: bool = True, created_by: str = None) -> Tuple[bool, Any]:
        """模擬流程圖執行"""
        try:
            # 獲取流程圖
            flag, diagram = self.get_flow_diagram(diagram_id)
            if not flag:
                return False, diagram
            
            flow_data = diagram.get("flow_data", {})
            
            # 默認模擬配置
            if simulation_config is None:
                simulation_config = {
                    "iterations": 1000,
                    "enable_timing": True,
                    "enable_probability": True,
                    "random_seed": None
                }
            
            # 執行模擬
            simulation_result = self._perform_simulation(flow_data, simulation_config)
            
            # 保存模擬歷史
            if save_history and created_by:
                self.simulation_model.create_simulation_record(
                    flow_diagram_id=diagram_id,
                    simulation_config=simulation_config,
                    results=simulation_result,
                    created_by=created_by
                )
            
            # 更新流程圖的模擬結果
            self.diagram_model.update_simulation_results(diagram_id, simulation_result)
            
            return True, simulation_result
            
        except Exception as e:
            logger.error(f"模擬流程圖失敗: {str(e)}")
            return False, "模擬流程圖失敗"
    
    def get_flow_analysis(self, diagram_id: str) -> Tuple[bool, Any]:
        """獲取流程分析報告"""
        try:
            # 獲取流程圖
            flag, diagram = self.get_flow_diagram(diagram_id)
            if not flag:
                return False, diagram
            
            flow_data = diagram.get("flow_data", {})
            simulation_results = diagram.get("simulation_results", {})
            
            # 生成分析報告
            analysis_report = self._generate_analysis_report(flow_data, simulation_results)
            
            return True, analysis_report
            
        except Exception as e:
            logger.error(f"獲取流程分析失敗: {str(e)}")
            return False, "獲取流程分析失敗"
    
    def get_simulation_history(self, diagram_id: str, page: int = 1, 
                              limit: int = 20) -> Tuple[bool, Any]:
        """獲取模擬歷史"""
        try:
            return self.simulation_model.get_simulation_history(
                flow_diagram_id=diagram_id,
                page=page,
                limit=limit
            )
            
        except Exception as e:
            logger.error(f"獲取模擬歷史失敗: {str(e)}")
            return False, "獲取模擬歷史失敗"
    
    # ==================== 優化和分析 ====================
    
    def get_optimization_suggestions(self, diagram_id: str) -> Tuple[bool, Any]:
        """獲取優化建議"""
        try:
            # 獲取流程圖和分析結果
            flag, diagram = self.get_flow_diagram(diagram_id)
            if not flag:
                return False, diagram
            
            flow_data = diagram.get("flow_data", {})
            simulation_results = diagram.get("simulation_results", {})
            
            # 生成優化建議
            optimization_suggestions = self._generate_optimization_suggestions(
                flow_data, simulation_results
            )
            
            return True, optimization_suggestions
            
        except Exception as e:
            logger.error(f"獲取優化建議失敗: {str(e)}")
            return False, "獲取優化建議失敗"
    
    def analyze_bottlenecks(self, diagram_id: str) -> Tuple[bool, Any]:
        """瓶頸分析"""
        try:
            # 獲取流程圖
            flag, diagram = self.get_flow_diagram(diagram_id)
            if not flag:
                return False, diagram
            
            flow_data = diagram.get("flow_data", {})
            simulation_results = diagram.get("simulation_results", {})
            
            # 執行瓶頸分析
            bottleneck_analysis = self._perform_bottleneck_analysis(
                flow_data, simulation_results
            )
            
            return True, bottleneck_analysis
            
        except Exception as e:
            logger.error(f"瓶頸分析失敗: {str(e)}")
            return False, "瓶頸分析失敗"
    
    # ==================== 導出和分享 ====================
    
    def export_flow_diagram(self, diagram_id: str, export_format: str = "json",
                           include_simulation: bool = False) -> Tuple[bool, Any]:
        """導出流程圖"""
        try:
            supported_formats = ["json", "xml", "png", "svg", "pdf"]
            if export_format not in supported_formats:
                return False, f"不支持的導出格式: {export_format}"
            
            # 獲取流程圖
            flag, diagram = self.get_flow_diagram(diagram_id)
            if not flag:
                return False, diagram
            
            # 準備導出數據
            export_data = {
                "diagram_info": {
                    "name": diagram.get("name"),
                    "description": diagram.get("description"),
                    "type": diagram.get("type"),
                    "created_at": diagram.get("created_at"),
                    "updated_at": diagram.get("updated_at")
                },
                "flow_data": diagram.get("flow_data", {}),
                "validation_rules": diagram.get("validation_rules", {})
            }
            
            if include_simulation:
                export_data["simulation_results"] = diagram.get("simulation_results", {})
            
            # 根據格式處理導出
            if export_format == "json":
                return True, {
                    "format": "json",
                    "data": export_data,
                    "filename": f"{diagram['name']}_flow_diagram.json"
                }
            elif export_format == "xml":
                xml_data = self._convert_to_xml(export_data)
                return True, {
                    "format": "xml",
                    "data": xml_data,
                    "filename": f"{diagram['name']}_flow_diagram.xml"
                }
            else:
                # 圖形格式導出 (png, svg, pdf)
                return self._export_as_image(diagram, export_format)
            
        except Exception as e:
            logger.error(f"導出流程圖失敗: {str(e)}")
            return False, "導出流程圖失敗"
    
    def generate_share_link(self, diagram_id: str) -> Tuple[bool, Any]:
        """生成分享鏈接"""
        try:
            return self.diagram_model.generate_share_token(diagram_id)
            
        except Exception as e:
            logger.error(f"生成分享鏈接失敗: {str(e)}")
            return False, "生成分享鏈接失敗"
    
    def get_shared_diagram(self, share_token: str) -> Tuple[bool, Any]:
        """獲取分享的流程圖"""
        try:
            return self.diagram_model.get_diagram_by_share_token(share_token)
            
        except Exception as e:
            logger.error(f"獲取分享流程圖失敗: {str(e)}")
            return False, "獲取分享流程圖失敗"
    
    # ==================== 私有方法 ====================
    
    def _validate_flow_data(self, flow_data: Dict) -> Tuple[bool, str]:
        """驗證流程數據結構"""
        try:
            if not isinstance(flow_data, dict):
                return False, "流程數據必須是字典格式"
            
            if "nodes" not in flow_data or "edges" not in flow_data:
                return False, "流程數據必須包含nodes和edges字段"
            
            nodes = flow_data.get("nodes", [])
            edges = flow_data.get("edges", [])
            
            if not isinstance(nodes, list) or not isinstance(edges, list):
                return False, "nodes和edges必須是數組格式"
            
            # 驗證節點
            node_ids = set()
            for node in nodes:
                if not isinstance(node, dict):
                    return False, "節點必須是字典格式"
                
                if "id" not in node or "type" not in node:
                    return False, "節點必須包含id和type字段"
                
                if node["type"] not in self.supported_node_types:
                    return False, f"不支持的節點類型: {node['type']}"
                
                if node["id"] in node_ids:
                    return False, f"重複的節點ID: {node['id']}"
                
                node_ids.add(node["id"])
            
            # 驗證邊
            for edge in edges:
                if not isinstance(edge, dict):
                    return False, "邊必須是字典格式"
                
                if "id" not in edge or "source" not in edge or "target" not in edge:
                    return False, "邊必須包含id、source和target字段"
                
                if edge["source"] not in node_ids or edge["target"] not in node_ids:
                    return False, f"邊引用了不存在的節點: {edge['source']} -> {edge['target']}"
            
            return True, "驗證通過"
            
        except Exception as e:
            return False, f"驗證過程中發生錯誤: {str(e)}"
    
    def _perform_validation(self, flow_data: Dict, validation_rules: Dict) -> Dict:
        """執行流程驗證"""
        validation_result = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "suggestions": []
        }
        
        try:
            nodes = flow_data.get("nodes", [])
            edges = flow_data.get("edges", [])
            required_nodes = validation_rules.get("required_nodes", [])
            forbidden_loops = validation_rules.get("forbidden_loops", False)
            max_complexity = validation_rules.get("max_complexity", 100)
            
            # 檢查必需節點
            node_types = [node.get("type") for node in nodes]
            for required_type in required_nodes:
                if required_type not in node_types:
                    validation_result["errors"].append(f"缺少必需的節點類型: {required_type}")
                    validation_result["is_valid"] = False
            
            # 檢查複雜度
            complexity = len(nodes) + len(edges)
            if complexity > max_complexity:
                validation_result["errors"].append(f"流程過於複雜: {complexity} > {max_complexity}")
                validation_result["is_valid"] = False
            
            # 檢查循環
            if forbidden_loops and self._has_cycles(nodes, edges):
                validation_result["errors"].append("流程中存在禁止的循環")
                validation_result["is_valid"] = False
            
            # 檢查孤立節點
            connected_nodes = set()
            for edge in edges:
                connected_nodes.add(edge["source"])
                connected_nodes.add(edge["target"])
            
            isolated_nodes = [node["id"] for node in nodes if node["id"] not in connected_nodes]
            if isolated_nodes:
                validation_result["warnings"].append(f"發現孤立節點: {isolated_nodes}")
            
            # 檢查開始和結束節點
            start_nodes = [node for node in nodes if node.get("type") == "start"]
            end_nodes = [node for node in nodes if node.get("type") == "end"]
            
            if len(start_nodes) == 0:
                validation_result["warnings"].append("沒有開始節點")
            elif len(start_nodes) > 1:
                validation_result["warnings"].append("存在多個開始節點")
            
            if len(end_nodes) == 0:
                validation_result["warnings"].append("沒有結束節點")
            elif len(end_nodes) > 1:
                validation_result["suggestions"].append("考慮合併多個結束節點")
            
        except Exception as e:
            validation_result["errors"].append(f"驗證過程中發生錯誤: {str(e)}")
            validation_result["is_valid"] = False
        
        return validation_result
    
    def _perform_simulation(self, flow_data: Dict, simulation_config: Dict) -> Dict:
        """執行流程模擬"""
        simulation_result = {
            "avg_execution_time": 0,
            "bottlenecks": [],
            "optimization_suggestions": [],
            "performance_metrics": {
                "total_iterations": simulation_config.get("iterations", 1000),
                "successful_executions": 0,
                "failed_executions": 0,
                "average_path_length": 0,
                "node_visit_frequency": {},
                "edge_usage_frequency": {}
            }
        }
        
        try:
            nodes = flow_data.get("nodes", [])
            edges = flow_data.get("edges", [])
            iterations = simulation_config.get("iterations", 1000)
            
            # 構建圖結構
            graph = self._build_graph(nodes, edges)
            
            # 執行多次模擬
            total_time = 0
            successful_runs = 0
            node_visits = {}
            edge_usage = {}
            path_lengths = []
            
            for i in range(iterations):
                try:
                    # 模擬單次執行
                    execution_result = self._simulate_single_execution(graph, simulation_config)
                    
                    if execution_result["success"]:
                        successful_runs += 1
                        total_time += execution_result["execution_time"]
                        path_lengths.append(execution_result["path_length"])
                        
                        # 統計節點和邊的使用頻率
                        for node_id in execution_result["visited_nodes"]:
                            node_visits[node_id] = node_visits.get(node_id, 0) + 1
                        
                        for edge_id in execution_result["used_edges"]:
                            edge_usage[edge_id] = edge_usage.get(edge_id, 0) + 1
                
                except Exception as e:
                    logger.warning(f"第{i+1}次模擬執行失敗: {str(e)}")
            
            # 計算統計結果
            if successful_runs > 0:
                simulation_result["avg_execution_time"] = total_time / successful_runs
                simulation_result["performance_metrics"]["average_path_length"] = sum(path_lengths) / len(path_lengths)
            
            simulation_result["performance_metrics"]["successful_executions"] = successful_runs
            simulation_result["performance_metrics"]["failed_executions"] = iterations - successful_runs
            simulation_result["performance_metrics"]["node_visit_frequency"] = node_visits
            simulation_result["performance_metrics"]["edge_usage_frequency"] = edge_usage
            
            # 識別瓶頸
            simulation_result["bottlenecks"] = self._identify_bottlenecks(nodes, node_visits, edges, edge_usage)
            
            # 生成優化建議
            simulation_result["optimization_suggestions"] = self._generate_simulation_suggestions(
                nodes, edges, simulation_result["performance_metrics"]
            )
            
        except Exception as e:
            logger.error(f"模擬執行失敗: {str(e)}")
            simulation_result["optimization_suggestions"].append("模擬執行失敗，請檢查流程圖結構")
        
        return simulation_result
    
    def _has_cycles(self, nodes: List, edges: List) -> bool:
        """檢查是否存在循環"""
        try:
            # 構建鄰接列表
            graph = {}
            for node in nodes:
                graph[node["id"]] = []
            
            for edge in edges:
                if edge["source"] in graph:
                    graph[edge["source"]].append(edge["target"])
            
            # DFS檢查循環
            visited = set()
            rec_stack = set()
            
            def has_cycle_util(node):
                visited.add(node)
                rec_stack.add(node)
                
                for neighbor in graph.get(node, []):
                    if neighbor not in visited:
                        if has_cycle_util(neighbor):
                            return True
                    elif neighbor in rec_stack:
                        return True
                
                rec_stack.remove(node)
                return False
            
            for node_id in graph:
                if node_id not in visited:
                    if has_cycle_util(node_id):
                        return True
            
            return False
            
        except Exception:
            return False
    
    def _build_graph(self, nodes: List, edges: List) -> Dict:
        """構建圖結構用於模擬"""
        graph = {
            "nodes": {node["id"]: node for node in nodes},
            "edges": {edge["id"]: edge for edge in edges},
            "adjacency": {}
        }
        
        # 構建鄰接列表
        for node in nodes:
            graph["adjacency"][node["id"]] = []
        
        for edge in edges:
            source = edge["source"]
            if source in graph["adjacency"]:
                graph["adjacency"][source].append(edge)
        
        return graph
    
    def _simulate_single_execution(self, graph: Dict, simulation_config: Dict) -> Dict:
        """模擬單次執行"""
        result = {
            "success": False,
            "execution_time": 0,
            "path_length": 0,
            "visited_nodes": [],
            "used_edges": []
        }
        
        try:
            # 找到開始節點
            start_nodes = [node_id for node_id, node in graph["nodes"].items() 
                          if node.get("type") == "start"]
            
            if not start_nodes:
                return result
            
            current_node = start_nodes[0]
            visited = set()
            max_steps = 1000  # 防止無限循環
            step_count = 0
            
            while step_count < max_steps:
                step_count += 1
                result["visited_nodes"].append(current_node)
                visited.add(current_node)
                
                # 檢查是否到達結束節點
                current_node_data = graph["nodes"][current_node]
                if current_node_data.get("type") == "end":
                    result["success"] = True
                    result["path_length"] = step_count
                    break
                
                # 獲取可能的下一步
                possible_edges = graph["adjacency"].get(current_node, [])
                if not possible_edges:
                    break
                
                # 根據概率選擇下一條邊
                selected_edge = self._select_next_edge(possible_edges, simulation_config)
                if not selected_edge:
                    break
                
                result["used_edges"].append(selected_edge["id"])
                current_node = selected_edge["target"]
                
                # 累加執行時間
                node_duration = current_node_data.get("data", {}).get("duration", 1)
                result["execution_time"] += node_duration
            
        except Exception as e:
            logger.warning(f"單次模擬執行失敗: {str(e)}")
        
        return result
    
    def _select_next_edge(self, edges: List, simulation_config: Dict) -> Optional[Dict]:
        """根據概率選擇下一條邊"""
        if not edges:
            return None
        
        if len(edges) == 1:
            return edges[0]
        
        # 如果邊有概率權重，按概率選擇
        import random
        if simulation_config.get("enable_probability", True):
            total_weight = sum(edge.get("probability", 1.0) for edge in edges)
            if total_weight > 0:
                r = random.uniform(0, total_weight)
                cumulative = 0
                for edge in edges:
                    cumulative += edge.get("probability", 1.0)
                    if r <= cumulative:
                        return edge
        
        # 否則隨機選擇
        return random.choice(edges)
    
    def _identify_bottlenecks(self, nodes: List, node_visits: Dict, 
                             edges: List, edge_usage: Dict) -> List[str]:
        """識別瓶頸節點"""
        bottlenecks = []
        
        if not node_visits:
            return bottlenecks
        
        # 計算平均訪問次數
        total_visits = sum(node_visits.values())
        avg_visits = total_visits / len(node_visits) if node_visits else 0
        
        # 找出訪問次數遠高於平均值的節點
        for node_id, visits in node_visits.items():
            if visits > avg_visits * 1.5:  # 超過平均值50%
                node_data = next((node for node in nodes if node["id"] == node_id), None)
                if node_data:
                    bottlenecks.append(f"節點 {node_data.get('data', {}).get('label', node_id)} 可能存在瓶頸")
        
        return bottlenecks
    
    def _generate_analysis_report(self, flow_data: Dict, simulation_results: Dict) -> Dict:
        """生成分析報告"""
        nodes = flow_data.get("nodes", [])
        edges = flow_data.get("edges", [])
        
        report = {
            "basic_metrics": {
                "total_nodes": len(nodes),
                "total_edges": len(edges),
                "complexity_score": len(nodes) + len(edges),
                "node_types_distribution": {}
            },
            "flow_structure": {
                "has_start_node": any(node.get("type") == "start" for node in nodes),
                "has_end_node": any(node.get("type") == "end" for node in nodes),
                "decision_points": len([node for node in nodes if node.get("type") == "decision"]),
                "parallel_processes": len([node for node in nodes if node.get("type") == "parallel"])
            },
            "simulation_summary": simulation_results,
            "recommendations": []
        }
        
        # 統計節點類型分佈
        for node in nodes:
            node_type = node.get("type", "unknown")
            report["basic_metrics"]["node_types_distribution"][node_type] = \
                report["basic_metrics"]["node_types_distribution"].get(node_type, 0) + 1
        
        # 生成建議
        if not report["flow_structure"]["has_start_node"]:
            report["recommendations"].append("建議添加開始節點以明確流程起點")
        
        if not report["flow_structure"]["has_end_node"]:
            report["recommendations"].append("建議添加結束節點以明確流程終點")
        
        if report["basic_metrics"]["complexity_score"] > 50:
            report["recommendations"].append("流程較為複雜，建議考慮拆分為多個子流程")
        
        if report["flow_structure"]["decision_points"] > 5:
            report["recommendations"].append("決策點較多，建議檢查是否可以合併相似的決策邏輯")
        
        return report
    
    def _generate_optimization_suggestions(self, flow_data: Dict, 
                                         simulation_results: Dict) -> List[str]:
        """生成優化建議"""
        suggestions = []
        
        try:
            nodes = flow_data.get("nodes", [])
            edges = flow_data.get("edges", [])
            performance_metrics = simulation_results.get("performance_metrics", {})
            
            # 基於節點數量的建議
            if len(nodes) > 20:
                suggestions.append("考慮將大型流程拆分為多個較小的子流程以提高可維護性")
            
            # 基於決策節點的建議
            decision_nodes = [node for node in nodes if node.get("type") == "decision"]
            if len(decision_nodes) > 3:
                suggestions.append("決策節點較多，考慮使用決策表或規則引擎來簡化邏輯")
            
            # 基於並行節點的建議
            parallel_nodes = [node for node in nodes if node.get("type") == "parallel"]
            if len(parallel_nodes) > 0:
                suggestions.append("存在並行處理節點，確保有適當的同步機制")
            
            # 基於模擬結果的建議
            if performance_metrics.get("failed_executions", 0) > 0:
                suggestions.append("存在執行失敗的情況，檢查流程路徑的完整性")
            
            avg_path_length = performance_metrics.get("average_path_length", 0)
            if avg_path_length > 15:
                suggestions.append("平均執行路徑較長，考慮優化關鍵路徑以提高效率")
            
            # 基於瓶頸的建議
            bottlenecks = simulation_results.get("bottlenecks", [])
            if bottlenecks:
                suggestions.append("發現潛在瓶頸節點，考慮優化或增加資源配置")
            
        except Exception as e:
            logger.error(f"生成優化建議失敗: {str(e)}")
            suggestions.append("建議定期審查和優化流程圖以保持最佳性能")
        
        return suggestions
    
    def _perform_bottleneck_analysis(self, flow_data: Dict, simulation_results: Dict) -> Dict:
        """執行瓶頸分析"""
        analysis = {
            "identified_bottlenecks": [],
            "performance_issues": [],
            "resource_constraints": [],
            "recommendations": []
        }
        
        try:
            nodes = flow_data.get("nodes", [])
            performance_metrics = simulation_results.get("performance_metrics", {})
            node_visit_frequency = performance_metrics.get("node_visit_frequency", {})
            
            if not node_visit_frequency:
                analysis["performance_issues"].append("無足夠的模擬數據進行瓶頸分析")
                return analysis
            
            # 計算訪問頻率統計
            total_visits = sum(node_visit_frequency.values())
            avg_visits = total_visits / len(node_visit_frequency)
            
            # 識別高頻訪問節點
            for node_id, visits in node_visit_frequency.items():
                if visits > avg_visits * 1.8:  # 超過平均值80%
                    node_data = next((node for node in nodes if node["id"] == node_id), None)
                    if node_data:
                        bottleneck_info = {
                            "node_id": node_id,
                            "node_label": node_data.get("data", {}).get("label", node_id),
                            "node_type": node_data.get("type"),
                            "visit_count": visits,
                            "relative_frequency": visits / avg_visits,
                            "severity": "high" if visits > avg_visits * 2 else "medium"
                        }
                        analysis["identified_bottlenecks"].append(bottleneck_info)
            
            # 分析資源約束
            for node in nodes:
                node_data = node.get("data", {})
                duration = node_data.get("duration", 0)
                if duration > 10:  # 假設超過10個時間單位為高耗時
                    analysis["resource_constraints"].append({
                        "node_id": node["id"],
                        "issue": "高執行時間",
                        "duration": duration,
                        "recommendation": "考慮優化此步驟或增加資源"
                    })
            
            # 生成建議
            if analysis["identified_bottlenecks"]:
                analysis["recommendations"].append("針對高頻訪問節點進行優化，考慮增加並行處理或資源配置")
            
            if analysis["resource_constraints"]:
                analysis["recommendations"].append("優化高耗時步驟，考慮自動化或流程重組")
            
            if not analysis["identified_bottlenecks"] and not analysis["resource_constraints"]:
                analysis["recommendations"].append("當前流程未發現明顯瓶頸，建議持續監控性能指標")
            
        except Exception as e:
            logger.error(f"瓶頸分析失敗: {str(e)}")
            analysis["performance_issues"].append(f"分析過程中發生錯誤: {str(e)}")
        
        return analysis
    
    def _generate_simulation_suggestions(self, nodes: List, edges: List, 
                                       performance_metrics: Dict) -> List[str]:
        """基於模擬結果生成建議"""
        suggestions = []
        
        successful_rate = performance_metrics.get("successful_executions", 0) / \
                         performance_metrics.get("total_iterations", 1)
        
        if successful_rate < 0.8:
            suggestions.append("執行成功率較低，檢查流程路徑的完整性和邏輯正確性")
        
        avg_path_length = performance_metrics.get("average_path_length", 0)
        if avg_path_length > len(nodes) * 1.5:
            suggestions.append("平均執行路徑過長，可能存在不必要的循環或重複步驟")
        
        return suggestions
    
    def _convert_to_xml(self, data: Dict) -> str:
        """將數據轉換為XML格式"""
        try:
            def dict_to_xml(d, root_name="flowDiagram"):
                xml_str = f"<{root_name}>"
                for key, value in d.items():
                    if isinstance(value, dict):
                        xml_str += dict_to_xml(value, key)
                    elif isinstance(value, list):
                        xml_str += f"<{key}>"
                        for item in value:
                            if isinstance(item, dict):
                                xml_str += dict_to_xml(item, "item")
                            else:
                                xml_str += f"<item>{item}</item>"
                        xml_str += f"</{key}>"
                    else:
                        xml_str += f"<{key}>{value}</{key}>"
                xml_str += f"</{root_name}>"
                return xml_str
            
            return dict_to_xml(data)
            
        except Exception as e:
            logger.error(f"XML轉換失敗: {str(e)}")
            return f"<error>XML轉換失敗: {str(e)}</error>"
    
    def _export_as_image(self, diagram: Dict, export_format: str) -> Tuple[bool, Any]:
        """導出為圖像格式"""
        try:
            # 這裡需要實現圖像生成邏輯
            # 可以使用matplotlib, PIL等庫來生成圖像
            return True, {
                "format": export_format,
                "message": f"圖像導出功能待實現 (格式: {export_format})",
                "filename": f"{diagram['name']}_flow_diagram.{export_format}"
            }
            
        except Exception as e:
            logger.error(f"圖像導出失敗: {str(e)}")
            return False, f"圖像導出失敗: {str(e)}"


# 全局控制器實例
flow_diagram_controller = None


def init_flow_diagram_controller(db_instance):
    """初始化流程圖控制器"""
    global flow_diagram_controller
    flow_diagram_controller = FlowDiagramController(db_instance)
    return flow_diagram_controller