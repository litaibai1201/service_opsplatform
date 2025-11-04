# -*- coding: utf-8 -*-
"""
@文件: notification_serialize.py
@說明: 通知服务序列化器
@時間: 2025-01-09
@作者: LiDong
"""
from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from datetime import datetime, time


# ==================== 基础Schema ====================

class PaginationSchema(Schema):
    """分页参数Schema"""
    page = fields.Integer(missing=1, validate=validate.Range(min=1))
    size = fields.Integer(missing=20, validate=validate.Range(min=1, max=100))


# ==================== 通知模板相关Schema ====================

class NotificationTemplateCreateSchema(Schema):
    """创建通知模板请求Schema"""
    name = fields.String(required=True, validate=validate.Length(min=1, max=255))
    type = fields.String(required=True, validate=validate.Length(min=1, max=100))
    event_type = fields.String(required=True, validate=validate.Length(min=1, max=100))
    subject_template = fields.String(missing=None)
    content_template = fields.String(required=True)
    html_template = fields.String(missing=None)
    variables = fields.Dict(missing={})
    is_active = fields.Boolean(missing=True)
    locale = fields.String(missing='en', validate=validate.Length(max=10))


class NotificationTemplateUpdateSchema(Schema):
    """更新通知模板请求Schema"""
    name = fields.String(missing=None, validate=validate.Length(min=1, max=255))
    type = fields.String(missing=None, validate=validate.Length(min=1, max=100))
    event_type = fields.String(missing=None, validate=validate.Length(min=1, max=100))
    subject_template = fields.String(missing=None)
    content_template = fields.String(missing=None)
    html_template = fields.String(missing=None)
    variables = fields.Dict(missing=None)
    is_active = fields.Boolean(missing=None)
    locale = fields.String(missing=None, validate=validate.Length(max=10))


class NotificationTemplateListSchema(PaginationSchema):
    """通知模板列表请求Schema"""
    event_type = fields.String(missing=None)
    type = fields.String(missing=None)
    is_active = fields.Boolean(missing=None)
    locale = fields.String(missing=None)


# ==================== 用户通知偏好相关Schema ====================

class NotificationPreferenceSchema(Schema):
    """通知偏好Schema"""
    event_type = fields.String(required=True, validate=validate.Length(min=1, max=100))
    email_enabled = fields.Boolean(missing=True)
    in_app_enabled = fields.Boolean(missing=True)
    push_enabled = fields.Boolean(missing=False)
    sms_enabled = fields.Boolean(missing=False)
    frequency = fields.String(missing='immediate', validate=validate.OneOf([
        'immediate', 'hourly', 'daily', 'weekly'
    ]))
    quiet_hours_start = fields.Time(missing=None)
    quiet_hours_end = fields.Time(missing=None)
    timezone = fields.String(missing=None, validate=validate.Length(max=50))


class UserNotificationPreferencesUpdateSchema(Schema):
    """更新用户通知偏好请求Schema"""
    preferences = fields.List(fields.Nested(NotificationPreferenceSchema), required=True)


# ==================== 通知相关Schema ====================

class NotificationListSchema(PaginationSchema):
    """通知列表请求Schema"""
    is_read = fields.Boolean(missing=None)
    priority = fields.String(missing=None, validate=validate.OneOf([
        'low', 'normal', 'high', 'urgent'
    ]))


class CreateInAppNotificationSchema(Schema):
    """创建应用内通知请求Schema"""
    user_id = fields.String(required=True, validate=validate.Length(min=1))
    title = fields.String(required=True, validate=validate.Length(min=1, max=255))
    content = fields.String(required=True)
    type = fields.String(missing='system', validate=validate.Length(max=100))
    priority = fields.String(missing='normal', validate=validate.OneOf([
        'low', 'normal', 'high', 'urgent'
    ]))
    data = fields.Dict(missing={})
    expires_hours = fields.Integer(missing=None, validate=validate.Range(min=1))


# ==================== 邮件相关Schema ====================

class SendEmailSchema(Schema):
    """发送邮件请求Schema"""
    to_email = fields.Email(required=True)
    to_name = fields.String(missing=None, validate=validate.Length(max=255))
    subject = fields.String(required=True, validate=validate.Length(min=1, max=255))
    content = fields.String(required=True)
    html_content = fields.String(missing=None)
    template_id = fields.String(missing=None)
    template_data = fields.Dict(missing={})
    attachments = fields.List(fields.Dict(), missing=[])
    priority = fields.String(missing='normal', validate=validate.OneOf([
        'low', 'normal', 'high'
    ]))
    scheduled_at = fields.DateTime(missing=None)


# ==================== 推送通知相关Schema ====================

class SendPushNotificationSchema(Schema):
    """发送推送通知请求Schema"""
    user_id = fields.String(required=True, validate=validate.Length(min=1))
    title = fields.String(required=True, validate=validate.Length(min=1, max=255))
    body = fields.String(required=True)
    data = fields.Dict(missing={})
    device_tokens = fields.List(fields.String(), missing=None)


# ==================== 设备管理相关Schema ====================

