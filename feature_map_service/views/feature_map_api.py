# -*- coding: utf-8 -*-
"""
@文件: feature_map_api.py
@說明: 功能導圖API (Feature Map Service)
@時間: 2025-01-09
@作者: LiDong
"""

from flask import request, g
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from common.common_method import fail_response_result, response_result
from controllers.feature_map_controller import feature_map_controller
from serializes.response_serialize import RspMsgDictSchema, RspMsgSchema
from serializes.feature_map_serialize import (
    FeatureMapCreateSchema, FeatureMapUpdateSchema, FeatureMapQuerySchema,
    FeatureMapDuplicateSchema, NodeCreateSchema, NodeUpdateSchema, NodeMoveSchema,
    NodeAssignSchema, DependencyCreateSchema, ExportSchema, GanttExportSchema,
    RoadmapExportSchema, SyncJiraSchema, SyncGithubSchema, FeatureMapListResponseSchema,
    FeatureMapResponseSchema, NodeResponseSchema, DependencyResponseSchema,
    DependencyGraphResponseSchema, ProgressReportResponseSchema, VelocityResponseSchema,
    BurndownResponseSchema, ExportResponseSchema, SyncStatusResponseSchema, HistoryResponseSchema
)
from common.common_tools import CommonTools
from loggers import logger


blp = Blueprint("feature_map_api", __name__)


class BaseFeatureMapView(MethodView):
    """功能導圖API基類 - 統一控制器管理和錯誤處理"""
    
    def __init__(self):
        super().__init__()
        # 使用單例模式的控制器，避免重複初始化
        if not hasattr(g, 'feature_map_controller'):
            g.feature_map_controller = feature_map_controller
        self.fmc = g.feature_map_controller
    
    def _build_response(self, result, flag, success_msg="操作成功", error_prefix=""):
        """統一響應構建"""
        if flag:
            return response_result(content=result, msg=success_msg)
        error_msg = f"{error_prefix}{result}" if error_prefix else str(result)
        logger.warning(f"API操作失敗: {error_msg}")
        return fail_response_result(msg=error_msg)


# ==================== 功能導圖管理API ====================

@blp.route("/projects/<project_id>/feature-maps")
class ProjectFeatureMapsApi(BaseFeatureMapView):
    """項目功能導圖列表API"""

    @jwt_required()
    @blp.arguments(FeatureMapQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params, project_id):
        """獲取功能導圖列表"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            page = query_params.get('page', 1)
            limit = query_params.get('limit', 20)
            map_type = query_params.get('type')
            
            result, flag = self.fmc.get_project_feature_maps(project_id, map_type, page, limit)
            return self._build_response(result, flag, "獲取功能導圖列表成功")
            
        except Exception as e:
            logger.error(f"獲取功能導圖列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(FeatureMapCreateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, project_id):
        """創建功能導圖"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.create_feature_map(
                project_id=project_id,
                name=payload['name'],
                description=payload.get('description'),
                map_type=payload['type'],
                created_by=current_user_id,
                mind_map=payload.get('mind_map')
            )
            return self._build_response(result, flag, "創建功能導圖成功")
            
        except Exception as e:
            logger.error(f"創建功能導圖異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/feature-maps/<map_id>")
