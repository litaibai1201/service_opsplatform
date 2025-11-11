# -*- coding: utf-8 -*-
"""
@文件: team_controller.py
@說明: 群組控制器 (Team Service)
@時間: 2025-01-09
@作者: LiDong
"""

import secrets
import uuid
import traceback
from datetime import datetime, timedelta
from typing import Tuple, Dict, Any, Optional, List
from flask import request, g

from common.common_tools import CommonTools
from dbs.mysql_db import DBFunction
from dbs.mysql_db.model_tables import (
    TeamModel, TeamMemberModel, TeamJoinRequestModel,
    TeamInvitationModel, TeamActivityModel
)
from models.team_model import (
    OperTeamModel, OperTeamMemberModel, OperTeamJoinRequestModel,
    OperTeamInvitationModel, OperTeamActivityModel
)
from configs.constant import Config
from loggers import logger
from cache import redis_client
from cache.token_cache import team_cache


class TeamController:
    """群組控制器"""
    
    # 类级别的单例缓存
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TeamController, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        # 避免重复初始化
        if TeamController._initialized:
            return
            
        self.oper_team = OperTeamModel()
        self.oper_member = OperTeamMemberModel()
        self.oper_join_request = OperTeamJoinRequestModel()
        self.oper_invitation = OperTeamInvitationModel()
        self.oper_activity = OperTeamActivityModel()
        
        # 配置项
        self.default_invitation_expires_hours = 72  # 邀请过期时间 72小时
        self.default_join_request_expires_hours = 168  # 申请过期时间 7天
        
        TeamController._initialized = True
        logger.info("TeamController 初始化完成")
    
    # ==================== 事务管理 ====================
    
    def _execute_with_transaction(self, operation, operation_name):
        """在事务中执行操作"""
        try:
            result = operation()
            commit_result, commit_flag = DBFunction.do_commit(operation_name)
            if not commit_flag:
                return commit_result, False
            return result, True
        except Exception as e:
            rollback_result, rollback_flag = DBFunction.do_rollback(f"{operation_name}回滚")
            logger.error(f"{operation_name}异常: {str(e)}")
            return f"{operation_name}失败", False
    
    # ==================== 群組管理 ====================
    
    def create_team(self, user_id: str, team_data: Dict[str, Any]) -> Tuple[Any, bool]:
        """创建群组"""
        try:
            def _create_team_transaction():
                # 创建群组
                team = TeamModel(
                    name=team_data['name'],
                    description=team_data.get('description', ''),
                    avatar_url=team_data.get('avatar_url'),
                    visibility=team_data.get('visibility', 'private'),
                    max_members=team_data.get('max_members', 100),
                    settings=team_data.get('settings', {}),
                    auto_approve_join=team_data.get('auto_approve_join', False),
                    allow_member_invite=team_data.get('allow_member_invite', False),
                    require_approval_for_projects=team_data.get('require_approval_for_projects', True),
                    default_project_visibility=team_data.get('default_project_visibility', 'private'),
                    created_by=user_id
                )
                
                create_result, create_flag = self.oper_team.create_team(team)
                if not create_flag:
                    raise Exception(f"创建群组失败: {create_result}")
                
                # 添加创建者为群组所有者
                member = TeamMemberModel(
                    team_id=team.id,
                    user_id=user_id,
                    role='owner',
                    invited_by=user_id
                )
                
                member_result, member_flag = self.oper_member.add_member(member)
                if not member_flag:
                    raise Exception(f"添加群组所有者失败: {member_result}")
                
                # 记录活动
                activity_result, activity_flag = self.oper_activity.record_team_creation(
                    team.id, user_id, team.name
                )
                if not activity_flag:
                    logger.warning(f"记录群组创建活动失败: {activity_result}")
                
                return {
                    'team_id': team.id,
                    'name': team.name,
                    'description': team.description,
                    'visibility': team.visibility,
                    'created_at': team.created_at.isoformat() if team.created_at else None,
                    'member_count': 1,
                    'your_role': 'owner'
                }
            
            return self._execute_with_transaction(_create_team_transaction, "创建群组")
            
        except Exception as e:
            logger.error(f"创建群组异常: {str(e)}")
            return "创建群组失败", False
    
    def get_team_detail(self, team_id: str, user_id: str) -> Tuple[Any, bool]:
        """获取群组详情"""
        try:
            team = self.oper_team.get_by_id(team_id)
            if not team:
                return "群组不存在", False
            
            # 检查用户是否有权限查看群组
            member = self.oper_member.get_by_team_and_user(team_id, user_id)
            if not member and team.visibility == 'private':
                return "没有权限查看该群组", False
            
            # 获取成员统计
            stats = self.oper_team.get_team_statistics(team_id)
            
            team_detail = {
                'team_id': team.id,
                'name': team.name,
                'description': team.description,
                'avatar_url': team.avatar_url,
                'visibility': team.visibility,
                'max_members': team.max_members,
                'settings': team.settings,
                'auto_approve_join': team.auto_approve_join,
                'allow_member_invite': team.allow_member_invite,
                'require_approval_for_projects': team.require_approval_for_projects,
                'default_project_visibility': team.default_project_visibility,
                'created_by': team.created_by,
                'created_at': team.created_at.isoformat() if team.created_at else None,
                'statistics': stats,
                'your_role': member.role if member else None,
                'is_member': member is not None
            }
            
            return team_detail, True
            
        except Exception as e:
            logger.error(f"获取群组详情异常: {str(e)}")
            return "获取群组详情失败", False
    
    def update_team(self, team_id: str, user_id: str, update_data: Dict[str, Any]) -> Tuple[Any, bool]:
        """更新群组信息"""
        try:
            # 检查权限
            if not self.oper_member.is_team_admin_or_owner(team_id, user_id):
                return "没有权限更新群组信息", False
            
            team = self.oper_team.get_by_id(team_id)
            if not team:
                return "群组不存在", False
            
            def _update_team_transaction():
                # 记录变更信息
                changes = {}
                for field, value in update_data.items():
                    if hasattr(team, field) and getattr(team, field) != value:
                        changes[field] = {
                            'old': getattr(team, field),
                            'new': value
                        }
                
                # 更新群组信息
                update_result, update_flag = self.oper_team.update_team(team, update_data)
                if not update_flag:
                    raise Exception(f"更新群组信息失败: {update_result}")
                
                # 记录活动
                if changes:
                    activity_result, activity_flag = self.oper_activity.record_team_updated(
                        team_id, user_id, changes
                    )
                    if not activity_flag:
                        logger.warning(f"记录群组更新活动失败: {activity_result}")
                
                return {
                    'team_id': team_id,
                    'updated_fields': list(changes.keys()),
                    'message': '群组信息更新成功'
                }
            
            return self._execute_with_transaction(_update_team_transaction, "更新群组信息")
            
        except Exception as e:
            logger.error(f"更新群组信息异常: {str(e)}")
            return "更新群组信息失败", False
    
    def delete_team(self, team_id: str, user_id: str) -> Tuple[Any, bool]:
        """删除群组"""
        try:
            # 检查权限 - 只有群组所有者可以删除
            if not self.oper_member.is_team_owner(team_id, user_id):
                return "只有群组所有者可以删除群组", False
            
            team = self.oper_team.get_by_id(team_id)
            if not team:
                return "群组不存在", False
            
            def _delete_team_transaction():
                # 删除群组（级联删除会自动删除相关记录）
                delete_result, delete_flag = self.oper_team.delete_team(team)
                if not delete_flag:
                    raise Exception(f"删除群组失败: {delete_result}")
                
                return {
                    'team_id': team_id,
                    'team_name': team.name,
                    'message': '群组删除成功'
                }
            
            return self._execute_with_transaction(_delete_team_transaction, "删除群组")
            
        except Exception as e:
            logger.error(f"删除群组异常: {str(e)}")
            return "删除群组失败", False
    
    def transfer_ownership(self, team_id: str, current_owner_id: str, new_owner_id: str) -> Tuple[Any, bool]:
        """转让群组所有权"""
        try:
            # 检查权限
            if not self.oper_member.is_team_owner(team_id, current_owner_id):
                return "只有群组所有者可以转让所有权", False
            
            # 检查新所有者是否为群组成员
            new_owner_member = self.oper_member.get_by_team_and_user(team_id, new_owner_id)
            if not new_owner_member:
                return "新所有者必须是群组成员", False
            
            current_owner_member = self.oper_member.get_by_team_and_user(team_id, current_owner_id)
            
            def _transfer_ownership_transaction():
                # 将新所有者设为owner
                update_result, update_flag = self.oper_member.update_member_role(new_owner_member, 'owner')
                if not update_flag:
                    raise Exception(f"更新新所有者角色失败: {update_result}")
                
                # 将原所有者设为admin
                admin_result, admin_flag = self.oper_member.update_member_role(current_owner_member, 'admin')
                if not admin_flag:
                    raise Exception(f"更新原所有者角色失败: {admin_result}")
                
                # 记录活动
                activity_result, activity_flag = self.oper_activity.record_role_changed(
                    team_id, current_owner_id, new_owner_id, 'admin', 'owner'
                )
                if not activity_flag:
                    logger.warning(f"记录所有权转让活动失败: {activity_result}")
                
                return {
                    'team_id': team_id,
                    'old_owner': current_owner_id,
                    'new_owner': new_owner_id,
                    'message': '群组所有权转让成功'
                }
            
            return self._execute_with_transaction(_transfer_ownership_transaction, "转让群组所有权")
            
        except Exception as e:
            logger.error(f"转让群组所有权异常: {str(e)}")
            return "转让群组所有权失败", False
    
    # ==================== 成员管理 ====================
    
    def get_team_members(self, team_id: str, user_id: str, page: int = 1, size: int = 20, role: str = None) -> Tuple[Any, bool]:
        """获取群组成员列表"""
        try:
            # 检查用户是否有权限查看成员列表
            member = self.oper_member.get_by_team_and_user(team_id, user_id)
            team = self.oper_team.get_by_id(team_id)
            
            if not member and team and team.visibility == 'private':
                return "没有权限查看成员列表", False
            
            # 获取成员列表
            paginated_members = self.oper_member.get_team_members(team_id, page, size, role)
            
            members_data = []
            for member_record in paginated_members.items:
                members_data.append({
                    'member_id': member_record.id,
                    'user_id': member_record.user_id,
                    'role': member_record.role,
                    'invited_by': member_record.invited_by,
                    'joined_at': member_record.joined_at.isoformat() if member_record.joined_at else None,
                    'last_active_at': member_record.last_active_at.isoformat() if member_record.last_active_at else None
                })
            
            return {
                'members': members_data,
                'total': paginated_members.total,
                'page': page,
                'size': size,
                'pages': paginated_members.pages,
                'your_role': member.role if member else None
            }, True
            
        except Exception as e:
            logger.error(f"获取群组成员列表异常: {str(e)}")
            return "获取群组成员列表失败", False
    
    def promote_member(self, team_id: str, operator_id: str, target_user_id: str) -> Tuple[Any, bool]:
        """提升成员为管理员"""
        try:
            # 检查权限 - 只有群组所有者可以提升管理员
            if not self.oper_member.is_team_owner(team_id, operator_id):
                return "只有群组所有者可以提升管理员", False
            
            target_member = self.oper_member.get_by_team_and_user(team_id, target_user_id)
            if not target_member:
                return "目标用户不是群组成员", False
            
            if target_member.role != 'member':
                return "只能提升普通成员为管理员", False
            
            def _promote_member_transaction():
                old_role = target_member.role
                update_result, update_flag = self.oper_member.update_member_role(target_member, 'admin')
                if not update_flag:
                    raise Exception(f"提升成员角色失败: {update_result}")
                
                # 记录活动
                activity_result, activity_flag = self.oper_activity.record_role_changed(
                    team_id, operator_id, target_user_id, old_role, 'admin'
                )
                if not activity_flag:
                    logger.warning(f"记录角色变更活动失败: {activity_result}")
                
                return {
                    'team_id': team_id,
                    'user_id': target_user_id,
                    'old_role': old_role,
                    'new_role': 'admin',
                    'message': '成员提升为管理员成功'
                }
            
            return self._execute_with_transaction(_promote_member_transaction, "提升成员为管理员")
            
        except Exception as e:
            logger.error(f"提升成员为管理员异常: {str(e)}")
            return "提升成员为管理员失败", False
    
    def demote_member(self, team_id: str, operator_id: str, target_user_id: str) -> Tuple[Any, bool]:
        """降级管理员为成员"""
        try:
            # 检查权限 - 只有群组所有者可以降级管理员
            if not self.oper_member.is_team_owner(team_id, operator_id):
                return "只有群组所有者可以降级管理员", False
            
            target_member = self.oper_member.get_by_team_and_user(team_id, target_user_id)
            if not target_member:
                return "目标用户不是群组成员", False
            
            if target_member.role != 'admin':
                return "只能降级管理员为普通成员", False
            
            def _demote_member_transaction():
                old_role = target_member.role
                update_result, update_flag = self.oper_member.update_member_role(target_member, 'member')
                if not update_flag:
                    raise Exception(f"降级成员角色失败: {update_result}")
                
                # 记录活动
                activity_result, activity_flag = self.oper_activity.record_role_changed(
                    team_id, operator_id, target_user_id, old_role, 'member'
                )
                if not activity_flag:
                    logger.warning(f"记录角色变更活动失败: {activity_result}")
                
                return {
                    'team_id': team_id,
                    'user_id': target_user_id,
                    'old_role': old_role,
                    'new_role': 'member',
                    'message': '管理员降级为成员成功'
                }
            
            return self._execute_with_transaction(_demote_member_transaction, "降级管理员为成员")
            
        except Exception as e:
            logger.error(f"降级管理员为成员异常: {str(e)}")
            return "降级管理员为成员失败", False
    
    def remove_member(self, team_id: str, operator_id: str, target_user_id: str) -> Tuple[Any, bool]:
        """移除群组成员"""
        try:
            # 检查权限
            if not self.oper_member.is_team_admin_or_owner(team_id, operator_id):
                return "没有权限移除成员", False
            
            # 不能移除自己
            if operator_id == target_user_id:
                return "不能移除自己", False
            
            target_member = self.oper_member.get_by_team_and_user(team_id, target_user_id)
            if not target_member:
                return "目标用户不是群组成员", False
            
            # 普通管理员不能移除所有者或其他管理员
            operator_member = self.oper_member.get_by_team_and_user(team_id, operator_id)
            if operator_member.role == 'admin' and target_member.role in ['owner', 'admin']:
                return "管理员不能移除所有者或其他管理员", False
            
            # 所有者不能被移除
            if target_member.role == 'owner':
                return "不能移除群组所有者", False
            
            def _remove_member_transaction():
                remove_result, remove_flag = self.oper_member.remove_member(target_member)
                if not remove_flag:
                    raise Exception(f"移除成员失败: {remove_result}")
                
                # 记录活动
                activity_result, activity_flag = self.oper_activity.record_member_left(
                    team_id, operator_id, target_user_id
                )
                if not activity_flag:
                    logger.warning(f"记录成员离开活动失败: {activity_result}")
                
                return {
                    'team_id': team_id,
                    'removed_user_id': target_user_id,
                    'message': '成员移除成功'
                }
            
            return self._execute_with_transaction(_remove_member_transaction, "移除群组成员")
            
        except Exception as e:
            logger.error(f"移除群组成员异常: {str(e)}")
            return "移除群组成员失败", False
    
    # ==================== 邀请管理 ====================
    
    def create_invitation(self, team_id: str, inviter_id: str, invitee_email: str, role: str = 'member', message: str = None) -> Tuple[Any, bool]:
        """创建群组邀请"""
        try:
            # 检查权限
            inviter_member = self.oper_member.get_by_team_and_user(team_id, inviter_id)
            if not inviter_member:
                return "您不是群组成员", False
            
            team = self.oper_team.get_by_id(team_id)
            if not team:
                return "群组不存在", False
            
            # 检查邀请权限
            if not team.allow_member_invite and inviter_member.role == 'member':
                return "群组不允许普通成员邀请他人", False
            
            def _create_invitation_transaction():
                # 生成邀请令牌
                invitation_token = self.oper_invitation.generate_invitation_token()
                expires_at = datetime.now() + timedelta(hours=self.default_invitation_expires_hours)
                
                invitation = TeamInvitationModel(
                    team_id=team_id,
                    invitee_email=invitee_email,
                    invited_role=role,
                    invitation_token=invitation_token,
                    invited_by=inviter_id,
                    expires_at=expires_at,
                    message=message
                )
                
                create_result, create_flag = self.oper_invitation.create_invitation(invitation)
                if not create_flag:
                    raise Exception(f"创建邀请失败: {create_result}")
                
                return {
                    'invitation_id': invitation.id,
                    'invitation_token': invitation_token,
                    'invitee_email': invitee_email,
                    'invited_role': role,
                    'expires_at': expires_at.isoformat(),
                    'message': '邀请创建成功'
                }
            
            return self._execute_with_transaction(_create_invitation_transaction, "创建群组邀请")
            
        except Exception as e:
            logger.error(f"创建群组邀请异常: {str(e)}")
            return "创建群组邀请失败", False
    
    def accept_invitation(self, invitation_token: str, user_id: str) -> Tuple[Any, bool]:
        """接受群组邀请"""
        try:
            invitation = self.oper_invitation.get_by_token(invitation_token)
            if not invitation:
                return "邀请不存在或已过期", False
            
            def _accept_invitation_transaction():
                # 接受邀请
                accept_result, accept_flag = self.oper_invitation.accept_invitation(invitation, user_id)
                if not accept_flag:
                    raise Exception(f"接受邀请失败: {accept_result}")
                
                # 添加为群组成员
                member = TeamMemberModel(
                    team_id=invitation.team_id,
                    user_id=user_id,
                    role=invitation.invited_role,
                    invited_by=invitation.invited_by
                )
                
                member_result, member_flag = self.oper_member.add_member(member)
                if not member_flag:
                    raise Exception(f"添加群组成员失败: {member_result}")
                
                # 记录活动
                activity_result, activity_flag = self.oper_activity.record_member_joined(
                    invitation.team_id, invitation.invited_by, user_id, invitation.invited_role
                )
                if not activity_flag:
                    logger.warning(f"记录成员加入活动失败: {activity_result}")
                
                return {
                    'team_id': invitation.team_id,
                    'user_id': user_id,
                    'role': invitation.invited_role,
                    'message': '成功加入群组'
                }
            
            return self._execute_with_transaction(_accept_invitation_transaction, "接受群组邀请")
            
        except Exception as e:
            logger.error(f"接受群组邀请异常: {str(e)}")
            return "接受群组邀请失败", False
    
    # ==================== 加入申请管理 ====================
    
    def create_join_request(self, team_id: str, user_id: str, email: str, message: str = None) -> Tuple[Any, bool]:
        """创建加入申请"""
        try:
            team = self.oper_team.get_by_id(team_id)
            if not team:
                return "群组不存在", False
            
            if team.visibility == 'private':
                return "私有群组不接受加入申请", False
            
            def _create_join_request_transaction():
                expires_at = datetime.now() + timedelta(hours=self.default_join_request_expires_hours)
                
                join_request = TeamJoinRequestModel(
                    team_id=team_id,
                    user_id=user_id,
                    email=email,
                    requested_role='member',
                    message=message,
                    expires_at=expires_at
                )
                
                create_result, create_flag = self.oper_join_request.create_request(join_request)
                if not create_flag:
                    raise Exception(f"创建加入申请失败: {create_result}")
                
                # 如果群组设置为自动批准，直接处理申请
                if team.auto_approve_join:
                    approve_result, approve_flag = self.oper_join_request.approve_request(
                        join_request, team.created_by
                    )
                    if not approve_flag:
                        raise Exception(f"自动批准申请失败: {approve_result}")
                    
                    # 添加为群组成员
                    member = TeamMemberModel(
                        team_id=team_id,
                        user_id=user_id,
                        role='member',
                        invited_by=team.created_by
                    )
                    
                    member_result, member_flag = self.oper_member.add_member(member)
                    if not member_flag:
                        raise Exception(f"添加群组成员失败: {member_result}")
                    
                    # 记录活动
                    activity_result, activity_flag = self.oper_activity.record_member_joined(
                        team_id, team.created_by, user_id, 'member'
                    )
                    if not activity_flag:
                        logger.warning(f"记录成员加入活动失败: {activity_result}")
                    
                    return {
                        'request_id': join_request.id,
                        'status': 'approved',
                        'team_id': team_id,
                        'message': '申请已自动批准，成功加入群组'
                    }
                
                return {
                    'request_id': join_request.id,
                    'status': 'pending',
                    'expires_at': expires_at.isoformat(),
                    'message': '加入申请已提交，等待审批'
                }
            
            return self._execute_with_transaction(_create_join_request_transaction, "创建加入申请")
            
        except Exception as e:
            logger.error(f"创建加入申请异常: {str(e)}")
            return "创建加入申请失败", False
    
    def approve_join_request(self, request_id: str, approver_id: str) -> Tuple[Any, bool]:
        """批准加入申请"""
        try:
            join_request = self.oper_join_request.get_by_id(request_id)
            if not join_request:
                return "申请不存在", False
            
            if join_request.status != 'pending':
                return "申请已处理", False
            
            # 检查权限
            if not self.oper_member.is_team_admin_or_owner(join_request.team_id, approver_id):
                return "没有权限处理申请", False
            
            def _approve_join_request_transaction():
                # 批准申请
                approve_result, approve_flag = self.oper_join_request.approve_request(
                    join_request, approver_id
                )
                if not approve_flag:
                    raise Exception(f"批准申请失败: {approve_result}")
                
                # 添加为群组成员
                member = TeamMemberModel(
                    team_id=join_request.team_id,
                    user_id=join_request.user_id,
                    role=join_request.requested_role,
                    invited_by=approver_id
                )
                
                member_result, member_flag = self.oper_member.add_member(member)
                if not member_flag:
                    raise Exception(f"添加群组成员失败: {member_result}")
                
                # 记录活动
                activity_result, activity_flag = self.oper_activity.record_member_joined(
                    join_request.team_id, approver_id, join_request.user_id, join_request.requested_role
                )
                if not activity_flag:
                    logger.warning(f"记录成员加入活动失败: {activity_result}")
                
                return {
                    'request_id': request_id,
                    'team_id': join_request.team_id,
                    'user_id': join_request.user_id,
                    'message': '申请已批准，用户成功加入群组'
                }
            
            return self._execute_with_transaction(_approve_join_request_transaction, "批准加入申请")
            
        except Exception as e:
            logger.error(f"批准加入申请异常: {str(e)}")
            return "批准加入申请失败", False
    
    # ==================== 权限检查 ====================
    
    def get_user_role_in_team(self, team_id: str, user_id: str) -> Tuple[Any, bool]:
        """获取用户在群组中的角色"""
        try:
            member = self.oper_member.get_by_team_and_user(team_id, user_id)
            
            if not member:
                return {
                    'team_id': team_id,
                    'user_id': user_id,
                    'role': None,
                    'is_member': False,
                    'permissions': []
                }, True
            
            # 只返回角色信息，权限由permission-service管理
            return {
                'team_id': team_id,
                'user_id': user_id,
                'role': member.role,
                'is_member': True,
                'joined_at': member.joined_at.isoformat() if member.joined_at else None
            }, True
            
        except Exception as e:
            logger.error(f"获取用户角色异常: {str(e)}")
            return "获取用户角色失败", False
    
    def get_user_teams_roles(self, user_id: str) -> Tuple[Any, bool]:
        """获取用户在所有群组中的角色"""
        try:
            user_teams = self.oper_member.get_user_teams(user_id)
            
            teams_roles = []
            for member in user_teams:
                teams_roles.append({
                    'team_id': member.team_id,
                    'role': member.role,
                    'joined_at': member.joined_at.isoformat() if member.joined_at else None
                })
            
            return {
                'user_id': user_id,
                'teams': teams_roles,
                'total_teams': len(teams_roles)
            }, True
            
        except Exception as e:
            logger.error(f"获取用户群组角色异常: {str(e)}")
            return "获取用户群组角色失败", False
    
    # 权限检查功能已移至permission-service
    # 如需检查权限，请调用permission-service的相关接口


# 创建全局控制器实例
team_controller = TeamController()