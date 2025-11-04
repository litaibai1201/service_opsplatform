# -*- coding: utf-8 -*-
"""
@文件: __init__.py
@說明: 视图包初始化 (Notification Service)
@時間: 2025-01-09
@作者: LiDong
"""

from .notification_api import blp as notification_blueprint

__all__ = ['notification_blueprint']