class FeatureMapDetailApi(BaseFeatureMapView):
    """功能導圖詳情API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, map_id):
        """獲取功能導圖詳情"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.get_feature_map(map_id)
            return self._build_response(result, flag, "獲取功能導圖詳情成功")
            
        except Exception as e:
            logger.error(f"獲取功能導圖詳情異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(FeatureMapUpdateSchema)
    @blp.response(200, RspMsgDictSchema)
    def put(self, payload, map_id):
        """更新功能導圖"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.update_feature_map(map_id, payload, current_user_id)
            return self._build_response(result, flag, "更新功能導圖成功")
            
        except Exception as e:
            logger.error(f"更新功能導圖異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def delete(self, map_id):
        """刪除功能導圖"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.delete_feature_map(map_id, current_user_id)
            return self._build_response(result, flag, "刪除功能導圖成功")
            
        except Exception as e:
            logger.error(f"刪除功能導圖異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/feature-maps/<map_id>/duplicate")
class FeatureMapDuplicateApi(BaseFeatureMapView):
    """複製功能導圖API"""

    @jwt_required()
    @blp.arguments(FeatureMapDuplicateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, map_id):
        """複製功能導圖"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.duplicate_feature_map(
                map_id, payload['new_name'], current_user_id
            )
            return self._build_response(result, flag, "複製功能導圖成功")
            
        except Exception as e:
            logger.error(f"複製功能導圖異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 節點操作API ====================

@blp.route("/feature-maps/<map_id>/nodes")
class FeatureMapNodesApi(BaseFeatureMapView):
    """功能導圖節點API"""

    @jwt_required()
    @blp.arguments(NodeCreateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, map_id):
        """添加節點"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            parent_node_id = payload.pop('parent_node_id')
            result, flag = self.fmc.add_node(map_id, parent_node_id, payload, current_user_id)
            return self._build_response(result, flag, "添加節點成功")
            
        except Exception as e:
            logger.error(f"添加節點異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/feature-maps/<map_id>/nodes/<node_id>")
class FeatureMapNodeDetailApi(BaseFeatureMapView):
    """功能導圖節點詳情API"""

    @jwt_required()
    @blp.arguments(NodeUpdateSchema)
    @blp.response(200, RspMsgDictSchema)
    def put(self, payload, map_id, node_id):
        """更新節點"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.update_node(map_id, node_id, payload, current_user_id)
            return self._build_response(result, flag, "更新節點成功")
            
        except Exception as e:
            logger.error(f"更新節點異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def delete(self, map_id, node_id):
        """刪除節點"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.delete_node(map_id, node_id, current_user_id)
            return self._build_response(result, flag, "刪除節點成功")
            
        except Exception as e:
            logger.error(f"刪除節點異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/feature-maps/<map_id>/nodes/<node_id>/move")
class FeatureMapNodeMoveApi(BaseFeatureMapView):
    """移動節點API"""

    @jwt_required()
    @blp.arguments(NodeMoveSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, map_id, node_id):
        """移動節點"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.move_node(
                map_id, node_id, payload['new_parent_id'], 
                payload.get('position', -1), current_user_id
            )
            return self._build_response(result, flag, "移動節點成功")
            
        except Exception as e:
            logger.error(f"移動節點異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/feature-maps/<map_id>/nodes/<node_id>/assign")
class FeatureMapNodeAssignApi(BaseFeatureMapView):
    """分配節點API"""

    @jwt_required()
    @blp.arguments(NodeAssignSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, map_id, node_id):
        """分配負責人"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.assign_node(
                map_id, node_id, payload['assignee'], current_user_id
            )
            return self._build_response(result, flag, "分配負責人成功")
            
        except Exception as e:
            logger.error(f"分配負責人異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 依賴管理API ====================

@blp.route("/feature-maps/<map_id>/dependencies")
class FeatureMapDependenciesApi(BaseFeatureMapView):
    """功能導圖依賴關係API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, map_id):
        """獲取依賴關係列表"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.get_dependencies(map_id)
            return self._build_response(result, flag, "獲取依賴關係成功")
            
        except Exception as e:
            logger.error(f"獲取依賴關係異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(DependencyCreateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, map_id):
        """創建依賴關係"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.create_dependency(
                map_id,
                payload['source_feature_id'],
                payload['target_feature_id'],
                payload['dependency_type'],
                payload.get('description', '')
            )
            return self._build_response(result, flag, "創建依賴關係成功")
            
        except Exception as e:
            logger.error(f"創建依賴關係異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/dependencies/<dependency_id>")
class DependencyDetailApi(BaseFeatureMapView):
    """依賴關係詳情API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def delete(self, dependency_id):
        """刪除依賴關係"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.delete_dependency(dependency_id)
            return self._build_response(result, flag, "刪除依賴關係成功")
            
        except Exception as e:
            logger.error(f"刪除依賴關係異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/feature-maps/<map_id>/dependency-graph")
class FeatureMapDependencyGraphApi(BaseFeatureMapView):
    """功能導圖依賴圖API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, map_id):
        """獲取依賴圖"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.get_dependency_graph(map_id)
            return self._build_response(result, flag, "獲取依賴圖成功")
            
        except Exception as e:
            logger.error(f"獲取依賴圖異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 統計和報告API ====================

@blp.route("/feature-maps/<map_id>/metrics")
class FeatureMapMetricsApi(BaseFeatureMapView):
    """功能導圖指標API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, map_id):
        """獲取項目指標"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.get_metrics(map_id)
            return self._build_response(result, flag, "獲取項目指標成功")
            
        except Exception as e:
            logger.error(f"獲取項目指標異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/feature-maps/<map_id>/progress")
class FeatureMapProgressApi(BaseFeatureMapView):
    """功能導圖進度API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, map_id):
        """獲取進度報告"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.get_progress_report(map_id)
            return self._build_response(result, flag, "獲取進度報告成功")
            
        except Exception as e:
            logger.error(f"獲取進度報告異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/feature-maps/<map_id>/velocity")
class FeatureMapVelocityApi(BaseFeatureMapView):
    """功能導圖速度API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, map_id):
        """獲取開發速度"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.get_velocity(map_id)
            return self._build_response(result, flag, "獲取開發速度成功")
            
        except Exception as e:
            logger.error(f"獲取開發速度異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/feature-maps/<map_id>/burndown")
class FeatureMapBurndownApi(BaseFeatureMapView):
    """功能導圖燃盡圖API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, map_id):
        """獲取燃盡圖數據"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.get_burndown(map_id)
            return self._build_response(result, flag, "獲取燃盡圖數據成功")
            
        except Exception as e:
            logger.error(f"獲取燃盡圖數據異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 導出功能API ====================

@blp.route("/feature-maps/<map_id>/export")
class FeatureMapExportApi(BaseFeatureMapView):
    """功能導圖導出API"""

    @jwt_required()
    @blp.arguments(ExportSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, map_id):
        """導出為其他格式"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            export_format = payload['format']
            options = {
                'include_completed': payload.get('include_completed', True),
                'include_cancelled': payload.get('include_cancelled', False)
            }
            
            result, flag = self.fmc.export_feature_map(map_id, export_format, options)
            return self._build_response(result, flag, "導出功能導圖成功")
            
        except Exception as e:
            logger.error(f"導出功能導圖異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/feature-maps/<map_id>/export/gantt")
