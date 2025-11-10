# -*- coding: utf-8 -*-
"""
@文件: app_config.py
@說明: 应用配置文件 (优化版本)
@時間: 2025-01-09
@作者: LiDong
"""

from configs.db_config import db_config_dict


# MongoDB 配置
MONGODB_URI = "mongodb://{}:{}@{}:{}/{}?authSource=admin".format(
    db_config_dict.get("mongodb", {}).get("username", "admin"),
    db_config_dict.get("mongodb", {}).get("password", "password"),
    db_config_dict.get("mongodb", {}).get("host", "localhost"),
    db_config_dict.get("mongodb", {}).get("port", 27017),
    db_config_dict.get("mongodb", {}).get("database_name", "api_design_db"),
)


SQLALCHEMY_DATABASE_URI = "mysql+pymysql://{}:{}@{}:{}/{}?charset=utf8mb4".format(
    db_config_dict["mysql_db"]["username"],
    db_config_dict["mysql_db"]["password"],
    db_config_dict["mysql_db"]["host"],
    db_config_dict["mysql_db"]["port"],
    db_config_dict["mysql_db"]["database_name"],
)


REDIS_PASSWORD = db_config_dict.get("redis", {}).get("password", "")
if REDIS_PASSWORD and REDIS_PASSWORD != "":
    REDIS_DATABASE_URI = "redis://{}@{}:{}/{}".format(
        db_config_dict["redis"]["password"],
        db_config_dict["redis"]["host"],
        db_config_dict["redis"]["port"],
        db_config_dict["redis"]["database_name"],
    )
else:
    REDIS_DATABASE_URI = "redis://{}:{}/{}".format(
        db_config_dict["redis"]["host"],
        db_config_dict["redis"]["port"],
        db_config_dict["redis"]["database_name"],
    )

# Flask 应用配置
SECRET_KEY = "abc"

# 服务器配置
SERVER_HOST = "0.0.0.0"
SERVER_PORT = 25700
WORKER_THREADS = 30