# -*- coding: utf-8 -*-
"""
@文件: integration_serialize.py
@說明: 集成服务序列化器
@時間: 2025-01-09
@作者: LiDong
"""
from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from datetime import datetime


# ==================== 基础Schema ====================

class PaginationSchema(Schema):
    """分页参数Schema"""
    page = fields.Integer(missing=1, validate=validate.Range(min=1))
    size = fields.Integer(missing=20, validate=validate.Range(min=1, max=100))


# ==================== Webhook相关Schema ====================

class WebhookCreateSchema(Schema):
    """创建Webhook请求Schema"""
    project_id = fields.String(required=True, validate=validate.Length(min=1))
    name = fields.String(required=True, validate=validate.Length(min=1, max=255))
    url = fields.Url(required=True, validate=validate.Length(max=500))
    events = fields.List(fields.String(), required=True, validate=validate.Length(min=1))
    headers = fields.Dict(missing={})
    secret = fields.String(missing=None, validate=validate.Length(max=255))
    is_active = fields.Boolean(missing=True)
    retry_config = fields.Dict(missing={})
    timeout_seconds = fields.Integer(missing=30, validate=validate.Range(min=1, max=300))


class WebhookUpdateSchema(Schema):
    """更新Webhook请求Schema"""
    name = fields.String(missing=None, validate=validate.Length(min=1, max=255))
    url = fields.Url(missing=None, validate=validate.Length(max=500))
    events = fields.List(fields.String(), missing=None)
    headers = fields.Dict(missing=None)
    secret = fields.String(missing=None, validate=validate.Length(max=255))
    is_active = fields.Boolean(missing=None)
    retry_config = fields.Dict(missing=None)
    timeout_seconds = fields.Integer(missing=None, validate=validate.Range(min=1, max=300))


class WebhookListSchema(PaginationSchema):
    """Webhook列表请求Schema"""
    project_id = fields.String(missing=None)
    is_active = fields.Boolean(missing=None)


class WebhookTestSchema(Schema):
    """测试Webhook请求Schema"""
    test_payload = fields.Dict(missing={})


class WebhookRetrySchema(Schema):
    """重试Webhook请求Schema"""
    log_id = fields.String(missing=None)


# ==================== 插件相关Schema ====================

class PluginInstallSchema(Schema):
    """安装插件请求Schema"""
    name = fields.String(required=True, validate=validate.Length(min=1, max=255))
    version = fields.String(required=True, validate=validate.Length(min=1, max=50))
    description = fields.String(missing=None)
    author = fields.String(missing=None, validate=validate.Length(max=255))
    repository_url = fields.Url(missing=None, validate=validate.Length(max=500))
    documentation_url = fields.Url(missing=None, validate=validate.Length(max=500))
    manifest = fields.Dict(required=True)
    permissions = fields.List(fields.String(), missing=[])
    configuration_schema = fields.Dict(missing=None)
    is_enabled = fields.Boolean(missing=True)
    is_verified = fields.Boolean(missing=False)


class PluginListSchema(PaginationSchema):
    """插件列表请求Schema"""
    is_enabled = fields.Boolean(missing=None)
    is_verified = fields.Boolean(missing=None)
    sort_by = fields.String(missing='rating', validate=validate.OneOf([
        'rating', 'downloads', 'installed_at', 'name'
    ]))


class PluginMarketplaceSchema(PaginationSchema):
    """插件市场请求Schema"""
    category = fields.String(missing=None)
    search = fields.String(missing=None)
    sort_by = fields.String(missing='rating', validate=validate.OneOf([
        'rating', 'downloads', 'name', 'updated_at'
    ]))


class PluginConfigurationSchema(Schema):
    """插件配置请求Schema"""
    project_id = fields.String(missing=None)
    configuration = fields.Dict(required=True)
    is_active = fields.Boolean(missing=True)


# ==================== 外部集成相关Schema ====================

class ExternalIntegrationCreateSchema(Schema):
    """创建外部集成请求Schema"""
    project_id = fields.String(required=True, validate=validate.Length(min=1))
    integration_type = fields.String(required=True, validate=validate.OneOf([
        'github', 'gitlab', 'jira', 'slack', 'jenkins', 'docker', 'trello',
        'bitbucket', 'azure_devops', 'kubernetes'
    ]))
    name = fields.String(required=True, validate=validate.Length(min=1, max=255))
    configuration = fields.Dict(required=True)
    auth_config = fields.Dict(missing=None)
    sync_settings = fields.Dict(missing={})