class FeatureMapGanttExportApi(BaseFeatureMapView):
    """功能導圖甘特圖導出API"""

    @jwt_required()
    @blp.arguments(GanttExportSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, map_id):
        """導出甘特圖"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            export_format = payload.get('format', 'png')
            options = {
                'start_date': payload.get('start_date'),
                'end_date': payload.get('end_date'),
                'show_dependencies': payload.get('show_dependencies', True)
            }
            
            result, flag = self.fmc.export_gantt(map_id, export_format, options)
            return self._build_response(result, flag, "導出甘特圖成功")
            
        except Exception as e:
            logger.error(f"導出甘特圖異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/feature-maps/<map_id>/export/roadmap")
class FeatureMapRoadmapExportApi(BaseFeatureMapView):
    """功能導圖路線圖導出API"""

    @jwt_required()
    @blp.arguments(RoadmapExportSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, map_id):
        """導出產品路線圖"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            export_format = payload.get('format', 'png')
            options = {
                'time_period': payload.get('time_period', 'quarter'),
                'show_milestones': payload.get('show_milestones', True)
            }
            
            result, flag = self.fmc.export_roadmap(map_id, export_format, options)
            return self._build_response(result, flag, "導出產品路線圖成功")
            
        except Exception as e:
            logger.error(f"導出產品路線圖異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 集成功能API ====================

@blp.route("/feature-maps/<map_id>/sync-jira")
class FeatureMapSyncJiraApi(BaseFeatureMapView):
    """功能導圖Jira同步API"""

    @jwt_required()
    @blp.arguments(SyncJiraSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, map_id):
        """同步到Jira"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.sync_jira(
                map_id,
                payload['project_key'],
                payload.get('sync_type', 'two_way'),
                payload.get('issue_types', ['Epic', 'Story', 'Task', 'Bug'])
            )
            return self._build_response(result, flag, "同步Jira成功")
            
        except Exception as e:
            logger.error(f"同步Jira異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/feature-maps/<map_id>/sync-github")
class FeatureMapSyncGithubApi(BaseFeatureMapView):
    """功能導圖GitHub同步API"""

    @jwt_required()
    @blp.arguments(SyncGithubSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, map_id):
        """同步到GitHub"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.sync_github(
                map_id,
                payload['repo'],
                payload.get('sync_type', 'import'),
                payload.get('include_issues', True),
                payload.get('include_milestones', True)
            )
            return self._build_response(result, flag, "同步GitHub成功")
            
        except Exception as e:
            logger.error(f"同步GitHub異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/feature-maps/<map_id>/sync-status")
