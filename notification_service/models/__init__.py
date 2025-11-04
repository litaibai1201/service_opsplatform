# -*- coding: utf-8 -*-
"""
@文件: __init__.py
@說明: 模型包初始化 (Notification Service)
@時間: 2025-01-09
@作者: LiDong
"""

from .notification_model import (
    template_model, preference_model, notification_model,
    email_queue_model, push_notification_model, user_device_model
)

__all__ = [
    'template_model', 'preference_model', 'notification_model',
    'email_queue_model', 'push_notification_model', 'user_device_model'
]