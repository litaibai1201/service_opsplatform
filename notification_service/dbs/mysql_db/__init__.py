# -*- coding: utf-8 -*-
"""
@文件: __init__.py
@說明: MySQL数据库初始化 (Notification Service)
@時間: 2025-01-09
@作者: LiDong
"""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

__all__ = ['db']