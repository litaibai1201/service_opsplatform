# -*- coding: utf-8 -*-
"""
@文件: integration_api.py
@說明: 集成服务API (优化版本)
@時間: 2025-01-09
@作者: LiDong
"""

from flask import request, g, jsonify
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from common.common_method import fail_response_result, response_result
from controllers.integration_controller import webhook_controller, plugin_controller, integration_controller
from serializes.response_serialize import RspMsgDictSchema, RspMsgSchema
from serializes.integration_serialize import (
    WebhookCreateSchema, WebhookUpdateSchema, WebhookListSchema, WebhookTestSchema,
    WebhookRetrySchema, WebhookResponseWrapperSchema, WebhookListResponseWrapperSchema,
    PluginInstallSchema, PluginListSchema, PluginMarketplaceSchema, PluginConfigurationSchema,
    PluginResponseWrapperSchema, PluginListResponseWrapperSchema,
    ExternalIntegrationCreateSchema, ExternalIntegrationUpdateSchema, ExternalIntegrationListSchema,
    IntegrationSyncSchema, IntegrationTypeSchema, ExternalIntegrationResponseWrapperSchema,
    ExternalIntegrationListResponseWrapperSchema, IntegrationTypeListResponseWrapperSchema,
    IntegrationHealthResponseSchema, WebhookTestResultSchema, IntegrationSyncResultSchema,
    PluginMarketplaceResponseSchema
)
from common.common_tools import CommonTools
from loggers import logger


blp = Blueprint("integration_api", __name__, url_prefix="/api/v1")


class BaseIntegrationView(MethodView):
    """集成API基类 - 统一控制器管理和错误处理"""
    
    def __init__(self):
        super().__init__()
        self.webhook_controller = webhook_controller
        self.plugin_controller = plugin_controller
        self.integration_controller = integration_controller
    
    def _build_response(self, result, flag, success_msg="操作成功", error_prefix=""):
        """统一响应构建"""
        if flag:
            return response_result(content=result, msg=success_msg)
        error_msg = f"{error_prefix}{result}" if error_prefix else str(result)
        logger.warning(f"API操作失败: {error_msg}")
        return fail_response_result(msg=error_msg)


# ==================== Webhook管理接口 ====================

