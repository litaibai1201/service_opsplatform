# -*- coding: utf-8 -*-
"""
@文件: __init__.py
@說明: 日志模块初始化
@時間: 2025-01-09
@作者: LiDong
"""

from loggers.write_log import enable_log

logger = enable_log("server")
