# -*- coding: utf-8 -*-
"""
@文件: constant.py
@說明: 常量配置 (优化版本)
@時間: 2025-01-09
@作者: LiDong
"""
import os


class Config:
    """配置管理类 - 支持环境变量覆盖"""
    
    # 认证相关配置
    PASSWORD_MIN_LENGTH = int(os.getenv("PASSWORD_MIN_LENGTH", 6))
    PASSWORD_MAX_LENGTH = int(os.getenv("PASSWORD_MAX_LENGTH", 128))
    
    # 账户锁定配置
    MAX_LOGIN_ATTEMPTS = int(os.getenv("MAX_LOGIN_ATTEMPTS", 5))
    ACCOUNT_LOCKOUT_DURATION = int(os.getenv("ACCOUNT_LOCKOUT_DURATION", 24))  # 小时
    
    # JWT 配置
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "FileService2025!")
    JWT_ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_HOURS", 2))
    REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 30))
    
    # 用户名配置
    USERNAME_MIN_LENGTH = int(os.getenv("USERNAME_MIN_LENGTH", 3))
    USERNAME_MAX_LENGTH = int(os.getenv("USERNAME_MAX_LENGTH", 50))
    
    # 邮箱配置
    EMAIL_MAX_LENGTH = int(os.getenv("EMAIL_MAX_LENGTH", 100))
    EMAIL_VERIFICATION_REQUIRED = os.getenv("EMAIL_VERIFICATION_REQUIRED", "false").lower() == "true"
    
    # 全名和手机配置
    FULL_NAME_MAX_LENGTH = int(os.getenv("FULL_NAME_MAX_LENGTH", 100))
    PHONE_MAX_LENGTH = int(os.getenv("PHONE_MAX_LENGTH", 20))
    
    # 头像配置
    AVATAR_URL_MAX_LENGTH = int(os.getenv("AVATAR_URL_MAX_LENGTH", 500))
    DEFAULT_AVATAR_URL = os.getenv("DEFAULT_AVATAR_URL", "")
    
    # 分页配置
    DEFAULT_PAGE_SIZE = int(os.getenv("DEFAULT_PAGE_SIZE", 10))
    MAX_PAGE_SIZE = int(os.getenv("MAX_PAGE_SIZE", 100))
    
    # 会话管理配置
    MAX_ACTIVE_SESSIONS_PER_USER = int(os.getenv("MAX_ACTIVE_SESSIONS_PER_USER", 10))
    SESSION_CLEANUP_HOURS = int(os.getenv("SESSION_CLEANUP_HOURS", 24))
    
    # 安全配置
    ENABLE_RATE_LIMITING = os.getenv("ENABLE_RATE_LIMITING", "true").lower() == "true"
    LOGIN_RATE_LIMIT = os.getenv("LOGIN_RATE_LIMIT", "5/minute")
    REGISTER_RATE_LIMIT = os.getenv("REGISTER_RATE_LIMIT", "3/minute")
    
    # 日志配置
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_RETENTION_DAYS = int(os.getenv("LOG_RETENTION_DAYS", 30))
    
    # 数据库配置
    DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", 10))
    DB_POOL_RECYCLE_HOURS = int(os.getenv("DB_POOL_RECYCLE_HOURS", 3))
    
    # 缓存配置
    CACHE_DEFAULT_TIMEOUT = int(os.getenv("CACHE_DEFAULT_TIMEOUT", 300))  # 5分钟
    CACHE_KEY_PREFIX = os.getenv("CACHE_KEY_PREFIX", "file_service:")
    
    # 文件上传配置
    FILE_UPLOAD_FOLDER = os.getenv("FILE_UPLOAD_FOLDER", "./uploads")
    FILE_TEMP_FOLDER = os.getenv("FILE_TEMP_FOLDER", "./temp")
    FILE_MAX_SIZE = int(os.getenv("FILE_MAX_SIZE", 100 * 1024 * 1024))  # 100MB
    FILE_CHUNK_SIZE = int(os.getenv("FILE_CHUNK_SIZE", 1024 * 1024))  # 1MB
    
    # 允许的文件扩展名
    FILE_ALLOWED_EXTENSIONS = set(os.getenv("FILE_ALLOWED_EXTENSIONS", 
        ".jpg,.jpeg,.png,.gif,.bmp,.svg,.webp,.pdf,.doc,.docx,.xls,.xlsx,"
        ".ppt,.pptx,.txt,.md,.zip,.rar,.7z,.tar,.gz,.mp4,.avi,.mov,.wmv,"
        ".mp3,.wav,.flac,.aac,.ogg"
    ).split(','))
    
    # 网关配置
    GATEWAY_DEFAULT_TIMEOUT = int(os.getenv("GATEWAY_DEFAULT_TIMEOUT", 30))
    GATEWAY_MAX_RETRY_COUNT = int(os.getenv("GATEWAY_MAX_RETRY_COUNT", 3))
    CIRCUIT_BREAKER_THRESHOLD = int(os.getenv("CIRCUIT_BREAKER_THRESHOLD", 5))


