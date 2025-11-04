# -*- coding: utf-8 -*-
"""
@文件: team_model.py
@說明: 群組模型操作類 (Team Service)
@時間: 2025-01-09
@作者: LiDong
"""

import secrets
import uuid
from datetime import datetime, timedelta
from sqlalchemy import and_, or_, func, desc
from sqlalchemy.orm import load_only
from typing import List, Dict, Any, Optional, Tuple

from common.common_tools import CommonTools, TryExcept
from dbs.mysql_db import db
from dbs.mysql_db.model_tables import (
    TeamModel, TeamMemberModel, TeamJoinRequestModel, 
    TeamInvitationModel, TeamActivityModel
)


class OperTeamModel:
    """群組模型操作類"""
    
    def __init__(self):
        self.model = TeamModel
    
    @TryExcept("創建群組失敗")
    def create_team(self, team_data):
        """创建新群组"""
        # 数据验证
        if not team_data.name or not team_data.name.strip():
            raise ValueError("群組名稱不能為空")
        
        if not team_data.created_by:
            raise ValueError("創建者不能為空")
        
        # 检查群组名是否已存在（同一创建者下）
        existing_team = self.model.query.filter(
            and_(
                self.model.name == team_data.name.strip(),
                self.model.created_by == team_data.created_by
            )
        ).first()
        
        if existing_team:
            raise ValueError("您已創建過同名群組")
        
        db.session.add(team_data)
        return True
    
    def get_by_id(self, team_id):
        """根据ID获取群组"""
        return self.model.query.filter(self.model.id == team_id).first()
    
    def get_by_name_and_creator(self, name, creator_id):
        """根据名称和创建者获取群组"""
        return self.model.query.filter(
            and_(
                self.model.name == name,
                self.model.created_by == creator_id
            )
        ).first()
    
    def get_teams_by_user(self, user_id, page=1, size=20, visibility=None):
        """获取用户相关的群组列表"""
        # 获取用户作为成员的群组
        member_teams_query = db.session.query(self.model).join(
            TeamMemberModel,
            self.model.id == TeamMemberModel.team_id
        ).filter(TeamMemberModel.user_id == user_id)
        
        # 如果指定了可见性，添加过滤条件
        if visibility:
            member_teams_query = member_teams_query.filter(self.model.visibility == visibility)
        
        # 分页查询
        paginated = member_teams_query.order_by(self.model.created_at.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
        
        return paginated
    
    def get_public_teams(self, page=1, size=20, search=None):
        """获取公开群组列表"""
        query = self.model.query.filter(self.model.visibility == 'public')
        
        # 搜索功能
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    self.model.name.like(search_term),
                    self.model.description.like(search_term)
                )
            )
        
        return query.order_by(self.model.created_at.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
    
    @TryExcept("更新群組失敗")
    def update_team(self, team, update_data):
        """更新群组信息"""
        allowed_fields = [
            'name', 'description', 'avatar_url', 'visibility', 'max_members',
            'settings', 'auto_approve_join', 'allow_member_invite',
            'require_approval_for_projects', 'default_project_visibility'
        ]
        
        for field, value in update_data.items():
            if field in allowed_fields and hasattr(team, field):
                setattr(team, field, value)
        
        return True
    
    @TryExcept("刪除群組失敗")
    def delete_team(self, team):
        """删除群组"""
        db.session.delete(team)
        return True
    
    def get_team_statistics(self, team_id):
        """获取群组统计信息"""
        team = self.get_by_id(team_id)
        if not team:
            return None
        
        # 成员数量统计
        members_count = TeamMemberModel.query.filter(TeamMemberModel.team_id == team_id).count()
        
        # 角色统计
        role_stats = db.session.query(
            TeamMemberModel.role,
            func.count(TeamMemberModel.id).label('count')
        ).filter(TeamMemberModel.team_id == team_id).group_by(TeamMemberModel.role).all()
        
        # 活动统计（最近30天）
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_activities = TeamActivityModel.query.filter(
            and_(
                TeamActivityModel.team_id == team_id,
                TeamActivityModel.created_at >= thirty_days_ago
            )
        ).count()
        
        return {
            'members_count': members_count,
            'role_distribution': {role: count for role, count in role_stats},
            'recent_activities': recent_activities,
            'max_members': team.max_members,
            'created_at': team.created_at
        }


class OperTeamMemberModel:
    """群組成員模型操作類"""
    
    def __init__(self):
        self.model = TeamMemberModel
    
    @TryExcept("添加群組成員失敗")
    def add_member(self, member_data):
        """添加群组成员"""
        # 检查是否已经是成员
        existing_member = self.model.query.filter(
            and_(
                self.model.team_id == member_data.team_id,
                self.model.user_id == member_data.user_id
            )
        ).first()
        
        if existing_member:
            raise ValueError("用戶已經是群組成員")
        
        # 检查群组成员上限
        team = OperTeamModel().get_by_id(member_data.team_id)
        if team and team.max_members:
            current_members = self.model.query.filter(self.model.team_id == member_data.team_id).count()
            if current_members >= team.max_members:
                raise ValueError("群組成員已達上限")
        
        db.session.add(member_data)
        return True
    
    def get_by_team_and_user(self, team_id, user_id):
        """根据群组和用户获取成员记录"""
        return self.model.query.filter(
            and_(
                self.model.team_id == team_id,
                self.model.user_id == user_id
            )
        ).first()
    
    def get_team_members(self, team_id, page=1, size=20, role=None):
        """获取群组成员列表"""
        query = self.model.query.filter(self.model.team_id == team_id)
        
        if role:
            query = query.filter(self.model.role == role)
        
        return query.order_by(self.model.joined_at.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
    
    def get_user_teams(self, user_id, role=None):
        """获取用户所在的群组列表"""
        query = self.model.query.filter(self.model.user_id == user_id)
        
        if role:
            query = query.filter(self.model.role == role)
        
        return query.all()
    
    @TryExcept("更新成員角色失敗")
    def update_member_role(self, member, new_role):
        """更新成员角色"""
        member.role = new_role
        return True
    
    @TryExcept("更新成員活躍時間失敗")
    def update_last_active(self, member):
        """更新成员最后活跃时间"""
        member.last_active_at = datetime.now()
        return True
    
    @TryExcept("移除群組成員失敗")
    def remove_member(self, member):
        """移除群组成员"""
        db.session.delete(member)
        return True
    
    def is_team_owner(self, team_id, user_id):
        """检查用户是否为群组所有者"""
        member = self.get_by_team_and_user(team_id, user_id)
        return member and member.role == 'owner'
    
    def is_team_admin_or_owner(self, team_id, user_id):
        """检查用户是否为群组管理员或所有者"""
        member = self.get_by_team_and_user(team_id, user_id)
        return member and member.role in ['owner', 'admin']
    
    def get_team_owners_and_admins(self, team_id):
        """获取群组的所有者和管理员"""
        return self.model.query.filter(
            and_(
                self.model.team_id == team_id,
                self.model.role.in_(['owner', 'admin'])
            )
        ).all()


class OperTeamJoinRequestModel:
    """群組加入申請模型操作類"""
    
    def __init__(self):
        self.model = TeamJoinRequestModel
    
    @TryExcept("創建加入申請失敗")
    def create_request(self, request_data):
        """创建加入申请"""
        # 检查是否已有待处理的申请
        existing_request = self.model.query.filter(
            and_(
                self.model.team_id == request_data.team_id,
                self.model.user_id == request_data.user_id,
                self.model.status == 'pending'
            )
        ).first()
        
        if existing_request:
            raise ValueError("您已提交過加入申請，請等待處理")
        
        # 检查是否已经是成员
        member_check = OperTeamMemberModel().get_by_team_and_user(
            request_data.team_id, request_data.user_id
        )
        if member_check:
            raise ValueError("您已經是群組成員")
        
        db.session.add(request_data)
        return True
    
    def get_by_id(self, request_id):
        """根据ID获取申请"""
        return self.model.query.filter(self.model.id == request_id).first()
    
    def get_pending_requests_by_team(self, team_id, page=1, size=20):
        """获取群组的待处理申请"""
        return self.model.query.filter(
            and_(
                self.model.team_id == team_id,
                self.model.status == 'pending',
                self.model.expires_at > datetime.now()
            )
        ).order_by(self.model.created_at.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
    
    def get_user_requests(self, user_id, page=1, size=20):
        """获取用户的申请记录"""
        return self.model.query.filter(
            self.model.user_id == user_id
        ).order_by(self.model.created_at.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
    
    @TryExcept("批准申請失敗")
    def approve_request(self, request, resolved_by):
        """批准申请"""
        request.status = 'approved'
        request.resolved_at = datetime.now()
        request.resolved_by = resolved_by
        return True
    
    @TryExcept("拒絕申請失敗")
    def reject_request(self, request, resolved_by, reason=None):
        """拒绝申请"""
        request.status = 'rejected'
        request.resolved_at = datetime.now()
        request.resolved_by = resolved_by
        if reason:
            request.rejection_reason = reason
        return True
    
    @TryExcept("清理過期申請失敗")
    def cleanup_expired_requests(self):
        """清理过期申请"""
        current_time = datetime.now()
        expired_requests = self.model.query.filter(
            and_(
                self.model.expires_at <= current_time,
                self.model.status == 'pending'
            )
        ).all()
        
        for request in expired_requests:
            request.status = 'expired'
        
        return len(expired_requests)


class OperTeamInvitationModel:
    """群組邀請模型操作類"""
    
    def __init__(self):
        self.model = TeamInvitationModel
    
    @TryExcept("創建邀請失敗")
    def create_invitation(self, invitation_data):
        """创建邀请"""
        # 检查是否已有待处理的邀请
        existing_invitation = self.model.query.filter(
            and_(
                self.model.team_id == invitation_data.team_id,
                self.model.invitee_email == invitation_data.invitee_email,
                self.model.status == 'pending'
            )
        ).first()
        
        if existing_invitation:
            raise ValueError("該郵箱已有待處理的邀請")
        
        # 如果有用户ID，检查是否已经是成员
        if invitation_data.invitee_user_id:
            member_check = OperTeamMemberModel().get_by_team_and_user(
                invitation_data.team_id, invitation_data.invitee_user_id
            )
            if member_check:
                raise ValueError("該用戶已經是群組成員")
        
        db.session.add(invitation_data)
        return True
    
    def get_by_id(self, invitation_id):
        """根据ID获取邀请"""
        return self.model.query.filter(self.model.id == invitation_id).first()
    
    def get_by_token(self, token):
        """根据令牌获取邀请"""
        return self.model.query.filter(
            and_(
                self.model.invitation_token == token,
                self.model.status == 'pending',
                self.model.expires_at > datetime.now()
            )
        ).first()
    
    def get_team_invitations(self, team_id, page=1, size=20, status=None):
        """获取群组的邀请列表"""
        query = self.model.query.filter(self.model.team_id == team_id)
        
        if status:
            query = query.filter(self.model.status == status)
        
        return query.order_by(self.model.created_at.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
    
    def get_user_invitations(self, email, page=1, size=20):
        """获取用户的邀请列表"""
        return self.model.query.filter(
            self.model.invitee_email == email
        ).order_by(self.model.created_at.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
    
    @TryExcept("接受邀請失敗")
    def accept_invitation(self, invitation, user_id=None):
        """接受邀请"""
        invitation.status = 'accepted'
        invitation.accepted_at = datetime.now()
        if user_id:
            invitation.invitee_user_id = user_id
        return True
    
    @TryExcept("拒絕邀請失敗")
    def decline_invitation(self, invitation):
        """拒绝邀请"""
        invitation.status = 'declined'
        return True
    
    @TryExcept("清理過期邀請失敗")
    def cleanup_expired_invitations(self):
        """清理过期邀请"""
        current_time = datetime.now()
        expired_invitations = self.model.query.filter(
            and_(
                self.model.expires_at <= current_time,
                self.model.status == 'pending'
            )
        ).all()
        
        for invitation in expired_invitations:
            invitation.status = 'expired'
        
        return len(expired_invitations)
    
    @staticmethod
    def generate_invitation_token():
        """生成邀请令牌"""
        return secrets.token_urlsafe(32)


class OperTeamActivityModel:
    """群組活動記錄模型操作類"""
    
    def __init__(self):
        self.model = TeamActivityModel
    
    @TryExcept("記錄群組活動失敗")
    def create_activity(self, activity_data):
        """创建群组活动记录"""
        db.session.add(activity_data)
        return True
    
    def get_team_activities(self, team_id, page=1, size=20, activity_type=None):
        """获取群组活动记录"""
        query = self.model.query.filter(self.model.team_id == team_id)
        
        if activity_type:
            query = query.filter(self.model.activity_type == activity_type)
        
        return query.order_by(self.model.created_at.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
    
    def get_user_activities_in_team(self, team_id, user_id, page=1, size=20):
        """获取用户在群组中的活动记录"""
        return self.model.query.filter(
            and_(
                self.model.team_id == team_id,
                self.model.user_id == user_id
            )
        ).order_by(self.model.created_at.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
    
    def record_team_creation(self, team_id, user_id, team_name):
        """记录群组创建活动"""
        activity = TeamActivityModel(
            team_id=team_id,
            user_id=user_id,
            activity_type='team_created',
            description=f'創建了群組 "{team_name}"',
            metadata={'team_name': team_name}
        )
        return self.create_activity(activity)
    
    def record_member_joined(self, team_id, user_id, new_member_id, role='member'):
        """记录成员加入活动"""
        activity = TeamActivityModel(
            team_id=team_id,
            user_id=user_id,
            activity_type='member_joined',
            description=f'新成員加入群組，角色為 {role}',
            metadata={'new_member_id': new_member_id, 'role': role}
        )
        return self.create_activity(activity)
    
    def record_member_left(self, team_id, user_id, left_member_id):
        """记录成员离开活动"""
        activity = TeamActivityModel(
            team_id=team_id,
            user_id=user_id,
            activity_type='member_left',
            description='成員離開了群組',
            metadata={'left_member_id': left_member_id}
        )
        return self.create_activity(activity)
    
    def record_role_changed(self, team_id, user_id, target_member_id, old_role, new_role):
        """记录角色变更活动"""
        activity = TeamActivityModel(
            team_id=team_id,
            user_id=user_id,
            activity_type='role_changed',
            description=f'成員角色從 {old_role} 變更為 {new_role}',
            metadata={
                'target_member_id': target_member_id,
                'old_role': old_role,
                'new_role': new_role
            }
        )
        return self.create_activity(activity)
    
    def record_team_updated(self, team_id, user_id, changes):
        """记录群组信息更新活动"""
        activity = TeamActivityModel(
            team_id=team_id,
            user_id=user_id,
            activity_type='team_updated',
            description='群組信息已更新',
            metadata={'changes': changes}
        )
        return self.create_activity(activity)
    
    @TryExcept("清理舊活動記錄失敗")
    def cleanup_old_activities(self, days=90):
        """清理旧的活动记录"""
        cutoff_date = datetime.now() - timedelta(days=days)
        old_activities = self.model.query.filter(
            self.model.created_at < cutoff_date
        ).all()
        
        for activity in old_activities:
            db.session.delete(activity)
        
        return len(old_activities)