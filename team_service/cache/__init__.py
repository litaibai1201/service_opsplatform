# -*- coding: utf-8 -*-
"""
@文件: __init__.py
@說明: 缓存模块初始化
@時間: 2025-01-09
@作者: LiDong
"""

import redis


class RedisClient:
    """Redis客户端封装"""
    
    def __init__(self):
        self.redis_client = None
    
    def init_app(self, app):
        """初始化Redis连接"""
        redis_url = app.config.get('REDIS_URL')
        if redis_url:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
        else:
            # 兼容旧配置方式
            self.redis_client = redis.Redis(
                host=app.config.get('REDIS_HOST', 'localhost'),
                port=app.config.get('REDIS_PORT', 6379),
                db=app.config.get('REDIS_DB', 0),
                password=app.config.get('REDIS_PASSWORD'),
                decode_responses=True
            )
    
    def get(self, key):
        """获取缓存值"""
        if self.redis_client:
            return self.redis_client.get(key)
        return None
    
    def set(self, key, value, ex=None):
        """设置缓存值"""
        if self.redis_client:
            return self.redis_client.set(key, value, ex=ex)
        return False
    
    def setex(self, key, time, value):
        """设置带过期时间的缓存值"""
        if self.redis_client:
            return self.redis_client.setex(key, time, value)
        return False
    
    def delete(self, key):
        """删除缓存值"""
        if self.redis_client:
            return self.redis_client.delete(key)
        return False
    
    def exists(self, key):
        """检查键是否存在"""
        if self.redis_client:
            return self.redis_client.exists(key)
        return False
    
    def incr(self, key):
        """递增"""
        if self.redis_client:
            return self.redis_client.incr(key)
        return 0
    
    def expire(self, key, time):
        """设置过期时间"""
        if self.redis_client:
            return self.redis_client.expire(key, time)
        return False
    
    def ping(self):
        """测试连接"""
        if self.redis_client:
            return self.redis_client.ping()
        return False
    
    def flushdb(self):
        """清空当前数据库"""
        if self.redis_client:
            return self.redis_client.flushdb()
        return False
    
    def hget(self, name, key):
        """获取哈希字段值"""
        if self.redis_client:
            return self.redis_client.hget(name, key)
        return None
    
    def hset(self, name, key, value):
        """设置哈希字段值"""
        if self.redis_client:
            return self.redis_client.hset(name, key, value)
        return False
    
    def hmget(self, name, keys):
        """批量获取哈希字段值"""
        if self.redis_client:
            return self.redis_client.hmget(name, keys)
        return None
    
    def hmset(self, name, mapping):
        """批量设置哈希字段值"""
        if self.redis_client:
            return self.redis_client.hmset(name, mapping)
        return False
    
    def hgetall(self, name):
        """获取哈希所有字段"""
        if self.redis_client:
            return self.redis_client.hgetall(name)
        return {}
    
    def hdel(self, name, *keys):
        """删除哈希字段"""
        if self.redis_client:
            return self.redis_client.hdel(name, *keys)
        return False
    
    def sadd(self, name, *values):
        """向集合添加成员"""
        if self.redis_client:
            return self.redis_client.sadd(name, *values)
        return False
    
    def sismember(self, name, value):
        """检查是否为集合成员"""
        if self.redis_client:
            return self.redis_client.sismember(name, value)
        return False
    
    def srem(self, name, *values):
        """从集合移除成员"""
        if self.redis_client:
            return self.redis_client.srem(name, *values)
        return False


# 创建全局Redis客户端实例
redis_client = RedisClient()