# 角色权限配置
ROLE_PERMISSIONS = {
    "admin": {
        "can_manage_users": True,
        "can_view_system_logs": True,
        "can_modify_system_config": True,
        "can_access_admin_apis": True
    },
    "user": {
        "can_manage_users": False,
        "can_view_system_logs": False,
        "can_modify_system_config": False,
        "can_access_admin_apis": False
    }
}

# API 端点配置
API_ENDPOINTS = {
    "auth": {
        "login": "/auth/login",
        "register": "/auth/register", 
        "refresh": "/auth/refresh",
        "profile": "/auth/profile",
        "logout": "/auth/logout",
        "sessions": "/auth/sessions"
    }
}

# 错误代码配置
ERROR_CODES = {
    # 成功
    "SUCCESS": "S10000",
    
    # 客户端错误 4xxxx
    "BAD_REQUEST": "F40000",
    "UNAUTHORIZED": "F40001", 
    "FORBIDDEN": "F40003",
    "NOT_FOUND": "F40004",
    "METHOD_NOT_ALLOWED": "F40005",
    "VALIDATION_ERROR": "F40022",
    "RATE_LIMITED": "F40029",
    
    # 认证相关错误 401xx
    "INVALID_CREDENTIALS": "F40101",
    "ACCOUNT_LOCKED": "F40102",
    "TOKEN_EXPIRED": "F40103",
    "TOKEN_INVALID": "F40104",
    "EMAIL_NOT_VERIFIED": "F40105",
    
    # 业务逻辑错误 422xx
    "SEARCH_QUERY_INVALID": "F42201",
    "RESOURCE_NOT_FOUND": "F42202",
    "INDEX_NOT_FOUND": "F42203",
    "INVALID_FILTER": "F42204",
    "SEARCH_TIMEOUT": "F42205",
    
    # 搜索服务错误 503xx
    "ELASTICSEARCH_ERROR": "F50301",
    "INDEX_ERROR": "F50302",
    "SEARCH_SERVICE_UNAVAILABLE": "F50303",
    
    # 服务器错误 5xxxx
    "INTERNAL_ERROR": "F50000",
    "DATABASE_ERROR": "F50001",
    "CACHE_ERROR": "F50002",
    "EXTERNAL_SERVICE_ERROR": "F50003"
}

# 向后兼容
conf = {
    "PASSWORD_MIN_LENGTH": Config.PASSWORD_MIN_LENGTH,
    "PASSWORD_MAX_LENGTH": Config.PASSWORD_MAX_LENGTH,
    "MAX_LOGIN_ATTEMPTS": Config.MAX_LOGIN_ATTEMPTS,
    "ACCOUNT_LOCKOUT_DURATION": Config.ACCOUNT_LOCKOUT_DURATION,
    "JWT_SECRET_KEY": Config.JWT_SECRET_KEY,
    "JWT_ACCESS_TOKEN_EXPIRE_HOURS": Config.JWT_ACCESS_TOKEN_EXPIRE_HOURS,
    "REFRESH_TOKEN_EXPIRE_DAYS": Config.REFRESH_TOKEN_EXPIRE_DAYS,
    "USERNAME_MIN_LENGTH": Config.USERNAME_MIN_LENGTH,
    "USERNAME_MAX_LENGTH": Config.USERNAME_MAX_LENGTH,
    "EMAIL_MAX_LENGTH": Config.EMAIL_MAX_LENGTH,
    "EMAIL_VERIFICATION_REQUIRED": Config.EMAIL_VERIFICATION_REQUIRED,
    "DEFAULT_PAGE_SIZE": Config.DEFAULT_PAGE_SIZE,
    "MAX_PAGE_SIZE": Config.MAX_PAGE_SIZE,
    "MAX_ACTIVE_SESSIONS_PER_USER": Config.MAX_ACTIVE_SESSIONS_PER_USER,
    "LOG_LEVEL": Config.LOG_LEVEL,
    "CACHE_DEFAULT_TIMEOUT": Config.CACHE_DEFAULT_TIMEOUT,
    "ROLE_PERMISSIONS": ROLE_PERMISSIONS,
    "API_ENDPOINTS": API_ENDPOINTS,
    "ERROR_CODES": ERROR_CODES
}