class RegisterDeviceSchema(Schema):
    """注册设备请求Schema"""
    device_token = fields.String(required=True, validate=validate.Length(min=1, max=500))
    device_type = fields.String(required=True, validate=validate.OneOf([
        'ios', 'android', 'web'
    ]))
    device_name = fields.String(missing=None, validate=validate.Length(max=255))


class UserDeviceListSchema(Schema):
    """用户设备列表请求Schema"""
    is_active = fields.Boolean(missing=None)


# ==================== 统一通知发送Schema ====================

class SendNotificationSchema(Schema):
    """发送通知请求Schema"""
    user_id = fields.String(required=True, validate=validate.Length(min=1))
    event_type = fields.String(required=True, validate=validate.Length(min=1, max=100))
    variables = fields.Dict(required=True)
    notification_types = fields.List(fields.String(validate=validate.OneOf([
        'in_app', 'email', 'push', 'sms'
    ])), missing=['in_app', 'email'])
    priority = fields.String(missing='normal', validate=validate.OneOf([
        'low', 'normal', 'high', 'urgent'
    ]))
    locale = fields.String(missing='en', validate=validate.Length(max=10))


class BulkNotificationSchema(Schema):
    """批量通知Schema"""
    user_id = fields.String(required=True, validate=validate.Length(min=1))
    event_type = fields.String(required=True, validate=validate.Length(min=1, max=100))
    variables = fields.Dict(required=True)
    notification_types = fields.List(fields.String(validate=validate.OneOf([
        'in_app', 'email', 'push', 'sms'
    ])), missing=['in_app', 'email'])
    priority = fields.String(missing='normal', validate=validate.OneOf([
        'low', 'normal', 'high', 'urgent'
    ]))
    locale = fields.String(missing='en', validate=validate.Length(max=10))


class SendBulkNotificationsSchema(Schema):
    """批量发送通知请求Schema"""
    notifications = fields.List(fields.Nested(BulkNotificationSchema), required=True, 
                                validate=validate.Length(min=1, max=100))


# ==================== 响应Schema ====================

class NotificationTemplateResponseSchema(Schema):
    """通知模板响应Schema"""
    id = fields.String()
    name = fields.String()
    type = fields.String()
    event_type = fields.String()
    subject_template = fields.String(allow_none=True)
    content_template = fields.String()
    html_template = fields.String(allow_none=True)
    variables = fields.Dict()
    is_active = fields.Boolean()
    locale = fields.String()
    created_by = fields.String()
    created_at = fields.DateTime(format='iso')
    updated_at = fields.DateTime(format='iso')


class NotificationPreferenceResponseSchema(Schema):
    """通知偏好响应Schema"""
    id = fields.String()
    user_id = fields.String()
    event_type = fields.String()
    email_enabled = fields.Boolean()
    in_app_enabled = fields.Boolean()
    push_enabled = fields.Boolean()
    sms_enabled = fields.Boolean()
    frequency = fields.String()
    quiet_hours_start = fields.Time(allow_none=True)
    quiet_hours_end = fields.Time(allow_none=True)
    timezone = fields.String(allow_none=True)


class NotificationResponseSchema(Schema):
    """通知响应Schema"""
    id = fields.String()
    user_id = fields.String()
    type = fields.String()
    priority = fields.String()
    title = fields.String()
    content = fields.String()
    data = fields.Dict()
    is_read = fields.Boolean()
    read_at = fields.DateTime(format='iso', allow_none=True)
    expires_at = fields.DateTime(format='iso', allow_none=True)
    created_at = fields.DateTime(format='iso')


class EmailQueueResponseSchema(Schema):
    """邮件队列响应Schema"""
    id = fields.String()
    to_email = fields.String()
    to_name = fields.String(allow_none=True)
    from_email = fields.String(allow_none=True)
    from_name = fields.String(allow_none=True)
    subject = fields.String()
    content = fields.String()
    html_content = fields.String(allow_none=True)
    template_id = fields.String(allow_none=True)
    template_data = fields.Dict()
    attachments = fields.List(fields.Dict())
    priority = fields.String()
    status = fields.String()
    retry_count = fields.Integer()
    max_retries = fields.Integer()
    error_message = fields.String(allow_none=True)
    scheduled_at = fields.DateTime(format='iso')
    sent_at = fields.DateTime(format='iso', allow_none=True)


class PushNotificationResponseSchema(Schema):
    """推送通知响应Schema"""
    id = fields.String()
    user_id = fields.String()
    device_token = fields.String()
    title = fields.String()
    body = fields.String()
    data = fields.Dict()
    status = fields.String()
    error_message = fields.String(allow_none=True)
    sent_at = fields.DateTime(format='iso', allow_none=True)
    created_at = fields.DateTime(format='iso')


class UserDeviceResponseSchema(Schema):
    """用户设备响应Schema"""
    id = fields.String()
    user_id = fields.String()
    device_token = fields.String()
    device_type = fields.String()
    device_name = fields.String(allow_none=True)
    is_active = fields.Boolean()
    registered_at = fields.DateTime(format='iso')
    last_used_at = fields.DateTime(format='iso')


# ==================== 列表响应Schema ====================

