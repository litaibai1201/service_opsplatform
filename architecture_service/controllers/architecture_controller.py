# -*- coding: utf-8 -*-
"""
@文件: architecture_controller.py
@說明: 架構圖控制器 (Architecture Service)
@時間: 2025-01-09
@作者: LiDong
"""

import json
import base64
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any, Optional
from bson import ObjectId

from common.common_tools import CommonTools
from dbs.mongodb.models import DiagramModel, DiagramVersionModel, DiagramCommentModel
from loggers import logger


class ArchitectureController:
    """架构图控制器"""

    def __init__(self, db_instance):
        self.db = db_instance
        self.diagram_model = DiagramModel(db_instance)
        self.version_model = DiagramVersionModel(db_instance)
        self.comment_model = DiagramCommentModel(db_instance)

    # ==================== 架构图管理 ====================

    def create_diagram(self, project_id: str, user_id: str, **kwargs) -> Tuple[bool, Any]:
        """创建架构图"""
        try:
            diagram = self.diagram_model.create_diagram(
                project_id=project_id,
                created_by=user_id,
                **kwargs
            )
            
            # 创建初始版本
            if diagram:
                self.version_model.create_version(
                    diagram_id=diagram['_id'],
                    version=1,
                    data=diagram['data'],
                    created_by=user_id,
                    comment="初始版本",
                    is_major=True
                )
            
            return True, diagram
            
        except Exception as e:
            logger.error(f"创建架构图失败: {str(e)}")
            return False, f"创建架构图失败: {str(e)}"

    def get_diagrams_by_project(self, project_id: str, page: int = 1, per_page: int = 20) -> Tuple[bool, Any]:
        """获取项目的架构图列表"""
        try:
            result = self.diagram_model.get_diagrams_by_project(project_id, page, per_page)
            return True, result
        except Exception as e:
            logger.error(f"获取项目架构图列表失败: {str(e)}")
            return False, f"获取项目架构图列表失败: {str(e)}"

    def get_diagram_detail(self, diagram_id: str) -> Tuple[bool, Any]:
        """获取架构图详情"""
        try:
            diagram = self.diagram_model.get_diagram_by_id(diagram_id)
            if not diagram:
                return False, "架构图不存在"
            
            # 获取评论数量
            comments = self.comment_model.get_comments_by_diagram(diagram_id)
            diagram['comment_count'] = len(comments)
            
            return True, diagram
        except Exception as e:
            logger.error(f"获取架构图详情失败: {str(e)}")
            return False, f"获取架构图详情失败: {str(e)}"

    def update_diagram(self, diagram_id: str, user_id: str, **kwargs) -> Tuple[bool, Any]:
        """更新架构图"""
        try:
            # 检查架构图是否存在
            existing_diagram = self.diagram_model.get_diagram_by_id(diagram_id)
            if not existing_diagram:
                return False, "架构图不存在"
            
            # 检查是否被锁定
            if (existing_diagram.get('collaboration', {}).get('locked_by') and 
                existing_diagram['collaboration']['locked_by'] != user_id):
                return False, "架构图已被其他用户锁定"
            
            # 如果有数据更新，创建新版本
            if 'data' in kwargs:
                old_version = existing_diagram['metadata']['version']
                new_version = old_version + 1
                
                self.version_model.create_version(
                    diagram_id=diagram_id,
                    version=new_version,
                    data=kwargs['data'],
                    created_by=user_id,
                    comment=kwargs.get('version_comment', f"版本 {new_version}"),
                    parent_version=old_version,
                    is_major=kwargs.get('is_major_version', False)
                )
            
            # 更新架构图
            updated_diagram = self.diagram_model.update_diagram(diagram_id, kwargs, user_id)
            if updated_diagram:
                return True, updated_diagram
            else:
                return False, "更新架构图失败"
                
        except Exception as e:
            logger.error(f"更新架构图失败: {str(e)}")
            return False, f"更新架构图失败: {str(e)}"

    def delete_diagram(self, diagram_id: str, user_id: str) -> Tuple[bool, Any]:
        """删除架构图"""
        try:
            # 检查架构图是否存在
            diagram = self.diagram_model.get_diagram_by_id(diagram_id)
            if not diagram:
                return False, "架构图不存在"
            
            # 删除相关数据
            # 删除版本历史
            self.db.diagram_versions.delete_many({"diagram_id": ObjectId(diagram_id)})
            
            # 删除评论
            self.db.diagram_comments.delete_many({"diagram_id": ObjectId(diagram_id)})
            
            # 删除架构图
            success = self.diagram_model.delete_diagram(diagram_id)
            
            if success:
                return True, "架构图删除成功"
            else:
                return False, "删除架构图失败"
                
        except Exception as e:
            logger.error(f"删除架构图失败: {str(e)}")
            return False, f"删除架构图失败: {str(e)}"

    def duplicate_diagram(self, diagram_id: str, new_name: str, user_id: str) -> Tuple[bool, Any]:
        """复制架构图"""
        try:
            # 检查原架构图是否存在
            original = self.diagram_model.get_diagram_by_id(diagram_id)
            if not original:
                return False, "原架构图不存在"
            
            # 复制架构图
            duplicated = self.diagram_model.duplicate_diagram(diagram_id, new_name, user_id)
            
            if duplicated:
                # 为复制的架构图创建初始版本
                self.version_model.create_version(
                    diagram_id=duplicated['_id'],
                    version=1,
                    data=duplicated['data'],
                    created_by=user_id,
                    comment=f"从 '{original['name']}' 复制",
                    is_major=True
                )
                
                return True, duplicated
            else:
                return False, "复制架构图失败"
                
        except Exception as e:
            logger.error(f"复制架构图失败: {str(e)}")
            return False, f"复制架构图失败: {str(e)}"

    # ==================== 版本管理 ====================

    def get_diagram_versions(self, diagram_id: str) -> Tuple[bool, Any]:
        """获取架构图版本历史"""
        try:
            # 检查架构图是否存在
            diagram = self.diagram_model.get_diagram_by_id(diagram_id)
            if not diagram:
                return False, "架构图不存在"
            
            versions = self.version_model.get_versions_by_diagram(diagram_id)
            
            return True, {
                "diagram_id": diagram_id,
                "diagram_name": diagram.get('name'),
                "current_version": diagram['metadata']['version'],
                "versions": versions,
                "total_versions": len(versions)
            }
        except Exception as e:
            logger.error(f"获取版本历史失败: {str(e)}")
            return False, f"获取版本历史失败: {str(e)}"

    def create_diagram_version(self, diagram_id: str, user_id: str, comment: str = None, is_major: bool = False) -> Tuple[bool, Any]:
        """创建新版本"""
        try:
            # 检查架构图是否存在
            diagram = self.diagram_model.get_diagram_by_id(diagram_id)
            if not diagram:
                return False, "架构图不存在"
            
            current_version = diagram['metadata']['version']
            new_version = current_version + 1
            
            # 创建新版本
            version = self.version_model.create_version(
                diagram_id=diagram_id,
                version=new_version,
                data=diagram['data'],
                created_by=user_id,
                comment=comment or f"版本 {new_version}",
                parent_version=current_version,
                is_major=is_major
            )
            
            # 更新架构图的版本号
            self.diagram_model.update_diagram(diagram_id, {"version": new_version}, user_id)
            
            return True, version
        except Exception as e:
            logger.error(f"创建版本失败: {str(e)}")
            return False, f"创建版本失败: {str(e)}"

    def get_diagram_version(self, diagram_id: str, version: int) -> Tuple[bool, Any]:
        """获取特定版本"""
        try:
            version_data = self.version_model.get_version(diagram_id, version)
            if not version_data:
                return False, "版本不存在"
            
            return True, version_data
        except Exception as e:
            logger.error(f"获取版本失败: {str(e)}")
            return False, f"获取版本失败: {str(e)}"

    def restore_diagram_version(self, diagram_id: str, version: int, user_id: str, comment: str = None) -> Tuple[bool, Any]:
        """恢复到指定版本"""
        try:
            # 获取要恢复的版本数据
            version_data = self.version_model.get_version(diagram_id, version)
            if not version_data:
                return False, "版本不存在"
            
            # 获取当前架构图
            current_diagram = self.diagram_model.get_diagram_by_id(diagram_id)
            if not current_diagram:
                return False, "架构图不存在"
            
            current_version = current_diagram['metadata']['version']
            new_version = current_version + 1
            
            # 更新架构图数据为历史版本的数据
            update_data = {
                "data": version_data['data']
            }
            
            updated_diagram = self.diagram_model.update_diagram(diagram_id, update_data, user_id)
            
            if updated_diagram:
                # 创建恢复版本记录
                self.version_model.create_version(
                    diagram_id=diagram_id,
                    version=new_version,
                    data=version_data['data'],
                    created_by=user_id,
                    comment=comment or f"恢复到版本 {version}",
                    parent_version=current_version,
                    is_major=True
                )
                
                return True, updated_diagram
            else:
                return False, "恢复版本失败"
                
        except Exception as e:
            logger.error(f"恢复版本失败: {str(e)}")
            return False, f"恢复版本失败: {str(e)}"

    # ==================== 验证和分析 ====================

    def validate_diagram(self, diagram_id: str, validation_rules: List[str] = None, compliance_checks: List[str] = None) -> Tuple[bool, Any]:
        """验证架构图"""
        try:
            diagram = self.diagram_model.get_diagram_by_id(diagram_id)
            if not diagram:
                return False, "架构图不存在"
            
            validation_result = {
                "diagram_id": diagram_id,
                "validation_status": "valid",
                "errors": [],
                "warnings": [],
                "info": [],
                "validation_time": datetime.utcnow().isoformat()
            }
            
            # 基本验证
            data = diagram.get('data', {})
            nodes = data.get('nodes', [])
            edges = data.get('edges', [])
            
            # 验证节点
            if not nodes:
                validation_result['warnings'].append("架构图没有任何节点")
            
            # 验证连接
            node_ids = {node.get('id') for node in nodes if node.get('id')}
            for edge in edges:
                source = edge.get('source')
                target = edge.get('target')
                
                if source not in node_ids:
                    validation_result['errors'].append(f"连接的源节点 '{source}' 不存在")
                if target not in node_ids:
                    validation_result['errors'].append(f"连接的目标节点 '{target}' 不存在")
            
            # 检查孤立节点
            connected_nodes = set()
            for edge in edges:
                connected_nodes.add(edge.get('source'))
                connected_nodes.add(edge.get('target'))
            
            isolated_nodes = node_ids - connected_nodes
            if isolated_nodes:
                validation_result['warnings'].append(f"发现 {len(isolated_nodes)} 个孤立节点")
            
            # 自定义验证规则
            if validation_rules:
                for rule in validation_rules:
                    # 这里可以实现自定义验证逻辑
                    validation_result['info'].append(f"执行自定义规则: {rule}")
            
            # 合规检查
            if compliance_checks:
                for check in compliance_checks:
                    # 这里可以实现合规检查逻辑
                    validation_result['info'].append(f"执行合规检查: {check}")
            
            # 确定最终状态
            if validation_result['errors']:
                validation_result['validation_status'] = "error"
            elif validation_result['warnings']:
                validation_result['validation_status'] = "warning"
            
            # 更新架构图验证状态
            self.diagram_model.update_diagram(
                diagram_id, 
                {"metadata.validation_status": validation_result['validation_status']},
                "system"
            )
            
            return True, validation_result
            
        except Exception as e:
            logger.error(f"验证架构图失败: {str(e)}")
            return False, f"验证架构图失败: {str(e)}"

    def analyze_diagram(self, diagram_id: str, analysis_type: str = "complexity") -> Tuple[bool, Any]:
        """分析架构图"""
        try:
            diagram = self.diagram_model.get_diagram_by_id(diagram_id)
            if not diagram:
                return False, "架构图不存在"
            
            data = diagram.get('data', {})
            nodes = data.get('nodes', [])
            edges = data.get('edges', [])
            
            analysis_result = {
                "diagram_id": diagram_id,
                "analysis_type": analysis_type,
                "analysis_time": datetime.utcnow().isoformat(),
                "metrics": {},
                "insights": [],
                "recommendations": []
            }
            
            if analysis_type == "complexity":
                # 复杂度分析
                node_count = len(nodes)
                edge_count = len(edges)
                
                # 计算复杂度分数
                complexity_score = self._calculate_complexity_score(nodes, edges)
                
                analysis_result['metrics'] = {
                    "node_count": node_count,
                    "edge_count": edge_count,
                    "complexity_score": complexity_score,
                    "density": edge_count / max(node_count * (node_count - 1) / 2, 1) if node_count > 1 else 0
                }
                
                # 生成洞察
                if complexity_score > 80:
                    analysis_result['insights'].append("架构复杂度较高，可能影响维护性")
                    analysis_result['recommendations'].append("考虑将复杂模块拆分为更小的组件")
                elif complexity_score < 20:
                    analysis_result['insights'].append("架构相对简单")
                    
            elif analysis_type == "performance":
                # 性能分析
                analysis_result['metrics'] = {
                    "critical_path_length": self._analyze_critical_path(nodes, edges),
                    "bottleneck_nodes": self._identify_bottlenecks(nodes, edges)
                }
                
            elif analysis_type == "security":
                # 安全分析
                security_issues = self._analyze_security(nodes, edges)
                analysis_result['metrics'] = {
                    "security_score": security_issues.get('score', 100),
                    "vulnerabilities": security_issues.get('vulnerabilities', [])
                }
                
            # 更新架构图复杂度分数
            if analysis_type == "complexity":
                self.diagram_model.update_diagram(
                    diagram_id,
                    {"metadata.complexity_score": analysis_result['metrics'].get('complexity_score', 0)},
                    "system"
                )
            
            return True, analysis_result
            
        except Exception as e:
            logger.error(f"分析架构图失败: {str(e)}")
            return False, f"分析架构图失败: {str(e)}"

    def get_diagram_suggestions(self, diagram_id: str) -> Tuple[bool, Any]:
        """获取优化建议"""
        try:
            # 先进行复杂度分析
            analysis_result, analysis_flag = self.analyze_diagram(diagram_id, "complexity")
            if not analysis_flag:
                return False, analysis_result
            
            suggestions = {
                "diagram_id": diagram_id,
                "suggestions": [],
                "priority": "medium",
                "generated_at": datetime.utcnow().isoformat()
            }
            
            metrics = analysis_result.get('metrics', {})
            complexity_score = metrics.get('complexity_score', 0)
            node_count = metrics.get('node_count', 0)
            edge_count = metrics.get('edge_count', 0)
            
            # 基于分析结果生成建议
            if complexity_score > 80:
                suggestions['suggestions'].append({
                    "type": "simplification",
                    "title": "简化架构复杂度",
                    "description": "当前架构复杂度较高，建议拆分大型组件",
                    "priority": "high"
                })
                suggestions['priority'] = "high"
            
            if node_count > 20:
                suggestions['suggestions'].append({
                    "type": "organization",
                    "title": "组织架构层次",
                    "description": "节点数量较多，建议使用分层或分组来组织架构",
                    "priority": "medium"
                })
            
            if edge_count / max(node_count, 1) > 3:
                suggestions['suggestions'].append({
                    "type": "connectivity",
                    "title": "优化连接关系",
                    "description": "组件间连接过多，考虑引入中介模式或事件总线",
                    "priority": "medium"
                })
            
            # 默认建议
            if not suggestions['suggestions']:
                suggestions['suggestions'].append({
                    "type": "maintenance",
                    "title": "定期维护",
                    "description": "架构设计良好，建议定期检查和更新文档",
                    "priority": "low"
                })
            
            return True, suggestions
            
        except Exception as e:
            logger.error(f"获取优化建议失败: {str(e)}")
            return False, f"获取优化建议失败: {str(e)}"

    def compliance_check(self, diagram_id: str, compliance_standards: List[str]) -> Tuple[bool, Any]:
        """合规检查"""
        try:
            diagram = self.diagram_model.get_diagram_by_id(diagram_id)
            if not diagram:
                return False, "架构图不存在"
            
            compliance_result = {
                "diagram_id": diagram_id,
                "compliance_standards": compliance_standards,
                "overall_status": "compliant",
                "checks": [],
                "checked_at": datetime.utcnow().isoformat()
            }
            
            data = diagram.get('data', {})
            
            # 执行合规检查
            for standard in compliance_standards:
                check_result = self._execute_compliance_check(standard, data)
                compliance_result['checks'].append(check_result)
                
                if check_result['status'] == "non_compliant":
                    compliance_result['overall_status'] = "non_compliant"
                elif check_result['status'] == "warning" and compliance_result['overall_status'] == "compliant":
                    compliance_result['overall_status'] = "warning"
            
            return True, compliance_result
            
        except Exception as e:
            logger.error(f"合规检查失败: {str(e)}")
            return False, f"合规检查失败: {str(e)}"

    # ==================== 评论系统 ====================

    def get_diagram_comments(self, diagram_id: str) -> Tuple[bool, Any]:
        """获取架构图评论列表"""
        try:
            # 检查架构图是否存在
            diagram = self.diagram_model.get_diagram_by_id(diagram_id)
            if not diagram:
                return False, "架构图不存在"
            
            comments = self.comment_model.get_comments_by_diagram(diagram_id)
            
            return True, {
                "diagram_id": diagram_id,
                "comments": comments,
                "total_comments": len(comments)
            }
        except Exception as e:
            logger.error(f"获取评论列表失败: {str(e)}")
            return False, f"获取评论列表失败: {str(e)}"

    def create_comment(self, diagram_id: str, user_id: str, content: str, position: Dict = None) -> Tuple[bool, Any]:
        """创建评论"""
        try:
            # 检查架构图是否存在
            diagram = self.diagram_model.get_diagram_by_id(diagram_id)
            if not diagram:
                return False, "架构图不存在"
            
            comment = self.comment_model.create_comment(diagram_id, user_id, content, position)
            return True, comment
        except Exception as e:
            logger.error(f"创建评论失败: {str(e)}")
            return False, f"创建评论失败: {str(e)}"

    def update_comment(self, comment_id: str, content: str, user_id: str) -> Tuple[bool, Any]:
        """更新评论"""
        try:
            # 检查评论是否存在以及权限
            comment = self.comment_model.get_comment_by_id(comment_id)
            if not comment:
                return False, "评论不存在"
            
            if comment['user_id'] != user_id:
                return False, "无权限修改此评论"
            
            updated_comment = self.comment_model.update_comment(comment_id, content)
            if updated_comment:
                return True, updated_comment
            else:
                return False, "更新评论失败"
        except Exception as e:
            logger.error(f"更新评论失败: {str(e)}")
            return False, f"更新评论失败: {str(e)}"

    def delete_comment(self, comment_id: str, user_id: str) -> Tuple[bool, Any]:
        """删除评论"""
        try:
            # 检查评论是否存在以及权限
            comment = self.comment_model.get_comment_by_id(comment_id)
            if not comment:
                return False, "评论不存在"
            
            if comment['user_id'] != user_id:
                return False, "无权限删除此评论"
            
            success = self.comment_model.delete_comment(comment_id)
            if success:
                return True, "评论删除成功"
            else:
                return False, "删除评论失败"
        except Exception as e:
            logger.error(f"删除评论失败: {str(e)}")
            return False, f"删除评论失败: {str(e)}"

    def resolve_comment(self, comment_id: str, user_id: str) -> Tuple[bool, Any]:
        """解决评论"""
        try:
            comment = self.comment_model.get_comment_by_id(comment_id)
            if not comment:
                return False, "评论不存在"
            
            resolved_comment = self.comment_model.resolve_comment(comment_id, user_id)
            if resolved_comment:
                return True, resolved_comment
            else:
                return False, "解决评论失败"
        except Exception as e:
            logger.error(f"解决评论失败: {str(e)}")
            return False, f"解决评论失败: {str(e)}"

    # ==================== 导出功能 ====================

    def export_diagram(self, diagram_id: str, export_format: str, options: Dict = None) -> Tuple[bool, Any]:
        """导出架构图"""
        try:
            diagram = self.diagram_model.get_diagram_by_id(diagram_id)
            if not diagram:
                return False, "架构图不存在"
            
            export_result = {
                "diagram_id": diagram_id,
                "format": export_format,
                "exported_at": datetime.utcnow().isoformat(),
                "file_info": {}
            }
            
            if export_format == "json":
                # JSON 导出
                export_data = {
                    "diagram": diagram,
                    "export_metadata": {
                        "exported_at": export_result["exported_at"],
                        "format": export_format,
                        "version": diagram['metadata']['version']
                    }
                }
                
                export_result['data'] = export_data
                export_result['file_info'] = {
                    "filename": f"{diagram['name']}_v{diagram['metadata']['version']}.json",
                    "size": len(json.dumps(export_data)),
                    "mime_type": "application/json"
                }
                
            elif export_format in ["png", "jpg", "svg", "pdf"]:
                # 图像导出 (这里模拟，实际需要图表渲染引擎)
                export_result['file_info'] = {
                    "filename": f"{diagram['name']}_v{diagram['metadata']['version']}.{export_format}",
                    "download_url": f"/api/diagrams/{diagram_id}/export/{export_format}",
                    "mime_type": self._get_mime_type(export_format)
                }
                
            elif export_format == "xml":
                # XML 导出
                xml_data = self._convert_to_xml(diagram)
                export_result['data'] = xml_data
                export_result['file_info'] = {
                    "filename": f"{diagram['name']}_v{diagram['metadata']['version']}.xml",
                    "size": len(xml_data),
                    "mime_type": "application/xml"
                }
            
            return True, export_result
            
        except Exception as e:
            logger.error(f"导出架构图失败: {str(e)}")
            return False, f"导出架构图失败: {str(e)}"

    # ==================== 私有方法 ====================

    def _calculate_complexity_score(self, nodes: List[Dict], edges: List[Dict]) -> int:
        """计算复杂度分数"""
        try:
            node_count = len(nodes)
            edge_count = len(edges)
            
            if node_count == 0:
                return 0
            
            # 基础复杂度 (基于节点和边的数量)
            base_score = min((node_count * 2 + edge_count) * 2, 60)
            
            # 连接密度影响
            density = edge_count / max(node_count * (node_count - 1) / 2, 1) if node_count > 1 else 0
            density_score = min(density * 30, 25)
            
            # 节点类型复杂度
            type_score = min(len(set(node.get('type', 'default') for node in nodes)) * 3, 15)
            
            total_score = int(base_score + density_score + type_score)
            return min(total_score, 100)
            
        except Exception:
            return 50  # 默认中等复杂度

    def _analyze_critical_path(self, nodes: List[Dict], edges: List[Dict]) -> int:
        """分析关键路径长度"""
        # 简化实现，实际应该使用图算法
        return len(edges) // max(len(nodes), 1)

    def _identify_bottlenecks(self, nodes: List[Dict], edges: List[Dict]) -> List[str]:
        """识别瓶颈节点"""
        # 统计每个节点的连接数
        node_connections = {}
        for edge in edges:
            source = edge.get('source')
            target = edge.get('target')
            node_connections[source] = node_connections.get(source, 0) + 1
            node_connections[target] = node_connections.get(target, 0) + 1
        
        # 找出连接数最多的节点作为潜在瓶颈
        if not node_connections:
            return []
        
        max_connections = max(node_connections.values())
        threshold = max_connections * 0.8
        
        return [node_id for node_id, count in node_connections.items() if count >= threshold]

    def _analyze_security(self, nodes: List[Dict], edges: List[Dict]) -> Dict:
        """安全分析"""
        vulnerabilities = []
        score = 100
        
        # 检查外部接口节点
        for node in nodes:
            if node.get('type') == 'external_api':
                vulnerabilities.append({
                    "type": "external_exposure",
                    "node_id": node.get('id'),
                    "description": "外部API接口需要安全审查"
                })
                score -= 10
        
        # 检查数据库直连
        db_nodes = [node for node in nodes if 'database' in node.get('type', '').lower()]
        api_nodes = [node for node in nodes if 'api' in node.get('type', '').lower()]
        
        for edge in edges:
            if (edge.get('source') in [n.get('id') for n in api_nodes] and 
                edge.get('target') in [n.get('id') for n in db_nodes]):
                vulnerabilities.append({
                    "type": "direct_db_access",
                    "description": "API直接访问数据库，建议添加服务层"
                })
                score -= 15
        
        return {
            "score": max(score, 0),
            "vulnerabilities": vulnerabilities
        }

    def _execute_compliance_check(self, standard: str, data: Dict) -> Dict:
        """执行合规检查"""
        check_result = {
            "standard": standard,
            "status": "compliant",
            "issues": [],
            "recommendations": []
        }
        
        nodes = data.get('nodes', [])
        edges = data.get('edges', [])
        
        if standard == "security_baseline":
            # 安全基线检查
            if not any('security' in node.get('type', '').lower() for node in nodes):
                check_result['status'] = "warning"
                check_result['issues'].append("未发现安全组件")
                check_result['recommendations'].append("建议添加安全网关或防火墙组件")
        
        elif standard == "high_availability":
            # 高可用检查
            if len(nodes) < 3:
                check_result['status'] = "non_compliant"
                check_result['issues'].append("组件数量不足以支持高可用")
                check_result['recommendations'].append("建议至少部署3个核心组件实例")
        
        return check_result

    def _get_mime_type(self, format: str) -> str:
        """获取MIME类型"""
        mime_types = {
            "png": "image/png",
            "jpg": "image/jpeg",
            "svg": "image/svg+xml",
            "pdf": "application/pdf",
            "json": "application/json",
            "xml": "application/xml"
        }
        return mime_types.get(format, "application/octet-stream")

    def _convert_to_xml(self, diagram: Dict) -> str:
        """转换为XML格式"""
        # 简化的XML转换
        xml_data = f"""<?xml version="1.0" encoding="UTF-8"?>
<diagram id="{diagram['_id']}" name="{diagram['name']}">
    <metadata>
        <version>{diagram['metadata']['version']}</version>
        <created_at>{diagram['metadata']['created_at']}</created_at>
        <type>{diagram['type']}</type>
    </metadata>
    <nodes>
"""
        
        for node in diagram['data'].get('nodes', []):
            xml_data += f'        <node id="{node.get("id", "")}" type="{node.get("type", "")}" />\n'
        
        xml_data += "    </nodes>\n    <edges>\n"
        
        for edge in diagram['data'].get('edges', []):
            xml_data += f'        <edge source="{edge.get("source", "")}" target="{edge.get("target", "")}" />\n'
        
        xml_data += "    </edges>\n</diagram>"
        
        return xml_data


# 全局控制器实例将在app初始化时创建
architecture_controller = None

def init_architecture_controller(db_instance):
    """初始化架构控制器"""
    global architecture_controller
    architecture_controller = ArchitectureController(db_instance)
    return architecture_controller