class ExternalIntegrationUpdateSchema(Schema):
    """更新外部集成请求Schema"""
    name = fields.String(missing=None, validate=validate.Length(min=1, max=255))
    configuration = fields.Dict(missing=None)
    auth_config = fields.Dict(missing=None)
    sync_settings = fields.Dict(missing=None)
    status = fields.String(missing=None, validate=validate.OneOf([
        'active', 'inactive', 'error'
    ]))


class ExternalIntegrationListSchema(PaginationSchema):
    """外部集成列表请求Schema"""
    project_id = fields.String(missing=None)
    integration_type = fields.String(missing=None)
    status = fields.String(missing=None, validate=validate.OneOf([
        'active', 'inactive', 'error'
    ]))


class IntegrationSyncSchema(Schema):
    """集成同步请求Schema"""
    sync_type = fields.String(missing='full', validate=validate.OneOf([
        'full', 'incremental', 'delta'
    ]))
    force = fields.Boolean(missing=False)


class IntegrationTypeSchema(Schema):
    """集成类型请求Schema"""
    category = fields.String(missing=None, validate=validate.OneOf([
        'code_repository', 'project_management', 'communication', 
        'ci_cd', 'container', 'monitoring'
    ]))


# ==================== 响应Schema ====================

class WebhookResponseSchema(Schema):
    """Webhook响应Schema"""
    id = fields.String()
    project_id = fields.String()
    name = fields.String()
    url = fields.String()
    events = fields.List(fields.String())
    headers = fields.Dict()
    secret = fields.String()
    is_active = fields.Boolean()
    retry_config = fields.Dict()
    timeout_seconds = fields.Integer()
    last_triggered_at = fields.DateTime(format='iso', allow_none=True)
    success_count = fields.Integer()
    failure_count = fields.Integer()
    created_by = fields.String()
    created_at = fields.DateTime(format='iso')


class WebhookLogResponseSchema(Schema):
    """Webhook日志响应Schema"""
    id = fields.String()
    webhook_id = fields.String()
    event_type = fields.String()
    payload = fields.Dict()
    response_status = fields.Integer(allow_none=True)
    response_body = fields.String(allow_none=True)
    response_headers = fields.Dict(allow_none=True)
    execution_time_ms = fields.Integer(allow_none=True)
    error_message = fields.String(allow_none=True)
    retry_count = fields.Integer()
    created_at = fields.DateTime(format='iso')


class PluginResponseSchema(Schema):
    """插件响应Schema"""
    id = fields.String()
    name = fields.String()
    version = fields.String()
    description = fields.String(allow_none=True)
    author = fields.String(allow_none=True)
    repository_url = fields.String(allow_none=True)
    documentation_url = fields.String(allow_none=True)
    manifest = fields.Dict()
    permissions = fields.List(fields.String())
    configuration_schema = fields.Dict(allow_none=True)
    is_enabled = fields.Boolean()
    is_verified = fields.Boolean()
    verification_date = fields.Date(allow_none=True)
    download_count = fields.Integer()
    rating = fields.Float()
    review_count = fields.Integer()
    installed_by = fields.String()
    installed_at = fields.DateTime(format='iso')


class PluginConfigurationResponseSchema(Schema):
    """插件配置响应Schema"""
    id = fields.String()
    plugin_id = fields.String()
    project_id = fields.String(allow_none=True)
    configuration = fields.Dict()
    is_active = fields.Boolean()
    created_by = fields.String()
    created_at = fields.DateTime(format='iso')
    updated_at = fields.DateTime(format='iso')


class ExternalIntegrationResponseSchema(Schema):
    """外部集成响应Schema"""
    id = fields.String()
    project_id = fields.String()
    integration_type = fields.String()
    name = fields.String()
    configuration = fields.Dict()
    auth_config = fields.Dict(allow_none=True)
    sync_settings = fields.Dict(allow_none=True)
    status = fields.String()
    last_sync_at = fields.DateTime(format='iso', allow_none=True)
    sync_error_message = fields.String(allow_none=True)
    created_by = fields.String()
    created_at = fields.DateTime(format='iso')
    updated_at = fields.DateTime(format='iso')


class IntegrationSyncLogResponseSchema(Schema):
    """集成同步日志响应Schema"""
    id = fields.String()
    integration_id = fields.String()
    sync_type = fields.String()
    status = fields.String()
    records_processed = fields.Integer()
    errors_count = fields.Integer()
    sync_details = fields.Dict(allow_none=True)
    error_details = fields.Dict(allow_none=True)
    started_at = fields.DateTime(format='iso')
    completed_at = fields.DateTime(format='iso', allow_none=True)


class IntegrationTypeResponseSchema(Schema):
    """集成类型响应Schema"""
    type = fields.String()
    name = fields.String()
    description = fields.String()
    category = fields.String()
    supported_features = fields.List(fields.String())
    auth_types = fields.List(fields.String())
    icon = fields.String()


