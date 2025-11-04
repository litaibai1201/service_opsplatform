# -*- coding: utf-8 -*-
"""
@文件: permission_api.py
@說明: 權限API (Permission Service)
@時間: 2025-01-09
@作者: LiDong
"""

from flask import request, g
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from common.common_method import fail_response_result, response_result
from controllers.permission_controller import permission_controller
from serializes.response_serialize import (RspMsgDictSchema, RspMsgSchema)
from serializes.permission_serialize import (
    PermissionVerifySchema, PermissionVerifyBatchSchema, PermissionVerifyContextSchema,
    ContextRefreshSchema, ContextClearSchema, TeamRoleChangedEventSchema,
    ProjectMaintainerChangedEventSchema, UserPlatformRoleChangedEventSchema,
    CacheInvalidateSchema, CacheWarmUpSchema
)
from common.common_tools import CommonTools
from loggers import logger


blp = Blueprint("permission_api", __name__)


class BasePermissionView(MethodView):
    """權限API基類 - 統一控制器管理和錯誤處理"""
    
    def __init__(self):
        super().__init__()
        self.pc = permission_controller
    
    def _build_response(self, result, flag, success_msg="操作成功", error_prefix=""):
        """统一响应构建"""
        if flag:
            return response_result(content=result, msg=success_msg)
        error_msg = f"{error_prefix}{result}" if error_prefix else str(result)
        logger.warning(f"API操作失败: {error_msg}")
        return fail_response_result(msg=error_msg)


# ==================== 權限驗證API ====================

@blp.route("/permissions/verify")
class PermissionVerifyApi(BasePermissionView):
    """單個權限驗證API"""
    
    @blp.arguments(PermissionVerifySchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, json_data):
        """验证单个权限"""
        result, flag = self.pc.verify_permission(
            user_id=json_data['user_id'],
            resource_type=json_data['resource_type'],
            resource_id=json_data['resource_id'],
            action=json_data['action'],
            use_cache=json_data.get('use_cache', True)
        )
        return self._build_response(result, flag, "權限驗證完成")


@blp.route("/permissions/verify-batch")
class PermissionVerifyBatchApi(BasePermissionView):
    """批量權限驗證API"""
    
    @blp.arguments(PermissionVerifyBatchSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, json_data):
        """批量验证权限"""
        result, flag = self.pc.verify_permissions_batch(
            user_id=json_data['user_id'],
            permissions=json_data['permissions']
        )
        return self._build_response(result, flag, "批量權限驗證完成")


@blp.route("/permissions/verify-context")
class PermissionVerifyContextApi(BasePermissionView):
    """基於用戶上下文驗證權限API"""
    
    @blp.arguments(PermissionVerifyContextSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, json_data):
        """基于用户上下文验证权限"""
        result, flag = self.pc.verify_permission(
            user_id=json_data['user_id'],
            resource_type=json_data['resource_type'],
            resource_id=json_data['resource_id'],
            action=json_data['action'],
            use_cache=json_data.get('use_cache', True)
        )
        return self._build_response(result, flag, "基於上下文的權限驗證完成")


# ==================== 權限上下文管理API ====================

@blp.route("/permissions/context/<string:user_id>")
class PermissionContextApi(BasePermissionView):
    """用戶權限上下文API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, user_id):
        """获取用户权限上下文"""
        result, flag = self.pc.get_user_context(user_id=user_id)
        return self._build_response(result, flag, "獲取用戶權限上下文成功")


@blp.route("/permissions/context/refresh")
class PermissionContextRefreshApi(BasePermissionView):
    """刷新用戶權限上下文API"""
    
    @blp.arguments(ContextRefreshSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, json_data):
        """刷新用户权限上下文"""
        result, flag = self.pc.refresh_user_context(user_ids=json_data['user_ids'])
        return self._build_response(result, flag, "用戶權限上下文刷新完成")


@blp.route("/permissions/context/clear")
class PermissionContextClearApi(BasePermissionView):
    """清除權限上下文緩存API"""
    
    @blp.arguments(ContextClearSchema)
    @blp.response(200, RspMsgDictSchema)
    def delete(self, json_data):
        """清除权限上下文缓存"""
        result, flag = self.pc.clear_context_cache(
            user_ids=json_data.get('user_ids'),
            clear_all=json_data.get('clear_all', False)
        )
        return self._build_response(result, flag, "權限上下文緩存清除完成")


# ==================== 權限查詢API ====================

@blp.route("/permissions/user/<string:user_id>/teams")
class UserTeamPermissionsApi(BasePermissionView):
    """用戶群組角色API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, user_id):
        """获取用户的群组角色"""
        result, flag = self.pc.get_user_team_roles(user_id=user_id)
        return self._build_response(result, flag, "獲取用戶群組角色成功")


@blp.route("/permissions/user/<string:user_id>/projects")
class UserProjectPermissionsApi(BasePermissionView):
    """用戶項目維護權限API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, user_id):
        """获取用户的项目维护权限"""
        result, flag = self.pc.get_user_project_roles(user_id=user_id)
        return self._build_response(result, flag, "獲取用戶項目維護權限成功")


@blp.route("/permissions/effective/<string:user_id>")
class UserEffectivePermissionsApi(BasePermissionView):
    """用戶有效權限列表API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, user_id):
        """获取用户有效权限列表"""
        result, flag = self.pc.get_user_effective_permissions(user_id=user_id)
        return self._build_response(result, flag, "獲取用戶有效權限列表成功")


