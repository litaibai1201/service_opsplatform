# -*- coding: utf-8 -*-
"""
@文件: token_cache.py
@說明: 高性能缓存服务 - 专为team service优化
@時間: 2025-01-09
@作者: LiDong
"""

import json
import time
from typing import Dict, Any, Optional, List
from flask_jwt_extended import decode_token
from cache import redis_client
from loggers import logger


class TeamCacheService:
    """团队缓存服务 - 超低延迟设计"""
    
    # 缓存键前缀
    TOKEN_CACHE_PREFIX = "team:token:"
    USER_CACHE_PREFIX = "team:user:"
    TEAM_CACHE_PREFIX = "team:info:"
    MEMBER_CACHE_PREFIX = "team:member:"
    PERMISSION_CACHE_PREFIX = "team:permission:"
    ACTIVITY_CACHE_PREFIX = "team:activity:"
    BLACKLIST_SET = "team:blacklist"
    
    # 缓存时间配置 (秒)
    TOKEN_CACHE_TTL = 300       # 5分钟 - 令牌信息缓存
    USER_CACHE_TTL = 600        # 10分钟 - 用户信息缓存
    TEAM_CACHE_TTL = 1800       # 30分钟 - 团队信息缓存
    MEMBER_CACHE_TTL = 900      # 15分钟 - 成员信息缓存
    PERMISSION_CACHE_TTL = 1200 # 20分钟 - 权限信息缓存
    ACTIVITY_CACHE_TTL = 300    # 5分钟 - 活动信息缓存
    
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
    
    # ==================== 团队信息缓存 ====================
    
    def cache_team_info(self, team_id: str, team_info: Dict[str, Any], ttl: int = None) -> bool:
        """
        缓存团队信息
        :param team_id: 团队ID
        :param team_info: 团队信息
        :param ttl: 缓存过期时间(秒)
        """
        try:
            cache_key = f"{self.TEAM_CACHE_PREFIX}{team_id}"
            cache_data = {
                'team_info': team_info,
                'cached_at': int(time.time())
            }
            
            cache_ttl = ttl or self.TEAM_CACHE_TTL
            return self.redis.setex(cache_key, cache_ttl, json.dumps(cache_data))
            
        except Exception as e:
            logger.error(f"缓存团队信息失败: {str(e)}")
            return False
    
    def get_cached_team_info(self, team_id: str) -> Optional[Dict[str, Any]]:
        """
        获取缓存的团队信息
        :param team_id: 团队ID
        :return: 团队信息或None
        """
        try:
            cache_key = f"{self.TEAM_CACHE_PREFIX}{team_id}"
            cached_data = self.redis.get(cache_key)
            
            if not cached_data:
                return None
            
            cache_info = json.loads(cached_data)
            return cache_info['team_info']
            
        except Exception as e:
            logger.error(f"获取缓存团队信息失败: {str(e)}")
            return None
    
    def invalidate_team_cache(self, team_id: str) -> bool:
        """
        使团队缓存失效
        :param team_id: 团队ID
        """
        try:
            cache_key = f"{self.TEAM_CACHE_PREFIX}{team_id}"
            return self.redis.delete(cache_key) > 0
            
        except Exception as e:
            logger.error(f"使团队缓存失效失败: {str(e)}")
            return False
    
    # ==================== 成员信息缓存 ====================
    
    def cache_team_member_role(self, team_id: str, user_id: str, role_info: Dict[str, Any], ttl: int = None) -> bool:
        """
        缓存团队成员角色信息
        :param team_id: 团队ID
        :param user_id: 用户ID
        :param role_info: 角色信息
        :param ttl: 缓存过期时间(秒)
        """
        try:
            cache_key = f"{self.MEMBER_CACHE_PREFIX}{team_id}:{user_id}"
            cache_data = {
                'role_info': role_info,
                'cached_at': int(time.time())
            }
            
            cache_ttl = ttl or self.MEMBER_CACHE_TTL
            return self.redis.setex(cache_key, cache_ttl, json.dumps(cache_data))
            
        except Exception as e:
            logger.error(f"缓存团队成员角色信息失败: {str(e)}")
            return False
    
    def get_cached_team_member_role(self, team_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        获取缓存的团队成员角色信息
        :param team_id: 团队ID
        :param user_id: 用户ID
        :return: 角色信息或None
        """
        try:
            cache_key = f"{self.MEMBER_CACHE_PREFIX}{team_id}:{user_id}"
            cached_data = self.redis.get(cache_key)
            
            if not cached_data:
                return None
            
            cache_info = json.loads(cached_data)
            return cache_info['role_info']
            
        except Exception as e:
            logger.error(f"获取缓存团队成员角色信息失败: {str(e)}")
            return None
    
    def invalidate_team_member_cache(self, team_id: str, user_id: str = None) -> bool:
        """
        使团队成员缓存失效
        :param team_id: 团队ID
        :param user_id: 用户ID，如果为None则清除团队所有成员缓存
        """
        try:
            if user_id:
                cache_key = f"{self.MEMBER_CACHE_PREFIX}{team_id}:{user_id}"
                return self.redis.delete(cache_key) > 0
            else:
                # 清除团队所有成员缓存
                pattern = f"{self.MEMBER_CACHE_PREFIX}{team_id}:*"
                keys = self.redis.redis_client.keys(pattern)
                if keys:
                    return self.redis.redis_client.delete(*keys) > 0
                return True
            
        except Exception as e:
            logger.error(f"使团队成员缓存失效失败: {str(e)}")
            return False
    
    # ==================== 权限信息缓存 ====================
    
    def cache_user_team_permissions(self, team_id: str, user_id: str, permissions: List[str], ttl: int = None) -> bool:
        """
        缓存用户在团队中的权限信息
        :param team_id: 团队ID
        :param user_id: 用户ID
        :param permissions: 权限列表
        :param ttl: 缓存过期时间(秒)
        """
        try:
            cache_key = f"{self.PERMISSION_CACHE_PREFIX}{team_id}:{user_id}"
            cache_data = {
                'permissions': permissions,
                'cached_at': int(time.time())
            }
            
            cache_ttl = ttl or self.PERMISSION_CACHE_TTL
            return self.redis.setex(cache_key, cache_ttl, json.dumps(cache_data))
            
        except Exception as e:
            logger.error(f"缓存用户团队权限信息失败: {str(e)}")
            return False
    
    def get_cached_user_team_permissions(self, team_id: str, user_id: str) -> Optional[List[str]]:
        """
        获取缓存的用户团队权限信息
        :param team_id: 团队ID
        :param user_id: 用户ID
        :return: 权限列表或None
        """
        try:
            cache_key = f"{self.PERMISSION_CACHE_PREFIX}{team_id}:{user_id}"
            cached_data = self.redis.get(cache_key)
            
            if not cached_data:
                return None
            
            cache_info = json.loads(cached_data)
            return cache_info['permissions']
            
        except Exception as e:
            logger.error(f"获取缓存用户团队权限信息失败: {str(e)}")
            return None
    
    def invalidate_user_team_permissions(self, team_id: str, user_id: str = None) -> bool:
        """
        使用户团队权限缓存失效
        :param team_id: 团队ID
        :param user_id: 用户ID，如果为None则清除团队所有用户权限缓存
        """
        try:
            if user_id:
                cache_key = f"{self.PERMISSION_CACHE_PREFIX}{team_id}:{user_id}"
                return self.redis.delete(cache_key) > 0
            else:
                # 清除团队所有用户权限缓存
                pattern = f"{self.PERMISSION_CACHE_PREFIX}{team_id}:*"
                keys = self.redis.redis_client.keys(pattern)
                if keys:
                    return self.redis.redis_client.delete(*keys) > 0
                return True
            
        except Exception as e:
            logger.error(f"使用户团队权限缓存失效失败: {str(e)}")
            return False
    
    # ==================== 活动信息缓存 ====================
    
    def cache_team_activities(self, team_id: str, activities: List[Dict[str, Any]], ttl: int = None) -> bool:
        """
        缓存团队活动信息
        :param team_id: 团队ID
        :param activities: 活动列表
        :param ttl: 缓存过期时间(秒)
        """
        try:
            cache_key = f"{self.ACTIVITY_CACHE_PREFIX}{team_id}"
            cache_data = {
                'activities': activities,
                'cached_at': int(time.time())
            }
            
            cache_ttl = ttl or self.ACTIVITY_CACHE_TTL
            return self.redis.setex(cache_key, cache_ttl, json.dumps(cache_data))
            
        except Exception as e:
            logger.error(f"缓存团队活动信息失败: {str(e)}")
            return False
    
    def get_cached_team_activities(self, team_id: str) -> Optional[List[Dict[str, Any]]]:
        """
        获取缓存的团队活动信息
        :param team_id: 团队ID
        :return: 活动列表或None
        """
        try:
            cache_key = f"{self.ACTIVITY_CACHE_PREFIX}{team_id}"
            cached_data = self.redis.get(cache_key)
            
            if not cached_data:
                return None
            
            cache_info = json.loads(cached_data)
            return cache_info['activities']
            
        except Exception as e:
            logger.error(f"获取缓存团队活动信息失败: {str(e)}")
            return None
    
    def invalidate_team_activities_cache(self, team_id: str) -> bool:
        """
        使团队活动缓存失效
        :param team_id: 团队ID
        """
        try:
            cache_key = f"{self.ACTIVITY_CACHE_PREFIX}{team_id}"
            return self.redis.delete(cache_key) > 0
            
        except Exception as e:
            logger.error(f"使团队活动缓存失效失败: {str(e)}")
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
    
    def batch_cache_teams(self, teams_data: Dict[str, Dict[str, Any]], ttl: int = None) -> bool:
        """
        批量缓存团队信息
        :param teams_data: {team_id: team_info} 格式的团队数据
        :param ttl: 缓存过期时间(秒)
        """
        try:
            cache_ttl = ttl or self.TEAM_CACHE_TTL
            pipeline = self.redis.redis_client.pipeline()
            
            for team_id, team_info in teams_data.items():
                cache_key = f"{self.TEAM_CACHE_PREFIX}{team_id}"
                cache_data = {
                    'team_info': team_info,
                    'cached_at': int(time.time())
                }
                pipeline.setex(cache_key, cache_ttl, json.dumps(cache_data))
            
            pipeline.execute()
            return True
            
        except Exception as e:
            logger.error(f"批量缓存团队信息失败: {str(e)}")
            return False
    
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
    
    def batch_get_teams(self, team_ids: list) -> Dict[str, Dict[str, Any]]:
        """
        批量获取团队缓存信息
        :param team_ids: 团队ID列表
        :return: {team_id: team_info} 格式的团队数据
        """
        try:
            pipeline = self.redis.redis_client.pipeline()
            cache_keys = [f"{self.TEAM_CACHE_PREFIX}{team_id}" for team_id in team_ids]
            
            for cache_key in cache_keys:
                pipeline.get(cache_key)
            
            cached_results = pipeline.execute()
            
            teams_data = {}
            for i, cached_data in enumerate(cached_results):
                if cached_data:
                    try:
                        cache_info = json.loads(cached_data)
                        teams_data[team_ids[i]] = cache_info['team_info']
                    except (json.JSONDecodeError, KeyError):
                        continue
            
            return teams_data
            
        except Exception as e:
            logger.error(f"批量获取团队缓存信息失败: {str(e)}")
            return {}
    
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
            team_keys = len(self.redis.redis_client.keys(f"{self.TEAM_CACHE_PREFIX}*"))
            member_keys = len(self.redis.redis_client.keys(f"{self.MEMBER_CACHE_PREFIX}*"))
            permission_keys = len(self.redis.redis_client.keys(f"{self.PERMISSION_CACHE_PREFIX}*"))
            activity_keys = len(self.redis.redis_client.keys(f"{self.ACTIVITY_CACHE_PREFIX}*"))
            blacklist_keys = len(self.redis.redis_client.keys("blacklisted_token:*"))
            
            return {
                'token_cache_count': token_keys,
                'user_cache_count': user_keys,
                'team_cache_count': team_keys,
                'member_cache_count': member_keys,
                'permission_cache_count': permission_keys,
                'activity_cache_count': activity_keys,
                'blacklist_count': blacklist_keys,
                'total_cache_keys': token_keys + user_keys + team_keys + member_keys + permission_keys + activity_keys + blacklist_keys,
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


# 创建全局团队缓存服务实例
team_cache = TeamCacheService()