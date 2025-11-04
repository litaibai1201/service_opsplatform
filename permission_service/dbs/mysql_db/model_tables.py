# -*- coding: utf-8 -*-
"""
@文件: model_tables.py
@說明: 權限相關數據模型表 (Permission Service)
@時間: 2025-01-09
@作者: LiDong
"""

from common.common_tools import CommonTools
from dbs.mysql_db import db


class BaseModel(db.Model):
    """基础模型类"""
    __abstract__ = True

    created_at = db.Column(db.TIMESTAMP, default=db.func.current_timestamp(), nullable=False, comment="創建時間")


class PermissionModel(BaseModel):
    """权限定义模型"""
    __tablename__ = "permissions"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="權限ID")
    name = db.Column(db.String(100), unique=True, nullable=False, comment="權限名稱")
    description = db.Column(db.Text, comment="權限描述")
    resource_type = db.Column(db.String(50), nullable=False, comment="資源類型")
    action = db.Column(db.String(50), nullable=False, comment="操作類型")
    scope = db.Column(
        db.Enum('platform', 'team', 'project', 'resource', name='permission_scope'),
        nullable=False,
        comment="權限範圍"
    )
    is_system_permission = db.Column(db.Boolean, default=False, comment="是否為系統權限")

    # 索引
    __table_args__ = (
        db.Index('idx_resource_action', 'resource_type', 'action'),
        db.Index('idx_scope', 'scope'),
        db.Index('idx_system', 'is_system_permission'),
    )


class UserPermissionContextModel(BaseModel):
    """用户权限上下文缓存模型"""
    __tablename__ = "user_permission_context"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="上下文ID")
    user_id = db.Column(db.String(36), unique=True, nullable=False, comment="用戶ID")
    platform_role = db.Column(
        db.Enum('platform_admin', 'platform_user', name='platform_role'),
        nullable=False,
        comment="平台角色"
    )
    team_roles = db.Column(db.JSON, comment="群組角色映射")
    project_maintainer_roles = db.Column(db.JSON, comment="項目維護員角色映射")
    cached_at = db.Column(db.TIMESTAMP, default=db.func.current_timestamp(), comment="緩存時間")
    expires_at = db.Column(db.TIMESTAMP, nullable=False, comment="過期時間")

    # 索引
    __table_args__ = (
        db.Index('idx_user', 'user_id'),
        db.Index('idx_expires', 'expires_at'),
    )


class PermissionVerificationCacheModel(BaseModel):
    """权限验证缓存模型"""
    __tablename__ = "permission_verification_cache"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="緩存ID")
    user_id = db.Column(db.String(36), nullable=False, comment="用戶ID")
    resource_type = db.Column(db.String(50), nullable=False, comment="資源類型")
    resource_id = db.Column(db.String(36), nullable=False, comment="資源ID")
    action = db.Column(db.String(50), nullable=False, comment="操作類型")
    has_permission = db.Column(db.Boolean, nullable=False, comment="是否有權限")
    verification_context = db.Column(db.JSON, comment="驗證上下文信息")
    cached_at = db.Column(db.TIMESTAMP, default=db.func.current_timestamp(), comment="緩存時間")
    expires_at = db.Column(db.TIMESTAMP, nullable=False, comment="過期時間")

    # 唯一約束和索引
    __table_args__ = (
        db.UniqueConstraint('user_id', 'resource_type', 'resource_id', 'action', name='uk_permission_verification'),
        db.Index('idx_user_resource', 'user_id', 'resource_type', 'resource_id'),
        db.Index('idx_expires', 'expires_at'),
    )


class PermissionChangeEventModel(BaseModel):
    """权限变更事件模型"""
    __tablename__ = "permission_change_events"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="事件ID")
    event_type = db.Column(
        db.Enum('user_role_changed', 'team_member_changed', 'project_maintainer_changed', name='permission_event_type'),
        nullable=False,
        comment="事件類型"
    )
    user_id = db.Column(db.String(36), nullable=False, comment="用戶ID")
    resource_type = db.Column(db.String(50), nullable=False, comment="資源類型")
    resource_id = db.Column(db.String(36), nullable=False, comment="資源ID")
    old_role = db.Column(db.String(50), comment="舊角色")
    new_role = db.Column(db.String(50), comment="新角色")
    changed_by = db.Column(db.String(36), nullable=False, comment="變更者ID")

    # 索引
    __table_args__ = (
        db.Index('idx_user', 'user_id'),
        db.Index('idx_resource', 'resource_type', 'resource_id'),
        db.Index('idx_created_at', 'created_at'),
    )