# ==================== 權限事件處理API ====================

@blp.route("/permissions/events/team-role-changed")
class TeamRoleChangedEventApi(BasePermissionView):
    """群組角色變更事件API"""
    
    @blp.arguments(TeamRoleChangedEventSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, json_data):
        """处理群组角色变更"""
        result, flag = self.pc.handle_permission_change_event(
            event_type='team_member_changed',
            user_id=json_data['user_id'],
            resource_type='team',
            resource_id=json_data['team_id'],
            old_role=json_data.get('old_role'),
            new_role=json_data.get('new_role'),
            changed_by=json_data['changed_by']
        )
        return self._build_response(result, flag, "群組角色變更事件處理完成")


@blp.route("/permissions/events/project-maintainer-changed")
class ProjectMaintainerChangedEventApi(BasePermissionView):
    """項目維護員變更事件API"""
    
    @blp.arguments(ProjectMaintainerChangedEventSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, json_data):
        """处理项目维护员变更"""
        result, flag = self.pc.handle_permission_change_event(
            event_type='project_maintainer_changed',
            user_id=json_data['user_id'],
            resource_type='project',
            resource_id=json_data['project_id'],
            old_role='maintainer' if json_data['action'] == 'removed' else None,
            new_role='maintainer' if json_data['action'] == 'added' else None,
            changed_by=json_data['changed_by']
        )
        return self._build_response(result, flag, "項目維護員變更事件處理完成")


@blp.route("/permissions/events/user-platform-role-changed")
class UserPlatformRoleChangedEventApi(BasePermissionView):
    """用戶平台角色變更事件API"""
    
    @blp.arguments(UserPlatformRoleChangedEventSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, json_data):
        """处理平台角色变更"""
        result, flag = self.pc.handle_permission_change_event(
            event_type='user_role_changed',
            user_id=json_data['user_id'],
            resource_type='platform',
            resource_id='system',
            old_role=json_data.get('old_role'),
            new_role=json_data['new_role'],
            changed_by=json_data['changed_by']
        )
        return self._build_response(result, flag, "用戶平台角色變更事件處理完成")


# ==================== 緩存管理API ====================

@blp.route("/permissions/cache/stats")
class PermissionCacheStatsApi(BasePermissionView):
    """權限緩存統計API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """获取缓存统计"""
        result, flag = self.pc.get_cache_stats()
        return self._build_response(result, flag, "獲取緩存統計信息成功")


@blp.route("/permissions/cache/invalidate")
class PermissionCacheInvalidateApi(BasePermissionView):
    """權限緩存失效API"""
    
    @blp.arguments(CacheInvalidateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, json_data):
        """使缓存失效"""
        result, flag = self.pc.invalidate_cache(
            user_ids=json_data.get('user_ids'),
            resource_type=json_data.get('resource_type'),
            resource_ids=json_data.get('resource_ids'),
            invalidate_all=json_data.get('invalidate_all', False)
        )
        return self._build_response(result, flag, "緩存失效操作完成")


@blp.route("/permissions/cache/warm-up")
class PermissionCacheWarmUpApi(BasePermissionView):
    """權限緩存預熱API"""
    
    @blp.arguments(CacheWarmUpSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, json_data):
        """预热缓存"""
        user_ids = json_data['user_ids']
        warmed_users = []
        failed_users = []
        
        for user_id in user_ids:
            result, flag = self.pc.get_user_context(user_id=user_id, force_refresh=True)
            if flag:
                warmed_users.append(user_id)
            else:
                failed_users.append({'user_id': user_id, 'error': result})
        
        result = {
            'warmed_users': warmed_users,
            'failed_users': failed_users,
            'total_requested': len(user_ids),
            'total_warmed': len(warmed_users),
            'total_failed': len(failed_users)
        }
        
        return response_result(content=result, msg="緩存預熱操作完成")


# ==================== 健康檢查API ====================

@blp.route("/permissions/health")
class PermissionHealthApi(BasePermissionView):
    """權限服務健康檢查API"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """权限服务健康检查"""
        try:
            from dbs.mysql_db import db
            
            # 检查数据库连接
            db.session.execute('SELECT 1')
            
            # 获取缓存统计
            cache_stats_result, cache_flag = self.pc.get_cache_stats()
            
            health_info = {
                'service': 'permission-service',
                'status': 'healthy',
                'timestamp': CommonTools.get_current_time(),
                'database': 'connected',
                'cache_stats': cache_stats_result if cache_flag else None
            }
            
            return response_result(content=health_info, msg="權限服務健康檢查通過")
            
        except Exception as e:
            logger.error(f"權限服務健康檢查失敗: {str(e)}")
            health_info = {
                'service': 'permission-service',
                'status': 'unhealthy',
                'timestamp': CommonTools.get_current_time(),
                'error': str(e)
            }
            return fail_response_result(content=health_info, msg=f"權限服務健康檢查失敗: {str(e)}")