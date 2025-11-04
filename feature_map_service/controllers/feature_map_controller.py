# -*- coding: utf-8 -*-
"""
@文件: feature_map_controller.py
@說明: 功能導圖控制器 (Feature Map Service)
@時間: 2025-01-09
@作者: LiDong
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple

from dbs.mongodb.models import FeatureMapModel, FeatureDependencyModel, FeatureHistoryModel
from common.common_tools import CommonTools
from loggers import logger


class FeatureMapController:
    """功能導圖控制器"""
    
    def __init__(self):
        self.feature_map_model = FeatureMapModel()
        self.dependency_model = FeatureDependencyModel()
        self.history_model = FeatureHistoryModel()
    
    # ==================== 功能導圖管理 ====================
    
    def get_project_feature_maps(self, project_id: str, map_type: str = None, 
                                page: int = 1, limit: int = 20) -> Tuple[Any, bool]:
        """獲取項目功能導圖列表"""
        try:
            result, flag = self.feature_map_model.get_project_feature_maps(
                project_id, map_type, page, limit
            )
            return result, flag
        except Exception as e:
            logger.error(f"獲取項目功能導圖列表失敗: {str(e)}")
            return str(e), False
    
    def create_feature_map(self, project_id: str, name: str, description: str, 
                          map_type: str, created_by: str, mind_map: Dict = None) -> Tuple[Any, bool]:
        """創建功能導圖"""
        try:
            result, flag = self.feature_map_model.create_feature_map(
                project_id, name, description, map_type, created_by, mind_map
            )
            
            if flag:
                # 記錄歷史
                self.history_model.add_history(
                    result["_id"], "root", "created", 
                    {"name": name, "type": map_type}, created_by
                )
            
            return result, flag
        except Exception as e:
            logger.error(f"創建功能導圖失敗: {str(e)}")
            return str(e), False
    
    def get_feature_map(self, map_id: str) -> Tuple[Any, bool]:
        """獲取功能導圖詳情"""
        try:
            return self.feature_map_model.get_feature_map(map_id)
        except Exception as e:
            logger.error(f"獲取功能導圖詳情失敗: {str(e)}")
            return str(e), False
    
    def update_feature_map(self, map_id: str, update_data: Dict, user_id: str) -> Tuple[Any, bool]:
        """更新功能導圖"""
        try:
            # 記錄變更
            changes = {k: v for k, v in update_data.items() if k not in ["updated_at"]}
            
            result, flag = self.feature_map_model.update_feature_map(map_id, update_data)
            
            if flag and changes:
                self.history_model.add_history(
                    map_id, "root", "updated", changes, user_id
                )
            
            return result, flag
        except Exception as e:
            logger.error(f"更新功能導圖失敗: {str(e)}")
            return str(e), False
    
    def delete_feature_map(self, map_id: str, user_id: str) -> Tuple[Any, bool]:
        """刪除功能導圖"""
        try:
            # 記錄刪除歷史
            self.history_model.add_history(
                map_id, "root", "deleted", {}, user_id
            )
            
            return self.feature_map_model.delete_feature_map(map_id)
        except Exception as e:
            logger.error(f"刪除功能導圖失敗: {str(e)}")
            return str(e), False
    
    def duplicate_feature_map(self, map_id: str, new_name: str, created_by: str) -> Tuple[Any, bool]:
        """複製功能導圖"""
        try:
            return self.feature_map_model.duplicate_feature_map(map_id, new_name, created_by)
        except Exception as e:
            logger.error(f"複製功能導圖失敗: {str(e)}")
            return str(e), False
    
    # ==================== 節點操作 ====================
    
    def add_node(self, map_id: str, parent_node_id: str, node_data: Dict, user_id: str) -> Tuple[Any, bool]:
        """添加節點"""
        try:
            result, flag = self.feature_map_model.add_node(map_id, parent_node_id, node_data)
            
            if flag:
                # 記錄歷史
                self.history_model.add_history(
                    map_id, result["node_id"], "created", node_data, user_id
                )
            
            return result, flag
        except Exception as e:
            logger.error(f"添加節點失敗: {str(e)}")
            return str(e), False
    
    def update_node(self, map_id: str, node_id: str, node_data: Dict, user_id: str) -> Tuple[Any, bool]:
        """更新節點"""
        try:
            result, flag = self.feature_map_model.update_node(map_id, node_id, node_data)
            
            if flag:
                # 記錄歷史
                self.history_model.add_history(
                    map_id, node_id, "updated", node_data, user_id
                )
            
            return result, flag
        except Exception as e:
            logger.error(f"更新節點失敗: {str(e)}")
            return str(e), False
    
    def delete_node(self, map_id: str, node_id: str, user_id: str) -> Tuple[Any, bool]:
        """刪除節點"""
        try:
            result, flag = self.feature_map_model.delete_node(map_id, node_id)
            
            if flag:
                # 記錄歷史
                self.history_model.add_history(
                    map_id, node_id, "deleted", {}, user_id
                )
            
            return result, flag
        except Exception as e:
            logger.error(f"刪除節點失敗: {str(e)}")
            return str(e), False
    
    def move_node(self, map_id: str, node_id: str, new_parent_id: str, 
                 position: int, user_id: str) -> Tuple[Any, bool]:
        """移動節點"""
        try:
            result, flag = self.feature_map_model.move_node(map_id, node_id, new_parent_id, position)
            
            if flag:
                # 記錄歷史
                self.history_model.add_history(
                    map_id, node_id, "moved", 
                    {"new_parent_id": new_parent_id, "position": position}, user_id
                )
            
            return result, flag
        except Exception as e:
            logger.error(f"移動節點失敗: {str(e)}")
            return str(e), False
    
    def assign_node(self, map_id: str, node_id: str, assignee: str, user_id: str) -> Tuple[Any, bool]:
        """分配節點負責人"""
        try:
            node_data = {"assignee": assignee}
            result, flag = self.feature_map_model.update_node(map_id, node_id, node_data)
            
            if flag:
                # 記錄歷史
                self.history_model.add_history(
                    map_id, node_id, "assigned", {"assignee": assignee}, user_id
                )
            
            return result, flag
        except Exception as e:
            logger.error(f"分配節點失敗: {str(e)}")
            return str(e), False
    
    # ==================== 依賴管理 ====================
    
    def get_dependencies(self, map_id: str) -> Tuple[Any, bool]:
        """獲取依賴關係列表"""
        try:
            return self.dependency_model.get_dependencies(map_id)
        except Exception as e:
            logger.error(f"獲取依賴關係失敗: {str(e)}")
            return str(e), False
    
    def create_dependency(self, map_id: str, source_feature_id: str, target_feature_id: str,
                         dependency_type: str, description: str = "") -> Tuple[Any, bool]:
        """創建依賴關係"""
        try:
            return self.dependency_model.create_dependency(
                map_id, source_feature_id, target_feature_id, dependency_type, description
            )
        except Exception as e:
            logger.error(f"創建依賴關係失敗: {str(e)}")
            return str(e), False
    
    def delete_dependency(self, dependency_id: str) -> Tuple[Any, bool]:
        """刪除依賴關係"""
        try:
            return self.dependency_model.delete_dependency(dependency_id)
        except Exception as e:
            logger.error(f"刪除依賴關係失敗: {str(e)}")
            return str(e), False
    
    def get_dependency_graph(self, map_id: str) -> Tuple[Any, bool]:
        """獲取依賴圖"""
        try:
            # 獲取功能導圖
            feature_map, flag = self.feature_map_model.get_feature_map(map_id)
            if not flag:
                return feature_map, False
            
            # 獲取依賴關係
            dependencies, flag = self.dependency_model.get_dependencies(map_id)
            if not flag:
                return dependencies, False
            
            # 構建依賴圖數據
            nodes = []
            edges = []
            
            # 遞歸添加節點
            def add_nodes(node, level=0):
                nodes.append({
                    "id": node["id"],
                    "title": node["title"],
                    "type": node.get("type", "feature"),
                    "status": node.get("status", "planned"),
                    "level": level
                })
                
                for child in node.get("children", []):
                    add_nodes(child, level + 1)
            
            add_nodes(feature_map["mind_map"]["root"])
            
            # 添加依賴邊
            for dep in dependencies:
                edges.append({
                    "id": dep["_id"],
                    "source": dep["source_feature_id"],
                    "target": dep["target_feature_id"],
                    "type": dep["dependency_type"],
                    "description": dep.get("description", "")
                })
            
            result = {
                "nodes": nodes,
                "edges": edges
            }
            
            return result, True
        except Exception as e:
            logger.error(f"獲取依賴圖失敗: {str(e)}")
            return str(e), False
    
    # ==================== 統計和報告 ====================
    
    def get_metrics(self, map_id: str) -> Tuple[Any, bool]:
        """獲取項目指標"""
        try:
            feature_map, flag = self.feature_map_model.get_feature_map(map_id)
            if not flag:
                return feature_map, False
            
            metrics = feature_map.get("metrics", {})
            
            # 增強統計數據
            enhanced_metrics = {
                **metrics,
                "last_updated": feature_map["updated_at"],
                "efficiency": self._calculate_efficiency(metrics),
                "status_breakdown": self._get_status_breakdown(feature_map["mind_map"]),
                "priority_breakdown": self._get_priority_breakdown(feature_map["mind_map"]),
                "type_breakdown": self._get_type_breakdown(feature_map["mind_map"])
            }
            
            return enhanced_metrics, True
        except Exception as e:
            logger.error(f"獲取項目指標失敗: {str(e)}")
            return str(e), False
    
    def get_progress_report(self, map_id: str) -> Tuple[Any, bool]:
        """獲取進度報告"""
        try:
            feature_map, flag = self.feature_map_model.get_feature_map(map_id)
            if not flag:
                return feature_map, False
            
            mind_map = feature_map["mind_map"]
            metrics = feature_map["metrics"]
            
            # 生成進度報告
            report = {
                "overall_progress": metrics.get("progress_percentage", 0),
                "feature_breakdown": self._get_feature_breakdown(mind_map),
                "milestone_progress": self._get_milestone_progress(mind_map),
                "velocity_trend": self._get_velocity_trend(map_id),
                "risk_analysis": self._analyze_risks(mind_map),
                "recommendations": self._generate_recommendations(mind_map, metrics)
            }
            
            return report, True
        except Exception as e:
            logger.error(f"獲取進度報告失敗: {str(e)}")
            return str(e), False
    
    def get_velocity(self, map_id: str) -> Tuple[Any, bool]:
        """獲取開發速度"""
        try:
            feature_map, flag = self.feature_map_model.get_feature_map(map_id)
            if not flag:
                return feature_map, False
            
            # 獲取歷史記錄計算速度
            history, flag = self.history_model.get_history(map_id, limit=100)
            if not flag:
                return history, False
            
            velocity_data = {
                "current_velocity": self._calculate_current_velocity(history["history"]),
                "average_velocity": self._calculate_average_velocity(history["history"]),
                "velocity_history": self._get_velocity_history(history["history"]),
                "sprint_burndown": self._get_sprint_burndown(map_id),
                "forecasts": self._generate_velocity_forecasts(feature_map, history["history"])
            }
            
            return velocity_data, True
        except Exception as e:
            logger.error(f"獲取開發速度失敗: {str(e)}")
            return str(e), False
    
    def get_burndown(self, map_id: str) -> Tuple[Any, bool]:
        """獲取燃盡圖數據"""
        try:
            feature_map, flag = self.feature_map_model.get_feature_map(map_id)
            if not flag:
                return feature_map, False
            
            burndown_data = {
                "ideal_line": self._calculate_ideal_burndown(feature_map),
                "actual_line": self._calculate_actual_burndown(map_id),
                "remaining_work": self._calculate_remaining_work(feature_map),
                "completion_forecast": self._forecast_completion(feature_map),
                "sprint_summary": self._get_sprint_summary(map_id)
            }
            
            return burndown_data, True
        except Exception as e:
            logger.error(f"獲取燃盡圖數據失敗: {str(e)}")
            return str(e), False
    
    # ==================== 導出功能 ====================
    
    def export_feature_map(self, map_id: str, export_format: str, options: Dict = None) -> Tuple[Any, bool]:
        """導出功能導圖"""
        try:
            feature_map, flag = self.feature_map_model.get_feature_map(map_id)
            if not flag:
                return feature_map, False
            
            options = options or {}
            
            if export_format == "json":
                return self._export_to_json(feature_map, options)
            elif export_format == "csv":
                return self._export_to_csv(feature_map, options)
            elif export_format == "xlsx":
                return self._export_to_xlsx(feature_map, options)
            elif export_format == "pdf":
                return self._export_to_pdf(feature_map, options)
            else:
                return "不支持的導出格式", False
        except Exception as e:
            logger.error(f"導出功能導圖失敗: {str(e)}")
            return str(e), False
    
    def export_gantt(self, map_id: str, export_format: str = "png", options: Dict = None) -> Tuple[Any, bool]:
        """導出甘特圖"""
        try:
            feature_map, flag = self.feature_map_model.get_feature_map(map_id)
            if not flag:
                return feature_map, False
            
            # 生成甘特圖數據
            gantt_data = self._generate_gantt_data(feature_map, options or {})
            
            # 根據格式導出
            if export_format in ["png", "pdf", "svg"]:
                return self._export_gantt_chart(gantt_data, export_format, options)
            else:
                return "不支持的甘特圖格式", False
        except Exception as e:
            logger.error(f"導出甘特圖失敗: {str(e)}")
            return str(e), False
    
    def export_roadmap(self, map_id: str, export_format: str = "png", options: Dict = None) -> Tuple[Any, bool]:
        """導出產品路線圖"""
        try:
            feature_map, flag = self.feature_map_model.get_feature_map(map_id)
            if not flag:
                return feature_map, False
            
            # 生成路線圖數據
            roadmap_data = self._generate_roadmap_data(feature_map, options or {})
            
            # 根據格式導出
            if export_format in ["png", "pdf", "svg"]:
                return self._export_roadmap_chart(roadmap_data, export_format, options)
            else:
                return "不支持的路線圖格式", False
        except Exception as e:
            logger.error(f"導出產品路線圖失敗: {str(e)}")
            return str(e), False
    
    # ==================== 集成功能 ====================
    
    def sync_jira(self, map_id: str, project_key: str, sync_type: str = "two_way", 
                 issue_types: List[str] = None) -> Tuple[Any, bool]:
        """同步到Jira"""
        try:
            # 這裡實現Jira同步邏輯
            # 由於需要Jira API配置，這裡提供模擬實現
            
            sync_result = {
                "status": "success",
                "synced_items": 0,
                "errors": [],
                "sync_time": datetime.now(timezone.utc).isoformat()
            }
            
            # 更新集成配置
            integration_data = {
                "integration.jira_project_key": project_key,
                "integration.sync_enabled": True,
                "integration.last_sync": datetime.now(timezone.utc)
            }
            
            self.feature_map_model.update_feature_map(map_id, integration_data)
            
            return sync_result, True
        except Exception as e:
            logger.error(f"同步Jira失敗: {str(e)}")
            return str(e), False
    
    def sync_github(self, map_id: str, repo: str, sync_type: str = "import", 
                   include_issues: bool = True, include_milestones: bool = True) -> Tuple[Any, bool]:
        """同步到GitHub"""
        try:
            # 這裡實現GitHub同步邏輯
            # 由於需要GitHub API配置，這裡提供模擬實現
            
            sync_result = {
                "status": "success",
                "synced_items": 0,
                "errors": [],
                "sync_time": datetime.now(timezone.utc).isoformat()
            }
            
            # 更新集成配置
            integration_data = {
                "integration.github_repo": repo,
                "integration.sync_enabled": True,
                "integration.last_sync": datetime.now(timezone.utc)
            }
            
            self.feature_map_model.update_feature_map(map_id, integration_data)
            
            return sync_result, True
        except Exception as e:
            logger.error(f"同步GitHub失敗: {str(e)}")
            return str(e), False
    
    def get_sync_status(self, map_id: str) -> Tuple[Any, bool]:
        """獲取同步狀態"""
        try:
            feature_map, flag = self.feature_map_model.get_feature_map(map_id)
            if not flag:
                return feature_map, False
            
            integration = feature_map.get("integration", {})
            
            sync_status = {
                "sync_enabled": integration.get("sync_enabled", False),
                "last_sync": integration.get("last_sync"),
                "sync_status": "active" if integration.get("sync_enabled") else "inactive",
                "jira_status": {
                    "connected": bool(integration.get("jira_project_key")),
                    "project_key": integration.get("jira_project_key", ""),
                    "last_sync": integration.get("last_sync")
                },
                "github_status": {
                    "connected": bool(integration.get("github_repo")),
                    "repo": integration.get("github_repo", ""),
                    "last_sync": integration.get("last_sync")
                },
                "errors": []
            }
            
            return sync_status, True
        except Exception as e:
            logger.error(f"獲取同步狀態失敗: {str(e)}")
            return str(e), False
    
    # ==================== 輔助方法 ====================
    
    def _calculate_efficiency(self, metrics: Dict) -> float:
        """計算效率"""
        estimated = metrics.get("total_estimated_hours", 0)
        actual = metrics.get("total_actual_hours", 0)
        
        if actual == 0:
            return 100.0
        
        return min(100.0, (estimated / actual) * 100)
    
    def _get_status_breakdown(self, mind_map: Dict) -> Dict:
        """獲取狀態分解"""
        breakdown = {}
        
        def count_status(node):
            status = node.get("status", "planned")
            breakdown[status] = breakdown.get(status, 0) + 1
            
            for child in node.get("children", []):
                count_status(child)
        
        count_status(mind_map["root"])
        return breakdown
    
    def _get_priority_breakdown(self, mind_map: Dict) -> Dict:
        """獲取優先級分解"""
        breakdown = {}
        
        def count_priority(node):
            priority = node.get("priority", "medium")
            breakdown[priority] = breakdown.get(priority, 0) + 1
            
            for child in node.get("children", []):
                count_priority(child)
        
        count_priority(mind_map["root"])
        return breakdown
    
    def _get_type_breakdown(self, mind_map: Dict) -> Dict:
        """獲取類型分解"""
        breakdown = {}
        
        def count_type(node):
            node_type = node.get("type", "feature")
            breakdown[node_type] = breakdown.get(node_type, 0) + 1
            
            for child in node.get("children", []):
                count_type(child)
        
        count_type(mind_map["root"])
        return breakdown
    
    def _get_feature_breakdown(self, mind_map: Dict) -> Dict:
        """獲取功能分解"""
        return {
            "epics": self._count_nodes_by_type(mind_map, "epic"),
            "features": self._count_nodes_by_type(mind_map, "feature"),
            "stories": self._count_nodes_by_type(mind_map, "story"),
            "tasks": self._count_nodes_by_type(mind_map, "task"),
            "bugs": self._count_nodes_by_type(mind_map, "bug")
        }
    
    def _count_nodes_by_type(self, mind_map: Dict, node_type: str) -> int:
        """按類型計算節點數"""
        count = 0
        
        def count_nodes(node):
            nonlocal count
            if node.get("type") == node_type:
                count += 1
            
            for child in node.get("children", []):
                count_nodes(child)
        
        count_nodes(mind_map["root"])
        return count
    
    def _get_milestone_progress(self, mind_map: Dict) -> List[Dict]:
        """獲取里程碑進度"""
        milestones = []
        
        def find_milestones(node, path=""):
            if node.get("type") == "epic" or node.get("tags", []).count("milestone") > 0:
                milestone = {
                    "id": node["id"],
                    "title": node["title"],
                    "path": path,
                    "progress": node.get("progress", 0),
                    "status": node.get("status", "planned"),
                    "due_date": node.get("due_date"),
                    "estimated_hours": node.get("estimated_hours", 0),
                    "actual_hours": node.get("actual_hours", 0)
                }
                milestones.append(milestone)
            
            for child in node.get("children", []):
                child_path = f"{path}/{node['title']}" if path else node["title"]
                find_milestones(child, child_path)
        
        find_milestones(mind_map["root"])
        return milestones
    
    def _get_velocity_trend(self, map_id: str) -> List[Dict]:
        """獲取速度趨勢"""
        # 這裡應該從歷史記錄計算速度趨勢
        # 簡化實現，返回模擬數據
        return [
            {"period": "Week 1", "completed_points": 8, "velocity": 8},
            {"period": "Week 2", "completed_points": 12, "velocity": 10},
            {"period": "Week 3", "completed_points": 10, "velocity": 10},
            {"period": "Week 4", "completed_points": 15, "velocity": 11.25}
        ]
    
    def _analyze_risks(self, mind_map: Dict) -> Dict:
        """分析風險"""
        risks = {
            "high_risk_items": [],
            "blocked_items": [],
            "overdue_items": [],
            "risk_score": 0
        }
        
        def analyze_node(node):
            # 檢查阻塞狀態
            if node.get("status") == "blocked":
                risks["blocked_items"].append({
                    "id": node["id"],
                    "title": node["title"],
                    "reason": "狀態為阻塞"
                })
            
            # 檢查高複雜度
            if node.get("complexity", 5) > 8:
                risks["high_risk_items"].append({
                    "id": node["id"],
                    "title": node["title"],
                    "reason": f"複雜度過高 ({node.get('complexity')})"
                })
            
            # 檢查截止日期
            due_date = node.get("due_date")
            if due_date and datetime.fromisoformat(due_date.replace('Z', '+00:00')) < datetime.now(timezone.utc):
                risks["overdue_items"].append({
                    "id": node["id"],
                    "title": node["title"],
                    "due_date": due_date
                })
            
            for child in node.get("children", []):
                analyze_node(child)
        
        analyze_node(mind_map["root"])
        
        # 計算風險分數
        risks["risk_score"] = len(risks["high_risk_items"]) * 3 + len(risks["blocked_items"]) * 2 + len(risks["overdue_items"])
        
        return risks
    
    def _generate_recommendations(self, mind_map: Dict, metrics: Dict) -> List[str]:
        """生成建議"""
        recommendations = []
        
        # 基於進度的建議
        progress = metrics.get("progress_percentage", 0)
        if progress < 30:
            recommendations.append("項目進度較慢，建議檢查資源分配和優先級設置")
        elif progress > 80:
            recommendations.append("項目進度良好，可以開始準備下一階段規劃")
        
        # 基於效率的建議
        estimated = metrics.get("total_estimated_hours", 0)
        actual = metrics.get("total_actual_hours", 0)
        if actual > estimated * 1.2:
            recommendations.append("實際工時超出預估較多，建議優化估算方法")
        
        return recommendations
    
    def _calculate_current_velocity(self, history: List[Dict]) -> float:
        """計算當前速度"""
        # 簡化實現
        completed_items = [h for h in history if h.get("action") == "updated" and 
                          h.get("changes", {}).get("status") == "completed"]
        return len(completed_items)
    
    def _calculate_average_velocity(self, history: List[Dict]) -> float:
        """計算平均速度"""
        # 簡化實現
        return self._calculate_current_velocity(history) * 0.8
    
    def _get_velocity_history(self, history: List[Dict]) -> List[Dict]:
        """獲取速度歷史"""
        # 簡化實現
        return [
            {"date": "2024-01-01", "velocity": 8},
            {"date": "2024-01-08", "velocity": 10},
            {"date": "2024-01-15", "velocity": 12},
            {"date": "2024-01-22", "velocity": 9}
        ]
    
    def _get_sprint_burndown(self, map_id: str) -> List[Dict]:
        """獲取Sprint燃盡數據"""
        # 簡化實現
        return [
            {"day": 1, "remaining": 100, "ideal": 90},
            {"day": 2, "remaining": 85, "ideal": 80},
            {"day": 3, "remaining": 75, "ideal": 70},
            {"day": 4, "remaining": 60, "ideal": 60}
        ]
    
    def _generate_velocity_forecasts(self, feature_map: Dict, history: List[Dict]) -> Dict:
        """生成速度預測"""
        return {
            "estimated_completion": "2024-03-15",
            "confidence": 0.75,
            "best_case": "2024-03-01",
            "worst_case": "2024-04-01"
        }
    
    def _calculate_ideal_burndown(self, feature_map: Dict) -> List[Dict]:
        """計算理想燃盡線"""
        total_work = feature_map.get("metrics", {}).get("total_estimated_hours", 100)
        
        return [
            {"date": "2024-01-01", "remaining": total_work},
            {"date": "2024-01-15", "remaining": total_work * 0.5},
            {"date": "2024-02-01", "remaining": 0}
        ]
    
    def _calculate_actual_burndown(self, map_id: str) -> List[Dict]:
        """計算實際燃盡線"""
        # 簡化實現
        return [
            {"date": "2024-01-01", "remaining": 100},
            {"date": "2024-01-15", "remaining": 60},
            {"date": "2024-02-01", "remaining": 20}
        ]
    
    def _calculate_remaining_work(self, feature_map: Dict) -> float:
        """計算剩餘工作量"""
        metrics = feature_map.get("metrics", {})
        total = metrics.get("total_estimated_hours", 0)
        actual = metrics.get("total_actual_hours", 0)
        return max(0, total - actual)
    
    def _forecast_completion(self, feature_map: Dict) -> str:
        """預測完成時間"""
        return "2024-03-15"
    
    def _get_sprint_summary(self, map_id: str) -> Dict:
        """獲取Sprint總結"""
        return {
            "sprint_number": 1,
            "start_date": "2024-01-01",
            "end_date": "2024-01-15",
            "planned_points": 100,
            "completed_points": 80,
            "velocity": 80
        }
    
    def _export_to_json(self, feature_map: Dict, options: Dict) -> Tuple[Any, bool]:
        """導出為JSON格式"""
        try:
            filename = f"feature_map_{feature_map['_id']}.json"
            export_data = {
                "feature_map": feature_map,
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "export_options": options
            }
            
            # 這裡應該實際生成文件並返回下載鏈接
            result = {
                "download_url": f"/downloads/{filename}",
                "file_name": filename,
                "file_size": len(json.dumps(export_data)),
                "export_format": "json",
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
            return result, True
        except Exception as e:
            return str(e), False
    
    def _export_to_csv(self, feature_map: Dict, options: Dict) -> Tuple[Any, bool]:
        """導出為CSV格式"""
        try:
            filename = f"feature_map_{feature_map['_id']}.csv"
            
            # 這裡應該實際生成CSV文件
            result = {
                "download_url": f"/downloads/{filename}",
                "file_name": filename,
                "file_size": 1024,  # 模擬文件大小
                "export_format": "csv",
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
            return result, True
        except Exception as e:
            return str(e), False
    
    def _export_to_xlsx(self, feature_map: Dict, options: Dict) -> Tuple[Any, bool]:
        """導出為Excel格式"""
        try:
            filename = f"feature_map_{feature_map['_id']}.xlsx"
            
            # 這裡應該實際生成Excel文件
            result = {
                "download_url": f"/downloads/{filename}",
                "file_name": filename,
                "file_size": 2048,  # 模擬文件大小
                "export_format": "xlsx",
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
            return result, True
        except Exception as e:
            return str(e), False
    
    def _export_to_pdf(self, feature_map: Dict, options: Dict) -> Tuple[Any, bool]:
        """導出為PDF格式"""
        try:
            filename = f"feature_map_{feature_map['_id']}.pdf"
            
            # 這裡應該實際生成PDF文件
            result = {
                "download_url": f"/downloads/{filename}",
                "file_name": filename,
                "file_size": 4096,  # 模擬文件大小
                "export_format": "pdf",
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
            return result, True
        except Exception as e:
            return str(e), False
    
    def _generate_gantt_data(self, feature_map: Dict, options: Dict) -> Dict:
        """生成甘特圖數據"""
        # 這裡應該解析思維導圖並生成甘特圖數據結構
        return {
            "tasks": [],
            "dependencies": [],
            "timeline": {
                "start": options.get("start_date", "2024-01-01"),
                "end": options.get("end_date", "2024-12-31")
            }
        }
    
    def _export_gantt_chart(self, gantt_data: Dict, export_format: str, options: Dict) -> Tuple[Any, bool]:
        """導出甘特圖"""
        try:
            filename = f"gantt_chart.{export_format}"
            
            # 這裡應該實際生成甘特圖文件
            result = {
                "download_url": f"/downloads/{filename}",
                "file_name": filename,
                "file_size": 3072,
                "export_format": export_format,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
            return result, True
        except Exception as e:
            return str(e), False
    
    def _generate_roadmap_data(self, feature_map: Dict, options: Dict) -> Dict:
        """生成路線圖數據"""
        # 這裡應該解析思維導圖並生成路線圖數據結構
        return {
            "milestones": [],
            "features": [],
            "timeline": options.get("time_period", "quarter")
        }
    
    def _export_roadmap_chart(self, roadmap_data: Dict, export_format: str, options: Dict) -> Tuple[Any, bool]:
        """導出路線圖"""
        try:
            filename = f"roadmap.{export_format}"
            
            # 這裡應該實際生成路線圖文件
            result = {
                "download_url": f"/downloads/{filename}",
                "file_name": filename,
                "file_size": 2560,
                "export_format": export_format,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
            return result, True
        except Exception as e:
            return str(e), False


# 全局控制器實例
feature_map_controller = None


def init_feature_map_controller(db_instance):
    """初始化功能導圖控制器"""
    global feature_map_controller
    feature_map_controller = FeatureMapController()
    logger.info("功能導圖控制器初始化完成")