# -*- coding: utf-8 -*-
"""
@文件: internal_api.py
@說明: 內部API (Architecture Service - 微服務間通信)
@時間: 2025-01-09
@作者: LiDong
"""

from flask.views import MethodView
from flask_smorest import Blueprint

from common.common_method import fail_response_result, response_result
from controllers.architecture_controller import architecture_controller
from serializes.response_serialize import RspMsgDictSchema, RspMsgSchema
from common.common_tools import CommonTools
from loggers import logger


blp = Blueprint("internal_api", __name__, url_prefix="/internal")


class BaseInternalView(MethodView):
    """內部API基類"""
    
    def __init__(self):
        super().__init__()
        self.ac = architecture_controller
    
    def _build_response(self, result, flag, success_msg="操作成功", error_prefix=""):
        """统一响应构建"""
        if flag:
            return response_result(content=result, msg=success_msg)
        error_msg = f"{error_prefix}{result}" if error_prefix else str(result)
        logger.warning(f"內部API操作失败: {error_msg}")
        return fail_response_result(msg=error_msg)


# ==================== 項目架構圖相關內部接口 ====================

@blp.route("/projects/<string:project_id>/diagrams/summary")
class InternalProjectDiagramsSummaryApi(BaseInternalView):
    """獲取項目架構圖摘要 - 內部接口"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, project_id):
        """获取项目架构图摘要"""
        try:
            # 获取项目的架构图列表
            result, flag = self.ac.get_diagrams_by_project(project_id, page=1, per_page=100)
            
            if not flag:
                return fail_response_result(msg=f"獲取項目架構圖失敗: {result}")
            
            diagrams = result.get('diagrams', [])
            
            # 统计信息
            total_diagrams = len(diagrams)
            type_stats = {}
            status_stats = {}
            recent_updates = []
            
            for diagram in diagrams:
                # 类型统计
                diagram_type = diagram.get('type', 'unknown')
                type_stats[diagram_type] = type_stats.get(diagram_type, 0) + 1
                
                # 状态统计
                validation_status = diagram.get('metadata', {}).get('validation_status', 'unknown')
                status_stats[validation_status] = status_stats.get(validation_status, 0) + 1
                
                # 最近更新
                if len(recent_updates) < 5:
                    recent_updates.append({
                        'id': diagram['_id'],
                        'name': diagram['name'],
                        'type': diagram_type,
                        'updated_at': diagram.get('metadata', {}).get('updated_at'),
                        'version': diagram.get('metadata', {}).get('version', 1)
                    })
            
            summary = {
                'project_id': project_id,
                'total_diagrams': total_diagrams,
                'type_distribution': type_stats,
                'status_distribution': status_stats,
                'recent_updates': recent_updates,
                'has_diagrams': total_diagrams > 0
            }
            
            return response_result(content=summary, msg="獲取項目架構圖摘要成功")
            
        except Exception as e:
            logger.error(f"內部API - 獲取項目架構圖摘要失敗: {str(e)}")
            return fail_response_result(msg=f"獲取項目架構圖摘要失敗: {str(e)}")


@blp.route("/projects/<string:project_id>/diagrams/count")
class InternalProjectDiagramsCountApi(BaseInternalView):
    """獲取項目架構圖數量 - 內部接口"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, project_id):
        """获取项目架构图数量"""
        try:
            # 直接查询数据库获取数量
            total_count = self.ac.db.diagrams.count_documents({"project_id": project_id})
            
            # 按类型分组统计
            pipeline = [
                {"$match": {"project_id": project_id}},
                {"$group": {"_id": "$type", "count": {"$sum": 1}}}
            ]
            
            type_counts = {}
            for item in self.ac.db.diagrams.aggregate(pipeline):
                type_counts[item['_id']] = item['count']
            
            count_info = {
                'project_id': project_id,
                'total_count': total_count,
                'type_counts': type_counts
            }
            
            return response_result(content=count_info, msg="獲取項目架構圖數量成功")
            
        except Exception as e:
            logger.error(f"內部API - 獲取項目架構圖數量失敗: {str(e)}")
            return fail_response_result(msg=f"獲取項目架構圖數量失敗: {str(e)}")


# ==================== 架構圖驗證相關內部接口 ====================