@blp.route("/webhooks")
class WebhookManagementApi(BaseIntegrationView):
    """Webhook管理API"""

    @jwt_required()
    @blp.arguments(WebhookListSchema, location="query")
    @blp.response(200, WebhookListResponseWrapperSchema)
    def get(self, query_params):
        """获取Webhook列表"""
        try:
            project_id = query_params.get('project_id')
            is_active = query_params.get('is_active')
            page = query_params.get('page', 1)
            size = query_params.get('size', 20)
            
            result, flag = self.webhook_controller.get_webhooks(project_id, is_active, page, size)
            return self._build_response(result, flag, "獲取Webhook列表成功")
        except Exception as e:
            logger.error(f"獲取Webhook列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(WebhookCreateSchema)
    @blp.response(200, WebhookResponseWrapperSchema)
    def post(self, payload):
        """创建Webhook"""
        try:
            current_user_id = get_jwt_identity()
            payload['created_by'] = current_user_id
            
            result, flag = self.webhook_controller.create_webhook(payload)
            return self._build_response(result, flag, "創建Webhook成功")
        except Exception as e:
            logger.error(f"創建Webhook異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/webhooks/<webhook_id>")
class WebhookDetailApi(BaseIntegrationView):
    """Webhook详情API"""

    @jwt_required()
    @blp.response(200, WebhookResponseWrapperSchema)
    def get(self, webhook_id):
        """获取Webhook详情"""
        try:
            result, flag = self.webhook_controller.get_webhook_by_id(webhook_id)
            return self._build_response(result, flag, "獲取Webhook詳情成功")
        except Exception as e:
            logger.error(f"獲取Webhook詳情異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(WebhookUpdateSchema)
    @blp.response(200, WebhookResponseWrapperSchema)
    def put(self, payload, webhook_id):
        """更新Webhook"""
        try:
            result, flag = self.webhook_controller.update_webhook(webhook_id, payload)
            return self._build_response(result, flag, "更新Webhook成功")
        except Exception as e:
            logger.error(f"更新Webhook異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, webhook_id):
        """删除Webhook"""
        try:
            result, flag = self.webhook_controller.delete_webhook(webhook_id)
            return self._build_response(result, flag, "刪除Webhook成功")
        except Exception as e:
            logger.error(f"刪除Webhook異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/webhooks/<webhook_id>/test")
class WebhookTestApi(BaseIntegrationView):
    """Webhook测试API"""

    @jwt_required()
    @blp.arguments(WebhookTestSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, webhook_id):
        """测试Webhook"""
        try:
            test_payload = payload.get('test_payload', {})
            result, flag = self.webhook_controller.test_webhook(webhook_id, test_payload)
            return self._build_response(result, flag, "測試Webhook成功")
        except Exception as e:
            logger.error(f"測試Webhook異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/webhooks/<webhook_id>/retry")
class WebhookRetryApi(BaseIntegrationView):
    """Webhook重试API"""

    @jwt_required()
    @blp.arguments(WebhookRetrySchema)
    @blp.response(200, RspMsgSchema)
    def post(self, payload, webhook_id):
        """重试Webhook"""
        try:
            log_id = payload.get('log_id')
            result, flag = self.webhook_controller.retry_webhook(webhook_id, log_id)
            return self._build_response(result, flag, "重試Webhook成功")
        except Exception as e:
            logger.error(f"重試Webhook異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/webhooks/<webhook_id>/logs")
class WebhookLogsApi(BaseIntegrationView):
    """Webhook日志API"""

    @jwt_required()
    @blp.arguments(WebhookListSchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params, webhook_id):
        """获取Webhook执行日志"""
        try:
            page = query_params.get('page', 1)
            size = query_params.get('size', 20)
            
            result, flag = self.webhook_controller.get_webhook_logs(webhook_id, page, size)
            return self._build_response(result, flag, "獲取Webhook日志成功")
        except Exception as e:
            logger.error(f"獲取Webhook日志異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 插件管理接口 ====================

@blp.route("/plugins")
class PluginManagementApi(BaseIntegrationView):
    """插件管理API"""

    @jwt_required()
    @blp.arguments(PluginListSchema, location="query")
    @blp.response(200, PluginListResponseWrapperSchema)
    def get(self, query_params):
        """获取插件列表"""
        try:
            is_enabled = query_params.get('is_enabled')
            is_verified = query_params.get('is_verified')
            page = query_params.get('page', 1)
            size = query_params.get('size', 20)
            sort_by = query_params.get('sort_by', 'rating')
            
            result, flag = self.plugin_controller.get_plugins(is_enabled, is_verified, page, size, sort_by)
            return self._build_response(result, flag, "獲取插件列表成功")
        except Exception as e:
            logger.error(f"獲取插件列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(PluginInstallSchema)
    @blp.response(200, PluginResponseWrapperSchema)
    def post(self, payload):
        """安装插件"""
        try:
            current_user_id = get_jwt_identity()
            payload['installed_by'] = current_user_id
            
            result, flag = self.plugin_controller.install_plugin(payload)
            return self._build_response(result, flag, "安裝插件成功")
        except Exception as e:
            logger.error(f"安裝插件異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/plugins/<plugin_id>")
class PluginDetailApi(BaseIntegrationView):
    """插件详情API"""

    @jwt_required()
    @blp.response(200, PluginResponseWrapperSchema)
    def get(self, plugin_id):
        """获取插件详情"""
        try:
            result, flag = self.plugin_controller.get_plugin_by_id(plugin_id)
            return self._build_response(result, flag, "獲取插件詳情成功")
        except Exception as e:
            logger.error(f"獲取插件詳情異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, plugin_id):
        """卸载插件"""
        try:
            result, flag = self.plugin_controller.uninstall_plugin(plugin_id)
            return self._build_response(result, flag, "卸載插件成功")
        except Exception as e:
            logger.error(f"卸載插件異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/plugins/marketplace")
class PluginMarketplaceApi(BaseIntegrationView):
    """插件市场API"""

    @blp.arguments(PluginMarketplaceSchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params):
        """获取插件市场列表"""
        try:
            category = query_params.get('category')
            search = query_params.get('search')
            page = query_params.get('page', 1)
            size = query_params.get('size', 20)
            sort_by = query_params.get('sort_by', 'rating')
            
            result, flag = self.plugin_controller.get_marketplace_plugins(category, search, page, size, sort_by)
            return self._build_response(result, flag, "獲取插件市場列表成功")
        except Exception as e:
            logger.error(f"獲取插件市場列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/plugins/<plugin_id>/configuration")
class PluginConfigurationApi(BaseIntegrationView):
    """插件配置API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self, plugin_id):
        """获取插件配置"""
        try:
            result, flag = self.plugin_controller.get_plugin_configuration(plugin_id)
            return self._build_response(result, flag, "獲取插件配置成功")
        except Exception as e:
            logger.error(f"獲取插件配置異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(PluginConfigurationSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, plugin_id):
        """创建插件配置"""
        try:
            current_user_id = get_jwt_identity()
            payload['created_by'] = current_user_id
            payload['plugin_id'] = plugin_id
            
            result, flag = self.plugin_controller.create_plugin_configuration(payload)
            return self._build_response(result, flag, "創建插件配置成功")
        except Exception as e:
            logger.error(f"創建插件配置異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(PluginConfigurationSchema)
    @blp.response(200, RspMsgDictSchema)
    def put(self, payload, plugin_id):
        """更新插件配置"""
        try:
            result, flag = self.plugin_controller.update_plugin_configuration(plugin_id, payload)
            return self._build_response(result, flag, "更新插件配置成功")
        except Exception as e:
            logger.error(f"更新插件配置異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 外部集成管理接口 ====================

@blp.route("/integrations")
class ExternalIntegrationManagementApi(BaseIntegrationView):
    """外部集成管理API"""

    @jwt_required()
    @blp.arguments(ExternalIntegrationListSchema, location="query")
    @blp.response(200, ExternalIntegrationListResponseWrapperSchema)
    def get(self, query_params):
        """获取外部集成列表"""
        try:
            project_id = query_params.get('project_id')
            integration_type = query_params.get('integration_type')
            status = query_params.get('status')
            page = query_params.get('page', 1)
            size = query_params.get('size', 20)
            
            result, flag = self.integration_controller.get_integrations(project_id, integration_type, status, page, size)
            return self._build_response(result, flag, "獲取外部集成列表成功")
        except Exception as e:
            logger.error(f"獲取外部集成列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(ExternalIntegrationCreateSchema)
    @blp.response(200, ExternalIntegrationResponseWrapperSchema)
    def post(self, payload):
        """创建外部集成"""
        try:
            current_user_id = get_jwt_identity()
            payload['created_by'] = current_user_id
            
            result, flag = self.integration_controller.create_integration(payload)
            return self._build_response(result, flag, "創建外部集成成功")
        except Exception as e:
            logger.error(f"創建外部集成異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/integrations/<integration_id>")
class ExternalIntegrationDetailApi(BaseIntegrationView):
    """外部集成详情API"""

    @jwt_required()
    @blp.response(200, ExternalIntegrationResponseWrapperSchema)
    def get(self, integration_id):
        """获取外部集成详情"""
        try:
            result, flag = self.integration_controller.get_integration_by_id(integration_id)
            return self._build_response(result, flag, "獲取外部集成詳情成功")
        except Exception as e:
            logger.error(f"獲取外部集成詳情異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(ExternalIntegrationUpdateSchema)
    @blp.response(200, ExternalIntegrationResponseWrapperSchema)
    def put(self, payload, integration_id):
        """更新外部集成"""
        try:
            result, flag = self.integration_controller.update_integration(integration_id, payload)
            return self._build_response(result, flag, "更新外部集成成功")
        except Exception as e:
            logger.error(f"更新外部集成異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.response(200, RspMsgSchema)
    def delete(self, integration_id):
        """删除外部集成"""
        try:
            result, flag = self.integration_controller.delete_integration(integration_id)
            return self._build_response(result, flag, "刪除外部集成成功")
        except Exception as e:
            logger.error(f"刪除外部集成異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/integrations/<integration_id>/sync")
class IntegrationSyncApi(BaseIntegrationView):
    """集成同步API"""

    @jwt_required()
    @blp.arguments(IntegrationSyncSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, integration_id):
        """启动集成同步"""
        try:
            sync_type = payload.get('sync_type', 'full')
            force = payload.get('force', False)
            
            result, flag = self.integration_controller.start_sync(integration_id, sync_type, force)
            return self._build_response(result, flag, "啟動集成同步成功")
        except Exception as e:
            logger.error(f"啟動集成同步異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/integrations/<integration_id>/sync/logs")
class IntegrationSyncLogsApi(BaseIntegrationView):
    """集成同步日志API"""

    @jwt_required()
    @blp.arguments(WebhookListSchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params, integration_id):
        """获取集成同步日志"""
        try:
            page = query_params.get('page', 1)
            size = query_params.get('size', 20)
            
            result, flag = self.integration_controller.get_sync_logs(integration_id, page, size)
            return self._build_response(result, flag, "獲取同步日志成功")
        except Exception as e:
            logger.error(f"獲取同步日志異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/integrations/types")
class IntegrationTypesApi(BaseIntegrationView):
    """集成类型API"""

    @blp.arguments(IntegrationTypeSchema, location="query")
    @blp.response(200, IntegrationTypeListResponseWrapperSchema)
    def get(self, query_params):
        """获取支持的集成类型"""
        try:
            category = query_params.get('category')
            result, flag = self.integration_controller.get_integration_types(category)
            return self._build_response(result, flag, "獲取集成類型成功")
        except Exception as e:
            logger.error(f"獲取集成類型異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/integrations/types/<integration_type>/schema")
class IntegrationSchemaApi(BaseIntegrationView):
    """集成配置架构API"""

    @blp.response(200, RspMsgDictSchema)
    def get(self, integration_type):
        """获取集成配置架构"""
        try:
            result, flag = self.integration_controller.get_integration_schema(integration_type)
            return self._build_response(result, flag, "獲取集成配置架構成功")
        except Exception as e:
            logger.error(f"獲取集成配置架構異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 健康检查接口 ====================

@blp.route("/health")
class IntegrationHealthApi(MethodView):
    """集成服务健康检查API"""

    @blp.response(200, IntegrationHealthResponseSchema)
    def get(self):
        """健康检查"""
        health_data = {
            'status': 'healthy',
            'service': 'integration-service',
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
        
        # 检查集成服务状态
        try:
            # 获取活跃Webhook数量
            from models.integration_model import webhook_model
            webhooks_result, webhooks_flag = webhook_model.get_webhooks(is_active=True, page=1, size=1)
            if webhooks_flag:
                health_data['webhooks_active'] = webhooks_result.get('total', 0)
            else:
                health_data['webhooks_active'] = 0
                
            # 获取活跃集成数量
            from models.integration_model import integration_model
            integrations_result, integrations_flag = integration_model.get_integrations(status='active', page=1, size=1)
            if integrations_flag:
                health_data['integrations_active'] = integrations_result.get('total', 0)
            else:
                health_data['integrations_active'] = 0
                
            # 获取已安装插件数量
            from models.integration_model import plugin_model
            plugins_result, plugins_flag = plugin_model.get_plugins(is_enabled=True, page=1, size=1)
            if plugins_flag:
                health_data['plugins_installed'] = plugins_result.get('total', 0)
            else:
                health_data['plugins_installed'] = 0
                
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


# ==================== 事件处理接口 ====================

@blp.route("/webhooks/events/<event_type>", methods=['POST'])
class WebhookEventApi(BaseIntegrationView):
    """Webhook事件处理API"""

    def post(self, event_type):
        """处理Webhook事件"""
        try:
            # 获取事件数据
            event_data = request.get_json() or {}
            headers = dict(request.headers)
            
            # 触发相关Webhook
            result, flag = self.webhook_controller.trigger_webhooks(event_type, event_data, headers)
            
            if flag:
                return response_result(content=result, msg="事件處理成功")
            else:
                return fail_response_result(msg=f"事件處理失敗: {result}")
                
        except Exception as e:
            logger.error(f"Webhook事件處理異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


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