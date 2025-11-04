# -*- coding: utf-8 -*-
"""
@文件: __init__.py
@說明: 数据库模块初始化 (Audit Service)
@時間: 2025-01-09
@作者: LiDong
"""

from .mysql_db import db, DBFunction
from .elasticsearch_db import es_client

__all__ = ['db', 'DBFunction', 'es_client']