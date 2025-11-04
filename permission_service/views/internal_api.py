# -*- coding: utf-8 -*-
"""
@文件: internal_api.py
@說明: 內部API (Permission Service - 微服務間通信)
@時間: 2025-01-09
@作者: LiDong
"""

from flask.views import MethodView
from flask_smorest import Blueprint

from common.common_method import fail_response_result, response_result
from controllers.permission_controller import permission_controller
from serializes.response_serialize import RspMsgDictSchema, RspMsgSchema
from serializes.permission_serialize import (
    InternalPermissionVerifySchema, InternalBuildContextSchema, InternalNotifyChangeSchema
)
from common.common_tools import CommonTools
from loggers import logger


blp = Blueprint("internal_api", __name__, url_prefix="/internal")


class BaseInternalView(MethodView):
    """內部API基類"""
    
    def __init__(self):
        super().__init__()
        self.pc = permission_controller
    
    def _build_response(self, result, flag, success_msg="操作成功", error_prefix=""):
        """统一响应构建"""
        if flag:
            return response_result(content=result, msg=success_msg)
        error_msg = f"{error_prefix}{result}" if error_prefix else str(result)
        logger.warning(f"內部API操作失败: {error_msg}")
        return fail_response_result(msg=error_msg)


# ==================== 內部權限驗證接口 ====================

@blp.route("/permissions/verify")
class InternalPermissionVerifyApi(BaseInternalView):
    """內部權限驗證接口"""
    
    @blp.arguments(InternalPermissionVerifySchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, json_data):
        """内部权限验证"""
        try:
            result, flag = self.pc.verify_permission(
                user_id=json_data['user_id'],
                resource_type=json_data['resource_type'],
                resource_id=json_data['resource_id'],
                action=json_data['action'],
                use_cache=True
            )
            
            if flag:
                # 为内部API优化响应格式
                internal_result = {
                    'user_id': json_data['user_id'],
                    'resource_type': json_data['resource_type'],
                    'resource_id': json_data['resource_id'],
                    'action': json_data['action'],
                    'has_permission': result.get('has_permission', False),
                    'verification_source': result.get('source', 'unknown'),
                    'context': json_data.get('context')
                }
                return response_result(content=internal_result, msg="內部權限驗證完成")
            
            return self._build_response(result, flag, "內部權限驗證完成")
            
        except Exception as e:
            logger.error(f"內部權限驗證失敗: {str(e)}")
            return fail_response_result(msg=f"內部權限驗證失敗: {str(e)}")


@blp.route("/permissions/verify-batch")
class InternalPermissionVerifyBatchApi(BaseInternalView):
    """內部批量權限驗證接口"""
    
    @blp.arguments(schema={
        'type': 'object',
        'properties': {
            'user_id': {'type': 'string'},
            'permissions': {
                'type': 'array',
                'items': {
                    'type': 'object',
                    'properties': {
                        'resource_type': {'type': 'string'},
                        'resource_id': {'type': 'string'},
                        'action': {'type': 'string'}
                    },
                    'required': ['resource_type', 'resource_id', 'action']
                }
            }
        },
        'required': ['user_id', 'permissions']
    })
    @blp.response(200, RspMsgDictSchema)
    def post(self, json_data):
        """内部批量权限验证"""
        try:
            result, flag = self.pc.verify_permissions_batch(
                user_id=json_data['user_id'],
                permissions=json_data['permissions']
            )
            
            if flag:
                # 为内部API简化响应格式
                internal_result = {
                    'user_id': json_data['user_id'],
                    'permissions': result.get('results', []),
                    'total_verified': result.get('total', 0)
                }
                return response_result(content=internal_result, msg="內部批量權限驗證完成")
            
            return self._build_response(result, flag, "內部批量權限驗證完成")
            
        except Exception as e:
            logger.error(f"內部批量權限驗證失敗: {str(e)}")
            return fail_response_result(msg=f"內部批量權限驗證失敗: {str(e)}")


# ==================== 權限上下文構建接口 ====================

