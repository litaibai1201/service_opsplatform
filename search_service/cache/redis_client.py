# -*- coding: utf-8 -*-
"""
@文件: redis_client.py
@說明: Redis客户端封装
@時間: 2025-01-09
@作者: LiDong
"""

import json
import pickle
import redis
from typing import Any, Optional, Union
from flask import Flask
from loggers import logger


class RedisClient:
    """Redis客户端封装类"""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self._initialized = False
    
    def init_app(self, app: Flask):
        """初始化Redis客户端"""
        try:
            redis_url = app.config.get('REDIS_URL', 'redis://localhost:6379/0')
            
            # 创建Redis连接
            self.redis_client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
            
            # 测试连接
            self.redis_client.ping()
            self._initialized = True
            logger.info(f"Redis连接初始化成功: {redis_url}")
            
        except Exception as e:
            logger.error(f"Redis连接初始化失败: {str(e)}")
            self.redis_client = None
            self._initialized = False
    
    def _ensure_connection(self):
        """确保Redis连接可用"""
        if not self._initialized or self.redis_client is None:
            raise Exception("Redis客户端未初始化")
    
    def set(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """设置键值对"""
        try:
            self._ensure_connection()
            
            # 序列化值
            if isinstance(value, (dict, list, tuple)):
                serialized_value = json.dumps(value, ensure_ascii=False)
            elif isinstance(value, (int, float, bool)):
                serialized_value = str(value)
            else:
                serialized_value = str(value)
            
            result = self.redis_client.set(key, serialized_value, ex=expire)
            return bool(result)
            
        except Exception as e:
            logger.error(f"Redis SET操作失败: {key} - {str(e)}")
            return False
    
    def get(self, key: str, default: Any = None) -> Any:
        """获取键值"""
        try:
            self._ensure_connection()
            
            value = self.redis_client.get(key)
            if value is None:
                return default
            
            # 尝试反序列化JSON
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                # 如果不是JSON，返回字符串值
                return value
                
        except Exception as e:
            logger.error(f"Redis GET操作失败: {key} - {str(e)}")
            return default
    
    def delete(self, *keys: str) -> int:
        """删除键"""
        try:
            self._ensure_connection()
            return self.redis_client.delete(*keys)
        except Exception as e:
            logger.error(f"Redis DELETE操作失败: {keys} - {str(e)}")
            return 0
    
    def exists(self, key: str) -> bool:
        """检查键是否存在"""
        try:
            self._ensure_connection()
            return bool(self.redis_client.exists(key))
        except Exception as e:
            logger.error(f"Redis EXISTS操作失败: {key} - {str(e)}")
            return False
    
    def expire(self, key: str, seconds: int) -> bool:
        """设置键过期时间"""
        try:
            self._ensure_connection()
            return bool(self.redis_client.expire(key, seconds))
        except Exception as e:
            logger.error(f"Redis EXPIRE操作失败: {key} - {str(e)}")
            return False
    
    def ttl(self, key: str) -> int:
        """获取键剩余生存时间"""
        try:
            self._ensure_connection()
            return self.redis_client.ttl(key)
        except Exception as e:
            logger.error(f"Redis TTL操作失败: {key} - {str(e)}")
            return -2
    
    def incr(self, key: str, amount: int = 1) -> Optional[int]:
        """递增键值"""
        try:
            self._ensure_connection()
            return self.redis_client.incr(key, amount)
        except Exception as e:
            logger.error(f"Redis INCR操作失败: {key} - {str(e)}")
            return None
    
    def setex(self, key: str, seconds: int, value: Any) -> bool:
        """设置键值对并指定过期时间"""
        try:
            self._ensure_connection()
            
            # 序列化值
            if isinstance(value, (dict, list, tuple)):
                serialized_value = json.dumps(value, ensure_ascii=False)
            else:
                serialized_value = str(value)
            
            result = self.redis_client.setex(key, seconds, serialized_value)
            return bool(result)
            
        except Exception as e:
            logger.error(f"Redis SETEX操作失败: {key} - {str(e)}")
            return False
    
    def hset(self, name: str, mapping: dict) -> bool:
        """设置哈希表"""
        try:
            self._ensure_connection()
            
            # 序列化哈希表值
            serialized_mapping = {}
            for k, v in mapping.items():
                if isinstance(v, (dict, list, tuple)):
                    serialized_mapping[k] = json.dumps(v, ensure_ascii=False)
                else:
                    serialized_mapping[k] = str(v)
            
            result = self.redis_client.hset(name, mapping=serialized_mapping)
            return True
            
        except Exception as e:
            logger.error(f"Redis HSET操作失败: {name} - {str(e)}")
            return False
    
    def hget(self, name: str, key: str, default: Any = None) -> Any:
        """获取哈希表字段值"""
        try:
            self._ensure_connection()
            
            value = self.redis_client.hget(name, key)
            if value is None:
                return default
            
            # 尝试反序列化JSON
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
                
        except Exception as e:
            logger.error(f"Redis HGET操作失败: {name}.{key} - {str(e)}")
            return default
    
    def hgetall(self, name: str) -> dict:
        """获取哈希表所有字段"""
        try:
            self._ensure_connection()
            
            hash_data = self.redis_client.hgetall(name)
            if not hash_data:
                return {}
            
            # 反序列化值
            result = {}
            for k, v in hash_data.items():
                try:
                    result[k] = json.loads(v)
                except (json.JSONDecodeError, TypeError):
                    result[k] = v
            
            return result
            
        except Exception as e:
            logger.error(f"Redis HGETALL操作失败: {name} - {str(e)}")
            return {}
    
    def hdel(self, name: str, *keys: str) -> int:
        """删除哈希表字段"""
        try:
            self._ensure_connection()
            return self.redis_client.hdel(name, *keys)
        except Exception as e:
            logger.error(f"Redis HDEL操作失败: {name} - {str(e)}")
            return 0
    
    def sadd(self, name: str, *values: Any) -> int:
        """向集合添加元素"""
        try:
            self._ensure_connection()
            
            # 序列化值
            serialized_values = []
            for v in values:
                if isinstance(v, (dict, list, tuple)):
                    serialized_values.append(json.dumps(v, ensure_ascii=False))
                else:
                    serialized_values.append(str(v))
            
            return self.redis_client.sadd(name, *serialized_values)
            
        except Exception as e:
            logger.error(f"Redis SADD操作失败: {name} - {str(e)}")
            return 0
    
    def srem(self, name: str, *values: Any) -> int:
        """从集合删除元素"""
        try:
            self._ensure_connection()
            
            # 序列化值
            serialized_values = []
            for v in values:
                if isinstance(v, (dict, list, tuple)):
                    serialized_values.append(json.dumps(v, ensure_ascii=False))
                else:
                    serialized_values.append(str(v))
            
            return self.redis_client.srem(name, *serialized_values)
            
        except Exception as e:
            logger.error(f"Redis SREM操作失败: {name} - {str(e)}")
            return 0
    
    def smembers(self, name: str) -> set:
        """获取集合所有成员"""
        try:
            self._ensure_connection()
            
            members = self.redis_client.smembers(name)
            if not members:
                return set()
            
            # 反序列化成员
            result = set()
            for member in members:
                try:
                    result.add(json.loads(member))
                except (json.JSONDecodeError, TypeError):
                    result.add(member)
            
            return result
            
        except Exception as e:
            logger.error(f"Redis SMEMBERS操作失败: {name} - {str(e)}")
            return set()
    
    def sismember(self, name: str, value: Any) -> bool:
        """检查元素是否在集合中"""
        try:
            self._ensure_connection()
            
            # 序列化值
            if isinstance(value, (dict, list, tuple)):
                serialized_value = json.dumps(value, ensure_ascii=False)
            else:
                serialized_value = str(value)
            
            return bool(self.redis_client.sismember(name, serialized_value))
            
        except Exception as e:
            logger.error(f"Redis SISMEMBER操作失败: {name} - {str(e)}")
            return False
    
    def lpush(self, name: str, *values: Any) -> int:
        """向列表左端推入元素"""
        try:
            self._ensure_connection()
            
            # 序列化值
            serialized_values = []
            for v in values:
                if isinstance(v, (dict, list, tuple)):
                    serialized_values.append(json.dumps(v, ensure_ascii=False))
                else:
                    serialized_values.append(str(v))
            
            return self.redis_client.lpush(name, *serialized_values)
            
        except Exception as e:
            logger.error(f"Redis LPUSH操作失败: {name} - {str(e)}")
            return 0
    
    def rpop(self, name: str) -> Any:
        """从列表右端弹出元素"""
        try:
            self._ensure_connection()
            
            value = self.redis_client.rpop(name)
            if value is None:
                return None
            
            # 尝试反序列化
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
                
        except Exception as e:
            logger.error(f"Redis RPOP操作失败: {name} - {str(e)}")
            return None
    
    def llen(self, name: str) -> int:
        """获取列表长度"""
        try:
            self._ensure_connection()
            return self.redis_client.llen(name)
        except Exception as e:
            logger.error(f"Redis LLEN操作失败: {name} - {str(e)}")
            return 0
    
    def ping(self) -> bool:
        """测试连接"""
        try:
            self._ensure_connection()
            self.redis_client.ping()
            return True
        except Exception as e:
            logger.error(f"Redis PING失败: {str(e)}")
            return False
    
    def flushdb(self) -> bool:
        """清空当前数据库"""
        try:
            self._ensure_connection()
            result = self.redis_client.flushdb()
            return bool(result)
        except Exception as e:
            logger.error(f"Redis FLUSHDB失败: {str(e)}")
            return False
    
    def keys(self, pattern: str = '*') -> list:
        """获取匹配模式的键"""
        try:
            self._ensure_connection()
            return list(self.redis_client.keys(pattern))
        except Exception as e:
            logger.error(f"Redis KEYS操作失败: {pattern} - {str(e)}")
            return []
    
    def pipeline(self):
        """创建管道"""
        try:
            self._ensure_connection()
            return self.redis_client.pipeline()
        except Exception as e:
            logger.error(f"Redis PIPELINE创建失败: {str(e)}")
            return None