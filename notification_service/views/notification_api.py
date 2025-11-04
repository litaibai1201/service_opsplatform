# -*- coding: utf-8 -*-
"""
@文件: notification_api.py
@說明: 通知服务API (优化版本)
@時間: 2025-01-09
@作者: LiDong
"""

from flask import request, g, jsonify
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from common.common_method import fail_response_result, response_result
from controllers.notification_controller import (
    template_controller, preference_controller, notification_controller,
    email_controller, push_controller, device_controller, notification_engine
)
from serializes.response_serialize import RspMsgDictSchema, RspMsgSchema
from serializes.notification_serialize import (
    NotificationTemplateCreateSchema, NotificationTemplateUpdateSchema,
    NotificationTemplateListSchema, NotificationTemplateResponseWrapperSchema,
    NotificationTemplateListResponseWrapperSchema, UserNotificationPreferencesUpdateSchema,
    UserNotificationPreferencesResponseWrapperSchema, NotificationListSchema,
    NotificationListResponseWrapperSchema, CreateInAppNotificationSchema,
    NotificationResponseWrapperSchema, SendEmailSchema, EmailQueueResponseWrapperSchema,
    SendPushNotificationSchema, PushNotificationListResponseWrapperSchema,
    RegisterDeviceSchema, UserDeviceListSchema, UserDeviceResponseWrapperSchema,
    UserDeviceListResponseWrapperSchema, SendNotificationSchema,
    SendBulkNotificationsSchema, SendNotificationResultWrapperSchema,
    SendBulkNotificationsResultWrapperSchema, UnreadCountResponseWrapperSchema,
    NotificationHealthResponseSchema
)
from common.common_tools import CommonTools
from loggers import logger


blp = Blueprint("notification_api", __name__, url_prefix="/api/v1")


class BaseNotificationView(MethodView):
    """通知API基类 - 统一控制器管理和错误处理"""
    
    def __init__(self):
        super().__init__()
        self.template_controller = template_controller
        self.preference_controller = preference_controller
        self.notification_controller = notification_controller
        self.email_controller = email_controller
        self.push_controller = push_controller
        self.device_controller = device_controller
        self.notification_engine = notification_engine
    
    def _build_response(self, result, flag, success_msg="操作成功", error_prefix=""):
        """统一响应构建"""
        if flag:
            return response_result(content=result, msg=success_msg)
        error_msg = f"{error_prefix}{result}" if error_prefix else str(result)
        logger.warning(f"API操作失败: {error_msg}")
        return fail_response_result(msg=error_msg)


# ==================== 用户通知接口 ====================

@blp.route("/notifications")
class NotificationManagementApi(BaseNotificationView):
    """用户通知管理API"""

    @jwt_required()
    @blp.arguments(NotificationListSchema, location="query")
    @blp.response(200, NotificationListResponseWrapperSchema)
    def get(self, query_params):
        """获取用户通知列表"""
        try:
            current_user_id = get_jwt_identity()
            is_read = query_params.get('is_read')
            priority = query_params.get('priority')
            page = query_params.get('page', 1)
            size = query_params.get('size', 20)
            
            result, flag = self.notification_controller.get_user_notifications(
                current_user_id, is_read, priority, page, size
            )
            return self._build_response(result, flag, "獲取通知列表成功")
        except Exception as e:
            logger.error(f"獲取通知列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/notifications/<notification_id>/read")
class NotificationReadApi(BaseNotificationView):
    """标记通知为已读API"""

    @jwt_required()
    @blp.response(200, NotificationResponseWrapperSchema)
    def put(self, notification_id):
        """标记通知为已读"""
        try:
            current_user_id = get_jwt_identity()
            result, flag = self.notification_controller.mark_notification_read(
                notification_id, current_user_id
            )
            return self._build_response(result, flag, "標記通知為已讀成功")
        except Exception as e:
            logger.error(f"標記通知為已讀異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/notifications/mark-all-read")