@blp.route("/permissions/build-context")
class InternalBuildContextApi(BaseInternalView):
    """構建用戶權限上下文接口"""
    
    @blp.arguments(InternalBuildContextSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, json_data):
        """构建用户权限上下文"""
        try:
            result, flag = self.pc.get_user_context(
                user_id=json_data['user_id'],
                force_refresh=json_data.get('force_refresh', False)
            )
            
            if flag:
                # 为内部API优化响应格式
                internal_result = {
                    'user_id': json_data['user_id'],
                    'context': result,
                    'force_refresh': json_data.get('force_refresh', False)
                }
                return response_result(content=internal_result, msg="用戶權限上下文構建完成")
            
            return self._build_response(result, flag, "用戶權限上下文構建完成")
            
        except Exception as e:
            logger.error(f"構建用戶權限上下文失敗: {str(e)}")
            return fail_response_result(msg=f"構建用戶權限上下文失敗: {str(e)}")


# ==================== 權限變更通知接口 ====================

@blp.route("/permissions/notify-change")
class InternalNotifyChangeApi(BaseInternalView):
    """權限變更通知接口"""
    
    @blp.arguments(InternalNotifyChangeSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, json_data):
        """通知权限变更"""
        try:
            result, flag = self.pc.handle_permission_change_event(
                event_type=json_data['event_type'],
                user_id=json_data['user_id'],
                resource_type=json_data['resource_type'],
                resource_id=json_data['resource_id'],
                old_role=json_data.get('old_role'),
                new_role=json_data.get('new_role'),
                changed_by=json_data['changed_by'],
                metadata=json_data.get('metadata')
            )
            
            if flag:
                logger.info(f"權限變更通知處理成功 - 事件類型: {json_data['event_type']}, 用戶: {json_data['user_id']}")
                return response_result(msg="權限變更通知處理成功")
            
            return self._build_response(result, flag, "權限變更通知處理完成")
            
        except Exception as e:
            logger.error(f"權限變更通知處理失敗: {str(e)}")
            return fail_response_result(msg=f"權限變更通知處理失敗: {str(e)}")


# ==================== 用戶權限快速查詢接口 ====================

@blp.route("/permissions/user/<string:user_id>/quick-check")
class InternalUserQuickPermissionCheckApi(BaseInternalView):
    """用戶權限快速檢查接口"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, user_id):
        """快速检查用户权限状态"""
        try:
            # 获取用户上下文
            context_result, context_flag = self.pc.get_user_context(user_id)
            
            if not context_flag:
                return fail_response_result(msg=f"獲取用戶權限上下文失敗: {context_result}")
            
            # 构建快速检查结果
            quick_check_result = {
                'user_id': user_id,
                'is_platform_admin': context_result.get('platform_role') == 'platform_admin',
                'platform_role': context_result.get('platform_role'),
                'team_count': len(context_result.get('team_roles', {})),
                'project_maintainer_count': len(context_result.get('project_maintainer_roles', {})),
                'has_team_admin_role': any(role in ['owner', 'admin'] for role in context_result.get('team_roles', {}).values()),
                'context_cached_at': context_result.get('cached_at')
            }
            
            return response_result(content=quick_check_result, msg="用戶權限快速檢查完成")
            
        except Exception as e:
            logger.error(f"用戶權限快速檢查失敗: {str(e)}")
            return fail_response_result(msg=f"用戶權限快速檢查失敗: {str(e)}")


@blp.route("/permissions/user/<string:user_id>/context-summary")
class InternalUserContextSummaryApi(BaseInternalView):
    """用戶上下文摘要接口"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self, user_id):
        """获取用户权限上下文摘要"""
        try:
            # 获取用户上下文
            context_result, context_flag = self.pc.get_user_context(user_id)
            
            if not context_flag:
                return fail_response_result(msg=f"獲取用戶權限上下文失敗: {context_result}")
            
            # 统计信息
            team_roles = context_result.get('team_roles', {})
            project_roles = context_result.get('project_maintainer_roles', {})
            
            # 按角色分组统计
            team_role_stats = {}
            for role in team_roles.values():
                team_role_stats[role] = team_role_stats.get(role, 0) + 1
            
            summary = {
                'user_id': user_id,
                'platform_role': context_result.get('platform_role'),
                'team_summary': {
                    'total_teams': len(team_roles),
                    'role_distribution': team_role_stats,
                    'team_list': list(team_roles.keys())
                },
                'project_summary': {
                    'total_maintained_projects': len(project_roles),
                    'project_list': list(project_roles.keys())
                },
                'context_info': {
                    'cached_at': context_result.get('cached_at'),
                    'last_updated': CommonTools.get_current_time()
                }
            }
            
            return response_result(content=summary, msg="用戶權限上下文摘要獲取成功")
            
        except Exception as e:
            logger.error(f"獲取用戶權限上下文摘要失敗: {str(e)}")
            return fail_response_result(msg=f"獲取用戶權限上下文摘要失敗: {str(e)}")


