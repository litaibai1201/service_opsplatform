# -*- coding: utf-8 -*-
"""
@文件: token_cache.py
@說明: 高性能令牌缓存服务 - 专为内部令牌验证优化
@時間: 2025-01-09
@作者: LiDong
"""

import json
import time
from typing import Dict, Any, Optional
from flask_jwt_extended import decode_token
from cache import redis_client
from loggers import logger


class TokenCacheService:
    """令牌缓存服务 - 超低延迟设计"""
    
    # 缓存键前缀
    TOKEN_CACHE_PREFIX = "auth:token:"
    USER_CACHE_PREFIX = "auth:user:"
    SESSION_CACHE_PREFIX = "auth:session:"
    BLACKLIST_SET = "auth:blacklist"
    
    # 缓存时间配置 (秒)
    TOKEN_CACHE_TTL = 300       # 5分钟 - 令牌信息缓存
    USER_CACHE_TTL = 600        # 10分钟 - 用户信息缓存
    SESSION_CACHE_TTL = 1800    # 30分钟 - 会话信息缓存
    
    def __init__(self):
        self.redis = redis_client
    
    # ==================== 令牌验证缓存 ====================
    
    def cache_token_validation(self, token: str, validation_result: Dict[str, Any], ttl: int = None) -> bool:
        """
        缓存令牌验证结果
        :param token: JWT令牌
        :param validation_result: 验证结果
        :param ttl: 缓存过期时间(秒)
        """
        try:
            token_hash = self._hash_token(token)
            cache_key = f"{self.TOKEN_CACHE_PREFIX}{token_hash}"
            
            # 序列化验证结果
            cache_data = {
                'result': validation_result,
                'cached_at': int(time.time()),
                'token_exp': self._get_token_exp(token)
            }
            
            cache_ttl = ttl or self.TOKEN_CACHE_TTL
            return self.redis.setex(cache_key, cache_ttl, json.dumps(cache_data))
            
        except Exception as e:
            logger.error(f"缓存令牌验证结果失败: {str(e)}")
            return False
    
    def get_cached_token_validation(self, token: str) -> Optional[Dict[str, Any]]:
        """
        获取缓存的令牌验证结果
        :param token: JWT令牌
        :return: 验证结果或None
        """
        try:
            token_hash = self._hash_token(token)
            cache_key = f"{self.TOKEN_CACHE_PREFIX}{token_hash}"
            
            cached_data = self.redis.get(cache_key)
            if not cached_data:
                return None
            
            cache_info = json.loads(cached_data)
            
            # 检查令牌是否已过期
            current_time = int(time.time())
            token_exp = cache_info.get('token_exp', 0)
            
            if current_time >= token_exp:
                # 令牌已过期，删除缓存
                self.redis.delete(cache_key)
                return None
            
            # 检查是否在黑名单中
            if self.is_token_blacklisted(token):
                # 令牌已被撤销，删除缓存
                self.redis.delete(cache_key)
                return None
            
            return cache_info['result']
            
        except Exception as e:
            logger.error(f"获取缓存令牌验证结果失败: {str(e)}")
            return None
    
    # ==================== 用户信息缓存 ====================
    
    def cache_user_info(self, user_id: str, user_info: Dict[str, Any], ttl: int = None) -> bool:
        """
        缓存用户信息
        :param user_id: 用户ID
        :param user_info: 用户信息
        :param ttl: 缓存过期时间(秒)
        """
        try:
            cache_key = f"{self.USER_CACHE_PREFIX}{user_id}"
            cache_data = {
                'user_info': user_info,
                'cached_at': int(time.time())
            }
            
            cache_ttl = ttl or self.USER_CACHE_TTL
            return self.redis.setex(cache_key, cache_ttl, json.dumps(cache_data))
            
        except Exception as e:
            logger.error(f"缓存用户信息失败: {str(e)}")
            return False
    
    def get_cached_user_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        获取缓存的用户信息
        :param user_id: 用户ID
        :return: 用户信息或None
        """
        try:
            cache_key = f"{self.USER_CACHE_PREFIX}{user_id}"
            cached_data = self.redis.get(cache_key)
            
            if not cached_data:
                return None
            
            cache_info = json.loads(cached_data)
            return cache_info['user_info']
            
        except Exception as e:
            logger.error(f"获取缓存用户信息失败: {str(e)}")
            return None
    
    def invalidate_user_cache(self, user_id: str) -> bool:
        """
        使用户缓存失效
        :param user_id: 用户ID
        """
        try:
            cache_key = f"{self.USER_CACHE_PREFIX}{user_id}"
            return self.redis.delete(cache_key) > 0
            
        except Exception as e:
            logger.error(f"使用户缓存失效失败: {str(e)}")
            return False
    
    # ==================== 会话信息缓存 ====================
    
    def cache_session_info(self, session_id: str, session_info: Dict[str, Any], ttl: int = None) -> bool:
        """
        缓存会话信息
        :param session_id: 会话ID
        :param session_info: 会话信息
        :param ttl: 缓存过期时间(秒)
        """
        try:
            cache_key = f"{self.SESSION_CACHE_PREFIX}{session_id}"
            cache_data = {
                'session_info': session_info,
                'cached_at': int(time.time())
            }
            
            cache_ttl = ttl or self.SESSION_CACHE_TTL
            return self.redis.setex(cache_key, cache_ttl, json.dumps(cache_data))
            
        except Exception as e:
            logger.error(f"缓存会话信息失败: {str(e)}")
            return False
    
    def get_cached_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        获取缓存的会话信息
        :param session_id: 会话ID
        :return: 会话信息或None
        """
        try:
            cache_key = f"{self.SESSION_CACHE_PREFIX}{session_id}"
            cached_data = self.redis.get(cache_key)
            
            if not cached_data:
                return None
            
            cache_info = json.loads(cached_data)
            return cache_info['session_info']
            
        except Exception as e:
            logger.error(f"获取缓存会话信息失败: {str(e)}")
            return None
    
    def invalidate_session_cache(self, session_id: str) -> bool:
        """
        使会话缓存失效
        :param session_id: 会话ID
        """
        try:
            cache_key = f"{self.SESSION_CACHE_PREFIX}{session_id}"
            return self.redis.delete(cache_key) > 0
            
        except Exception as e:
            logger.error(f"使会话缓存失效失败: {str(e)}")
            return False
    
    # ==================== 令牌黑名单管理 ====================
    
    def add_token_to_blacklist(self, token: str, ttl: int = None) -> bool:
        """
        将令牌添加到黑名单
        :param token: JWT令牌
        :param ttl: 黑名单过期时间(秒)，通常设置为令牌剩余有效期
        """
        try:
            token_data = decode_token(token)
            jti = token_data.get('jti')
            
            if not jti:
                return False
            
            # 计算令牌剩余有效期
            exp = token_data.get('exp', 0)
            current_time = int(time.time())
            remaining_ttl = exp - current_time
            
            if remaining_ttl <= 0:
                return True  # 令牌已过期，无需加入黑名单
            
            blacklist_ttl = ttl or remaining_ttl
            blacklist_key = f"blacklisted_token:{jti}"
            
            return self.redis.setex(blacklist_key, blacklist_ttl, "revoked")
            
        except Exception as e:
            logger.error(f"添加令牌到黑名单失败: {str(e)}")
            return False
    
    def is_token_blacklisted(self, token: str) -> bool:
        """
        检查令牌是否在黑名单中
        :param token: JWT令牌
        :return: True表示在黑名单中
        """
        try:
            token_data = decode_token(token)
            jti = token_data.get('jti')
            
            if not jti:
                return False
            
            blacklist_key = f"blacklisted_token:{jti}"
            return self.redis.exists(blacklist_key)
            
        except Exception as e:
            logger.error(f"检查令牌黑名单状态失败: {str(e)}")
            return False
    
    def remove_token_from_blacklist(self, token: str) -> bool:
        """
        从黑名单移除令牌
        :param token: JWT令牌
        """
        try:
            token_data = decode_token(token)
            jti = token_data.get('jti')
            
            if not jti:
                return False
            
            blacklist_key = f"blacklisted_token:{jti}"
            return self.redis.delete(blacklist_key) > 0
            
        except Exception as e:
            logger.error(f"从黑名单移除令牌失败: {str(e)}")
            return False
    
    # ==================== 批量操作优化 ====================
    
    def batch_cache_users(self, users_data: Dict[str, Dict[str, Any]], ttl: int = None) -> bool:
        """
        批量缓存用户信息
        :param users_data: {user_id: user_info} 格式的用户数据
        :param ttl: 缓存过期时间(秒)
        """
        try:
            cache_ttl = ttl or self.USER_CACHE_TTL
            pipeline = self.redis.redis_client.pipeline()
            
            for user_id, user_info in users_data.items():
                cache_key = f"{self.USER_CACHE_PREFIX}{user_id}"
                cache_data = {
                    'user_info': user_info,
                    'cached_at': int(time.time())
                }
                pipeline.setex(cache_key, cache_ttl, json.dumps(cache_data))
            
            pipeline.execute()
            return True
            
        except Exception as e:
            logger.error(f"批量缓存用户信息失败: {str(e)}")
            return False
    
    def batch_get_users(self, user_ids: list) -> Dict[str, Dict[str, Any]]:
        """
        批量获取用户缓存信息
        :param user_ids: 用户ID列表
        :return: {user_id: user_info} 格式的用户数据
        """
        try:
            pipeline = self.redis.redis_client.pipeline()
            cache_keys = [f"{self.USER_CACHE_PREFIX}{user_id}" for user_id in user_ids]
            
            for cache_key in cache_keys:
                pipeline.get(cache_key)
            
            cached_results = pipeline.execute()
            
            users_data = {}
            for i, cached_data in enumerate(cached_results):
                if cached_data:
                    try:
                        cache_info = json.loads(cached_data)
                        users_data[user_ids[i]] = cache_info['user_info']
                    except (json.JSONDecodeError, KeyError):
                        continue
            
            return users_data
            
        except Exception as e:
            logger.error(f"批量获取用户缓存信息失败: {str(e)}")
            return {}
    
    # ==================== 缓存统计和监控 ====================
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """
        获取缓存统计信息
        """
        try:
            # 获取不同类型缓存的数量
            token_keys = len(self.redis.redis_client.keys(f"{self.TOKEN_CACHE_PREFIX}*"))
            user_keys = len(self.redis.redis_client.keys(f"{self.USER_CACHE_PREFIX}*"))
            session_keys = len(self.redis.redis_client.keys(f"{self.SESSION_CACHE_PREFIX}*"))
            blacklist_keys = len(self.redis.redis_client.keys("blacklisted_token:*"))
            
            return {
                'token_cache_count': token_keys,
                'user_cache_count': user_keys,
                'session_cache_count': session_keys,
                'blacklist_count': blacklist_keys,
                'total_cache_keys': token_keys + user_keys + session_keys + blacklist_keys,
                'redis_info': self.redis.redis_client.info('memory') if self.redis.redis_client else {}
            }
            
        except Exception as e:
            logger.error(f"获取缓存统计信息失败: {str(e)}")
            return {}
    
    def clear_expired_cache(self) -> int:
        """
        清理过期缓存（Redis会自动清理，这里主要用于手动清理）
        :return: 清理的缓存数量
        """
        try:
            cleared_count = 0
            current_time = int(time.time())
            
            # 清理过期的令牌缓存
            token_keys = self.redis.redis_client.keys(f"{self.TOKEN_CACHE_PREFIX}*")
            for key in token_keys:
                try:
                    cached_data = self.redis.get(key)
                    if cached_data:
                        cache_info = json.loads(cached_data)
                        token_exp = cache_info.get('token_exp', 0)
                        if current_time >= token_exp:
                            self.redis.delete(key)
                            cleared_count += 1
                except (json.JSONDecodeError, KeyError):
                    # 数据格式错误，删除
                    self.redis.delete(key)
                    cleared_count += 1
            
            return cleared_count
            
        except Exception as e:
            logger.error(f"清理过期缓存失败: {str(e)}")
            return 0
    
    # ==================== 辅助方法 ====================
    
    def _hash_token(self, token: str) -> str:
        """
        生成令牌哈希值用作缓存键
        :param token: JWT令牌
        :return: 哈希值
        """
        import hashlib
        return hashlib.sha256(token.encode()).hexdigest()
    
    def _get_token_exp(self, token: str) -> int:
        """
        获取令牌过期时间
        :param token: JWT令牌
        :return: 过期时间戳
        """
        try:
            token_data = decode_token(token)
            return token_data.get('exp', 0)
        except Exception:
            return 0


# 创建全局令牌缓存服务实例
token_cache = TokenCacheService()