class NotificationMarkAllReadApi(BaseNotificationView):
    """标记所有通知为已读API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self):
        """标记所有通知为已读"""
        try:
            current_user_id = get_jwt_identity()
            result, flag = self.notification_controller.mark_all_notifications_read(current_user_id)
            return self._build_response(result, flag, "標記所有通知為已讀成功")
        except Exception as e:
            logger.error(f"標記所有通知為已讀異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/notifications/<notification_id>")
class NotificationDetailApi(BaseNotificationView):
    """通知详情API"""

    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, notification_id):
        """删除通知"""
        try:
            current_user_id = get_jwt_identity()
            result, flag = self.notification_controller.delete_notification(
                notification_id, current_user_id
            )
            return self._build_response(result, flag, "刪除通知成功")
        except Exception as e:
            logger.error(f"刪除通知異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/notifications/unread-count")
class NotificationUnreadCountApi(BaseNotificationView):
    """获取未读通知数量API"""

    @jwt_required()
    @blp.response(200, UnreadCountResponseWrapperSchema)
    def get(self):
        """获取未读通知数量"""
        try:
            current_user_id = get_jwt_identity()
            result, flag = self.notification_controller.get_unread_count(current_user_id)
            return self._build_response(result, flag, "獲取未讀通知數量成功")
        except Exception as e:
            logger.error(f"獲取未讀通知數量異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 通知偏好接口 ====================

@blp.route("/notifications/preferences")
class NotificationPreferencesApi(BaseNotificationView):
    """通知偏好API"""

    @jwt_required()
    @blp.response(200, UserNotificationPreferencesResponseWrapperSchema)
    def get(self):
        """获取通知偏好"""
        try:
            current_user_id = get_jwt_identity()
            result, flag = self.preference_controller.get_user_preferences(current_user_id)
            return self._build_response(result, flag, "獲取通知偏好成功")
        except Exception as e:
            logger.error(f"獲取通知偏好異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(UserNotificationPreferencesUpdateSchema)
    @blp.response(200, UserNotificationPreferencesResponseWrapperSchema)
    def put(self, payload):
        """更新通知偏好"""
        try:
            current_user_id = get_jwt_identity()
            preferences_data = payload.get('preferences', [])
            
            result, flag = self.preference_controller.update_user_preferences(
                current_user_id, preferences_data
            )
            return self._build_response(result, flag, "更新通知偏好成功")
        except Exception as e:
            logger.error(f"更新通知偏好異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/notifications/preferences/reset")
class NotificationPreferencesResetApi(BaseNotificationView):
    """重置通知偏好API"""

    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def post(self):
        """重置为默认设置"""
        try:
            current_user_id = get_jwt_identity()
            result, flag = self.preference_controller.reset_user_preferences(current_user_id)
            return self._build_response(result, flag, "重置通知偏好成功")
        except Exception as e:
            logger.error(f"重置通知偏好異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 设备管理接口 ====================

@blp.route("/notifications/devices")
class NotificationDevicesApi(BaseNotificationView):
    """设备管理API"""

    @jwt_required()
    @blp.arguments(UserDeviceListSchema, location="query")
    @blp.response(200, UserDeviceListResponseWrapperSchema)
    def get(self, query_params):
        """获取设备列表"""
        try:
            current_user_id = get_jwt_identity()
            is_active = query_params.get('is_active')
            
            result, flag = self.device_controller.get_user_devices(current_user_id, is_active)
            return self._build_response(result, flag, "獲取設備列表成功")
        except Exception as e:
            logger.error(f"獲取設備列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(RegisterDeviceSchema)
    @blp.response(200, UserDeviceResponseWrapperSchema)
    def post(self, payload):
        """注册设备"""
        try:
            current_user_id = get_jwt_identity()
            device_token = payload['device_token']
            device_type = payload['device_type']
            device_name = payload.get('device_name')
            
            result, flag = self.device_controller.register_device(
                current_user_id, device_token, device_type, device_name
            )
            return self._build_response(result, flag, "註冊設備成功")
        except Exception as e:
            logger.error(f"註冊設備異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/notifications/devices/<device_id>")
class NotificationDeviceDetailApi(BaseNotificationView):
    """设备详情API"""

    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, device_id):
        """取消设备注册"""
        try:
            current_user_id = get_jwt_identity()
            result, flag = self.device_controller.unregister_device(device_id, current_user_id)
            return self._build_response(result, flag, "取消設備註冊成功")
        except Exception as e:
            logger.error(f"取消設備註冊異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 通知模板管理接口（管理员） ====================

@blp.route("/admin/notification-templates")
class NotificationTemplateManagementApi(BaseNotificationView):
    """通知模板管理API"""

    @jwt_required()
    @blp.arguments(NotificationTemplateListSchema, location="query")
    @blp.response(200, NotificationTemplateListResponseWrapperSchema)
    def get(self, query_params):
        """获取模板列表"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role != 'admin':
                return fail_response_result(msg="權限不足，僅管理員可操作")
            
            event_type = query_params.get('event_type')
            template_type = query_params.get('type')
            is_active = query_params.get('is_active')
            locale = query_params.get('locale')
            page = query_params.get('page', 1)
            size = query_params.get('size', 20)
            
            result, flag = self.template_controller.get_templates(
                event_type, template_type, is_active, locale, page, size
            )
            return self._build_response(result, flag, "獲取模板列表成功")
        except Exception as e:
            logger.error(f"獲取模板列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(NotificationTemplateCreateSchema)
    @blp.response(200, NotificationTemplateResponseWrapperSchema)
    def post(self, payload):
        """创建模板"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role != 'admin':
                return fail_response_result(msg="權限不足，僅管理員可操作")
            
            current_user_id = get_jwt_identity()
            payload['created_by'] = current_user_id
            
            result, flag = self.template_controller.create_template(payload)
            return self._build_response(result, flag, "創建模板成功")
        except Exception as e:
            logger.error(f"創建模板異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/admin/notification-templates/<template_id>")
class NotificationTemplateDetailApi(BaseNotificationView):
    """通知模板详情API"""

    @jwt_required()
    @blp.response(200, NotificationTemplateResponseWrapperSchema)
    def get(self, template_id):
        """获取模板详情"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role != 'admin':
                return fail_response_result(msg="權限不足，僅管理員可操作")
            
            result, flag = self.template_controller.get_template_by_id(template_id)
            return self._build_response(result, flag, "獲取模板詳情成功")
        except Exception as e:
            logger.error(f"獲取模板詳情異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(NotificationTemplateUpdateSchema)
    @blp.response(200, NotificationTemplateResponseWrapperSchema)
    def put(self, payload, template_id):
        """更新模板"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role != 'admin':
                return fail_response_result(msg="權限不足，僅管理員可操作")
            
            result, flag = self.template_controller.update_template(template_id, payload)
            return self._build_response(result, flag, "更新模板成功")
        except Exception as e:
            logger.error(f"更新模板異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, template_id):
        """删除模板"""
        try:
            # 检查管理员权限
            jwt_claims = get_jwt()
            user_role = jwt_claims.get('role', 'user')
            
            if user_role != 'admin':
                return fail_response_result(msg="權限不足，僅管理員可操作")
            
            result, flag = self.template_controller.delete_template(template_id)
            return self._build_response(result, flag, "刪除模板成功")
        except Exception as e:
            logger.error(f"刪除模板異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 内部发送接口 ====================

@blp.route("/internal/notifications/send")
class InternalSendNotificationApi(BaseNotificationView):
    """内部发送通知API"""

    @blp.arguments(SendNotificationSchema)
    @blp.response(200, SendNotificationResultWrapperSchema)
    def post(self, payload):
        """发送通知"""
        try:
            user_id = payload['user_id']
            event_type = payload['event_type']
            variables = payload['variables']
            notification_types = payload.get('notification_types', ['in_app', 'email'])
            priority = payload.get('priority', 'normal')
            locale = payload.get('locale', 'en')
            
            result, flag = self.notification_engine.send_notification(
                user_id, event_type, variables, notification_types, priority, locale
            )
            return self._build_response(result, flag, "發送通知成功")
        except Exception as e:
            logger.error(f"發送通知異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/internal/notifications/email")
class InternalSendEmailApi(BaseNotificationView):
    """内部发送邮件API"""

    @blp.arguments(SendEmailSchema)
    @blp.response(200, EmailQueueResponseWrapperSchema)
    def post(self, payload):
        """发送邮件"""
        try:
            result, flag = self.email_controller.send_email(**payload)
            return self._build_response(result, flag, "發送郵件成功")
        except Exception as e:
            logger.error(f"發送郵件異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/internal/notifications/push")
class InternalSendPushApi(BaseNotificationView):
    """内部发送推送API"""

    @blp.arguments(SendPushNotificationSchema)
    @blp.response(200, PushNotificationListResponseWrapperSchema)
    def post(self, payload):
        """发送推送"""
        try:
            user_id = payload['user_id']
            title = payload['title']
            body = payload['body']
            data = payload.get('data', {})
            device_tokens = payload.get('device_tokens')
            
            result, flag = self.push_controller.send_push_notification(
                user_id, title, body, data, device_tokens
            )
            return self._build_response(result, flag, "發送推送成功")
        except Exception as e:
            logger.error(f"發送推送異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/internal/notifications/bulk")
class InternalSendBulkNotificationsApi(BaseNotificationView):
    """内部批量发送通知API"""

    @blp.arguments(SendBulkNotificationsSchema)
    @blp.response(200, SendBulkNotificationsResultWrapperSchema)
    def post(self, payload):
        """批量发送通知"""
        try:
            notifications = payload['notifications']
            result, flag = self.notification_engine.send_bulk_notifications(notifications)
            return self._build_response(result, flag, "批量發送通知成功")
        except Exception as e:
            logger.error(f"批量發送通知異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 健康检查接口 ====================

@blp.route("/health")
class NotificationHealthApi(MethodView):
    """通知服务健康检查API"""

    @blp.response(200, NotificationHealthResponseSchema)
    def get(self):
        """健康检查"""
        health_data = {
            'status': 'healthy',
            'service': 'notification-service',
            'timestamp': CommonTools.get_now(),
            'version': '1.0.0'
        }
        
        issues = []
        
        # 检查数据库连接
        try:
            from dbs.mysql_db import db
            from sqlalchemy import text
            result = db.session.execute(text('SELECT 1'))
            result.fetchone()
            health_data['database'] = 'connected'
        except Exception as db_error:
            logger.error(f"数据库连接检查失敗: {str(db_error)}")
            health_data['database'] = f'error: {str(db_error)}'
            issues.append(f'数据库: {str(db_error)}')
        
        # 检查缓存连接
        try:
            from cache import redis_client
            if redis_client.redis_client is None:
                health_data['cache'] = 'not_initialized'
                issues.append('缓存: Redis客户端未初始化')
            else:
                redis_client.ping()
                health_data['cache'] = 'connected'
        except Exception as cache_error:
            logger.error(f"缓存连接检查失敗: {str(cache_error)}")
            health_data['cache'] = f'error: {str(cache_error)}'
            issues.append(f'缓存: {str(cache_error)}')
        
        # 检查通知服务状态
        try:
            # 获取邮件队列中待发送邮件数量
            from models.notification_model import email_queue_model
            pending_emails, success = email_queue_model.get_pending_emails(limit=1)
            if success:
                health_data['email_queue_pending'] = len(pending_emails) if pending_emails else 0
            else:
                health_data['email_queue_pending'] = 0
                
            # 获取推送队列中待发送推送数量
            from models.notification_model import push_notification_model
            pending_pushes, success = push_notification_model.get_pending_pushes(limit=1)
            if success:
                health_data['push_queue_pending'] = len(pending_pushes) if pending_pushes else 0
            else:
                health_data['push_queue_pending'] = 0
                
            # 获取活跃模板数量
            from models.notification_model import template_model
            templates_result, success = template_model.get_templates(is_active=True, page=1, size=1)
            if success:
                health_data['active_templates'] = templates_result.get('total', 0)
            else:
                health_data['active_templates'] = 0
                
        except Exception as service_error:
            logger.error(f"服务状态检查失敗: {str(service_error)}")
            issues.append(f'服务状态: {str(service_error)}')
        
        # 判断整体健康状态
        if issues:
            health_data['status'] = 'unhealthy'
            health_data['issues'] = issues
            return fail_response_result(content=health_data, msg="服務異常")
        else:
            return response_result(content=health_data, msg="服務正常")


# 错误处理器
@blp.errorhandler(401)
def handle_unauthorized(error):
    """处理401未授权错误"""
    return fail_response_result(msg="未授權訪問，請先登錄")


@blp.errorhandler(403)
def handle_forbidden(error):
    """处理403禁止访问错误"""
    return fail_response_result(msg="禁止訪問，權限不足")


@blp.errorhandler(422)
def handle_validation_error(error):
    """处理422验证错误"""
    return fail_response_result(msg="請求參數驗證失敗")


@blp.errorhandler(500)
def handle_internal_error(error):
    """处理500内部错误"""
    logger.error(f"內部服務器錯誤: {str(error)}")
    return fail_response_result(msg="內部服務器錯誤")


# 请求前处理
@blp.before_request
def before_request():
    """请求前处理"""
    # 记录API访问日志（排除健康检查）
    if request.endpoint and not request.endpoint.endswith('health'):
        logger.info(f"API訪問: {request.method} {request.path} - IP: {request.remote_addr}")


# 响应后处理
@blp.after_request
def after_request(response):
    """响应后处理"""
    # 添加安全头
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # 添加CORS头
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    
    return response