@blp.route("/diagrams/<string:diagram_id>/validation-status")
class InternalDiagramValidationStatusApi(BaseInternalView):
    """獲取架構圖驗證狀態 - 內部接口"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, diagram_id):
        """获取架构图验证状态"""
        try:
            result, flag = self.ac.get_diagram_detail(diagram_id)
            
            if not flag:
                return fail_response_result(msg=f"獲取架構圖失敗: {result}")
            
            validation_info = {
                'diagram_id': diagram_id,
                'diagram_name': result.get('name'),
                'validation_status': result.get('metadata', {}).get('validation_status', 'unknown'),
                'complexity_score': result.get('metadata', {}).get('complexity_score', 0),
                'version': result.get('metadata', {}).get('version', 1),
                'last_validated': result.get('metadata', {}).get('updated_at')
            }
            
            return response_result(content=validation_info, msg="獲取驗證狀態成功")
            
        except Exception as e:
            logger.error(f"內部API - 獲取架構圖驗證狀態失敗: {str(e)}")
            return fail_response_result(msg=f"獲取架構圖驗證狀態失敗: {str(e)}")


@blp.route("/diagrams/batch-validate")
class InternalDiagramBatchValidateApi(BaseInternalView):
    """批量驗證架構圖 - 內部接口"""
    
    @blp.arguments(schema={
        'type': 'object',
        'properties': {
            'diagram_ids': {'type': 'array', 'items': {'type': 'string'}},
            'validation_rules': {'type': 'array', 'items': {'type': 'string'}},
            'project_id': {'type': 'string'}
        }
    })
    @blp.response(200, RspMsgDictSchema)
    def post(self, json_data):
        """批量验证架构图"""
        try:
            diagram_ids = json_data.get('diagram_ids', [])
            validation_rules = json_data.get('validation_rules', [])
            project_id = json_data.get('project_id')
            
            if not diagram_ids and project_id:
                # 如果没有指定diagram_ids但有project_id，验证该项目的所有架构图
                project_result, project_flag = self.ac.get_diagrams_by_project(project_id, page=1, per_page=1000)
                if project_flag:
                    diagram_ids = [d['_id'] for d in project_result.get('diagrams', [])]
            
            validation_results = []
            
            for diagram_id in diagram_ids:
                try:
                    result, flag = self.ac.validate_diagram(diagram_id, validation_rules)
                    if flag:
                        validation_results.append({
                            'diagram_id': diagram_id,
                            'validation_status': result.get('validation_status'),
                            'errors': result.get('errors', []),
                            'warnings': result.get('warnings', []),
                            'success': True
                        })
                    else:
                        validation_results.append({
                            'diagram_id': diagram_id,
                            'error': result,
                            'success': False
                        })
                except Exception as e:
                    validation_results.append({
                        'diagram_id': diagram_id,
                        'error': str(e),
                        'success': False
                    })
            
            # 统计结果
            success_count = sum(1 for r in validation_results if r.get('success'))
            error_count = len(validation_results) - success_count
            
            batch_result = {
                'total_validated': len(validation_results),
                'success_count': success_count,
                'error_count': error_count,
                'validation_results': validation_results,
                'validated_at': CommonTools.get_current_time()
            }
            
            return response_result(content=batch_result, msg="批量驗證完成")
            
        except Exception as e:
            logger.error(f"內部API - 批量驗證架構圖失敗: {str(e)}")
            return fail_response_result(msg=f"批量驗證失敗: {str(e)}")


# ==================== 用戶架構圖相關內部接口 ====================

@blp.route("/users/<string:user_id>/diagrams/summary")
class InternalUserDiagramsSummaryApi(BaseInternalView):
    """獲取用戶架構圖摘要 - 內部接口"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, user_id):
        """获取用户架构图摘要"""
        try:
            # 查询用户创建的架构图
            created_diagrams = list(self.ac.db.diagrams.find(
                {"metadata.created_by": user_id},
                {"name": 1, "type": 1, "project_id": 1, "metadata": 1}
            ))
            
            # 查询用户最后修改的架构图
            modified_diagrams = list(self.ac.db.diagrams.find(
                {"metadata.last_modified_by": user_id, "metadata.created_by": {"$ne": user_id}},
                {"name": 1, "type": 1, "project_id": 1, "metadata": 1}
            ))
            
            # 转换ObjectId为字符串
            for diagram in created_diagrams + modified_diagrams:
                diagram['_id'] = str(diagram['_id'])
            
            # 统计信息
            summary = {
                'user_id': user_id,
                'created_diagrams_count': len(created_diagrams),
                'modified_diagrams_count': len(modified_diagrams),
                'total_involved_diagrams': len(created_diagrams) + len(modified_diagrams),
                'created_diagrams': created_diagrams[:10],  # 最多返回10个
                'recently_modified': modified_diagrams[:5],  # 最多返回5个
                'type_distribution': {}
            }
            
            # 类型分布统计
            for diagram in created_diagrams:
                diagram_type = diagram.get('type', 'unknown')
                summary['type_distribution'][diagram_type] = summary['type_distribution'].get(diagram_type, 0) + 1
            
            return response_result(content=summary, msg="獲取用戶架構圖摘要成功")
            
        except Exception as e:
            logger.error(f"內部API - 獲取用戶架構圖摘要失敗: {str(e)}")
            return fail_response_result(msg=f"獲取用戶架構圖摘要失敗: {str(e)}")