# ==================== 緩存管理接口 ====================

@blp.route("/permissions/cache/cleanup")
class InternalCacheCleanupApi(BaseInternalView):
    """緩存清理接口"""
    
    @blp.response(200, RspMsgDictSchema)
    def post(self):
        """清理过期缓存"""
        try:
            from dbs.mysql_db.model_tables import UserPermissionContextModel, PermissionVerificationCacheModel
            from dbs.mysql_db import db
            from datetime import datetime
            
            # 清理过期的用户上下文缓存
            expired_contexts = UserPermissionContextModel.query.filter(
                UserPermissionContextModel.expires_at <= datetime.utcnow()
            ).delete()
            
            # 清理过期的权限验证缓存
            expired_verifications = PermissionVerificationCacheModel.query.filter(
                PermissionVerificationCacheModel.expires_at <= datetime.utcnow()
            ).delete()
            
            db.session.commit()
            
            cleanup_result = {
                'expired_contexts_cleaned': expired_contexts,
                'expired_verifications_cleaned': expired_verifications,
                'total_cleaned': expired_contexts + expired_verifications,
                'cleanup_time': CommonTools.get_current_time()
            }
            
            logger.info(f"緩存清理完成 - 清理了 {cleanup_result['total_cleaned']} 個過期記錄")
            return response_result(content=cleanup_result, msg="緩存清理完成")
            
        except Exception as e:
            logger.error(f"緩存清理失敗: {str(e)}")
            return fail_response_result(msg=f"緩存清理失敗: {str(e)}")


# ==================== 健康檢查接口 ====================

@blp.route("/health")
class InternalHealthCheckApi(BaseInternalView):
    """健康檢查接口"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """服务健康检查"""
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
                'cache_stats': cache_stats_result if cache_flag else None,
                'features': {
                    'permission_verification': 'available',
                    'context_management': 'available',
                    'cache_management': 'available',
                    'event_handling': 'available'
                }
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


# ==================== 系統管理接口 ====================

@blp.route("/permissions/system/stats")
class InternalSystemStatsApi(BaseInternalView):
    """系統統計接口"""
    
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """获取权限系统统计信息"""
        try:
            from dbs.mysql_db.model_tables import (
                UserPermissionContextModel, PermissionVerificationCacheModel, PermissionChangeEventModel
            )
            from dbs.mysql_db import db
            from sqlalchemy import func
            from datetime import datetime, timedelta
            
            # 统计活跃用户上下文
            active_contexts = UserPermissionContextModel.query.filter(
                UserPermissionContextModel.expires_at > datetime.utcnow()
            ).count()
            
            # 统计活跃验证缓存
            active_verifications = PermissionVerificationCacheModel.query.filter(
                PermissionVerificationCacheModel.expires_at > datetime.utcnow()
            ).count()
            
            # 统计最近24小时的权限变更事件
            yesterday = datetime.utcnow() - timedelta(days=1)
            recent_events = PermissionChangeEventModel.query.filter(
                PermissionChangeEventModel.created_at >= yesterday
            ).count()
            
            # 统计事件类型分布
            event_type_stats = db.session.query(
                PermissionChangeEventModel.event_type,
                func.count(PermissionChangeEventModel.id)
            ).filter(
                PermissionChangeEventModel.created_at >= yesterday
            ).group_by(PermissionChangeEventModel.event_type).all()
            
            system_stats = {
                'active_user_contexts': active_contexts,
                'active_verification_caches': active_verifications,
                'recent_permission_events_24h': recent_events,
                'event_type_distribution_24h': {event_type: count for event_type, count in event_type_stats},
                'cache_efficiency': {
                    'total_cache_entries': active_contexts + active_verifications,
                    'context_cache_ratio': active_contexts / (active_contexts + active_verifications) if (active_contexts + active_verifications) > 0 else 0
                },
                'system_status': 'operational',
                'stats_generated_at': CommonTools.get_current_time()
            }
            
            return response_result(content=system_stats, msg="權限系統統計信息獲取成功")
            
        except Exception as e:
            logger.error(f"獲取權限系統統計信息失敗: {str(e)}")
            return fail_response_result(msg=f"獲取權限系統統計信息失敗: {str(e)}")