class NotificationTemplateListResponseSchema(Schema):
    """通知模板列表响应Schema"""
    templates = fields.List(fields.Nested(NotificationTemplateResponseSchema))
    total = fields.Integer()
    page = fields.Integer()
    size = fields.Integer()


class NotificationListResponseSchema(Schema):
    """通知列表响应Schema"""
    notifications = fields.List(fields.Nested(NotificationResponseSchema))
    total = fields.Integer()
    page = fields.Integer()
    size = fields.Integer()


class UserNotificationPreferencesResponseSchema(Schema):
    """用户通知偏好响应Schema"""
    user_id = fields.String()
    preferences = fields.List(fields.Nested(NotificationPreferenceResponseSchema))


class UserDeviceListResponseSchema(Schema):
    """用户设备列表响应Schema"""
    user_id = fields.String()
    devices = fields.List(fields.Nested(UserDeviceResponseSchema))


# ==================== 操作结果Schema ====================

class UnreadCountResponseSchema(Schema):
    """未读通知数量响应Schema"""
    unread_count = fields.Integer()


class NotificationSendResultSchema(Schema):
    """通知发送结果Schema"""
    sent = fields.Boolean()
    result = fields.Raw(allow_none=True)
    error = fields.String(allow_none=True)
    reason = fields.String(allow_none=True)


class SendNotificationResultSchema(Schema):
    """发送通知结果Schema"""
    in_app = fields.Nested(NotificationSendResultSchema, allow_none=True)
    email = fields.Nested(NotificationSendResultSchema, allow_none=True)
    push = fields.Nested(NotificationSendResultSchema, allow_none=True)
    sms = fields.Nested(NotificationSendResultSchema, allow_none=True)


class BulkNotificationResultSchema(Schema):
    """批量通知结果Schema"""
    user_id = fields.String()
    event_type = fields.String()
    success = fields.Boolean()
    result = fields.Raw()


class SendBulkNotificationsResultSchema(Schema):
    """批量发送通知结果Schema"""
    notifications = fields.List(fields.Nested(BulkNotificationResultSchema))


class PushNotificationListResponseSchema(Schema):
    """推送通知列表响应Schema"""
    push_notifications = fields.List(fields.Nested(PushNotificationResponseSchema))


# ==================== 健康检查Schema ====================

class NotificationHealthSchema(Schema):
    """通知服务健康检查Schema"""
    status = fields.String()
    service = fields.String()
    timestamp = fields.DateTime(format='iso')
    version = fields.String()
    database = fields.String()
    cache = fields.String()
    email_queue_pending = fields.Integer()
    push_queue_pending = fields.Integer()
    active_templates = fields.Integer()


# ==================== 通用响应Schema ====================

from serializes.response_serialize import RspMsgSchema, RspMsgDictSchema, RspMsgListSchema

# 通知专用响应Schema
class NotificationTemplateResponseWrapperSchema(RspMsgDictSchema):
    """通知模板响应包装Schema"""
    content = fields.Nested(NotificationTemplateResponseSchema)


class NotificationTemplateListResponseWrapperSchema(RspMsgDictSchema):
    """通知模板列表响应包装Schema"""
    content = fields.Nested(NotificationTemplateListResponseSchema)


class NotificationResponseWrapperSchema(RspMsgDictSchema):
    """通知响应包装Schema"""
    content = fields.Nested(NotificationResponseSchema)


class NotificationListResponseWrapperSchema(RspMsgDictSchema):
    """通知列表响应包装Schema"""
    content = fields.Nested(NotificationListResponseSchema)


class UserNotificationPreferencesResponseWrapperSchema(RspMsgDictSchema):
    """用户通知偏好响应包装Schema"""
    content = fields.Nested(UserNotificationPreferencesResponseSchema)


class UserDeviceResponseWrapperSchema(RspMsgDictSchema):
    """用户设备响应包装Schema"""
    content = fields.Nested(UserDeviceResponseSchema)


class UserDeviceListResponseWrapperSchema(RspMsgDictSchema):
    """用户设备列表响应包装Schema"""
    content = fields.Nested(UserDeviceListResponseSchema)


class UnreadCountResponseWrapperSchema(RspMsgDictSchema):
    """未读通知数量响应包装Schema"""
    content = fields.Nested(UnreadCountResponseSchema)


class SendNotificationResultWrapperSchema(RspMsgDictSchema):
    """发送通知结果包装Schema"""
    content = fields.Nested(SendNotificationResultSchema)


class SendBulkNotificationsResultWrapperSchema(RspMsgDictSchema):
    """批量发送通知结果包装Schema"""
    content = fields.Nested(SendBulkNotificationsResultSchema)


class NotificationHealthResponseSchema(RspMsgDictSchema):
    """通知健康检查响应Schema"""
    content = fields.Nested(NotificationHealthSchema)


class EmailQueueResponseWrapperSchema(RspMsgDictSchema):
    """邮件队列响应包装Schema"""
    content = fields.Nested(EmailQueueResponseSchema)


class PushNotificationListResponseWrapperSchema(RspMsgDictSchema):
    """推送通知列表响应包装Schema"""
    content = fields.Nested(PushNotificationListResponseSchema)