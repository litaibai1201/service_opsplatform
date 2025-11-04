# -*- coding: utf-8 -*-
"""
@文件: cache_config.py
@說明: 缓存配置 - 针对高频令牌验证优化
@時間: 2025-01-09
@作者: LiDong
"""

import os


class CacheConfig:
    """缓存配置类"""
    
    # ==================== Redis连接配置 ====================
    
    REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
    REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
    REDIS_DB = int(os.getenv('REDIS_DB', 0))
    REDIS_PASSWORD = os.getenv('REDIS_PASSWORD')
    REDIS_URL = os.getenv('REDIS_URL')
    
    # Redis连接池配置
    REDIS_MAX_CONNECTIONS = int(os.getenv('REDIS_MAX_CONNECTIONS', 50))
    REDIS_CONNECTION_TIMEOUT = int(os.getenv('REDIS_CONNECTION_TIMEOUT', 5))
    REDIS_SOCKET_TIMEOUT = int(os.getenv('REDIS_SOCKET_TIMEOUT', 3))
    
    # ==================== 缓存TTL配置 (秒) ====================
    
    # 令牌验证缓存 - 高频访问，短TTL
    TOKEN_VALIDATION_TTL = int(os.getenv('TOKEN_VALIDATION_TTL', 300))      # 5分钟
    
    # 用户信息缓存 - 中等频率，中等TTL  
    USER_INFO_TTL = int(os.getenv('USER_INFO_TTL', 600))                    # 10分钟
    
    # 会话信息缓存 - 低频访问，长TTL
    SESSION_INFO_TTL = int(os.getenv('SESSION_INFO_TTL', 1800))             # 30分钟
    
    # 黑名单令牌缓存 - 跟随令牌有效期
    BLACKLIST_TOKEN_TTL = int(os.getenv('BLACKLIST_TOKEN_TTL', 86400))      # 24小时(最大值)
    
    # 失败验证结果缓存 - 短期缓存，避免恶意重试
    FAILED_VALIDATION_TTL = int(os.getenv('FAILED_VALIDATION_TTL', 60))     # 1分钟
    
    # ==================== 缓存策略配置 ====================
    
    # 是否启用缓存
    ENABLE_TOKEN_CACHE = os.getenv('ENABLE_TOKEN_CACHE', 'true').lower() == 'true'
    ENABLE_USER_CACHE = os.getenv('ENABLE_USER_CACHE', 'true').lower() == 'true'
    ENABLE_SESSION_CACHE = os.getenv('ENABLE_SESSION_CACHE', 'true').lower() == 'true'
    
    # 批量操作配置
    BATCH_CACHE_SIZE = int(os.getenv('BATCH_CACHE_SIZE', 100))              # 批量缓存大小限制
    CACHE_WARM_UP_LIMIT = int(os.getenv('CACHE_WARM_UP_LIMIT', 200))        # 缓存预热用户数量限制
    
    # 缓存性能监控
    ENABLE_CACHE_METRICS = os.getenv('ENABLE_CACHE_METRICS', 'true').lower() == 'true'
    CACHE_HIT_RATE_THRESHOLD = float(os.getenv('CACHE_HIT_RATE_THRESHOLD', 0.8))  # 缓存命中率阈值
    
    # ==================== 缓存清理配置 ====================
    
    # 自动清理过期缓存
    AUTO_CLEANUP_EXPIRED = os.getenv('AUTO_CLEANUP_EXPIRED', 'true').lower() == 'true'
    CLEANUP_INTERVAL_MINUTES = int(os.getenv('CLEANUP_INTERVAL_MINUTES', 60))     # 清理间隔
    
    # 内存使用限制 (MB)
    REDIS_MAX_MEMORY_MB = int(os.getenv('REDIS_MAX_MEMORY_MB', 512))
    REDIS_MAX_MEMORY_POLICY = os.getenv('REDIS_MAX_MEMORY_POLICY', 'allkeys-lru')
    
    # ==================== 性能优化配置 ====================
    
    # 缓存键前缀优化
    USE_SHORT_CACHE_KEYS = os.getenv('USE_SHORT_CACHE_KEYS', 'true').lower() == 'true'
    
    # 序列化方式选择 (json|pickle|msgpack)
    CACHE_SERIALIZATION = os.getenv('CACHE_SERIALIZATION', 'json')
    
    # Pipeline批处理优化
    ENABLE_PIPELINE = os.getenv('ENABLE_PIPELINE', 'true').lower() == 'true'
    PIPELINE_BATCH_SIZE = int(os.getenv('PIPELINE_BATCH_SIZE', 50))
    
    # ==================== 高可用配置 ====================
    
    # 缓存降级配置
    ENABLE_CACHE_FALLBACK = os.getenv('ENABLE_CACHE_FALLBACK', 'true').lower() == 'true'
    CACHE_FAILURE_RETRY_TIMES = int(os.getenv('CACHE_FAILURE_RETRY_TIMES', 3))
    CACHE_FAILURE_TIMEOUT = int(os.getenv('CACHE_FAILURE_TIMEOUT', 1))      # 缓存失败超时时间(秒)
    
    # 熔断器配置
    ENABLE_CACHE_CIRCUIT_BREAKER = os.getenv('ENABLE_CACHE_CIRCUIT_BREAKER', 'true').lower() == 'true'
    CACHE_FAILURE_THRESHOLD = int(os.getenv('CACHE_FAILURE_THRESHOLD', 10))  # 失败次数阈值
    CACHE_RECOVERY_TIMEOUT = int(os.getenv('CACHE_RECOVERY_TIMEOUT', 30))    # 恢复超时时间(秒)
    
    # ==================== 环境特定配置 ====================
    
    @classmethod
    def get_env_config(cls):
        """根据环境获取配置"""
        env = os.getenv('FLASK_ENV', 'production').lower()
        
        if env == 'development':
            return {
                'TOKEN_VALIDATION_TTL': 60,      # 开发环境使用较短的TTL便于测试
                'USER_INFO_TTL': 120,
                'SESSION_INFO_TTL': 300,
                'ENABLE_CACHE_METRICS': True,
                'AUTO_CLEANUP_EXPIRED': True,
            }
        elif env == 'testing':
            return {
                'TOKEN_VALIDATION_TTL': 30,      # 测试环境使用很短的TTL
                'USER_INFO_TTL': 60,
                'SESSION_INFO_TTL': 120,
                'ENABLE_CACHE_METRICS': True,
                'AUTO_CLEANUP_EXPIRED': False,   # 测试环境不自动清理
            }
        else:  # production
            return {
                'TOKEN_VALIDATION_TTL': cls.TOKEN_VALIDATION_TTL,
                'USER_INFO_TTL': cls.USER_INFO_TTL,
                'SESSION_INFO_TTL': cls.SESSION_INFO_TTL,
                'ENABLE_CACHE_METRICS': cls.ENABLE_CACHE_METRICS,
                'AUTO_CLEANUP_EXPIRED': cls.AUTO_CLEANUP_EXPIRED,
            }
    
    # ==================== 性能基准配置 ====================
    
    # 期望的性能指标
    TARGET_CACHE_HIT_RATE = 0.90                # 目标缓存命中率 90%
    TARGET_RESPONSE_TIME_MS = 5                  # 目标响应时间 5ms (缓存命中时)
    TARGET_DB_FALLBACK_TIME_MS = 50             # 目标数据库回退时间 50ms
    
    # 监控阈值
    SLOW_CACHE_OPERATION_MS = 10                 # 慢缓存操作阈值 10ms
    HIGH_MEMORY_USAGE_PERCENT = 80               # 高内存使用率阈值 80%
    
    @classmethod
    def get_redis_config(cls):
        """获取Redis连接配置"""
        config = {
            'host': cls.REDIS_HOST,
            'port': cls.REDIS_PORT,
            'db': cls.REDIS_DB,
            'max_connections': cls.REDIS_MAX_CONNECTIONS,
            'socket_timeout': cls.REDIS_SOCKET_TIMEOUT,
            'socket_connect_timeout': cls.REDIS_CONNECTION_TIMEOUT,
            'decode_responses': True,
            'health_check_interval': 30,
        }
        
        if cls.REDIS_PASSWORD:
            config['password'] = cls.REDIS_PASSWORD
            
        if cls.REDIS_URL:
            config['connection_pool'] = cls.REDIS_URL
            
        return config


