# -*- coding: utf-8 -*-
"""
@文件: permission_controller.py
@說明: 權限控制器 (Permission Service)
@時間: 2025-01-09
@作者: LiDong
"""

import json
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any, Optional
from sqlalchemy import func, and_, or_
from sqlalchemy.exc import IntegrityError

from common.common_tools import CommonTools
from dbs.mysql_db import db
from dbs.mysql_db.model_tables import (
    PermissionModel, UserPermissionContextModel,
    PermissionVerificationCacheModel, PermissionChangeEventModel
)
from cache import redis_client
from loggers import logger


class PermissionController:
    """权限控制器"""

    # 缓存过期时间
    CONTEXT_CACHE_EXPIRE = 3600  # 1小时
    VERIFICATION_CACHE_EXPIRE = 1800  # 30分钟
    
    # 权限规则定义
    PERMISSION_RULES = {
        # 平台级权限
        'platform': {
            'platform_admin': ['platform:admin', 'platform:read', 'platform:write'],
            'platform_user': ['platform:read']
        },
        # 团队级权限
        'team': {
            'owner': ['team:admin', 'team:read', 'team:write', 'team:delete', 'team:invite', 'team:manage_members'],
            'admin': ['team:read', 'team:write', 'team:invite', 'team:manage_members'],
            'member': ['team:read']
        },
        # 项目级权限
        'project': {
            'maintainer': ['project:admin', 'project:read', 'project:write', 'project:delete', 'project:manage'],
            'member': ['project:read', 'project:write']  # 如果项目允许成员编辑
        }
    }

    @staticmethod
    def verify_permission(user_id: str, resource_type: str, resource_id: str, action: str, use_cache: bool = True) -> Tuple[bool, Any]:
        """验证单个权限"""
        try:
            # 检查缓存
            if use_cache:
                cached_result = PermissionController._get_verification_cache(user_id, resource_type, resource_id, action)
                if cached_result is not None:
                    return True, {
                        'has_permission': cached_result,
                        'source': 'cache',
                        'user_id': user_id,
                        'resource_type': resource_type,
                        'resource_id': resource_id,
                        'action': action
                    }
            
            # 获取用户权限上下文
            context_result, context_flag = PermissionController.get_user_context(user_id)
            if not context_flag:
                return False, f"获取用户权限上下文失败: {context_result}"
            
            # 执行权限验证
            has_permission = PermissionController._verify_permission_logic(
                context_result, resource_type, resource_id, action
            )
            
            # 缓存结果
            if use_cache:
                PermissionController._cache_verification_result(
                    user_id, resource_type, resource_id, action, has_permission, context_result
                )
            
            return True, {
                'has_permission': has_permission,
                'source': 'computed',
                'user_id': user_id,
                'resource_type': resource_type,
                'resource_id': resource_id,
                'action': action,
                'context': context_result
            }
            
        except Exception as e:
            logger.error(f"权限验证失败: {str(e)}")
            return False, f"权限验证失败: {str(e)}"

    @staticmethod
    def verify_permissions_batch(user_id: str, permissions: List[Dict]) -> Tuple[bool, Any]:
        """批量验证权限"""
        try:
            results = []
            
            # 获取用户权限上下文
            context_result, context_flag = PermissionController.get_user_context(user_id)
            if not context_flag:
                return False, f"获取用户权限上下文失败: {context_result}"
            
            for perm in permissions:
                resource_type = perm.get('resource_type')
                resource_id = perm.get('resource_id')
                action = perm.get('action')
                
                # 检查缓存
                cached_result = PermissionController._get_verification_cache(user_id, resource_type, resource_id, action)
                
                if cached_result is not None:
                    has_permission = cached_result
                    source = 'cache'
                else:
                    # 执行权限验证
                    has_permission = PermissionController._verify_permission_logic(
                        context_result, resource_type, resource_id, action
                    )
                    source = 'computed'
                    
                    # 缓存结果
                    PermissionController._cache_verification_result(
                        user_id, resource_type, resource_id, action, has_permission, context_result
                    )
                
                results.append({
                    'resource_type': resource_type,
                    'resource_id': resource_id,
                    'action': action,
                    'has_permission': has_permission,
                    'source': source
                })
            
            return True, {
                'user_id': user_id,
                'results': results,
                'total': len(results),
                'context': context_result
            }
            
        except Exception as e:
            logger.error(f"批量权限验证失败: {str(e)}")
            return False, f"批量权限验证失败: {str(e)}"

    @staticmethod
    def get_user_context(user_id: str, force_refresh: bool = False) -> Tuple[bool, Any]:
        """获取用户权限上下文"""
        try:
            # 检查缓存
            if not force_refresh:
                context = UserPermissionContextModel.query.filter(
                    UserPermissionContextModel.user_id == user_id,
                    UserPermissionContextModel.expires_at > datetime.utcnow()
                ).first()
                
                if context:
                    return True, {
                        'user_id': context.user_id,
                        'platform_role': context.platform_role,
                        'team_roles': context.team_roles or {},
                        'project_maintainer_roles': context.project_maintainer_roles or {},
                        'cached_at': context.cached_at.isoformat() if context.cached_at else None
                    }
            
            # 构建用户上下文
            context_result = PermissionController._build_user_context(user_id)
            
            # 保存到缓存
            PermissionController._save_user_context(user_id, context_result)
            
            return True, context_result
            
        except Exception as e:
            logger.error(f"获取用户权限上下文失败: {str(e)}")
            return False, f"获取用户权限上下文失败: {str(e)}"

    @staticmethod
    def refresh_user_context(user_ids: List[str]) -> Tuple[bool, Any]:
        """刷新用户权限上下文"""
        try:
            refreshed_users = []
            failed_users = []
            
            for user_id in user_ids:
                try:
                    # 清除旧缓存
                    UserPermissionContextModel.query.filter_by(user_id=user_id).delete()
                    
                    # 重新构建上下文
                    result, flag = PermissionController.get_user_context(user_id, force_refresh=True)
                    if flag:
                        refreshed_users.append(user_id)
                    else:
                        failed_users.append({'user_id': user_id, 'error': result})
                        
                except Exception as e:
                    failed_users.append({'user_id': user_id, 'error': str(e)})
            
            db.session.commit()
            
            return True, {
                'refreshed_users': refreshed_users,
                'failed_users': failed_users,
                'total_requested': len(user_ids),
                'total_refreshed': len(refreshed_users),
                'total_failed': len(failed_users)
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"刷新用户权限上下文失败: {str(e)}")
            return False, f"刷新用户权限上下文失败: {str(e)}"

    @staticmethod
    def clear_context_cache(user_ids: List[str] = None, clear_all: bool = False) -> Tuple[bool, Any]:
        """清除权限上下文缓存"""
        try:
            if clear_all:
                deleted_count = UserPermissionContextModel.query.delete()
                PermissionVerificationCacheModel.query.delete()
            elif user_ids:
                deleted_count = UserPermissionContextModel.query.filter(
                    UserPermissionContextModel.user_id.in_(user_ids)
                ).delete(synchronize_session=False)
                
                PermissionVerificationCacheModel.query.filter(
                    PermissionVerificationCacheModel.user_id.in_(user_ids)
                ).delete(synchronize_session=False)
            else:
                return False, "必须指定用户ID列表或选择清除全部"
            
            db.session.commit()
            
            return True, {
                'cleared_contexts': deleted_count if not clear_all else 'all',
                'user_ids': user_ids if not clear_all else 'all'
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"清除权限上下文缓存失败: {str(e)}")
            return False, f"清除权限上下文缓存失败: {str(e)}"

    @staticmethod
    def get_user_team_roles(user_id: str) -> Tuple[bool, Any]:
        """获取用户的群组角色"""
        try:
            context_result, flag = PermissionController.get_user_context(user_id)
            if not flag:
                return False, context_result
            
            team_roles = context_result.get('team_roles', {})
            
            return True, {
                'user_id': user_id,
                'team_roles': team_roles,
                'total_teams': len(team_roles)
            }
            
        except Exception as e:
            logger.error(f"获取用户群组角色失败: {str(e)}")
            return False, f"获取用户群组角色失败: {str(e)}"

    @staticmethod
    def get_user_project_roles(user_id: str) -> Tuple[bool, Any]:
        """获取用户的项目维护权限"""
        try:
            context_result, flag = PermissionController.get_user_context(user_id)
            if not flag:
                return False, context_result
            
            project_roles = context_result.get('project_maintainer_roles', {})
            
            return True, {
                'user_id': user_id,
                'project_maintainer_roles': project_roles,
                'total_projects': len(project_roles)
            }
            
        except Exception as e:
            logger.error(f"获取用户项目维护权限失败: {str(e)}")
            return False, f"获取用户项目维护权限失败: {str(e)}"

    @staticmethod
    def get_user_effective_permissions(user_id: str) -> Tuple[bool, Any]:
        """获取用户有效权限列表"""
        try:
            context_result, flag = PermissionController.get_user_context(user_id)
            if not flag:
                return False, context_result
            
            effective_permissions = []
            
            # 平台权限
            platform_role = context_result.get('platform_role')
            if platform_role in PermissionController.PERMISSION_RULES['platform']:
                platform_permissions = PermissionController.PERMISSION_RULES['platform'][platform_role]
                for perm in platform_permissions:
                    effective_permissions.append({
                        'permission': perm,
                        'scope': 'platform',
                        'resource_id': None,
                        'source': 'platform_role'
                    })
            
            # 团队权限
            team_roles = context_result.get('team_roles', {})
            for team_id, role in team_roles.items():
                if role in PermissionController.PERMISSION_RULES['team']:
                    team_permissions = PermissionController.PERMISSION_RULES['team'][role]
                    for perm in team_permissions:
                        effective_permissions.append({
                            'permission': perm,
                            'scope': 'team',
                            'resource_id': team_id,
                            'source': 'team_role'
                        })
            
            # 项目权限
            project_roles = context_result.get('project_maintainer_roles', {})
            for project_id, role in project_roles.items():
                if role in PermissionController.PERMISSION_RULES['project']:
                    project_permissions = PermissionController.PERMISSION_RULES['project'][role]
                    for perm in project_permissions:
                        effective_permissions.append({
                            'permission': perm,
                            'scope': 'project',
                            'resource_id': project_id,
                            'source': 'project_role'
                        })
            
            return True, {
                'user_id': user_id,
                'effective_permissions': effective_permissions,
                'total_permissions': len(effective_permissions),
                'context': context_result
            }
            
        except Exception as e:
            logger.error(f"获取用户有效权限列表失败: {str(e)}")
            return False, f"获取用户有效权限列表失败: {str(e)}"

    @staticmethod
    def handle_permission_change_event(event_type: str, user_id: str, resource_type: str, 
                                     resource_id: str, old_role: str = None, new_role: str = None, 
                                     changed_by: str = None, metadata: dict = None) -> Tuple[bool, Any]:
        """处理权限变更事件"""
        try:
            # 记录权限变更事件
            event = PermissionChangeEventModel(
                event_type=event_type,
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                old_role=old_role,
                new_role=new_role,
                changed_by=changed_by
            )
            db.session.add(event)
            
            # 清除相关缓存
            PermissionController._clear_user_caches(user_id)
            
            db.session.commit()
            
            logger.info(f"权限变更事件处理成功 - 类型: {event_type}, 用户: {user_id}, 资源: {resource_type}:{resource_id}")
            
            return True, {
                'event_id': event.id,
                'event_type': event_type,
                'user_id': user_id,
                'resource_type': resource_type,
                'resource_id': resource_id,
                'processed_at': event.created_at.isoformat() if event.created_at else None
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"处理权限变更事件失败: {str(e)}")
            return False, f"处理权限变更事件失败: {str(e)}"

    @staticmethod
    def get_cache_stats() -> Tuple[bool, Any]:
        """获取缓存统计信息"""
        try:
            # 权限上下文缓存统计
            context_total = UserPermissionContextModel.query.count()
            context_expired = UserPermissionContextModel.query.filter(
                UserPermissionContextModel.expires_at <= datetime.utcnow()
            ).count()
            context_active = context_total - context_expired
            
            # 权限验证缓存统计
            verification_total = PermissionVerificationCacheModel.query.count()
            verification_expired = PermissionVerificationCacheModel.query.filter(
                PermissionVerificationCacheModel.expires_at <= datetime.utcnow()
            ).count()
            verification_active = verification_total - verification_expired
            
            return True, {
                'context_cache': {
                    'total': context_total,
                    'active': context_active,
                    'expired': context_expired
                },
                'verification_cache': {
                    'total': verification_total,
                    'active': verification_active,
                    'expired': verification_expired
                },
                'total_cache_entries': context_total + verification_total,
                'total_active_entries': context_active + verification_active
            }
            
        except Exception as e:
            logger.error(f"获取缓存统计信息失败: {str(e)}")
            return False, f"获取缓存统计信息失败: {str(e)}"

    @staticmethod
    def invalidate_cache(user_ids: List[str] = None, resource_type: str = None, 
                        resource_ids: List[str] = None, invalidate_all: bool = False) -> Tuple[bool, Any]:
        """使缓存失效"""
        try:
            invalidated_count = 0
            
            if invalidate_all:
                # 清除所有缓存
                context_count = UserPermissionContextModel.query.delete()
                verification_count = PermissionVerificationCacheModel.query.delete()
                invalidated_count = context_count + verification_count
                
            else:
                # 按条件清除缓存
                if user_ids:
                    context_count = UserPermissionContextModel.query.filter(
                        UserPermissionContextModel.user_id.in_(user_ids)
                    ).delete(synchronize_session=False)
                    
                    verification_count = PermissionVerificationCacheModel.query.filter(
                        PermissionVerificationCacheModel.user_id.in_(user_ids)
                    ).delete(synchronize_session=False)
                    
                    invalidated_count += context_count + verification_count
                
                if resource_type and resource_ids:
                    verification_count = PermissionVerificationCacheModel.query.filter(
                        PermissionVerificationCacheModel.resource_type == resource_type,
                        PermissionVerificationCacheModel.resource_id.in_(resource_ids)
                    ).delete(synchronize_session=False)
                    
                    invalidated_count += verification_count
            
            db.session.commit()
            
            return True, {
                'invalidated_count': invalidated_count,
                'criteria': {
                    'user_ids': user_ids,
                    'resource_type': resource_type,
                    'resource_ids': resource_ids,
                    'invalidate_all': invalidate_all
                }
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"缓存失效操作失败: {str(e)}")
            return False, f"缓存失效操作失败: {str(e)}"

    # 私有方法
    @staticmethod
    def _verify_permission_logic(context: Dict, resource_type: str, resource_id: str, action: str) -> bool:
        """权限验证逻辑核心"""
        try:
            # 平台管理员拥有所有权限
            if context.get('platform_role') == 'platform_admin':
                return True
            
            # 根据资源类型和操作进行权限检查
            if resource_type == 'platform':
                # 平台级操作
                platform_role = context.get('platform_role')
                platform_permissions = PermissionController.PERMISSION_RULES['platform'].get(platform_role, [])
                return f'platform:{action}' in platform_permissions
            
            elif resource_type == 'team':
                # 团队级操作
                team_roles = context.get('team_roles', {})
                user_role = team_roles.get(resource_id)
                if user_role:
                    team_permissions = PermissionController.PERMISSION_RULES['team'].get(user_role, [])
                    return f'team:{action}' in team_permissions
                return False
            
            elif resource_type == 'project':
                # 项目级操作
                # 检查是否是项目维护员
                project_roles = context.get('project_maintainer_roles', {})
                if resource_id in project_roles:
                    project_permissions = PermissionController.PERMISSION_RULES['project']['maintainer']
                    return f'project:{action}' in project_permissions
                
                # 检查团队权限（如果项目属于某个团队）
                # 这里需要调用项目服务获取项目信息，简化处理
                return False
            
            return False
            
        except Exception as e:
            logger.error(f"权限验证逻辑执行失败: {str(e)}")
            return False

    @staticmethod
    def _build_user_context(user_id: str) -> Dict:
        """构建用户权限上下文"""
        try:
            context = {
                'user_id': user_id,
                'platform_role': 'platform_user',  # 默认角色，实际应从用户服务获取
                'team_roles': {},
                'project_maintainer_roles': {}
            }
            
            # 调用团队服务获取用户团队角色
            try:
                # 这里应该调用团队服务的内部接口
                # team_roles = requests.get(f'http://team-service/internal/users/{user_id}/teams').json()
                # context['team_roles'] = team_roles.get('data', {})
                pass
            except Exception as e:
                logger.warning(f"获取用户团队角色失败: {str(e)}")
            
            # 调用项目服务获取用户项目维护员角色
            try:
                # 这里应该调用项目服务的内部接口
                # project_roles = requests.get(f'http://project-service/internal/users/{user_id}/maintainer-projects').json()
                # context['project_maintainer_roles'] = {p['id']: 'maintainer' for p in project_roles.get('data', {}).get('projects', [])}
                pass
            except Exception as e:
                logger.warning(f"获取用户项目维护员角色失败: {str(e)}")
            
            return context
            
        except Exception as e:
            logger.error(f"构建用户权限上下文失败: {str(e)}")
            return {
                'user_id': user_id,
                'platform_role': 'platform_user',
                'team_roles': {},
                'project_maintainer_roles': {}
            }

    @staticmethod
    def _save_user_context(user_id: str, context: Dict):
        """保存用户上下文到缓存"""
        try:
            # 删除旧缓存
            UserPermissionContextModel.query.filter_by(user_id=user_id).delete()
            
            # 保存新缓存
            context_model = UserPermissionContextModel(
                user_id=user_id,
                platform_role=context.get('platform_role', 'platform_user'),
                team_roles=context.get('team_roles'),
                project_maintainer_roles=context.get('project_maintainer_roles'),
                expires_at=datetime.utcnow() + timedelta(seconds=PermissionController.CONTEXT_CACHE_EXPIRE)
            )
            db.session.add(context_model)
            db.session.commit()
            
        except Exception as e:
            logger.error(f"保存用户上下文缓存失败: {str(e)}")

    @staticmethod
    def _get_verification_cache(user_id: str, resource_type: str, resource_id: str, action: str) -> Optional[bool]:
        """获取权限验证缓存"""
        try:
            cache = PermissionVerificationCacheModel.query.filter(
                PermissionVerificationCacheModel.user_id == user_id,
                PermissionVerificationCacheModel.resource_type == resource_type,
                PermissionVerificationCacheModel.resource_id == resource_id,
                PermissionVerificationCacheModel.action == action,
                PermissionVerificationCacheModel.expires_at > datetime.utcnow()
            ).first()
            
            if cache:
                return cache.has_permission
            return None
            
        except Exception as e:
            logger.error(f"获取权限验证缓存失败: {str(e)}")
            return None

    @staticmethod
    def _cache_verification_result(user_id: str, resource_type: str, resource_id: str, 
                                 action: str, has_permission: bool, context: Dict):
        """缓存权限验证结果"""
        try:
            # 删除旧缓存
            PermissionVerificationCacheModel.query.filter(
                PermissionVerificationCacheModel.user_id == user_id,
                PermissionVerificationCacheModel.resource_type == resource_type,
                PermissionVerificationCacheModel.resource_id == resource_id,
                PermissionVerificationCacheModel.action == action
            ).delete()
            
            # 保存新缓存
            cache = PermissionVerificationCacheModel(
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                action=action,
                has_permission=has_permission,
                verification_context=context,
                expires_at=datetime.utcnow() + timedelta(seconds=PermissionController.VERIFICATION_CACHE_EXPIRE)
            )
            db.session.add(cache)
            db.session.commit()
            
        except Exception as e:
            logger.error(f"缓存权限验证结果失败: {str(e)}")

    @staticmethod
    def _clear_user_caches(user_id: str):
        """清除用户相关的所有缓存"""
        try:
            UserPermissionContextModel.query.filter_by(user_id=user_id).delete()
            PermissionVerificationCacheModel.query.filter_by(user_id=user_id).delete()
            
        except Exception as e:
            logger.error(f"清除用户缓存失败: {str(e)}")


# 创建全局控制器实例
permission_controller = PermissionController()