class IntegrationSchemaResponseSchema(Schema):
    """集成配置架构响应Schema"""
    schema = fields.Dict()


# ==================== 列表响应Schema ====================

class WebhookListResponseSchema(Schema):
    """Webhook列表响应Schema"""
    webhooks = fields.List(fields.Nested(WebhookResponseSchema))
    total = fields.Integer()
    page = fields.Integer()
    size = fields.Integer()


class WebhookLogListResponseSchema(Schema):
    """Webhook日志列表响应Schema"""
    logs = fields.List(fields.Nested(WebhookLogResponseSchema))
    total = fields.Integer()
    page = fields.Integer()
    size = fields.Integer()


class PluginListResponseSchema(Schema):
    """插件列表响应Schema"""
    plugins = fields.List(fields.Nested(PluginResponseSchema))
    total = fields.Integer()
    page = fields.Integer()
    size = fields.Integer()


class ExternalIntegrationListResponseSchema(Schema):
    """外部集成列表响应Schema"""
    integrations = fields.List(fields.Nested(ExternalIntegrationResponseSchema))
    total = fields.Integer()
    page = fields.Integer()
    size = fields.Integer()


class IntegrationSyncLogListResponseSchema(Schema):
    """同步日志列表响应Schema"""
    logs = fields.List(fields.Nested(IntegrationSyncLogResponseSchema))
    total = fields.Integer()
    page = fields.Integer()
    size = fields.Integer()


class IntegrationTypeListResponseSchema(Schema):
    """集成类型列表响应Schema"""
    types = fields.List(fields.Nested(IntegrationTypeResponseSchema))


# ==================== 操作结果Schema ====================

class WebhookTestResultSchema(Schema):
    """Webhook测试结果Schema"""
    success = fields.Boolean()
    status_code = fields.Integer(allow_none=True)
    execution_time_ms = fields.Integer()
    response_body = fields.String(allow_none=True)
    error = fields.String(allow_none=True)


class IntegrationSyncResultSchema(Schema):
    """集成同步结果Schema"""
    message = fields.String()
    integration_id = fields.String()
    sync_started = fields.Boolean()


class PluginMarketplaceResponseSchema(Schema):
    """插件市场响应Schema"""
    plugins = fields.List(fields.Nested(PluginResponseSchema))
    total = fields.Integer()
    page = fields.Integer()
    size = fields.Integer()
    featured = fields.List(fields.Nested(PluginResponseSchema))
    trending = fields.List(fields.Nested(PluginResponseSchema))


# ==================== 健康检查Schema ====================

class IntegrationHealthSchema(Schema):
    """集成服务健康检查Schema"""
    status = fields.String()
    service = fields.String()
    timestamp = fields.DateTime(format='iso')
    version = fields.String()
    database = fields.String()
    cache = fields.String()
    webhooks_active = fields.Integer()
    integrations_active = fields.Integer()
    plugins_installed = fields.Integer()


# ==================== 通用响应Schema ====================

from serializes.response_serialize import RspMsgSchema, RspMsgDictSchema, RspMsgListSchema

# 集成专用响应Schema
class WebhookResponseWrapperSchema(RspMsgDictSchema):
    """Webhook响应包装Schema"""
    content = fields.Nested(WebhookResponseSchema)


class WebhookListResponseWrapperSchema(RspMsgDictSchema):
    """Webhook列表响应包装Schema"""
    content = fields.Nested(WebhookListResponseSchema)


class PluginResponseWrapperSchema(RspMsgDictSchema):
    """插件响应包装Schema"""
    content = fields.Nested(PluginResponseSchema)


class PluginListResponseWrapperSchema(RspMsgDictSchema):
    """插件列表响应包装Schema"""
    content = fields.Nested(PluginListResponseSchema)


class ExternalIntegrationResponseWrapperSchema(RspMsgDictSchema):
    """外部集成响应包装Schema"""
    content = fields.Nested(ExternalIntegrationResponseSchema)


class ExternalIntegrationListResponseWrapperSchema(RspMsgDictSchema):
    """外部集成列表响应包装Schema"""
    content = fields.Nested(ExternalIntegrationListResponseSchema)


class IntegrationTypeListResponseWrapperSchema(RspMsgDictSchema):
    """集成类型列表响应包装Schema"""
    content = fields.Nested(IntegrationTypeListResponseSchema)


class IntegrationHealthResponseSchema(RspMsgDictSchema):
    """集成健康检查响应Schema"""
    content = fields.Nested(IntegrationHealthSchema)