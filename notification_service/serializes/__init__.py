# -*- coding: utf-8 -*-
"""
@文件: __init__.py
@說明: 序列化包初始化 (Notification Service)
@時間: 2025-01-09
@作者: LiDong
"""

from .response_serialize import RspMsgSchema, RspMsgDictSchema, RspMsgListSchema
from .notification_serialize import (
    NotificationTemplateCreateSchema, NotificationTemplateUpdateSchema,
    NotificationTemplateListSchema, NotificationPreferenceSchema,
    UserNotificationPreferencesUpdateSchema, NotificationListSchema,
    CreateInAppNotificationSchema, SendEmailSchema, SendPushNotificationSchema,
    RegisterDeviceSchema, UserDeviceListSchema, SendNotificationSchema,
    SendBulkNotificationsSchema
)

__all__ = [
    'RspMsgSchema', 'RspMsgDictSchema', 'RspMsgListSchema',
    'NotificationTemplateCreateSchema', 'NotificationTemplateUpdateSchema',
    'NotificationTemplateListSchema', 'NotificationPreferenceSchema',
    'UserNotificationPreferencesUpdateSchema', 'NotificationListSchema',
    'CreateInAppNotificationSchema', 'SendEmailSchema', 'SendPushNotificationSchema',
    'RegisterDeviceSchema', 'UserDeviceListSchema', 'SendNotificationSchema',
    'SendBulkNotificationsSchema'
]