class FeatureMapSyncStatusApi(BaseFeatureMapView):
    """功能導圖同步狀態API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, map_id):
        """獲取同步狀態"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            result, flag = self.fmc.get_sync_status(map_id)
            return self._build_response(result, flag, "獲取同步狀態成功")
            
        except Exception as e:
            logger.error(f"獲取同步狀態異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 健康檢查API ====================

@blp.route("/health")
class FeatureMapHealthApi(MethodView):
    """功能導圖服務健康檢查API"""

    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """健康檢查"""
        health_data = {
            'status': 'healthy',
            'service': 'feature-map-service',
            'timestamp': CommonTools.get_now(),
            'version': '1.0.0'
        }
        
        issues = []
        
        # 檢查數據庫連接
        try:
            from dbs.mongodb import get_db
            db = get_db()
            db.admin.command('ping')
            health_data['database'] = 'connected'
        except Exception as db_error:
            logger.error(f"數據庫連接檢查失敗: {str(db_error)}")
            health_data['database'] = f'error: {str(db_error)}'
            issues.append(f'數據庫: {str(db_error)}')
        
        # 檢查控制器狀態
        try:
            if feature_map_controller is not None:
                health_data['controller'] = 'initialized'
            else:
                health_data['controller'] = 'not_initialized'
                issues.append('控制器: 未初始化')
        except Exception as controller_error:
            logger.error(f"控制器檢查失敗: {str(controller_error)}")
            health_data['controller'] = f'error: {str(controller_error)}'
            issues.append(f'控制器: {str(controller_error)}')
        
        # 判斷整體健康狀態
        if issues:
            health_data['status'] = 'unhealthy'
            health_data['issues'] = issues
            return fail_response_result(content=health_data, msg="服務異常")
        else:
            return response_result(content=health_data, msg="服務正常")


# 錯誤處理器
@blp.errorhandler(401)
def handle_unauthorized(error):
    """處理401未授權錯誤"""
    return fail_response_result(msg="未授權訪問，請先登錄")


@blp.errorhandler(403)
def handle_forbidden(error):
    """處理403禁止訪問錯誤"""
    return fail_response_result(msg="禁止訪問，權限不足")


@blp.errorhandler(422)
def handle_validation_error(error):
    """處理422驗證錯誤"""
    return fail_response_result(msg="請求參數驗證失敗")


@blp.errorhandler(500)
def handle_internal_error(error):
    """處理500內部錯誤"""
    logger.error(f"內部服務器錯誤: {str(error)}")
    return fail_response_result(msg="內部服務器錯誤")


# 請求前處理
@blp.before_request
def before_request():
    """請求前處理"""
    # 記錄API訪問日誌（排除健康檢查）
    if request.endpoint and not request.endpoint.endswith('health'):
        logger.info(f"API訪問: {request.method} {request.path} - IP: {request.remote_addr}")


# 響應後處理
@blp.after_request
def after_request(response):
    """響應後處理"""
    # 添加安全頭
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # 添加CORS頭
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    
    return response