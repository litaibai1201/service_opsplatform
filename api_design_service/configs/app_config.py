# -*- coding: utf-8 -*-
"""
@文件: app_config.py
@說明: 应用配置文件 (API Design Service)
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
SERVER_PORT = 25703  # API设计服务端口
WORKER_THREADS = 30

# API设计相关配置
API_DOCS_EXPORT_PATH = "/tmp/api_docs_exports"
SUPPORTED_EXPORT_FORMATS = ["json", "yaml", "html", "pdf", "markdown"]
MAX_SPEC_SIZE_MB = 50
MAX_ENDPOINTS_PER_SPEC = 1000

# API类型配置
SUPPORTED_API_TYPES = ["rest", "graphql", "grpc", "websocket"]

# API状态配置
SUPPORTED_API_STATUSES = ["draft", "review", "published", "deprecated"]

# 代码生成配置
SUPPORTED_CLIENT_LANGUAGES = [
    "javascript", "python", "java", "csharp", "go", "swift"
]

SUPPORTED_SERVER_FRAMEWORKS = [
    "express", "flask", "spring", "aspnet", "gin", "django"
]

# 测试配置
MAX_TEST_TIMEOUT_SECONDS = 300
DEFAULT_TEST_TIMEOUT_SECONDS = 30
MAX_TEST_CASES_PER_SUITE = 500

# Mock服务配置
MAX_MOCK_SCENARIOS_PER_ENDPOINT = 10
DEFAULT_MOCK_DELAY_MS = 100
MAX_MOCK_DELAY_MS = 10000

# 文档配置
AUTO_GENERATE_DOCS = True
DOCS_CACHE_EXPIRE_HOURS = 24
MAX_DOC_SIZE_MB = 20

# 分析配置
ANALYTICS_RETENTION_DAYS = 365
ANALYTICS_BATCH_SIZE = 1000
PERFORMANCE_METRICS_ENABLED = True