# -*- coding: utf-8 -*-
"""
@文件: __init__.py
@說明: 视图包初始化 (Integration Service)
@時間: 2025-01-09
@作者: LiDong
"""

from .integration_api import blp as integration_blueprint

__all__ = ['integration_blueprint']