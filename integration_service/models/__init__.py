# -*- coding: utf-8 -*-
"""
@文件: __init__.py
@說明: 模型包初始化 (Integration Service)
@時間: 2025-01-09
@作者: LiDong
"""

from .integration_model import webhook_model, plugin_model, integration_model

__all__ = ['webhook_model', 'plugin_model', 'integration_model']