# ==================== 架構圖分析相關內部接口 ====================

@blp.route("/diagrams/complexity-analysis")
class InternalDiagramComplexityAnalysisApi(BaseInternalView):
    """架構圖複雜度分析 - 內部接口"""
    
    @blp.arguments(schema={
        'type': 'object',
        'properties': {
            'project_ids': {'type': 'array', 'items': {'type': 'string'}},
            'threshold': {'type': 'number', 'minimum': 0, 'maximum': 100}
        }
    })
    @blp.response(200, RspMsgDictSchema)
    def post(self, json_data):
        """分析项目架构图复杂度"""
        try:
            project_ids = json_data.get('project_ids', [])
            threshold = json_data.get('threshold', 70)
            
            analysis_results = []
            
            for project_id in project_ids:
                try:
                    # 获取项目的所有架构图
                    project_result, project_flag = self.ac.get_diagrams_by_project(project_id, page=1, per_page=1000)
                    
                    if not project_flag:
                        continue
                    
                    diagrams = project_result.get('diagrams', [])
                    complex_diagrams = []
                    total_complexity = 0
                    
                    for diagram in diagrams:
                        complexity_score = diagram.get('metadata', {}).get('complexity_score', 0)
                        total_complexity += complexity_score
                        
                        if complexity_score > threshold:
                            complex_diagrams.append({
                                'id': diagram['_id'],
                                'name': diagram['name'],
                                'type': diagram['type'],
                                'complexity_score': complexity_score
                            })
                    
                    avg_complexity = total_complexity / len(diagrams) if diagrams else 0
                    
                    project_analysis = {
                        'project_id': project_id,
                        'total_diagrams': len(diagrams),
                        'average_complexity': round(avg_complexity, 2),
                        'complex_diagrams_count': len(complex_diagrams),
                        'complex_diagrams': complex_diagrams,
                        'complexity_threshold': threshold
                    }
                    
                    analysis_results.append(project_analysis)
                    
                except Exception as e:
                    logger.warning(f"分析項目 {project_id} 複雜度失敗: {str(e)}")
                    continue
            
            result = {
                'analysis_results': analysis_results,
                'total_projects_analyzed': len(analysis_results),
                'analyzed_at': CommonTools.get_current_time()
            }
            
            return response_result(content=result, msg="複雜度分析完成")
            
        except Exception as e:
            logger.error(f"內部API - 架構圖複雜度分析失敗: {str(e)}")
            return fail_response_result(msg=f"複雜度分析失敗: {str(e)}")


# ==================== 系統統計相關內部接口 ====================