# 缓存性能统计
class CacheMetrics:
    """缓存性能指标"""
    
    def __init__(self):
        self.reset_metrics()
    
    def reset_metrics(self):
        """重置统计指标"""
        self.total_requests = 0
        self.cache_hits = 0
        self.cache_misses = 0
        self.cache_errors = 0
        self.total_response_time = 0
        self.db_fallback_count = 0
    
    @property
    def hit_rate(self):
        """缓存命中率"""
        if self.total_requests == 0:
            return 0.0
        return self.cache_hits / self.total_requests
    
    @property
    def error_rate(self):
        """缓存错误率"""
        if self.total_requests == 0:
            return 0.0
        return self.cache_errors / self.total_requests
    
    @property
    def avg_response_time(self):
        """平均响应时间"""
        if self.total_requests == 0:
            return 0.0
        return self.total_response_time / self.total_requests
    
    def record_hit(self, response_time_ms=0):
        """记录缓存命中"""
        self.total_requests += 1
        self.cache_hits += 1
        self.total_response_time += response_time_ms
    
    def record_miss(self, response_time_ms=0):
        """记录缓存未命中"""
        self.total_requests += 1
        self.cache_misses += 1
        self.total_response_time += response_time_ms
        self.db_fallback_count += 1
    
    def record_error(self, response_time_ms=0):
        """记录缓存错误"""
        self.total_requests += 1
        self.cache_errors += 1
        self.total_response_time += response_time_ms
        self.db_fallback_count += 1
    
    def get_stats(self):
        """获取统计信息"""
        return {
            'total_requests': self.total_requests,
            'cache_hits': self.cache_hits,
            'cache_misses': self.cache_misses,
            'cache_errors': self.cache_errors,
            'hit_rate': self.hit_rate,
            'error_rate': self.error_rate,
            'avg_response_time_ms': self.avg_response_time,
            'db_fallback_count': self.db_fallback_count
        }


# 全局缓存性能统计实例
cache_metrics = CacheMetrics()