# -*- coding: utf-8 -*-
"""
@文件: log_conf.py
@說明: 日志配置文件
@時間: 2025-01-09
@作者: LiDong
"""

log_conf = {
    "server": {
        "LOG_NAME": "api_gateway",
        "PATH": "logs",
        "LOG_FMT": "%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s"
    }
}