@blp.route("/statistics/system-overview")
class InternalSystemStatisticsApi(BaseInternalView):
    """系統概覽統計 - 內部接口"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """获取系统级架构图统计"""
        try:
            # 总体统计
            total_diagrams = self.ac.db.diagrams.count_documents({})
            total_versions = self.ac.db.diagram_versions.count_documents({})
            total_comments = self.ac.db.diagram_comments.count_documents({})
            
            # 按类型统计
            type_pipeline = [
                {"$group": {"_id": "$type", "count": {"$sum": 1}}}
            ]
            type_stats = {item['_id']: item['count'] for item in self.ac.db.diagrams.aggregate(type_pipeline)}
            
            # 按验证状态统计
            status_pipeline = [
                {"$group": {"_id": "$metadata.validation_status", "count": {"$sum": 1}}}
            ]
            status_stats = {item['_id']: item['count'] for item in self.ac.db.diagrams.aggregate(status_pipeline)}
            
            # 复杂度分布
            complexity_pipeline = [
                {
                    "$bucket": {
                        "groupBy": "$metadata.complexity_score",
                        "boundaries": [0, 30, 60, 80, 100],
                        "default": "unknown",
                        "output": {"count": {"$sum": 1}}
                    }
                }
            ]
            complexity_distribution = {}
            for item in self.ac.db.diagrams.aggregate(complexity_pipeline):
                if item['_id'] == 0:
                    complexity_distribution['low'] = item['count']
                elif item['_id'] == 30:
                    complexity_distribution['medium'] = item['count']
                elif item['_id'] == 60:
                    complexity_distribution['high'] = item['count']
                elif item['_id'] == 80:
                    complexity_distribution['very_high'] = item['count']
                else:
                    complexity_distribution['unknown'] = item.get('count', 0)
            
            # 活跃度统计 (最近30天)
            from datetime import datetime, timedelta
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            
            recent_active = self.ac.db.diagrams.count_documents({
                "metadata.updated_at": {"$gte": thirty_days_ago}
            })
            
            system_stats = {
                'overview': {
                    'total_diagrams': total_diagrams,
                    'total_versions': total_versions,
                    'total_comments': total_comments,
                    'recent_active_diagrams': recent_active
                },
                'distribution': {
                    'by_type': type_stats,
                    'by_validation_status': status_stats,
                    'by_complexity': complexity_distribution
                },
                'health_metrics': {
                    'average_complexity': self._calculate_average_complexity(),
                    'validation_pass_rate': self._calculate_validation_pass_rate(status_stats),
                    'activity_score': min(recent_active / max(total_diagrams, 1) * 100, 100)
                },
                'generated_at': CommonTools.get_current_time()
            }
            
            return response_result(content=system_stats, msg="獲取系統統計信息成功")
            
        except Exception as e:
            logger.error(f"內部API - 獲取系統統計信息失敗: {str(e)}")
            return fail_response_result(msg=f"獲取系統統計信息失敗: {str(e)}")


# ==================== 健康檢查接口 ====================

@blp.route("/health")
class InternalHealthCheckApi(BaseInternalView):
    """健康檢查接口"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """服务健康检查"""
        try:
            # 检查MongoDB连接
            self.ac.db.diagrams.count_documents({}, limit=1)
            
            # 检查基本功能
            diagram_count = self.ac.db.diagrams.count_documents({})
            version_count = self.ac.db.diagram_versions.count_documents({})
            comment_count = self.ac.db.diagram_comments.count_documents({})
            
            health_info = {
                'service': 'architecture-service',
                'status': 'healthy',
                'timestamp': CommonTools.get_current_time(),
                'database': 'connected',
                'collections': {
                    'diagrams': diagram_count,
                    'versions': version_count,
                    'comments': comment_count
                },
                'features': {
                    'diagram_management': 'available',
                    'version_control': 'available',
                    'validation_analysis': 'available',
                    'export_functionality': 'available',
                    'collaboration': 'available'
                }
            }
            
            return response_result(content=health_info, msg="架構服務健康檢查通過")
            
        except Exception as e:
            logger.error(f"架構服務健康檢查失敗: {str(e)}")
            health_info = {
                'service': 'architecture-service',
                'status': 'unhealthy',
                'timestamp': CommonTools.get_current_time(),
                'error': str(e)
            }
            return fail_response_result(content=health_info, msg=f"架構服務健康檢查失敗: {str(e)}")


# ==================== 輔助方法 ====================

    def _calculate_average_complexity(self) -> float:
        """计算平均复杂度"""
        try:
            pipeline = [
                {"$group": {"_id": None, "avg_complexity": {"$avg": "$metadata.complexity_score"}}}
            ]
            result = list(self.ac.db.diagrams.aggregate(pipeline))
            return round(result[0]['avg_complexity'], 2) if result else 0.0
        except Exception:
            return 0.0

    def _calculate_validation_pass_rate(self, status_stats: dict) -> float:
        """计算验证通过率"""
        try:
            total = sum(status_stats.values())
            valid_count = status_stats.get('valid', 0)
            return round(valid_count / max(total, 1) * 100, 2)
        except Exception:
            return 0.0