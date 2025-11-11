# -*- coding: utf-8 -*-
"""
@文件: model_tables.py
@說明: 群組相關數據模型表 (Team Service)
@時間: 2025-01-09
@作者: LiDong
"""

from common.common_tools import CommonTools
from dbs.mysql_db import db


class BaseModel(db.Model):
    """基础模型类"""
    __abstract__ = True

    created_at = db.Column(db.TIMESTAMP, default=db.func.current_timestamp(), nullable=False, comment="創建時間")
    updated_at = db.Column(
        db.TIMESTAMP, 
        default=db.func.current_timestamp(), 
        onupdate=db.func.current_timestamp(),
        nullable=False,
        comment="更新時間"
    )


class TeamModel(BaseModel):
    """群组模型"""
    __tablename__ = "teams"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="群組ID")
    name = db.Column(db.String(255), nullable=False, comment="群組名稱")
    description = db.Column(db.Text, comment="群組描述")
    avatar_url = db.Column(db.String(255), comment="群組頭像URL")
    visibility = db.Column(
        db.Enum('public', 'private', 'internal', name='team_visibility'),
        nullable=False,
        default='private',
        comment="可見性"
    )
    max_members = db.Column(db.Integer, default=100, comment="最大成員數")
    settings = db.Column(db.JSON, comment="群組配置信息")
    auto_approve_join = db.Column(db.Boolean, default=False, comment="自動批准加入")
    allow_member_invite = db.Column(db.Boolean, default=False, comment="允許成員邀請")
    require_approval_for_projects = db.Column(db.Boolean, default=True, comment="專案需要審批")
    default_project_visibility = db.Column(
        db.Enum('public', 'private', name='default_project_visibility'),
        default='private',
        comment="默認專案可見性"
    )
    created_by = db.Column(db.String(36), nullable=False, comment="創建者ID")

    # 索引
    __table_args__ = (
        db.Index('idx_creator', 'created_by'),
        db.Index('idx_visibility', 'visibility'),
        db.Index('idx_name', 'name'),
        db.Index('ft_name_desc', 'name', 'description', mysql_prefix='FULLTEXT'),
    )


class TeamMemberModel(BaseModel):
    """群组成员模型"""
    __tablename__ = "team_members"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="成員關聯ID")
    team_id = db.Column(db.String(36), db.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False, comment="群組ID")
    user_id = db.Column(db.String(36), nullable=False, comment="用戶ID")
    role = db.Column(
        db.Enum('owner', 'admin', 'member', name='team_member_role'),
        nullable=False,
        default='member',
        comment="群組角色"
    )
    custom_permissions = db.Column(db.JSON, comment="自定義權限擴展")
    invited_by = db.Column(db.String(36), comment="邀請者ID")
    joined_at = db.Column(db.TIMESTAMP, default=db.func.current_timestamp(), comment="加入時間")
    last_active_at = db.Column(db.TIMESTAMP, default=db.func.current_timestamp(), comment="最後活躍時間")

    # 關係
    team = db.relationship('TeamModel', backref='members')

    # 唯一約束和索引
    __table_args__ = (
        db.UniqueConstraint('team_id', 'user_id', name='uk_team_user'),
        db.Index('idx_team', 'team_id'),
        db.Index('idx_user', 'user_id'),
        db.Index('idx_role', 'role'),
        db.Index('idx_last_active', 'last_active_at'),
    )


class TeamJoinRequestModel(BaseModel):
    """群组加入申请模型"""
    __tablename__ = "team_join_requests"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="申請ID")
    team_id = db.Column(db.String(36), db.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False, comment="群組ID")
    user_id = db.Column(db.String(36), nullable=False, comment="用戶ID")
    email = db.Column(db.String(255), nullable=False, comment="申請者郵箱")
    requested_role = db.Column(
        db.Enum('member', name='requested_role'),
        default='member',
        comment="申請角色"
    )
    message = db.Column(db.Text, comment="申請理由")
    status = db.Column(
        db.Enum('pending', 'approved', 'rejected', 'expired', name='join_request_status'),
        default='pending',
        comment="申請狀態"
    )
    expires_at = db.Column(db.TIMESTAMP, nullable=False, comment="過期時間")
    resolved_at = db.Column(db.TIMESTAMP, comment="處理時間")
    resolved_by = db.Column(db.String(36), comment="處理者ID")
    rejection_reason = db.Column(db.Text, comment="拒絕原因")

    # 關係
    team = db.relationship('TeamModel', backref='join_requests')

    # 唯一約束和索引
    __table_args__ = (
        db.UniqueConstraint('team_id', 'user_id', name='uk_team_user_request'),
        db.Index('idx_team', 'team_id'),
        db.Index('idx_user', 'user_id'),
        db.Index('idx_status', 'status'),
        db.Index('idx_expires', 'expires_at'),
    )


class TeamInvitationModel(BaseModel):
    """群组邀请模型"""
    __tablename__ = "team_invitations"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="邀請ID")
    team_id = db.Column(db.String(36), db.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False, comment="群組ID")
    invitee_email = db.Column(db.String(255), nullable=False, comment="被邀請者郵箱")
    invitee_user_id = db.Column(db.String(36), comment="被邀請者用戶ID")
    invited_role = db.Column(
        db.Enum('admin', 'member', name='invited_role'),
        default='member',
        comment="邀請角色"
    )
    invitation_token = db.Column(db.String(255), unique=True, nullable=False, comment="邀請令牌")
    invited_by = db.Column(db.String(36), nullable=False, comment="邀請者ID")
    expires_at = db.Column(db.TIMESTAMP, nullable=False, comment="過期時間")
    status = db.Column(
        db.Enum('pending', 'accepted', 'declined', 'expired', name='invitation_status'),
        default='pending',
        comment="邀請狀態"
    )
    message = db.Column(db.Text, comment="邀請消息")
    accepted_at = db.Column(db.TIMESTAMP, comment="接受時間")

    # 關係
    team = db.relationship('TeamModel', backref='invitations')

    # 索引
    __table_args__ = (
        db.Index('idx_team', 'team_id'),
        db.Index('idx_email', 'invitee_email'),
        db.Index('idx_user', 'invitee_user_id'),
        db.Index('idx_status', 'status'),
        db.Index('idx_token', 'invitation_token'),
        db.Index('idx_expires', 'expires_at'),
    )


class TeamActivityModel(BaseModel):
    """群组活动记录模型"""
    __tablename__ = "team_activities"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="活動ID")
    team_id = db.Column(db.String(36), db.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False, comment="群組ID")
    user_id = db.Column(db.String(36), nullable=False, comment="用戶ID")
    activity_type = db.Column(db.String(100), nullable=False, comment="活動類型")
    description = db.Column(db.Text, nullable=False, comment="活動描述")
    _metadata = db.Column(db.JSON, comment="活動元數據")

    # 關係
    team = db.relationship('TeamModel', backref='activities')

    # 索引
    __table_args__ = (
        db.Index('idx_team', 'team_id'),
        db.Index('idx_user', 'user_id'),
        db.Index('idx_type', 'activity_type'),
        db.Index('idx_created', 'created_at'),
    )