# -*- coding: utf-8 -*-
"""
@文件: app_config.py
@說明: 应用配置文件 (Flow Diagram Service)
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
    db_config_dict.get("mongodb", {}).get("database_name", "flow_diagram_db"),
)

# Redis 配置
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
SERVER_PORT = 25702  # 流程图服务端口
WORKER_THREADS = 30

# 流程图相关配置
DIAGRAM_EXPORT_PATH = "/tmp/flow_diagram_exports"
SUPPORTED_EXPORT_FORMATS = ["png", "jpg", "svg", "pdf", "json", "xml"]
MAX_DIAGRAM_SIZE_MB = 50
MAX_NODES_PER_DIAGRAM = 1000
MAX_EDGES_PER_DIAGRAM = 2000

# 流程图类型配置
SUPPORTED_DIAGRAM_TYPES = [
    "business_process", "system_flow", "user_journey", 
    "workflow", "decision_tree"
]

# 节点类型配置
SUPPORTED_NODE_TYPES = [
    "start", "process", "decision", "end", 
    "parallel", "timer", "gateway"
]

# 模拟配置
MAX_SIMULATION_ITERATIONS = 10000
DEFAULT_SIMULATION_ITERATIONS = 1000
SIMULATION_TIMEOUT_SECONDS = 300

# 分享配置
SHARE_TOKEN_EXPIRE_DAYS = 90
MAX_SHARED_DIAGRAMS_PER_USER = 100