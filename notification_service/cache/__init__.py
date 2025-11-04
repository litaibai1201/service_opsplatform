# -*- coding: utf-8 -*-
"""
@文件: __init__.py
@說明: Redis 缓存模块
@時間: 2025-01-09
@作者: LiDong
"""

from .redis_client import RedisClient

# 创建全局Redis客户端实例
redis_client = RedisClient()