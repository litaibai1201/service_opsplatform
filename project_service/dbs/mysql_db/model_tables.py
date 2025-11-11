# -*- coding: utf-8 -*-
"""
@文件: model_tables.py
@說明: 項目相關數據模型表 (Project Service)
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


class ProjectModel(BaseModel):
    """项目模型"""
    __tablename__ = "projects"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="項目ID")
    name = db.Column(db.String(255), nullable=False, comment="項目名稱")
    description = db.Column(db.Text, comment="項目描述")
    team_id = db.Column(db.String(36), nullable=False, comment="群組ID")
    visibility = db.Column(
        db.Enum('public', 'private', name='project_visibility'),
        nullable=False,
        default='private',
        comment="可見性"
    )
    status = db.Column(
        db.Enum('active', 'archived', 'deleted', name='project_status'),
        default='active',
        comment="項目狀態"
    )
    template_id = db.Column(db.String(36), comment="模板ID")
    settings = db.Column(db.JSON, comment="項目配置")
    allow_member_edit = db.Column(db.Boolean, default=False, comment="是否允許普通群組成員編輯")
    allow_external_view = db.Column(db.Boolean, default=False, comment="是否允許外部用戶查看")
    allow_external_comment = db.Column(db.Boolean, default=False, comment="是否允許外部用戶評論")
    created_by = db.Column(db.String(36), nullable=False, comment="創建者ID")

    # 索引
    __table_args__ = (
        db.Index('idx_team', 'team_id'),
        db.Index('idx_creator', 'created_by'),
        db.Index('idx_visibility', 'visibility'),
        db.Index('idx_status', 'status'),
        db.Index('idx_template', 'template_id'),
        db.Index('ft_name_desc', 'name', 'description', mysql_prefix='FULLTEXT'),
    )


class ProjectMaintainerModel(BaseModel):
    """项目维护员模型"""
    __tablename__ = "project_maintainers"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="維護員ID")
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, comment="項目ID")
    user_id = db.Column(db.String(36), nullable=False, comment="用戶ID")
    assigned_by = db.Column(db.String(36), nullable=False, comment="分配者ID")
    assigned_at = db.Column(db.TIMESTAMP, default=db.func.current_timestamp(), comment="分配時間")

    # 關係
    project = db.relationship('ProjectModel', backref='maintainers')

    # 唯一約束和索引
    __table_args__ = (
        db.UniqueConstraint('project_id', 'user_id', name='uk_project_user'),
        db.Index('idx_project', 'project_id'),
        db.Index('idx_user', 'user_id'),
        db.Index('idx_assigned_by', 'assigned_by'),
    )


class ProjectTemplateModel(BaseModel):
    """项目模板模型"""
    __tablename__ = "project_templates"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="模板ID")
    name = db.Column(db.String(255), nullable=False, comment="模板名稱")
    description = db.Column(db.Text, comment="模板描述")
    template_data = db.Column(db.JSON, comment="模板數據")
    category = db.Column(db.String(100), comment="模板分類")
    is_public = db.Column(db.Boolean, default=False, comment="是否公開")
    usage_count = db.Column(db.Integer, default=0, comment="使用次數")
    created_by = db.Column(db.String(36), nullable=False, comment="創建者ID")

    # 索引
    __table_args__ = (
        db.Index('idx_category', 'category'),
        db.Index('idx_public', 'is_public'),
        db.Index('idx_usage', 'usage_count'),
    )


class TagModel(BaseModel):
    """标签模型"""
    __tablename__ = "tags"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="標籤ID")
    name = db.Column(db.String(255), nullable=False, comment="標籤名稱")
    color = db.Column(db.String(7), default='#6B7280', comment="標籤顏色")
    category = db.Column(db.String(100), comment="標籤分類")
    description = db.Column(db.Text, comment="標籤描述")
    usage_count = db.Column(db.Integer, default=0, comment="使用次數")
    created_by = db.Column(db.String(36), nullable=False, comment="創建者ID")

    # 唯一約束和索引
    __table_args__ = (
        db.UniqueConstraint('name', 'category', name='uk_name_category'),
        db.Index('idx_category', 'category'),
        db.Index('idx_usage', 'usage_count'),
        db.Index('idx_name', 'name'),
    )


class ProjectTagModel(db.Model):
    """项目标签关联模型"""
    __tablename__ = "project_tags"

    project_id = db.Column(db.String(36), db.ForeignKey('projects.id', ondelete='CASCADE'), primary_key=True, comment="項目ID")
    tag_id = db.Column(db.String(36), db.ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True, comment="標籤ID")
    created_at = db.Column(db.TIMESTAMP, default=db.func.current_timestamp(), comment="創建時間")

    # 關係
    project = db.relationship('ProjectModel', backref='project_tags')
    tag = db.relationship('TagModel', backref='project_tags')

    # 索引
    __table_args__ = (
        db.Index('idx_tag', 'tag_id'),
    )


class ProjectActivityModel(BaseModel):
    """项目活动记录模型"""
    __tablename__ = "project_activities"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="活動ID")
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, comment="項目ID")
    user_id = db.Column(db.String(36), nullable=False, comment="用戶ID")
    activity_type = db.Column(db.String(100), nullable=False, comment="活動類型")
    description = db.Column(db.Text, nullable=False, comment="活動描述")
    _metadata = db.Column(db.JSON, comment="活動元數據")

    # 關係
    project = db.relationship('ProjectModel', backref='activities')

    # 索引
    __table_args__ = (
        db.Index('idx_project', 'project_id'),
        db.Index('idx_user', 'user_id'),
        db.Index('idx_type', 'activity_type'),
        db.Index('idx_created', 'created_at'),
    )


class ProjectAccessRequestModel(BaseModel):
    """项目访问申请模型"""
    __tablename__ = "project_access_requests"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="申請ID")
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, comment="項目ID")
    user_id = db.Column(db.String(36), nullable=False, comment="用戶ID")
    access_type = db.Column(
        db.Enum('view', 'maintainer', name='access_type'),
        default='view',
        comment="申請訪問類型"
    )
    message = db.Column(db.Text, comment="申請消息")
    status = db.Column(
        db.Enum('pending', 'approved', 'rejected', 'expired', name='access_request_status'),
        default='pending',
        comment="申請狀態"
    )
    expires_at = db.Column(db.TIMESTAMP, nullable=False, comment="過期時間")
    resolved_at = db.Column(db.TIMESTAMP, comment="處理時間")
    resolved_by = db.Column(db.String(36), comment="處理者ID")
    rejection_reason = db.Column(db.Text, comment="拒絕原因")

    # 關係
    project = db.relationship('ProjectModel', backref='access_requests')

    # 唯一約束和索引
    __table_args__ = (
        db.UniqueConstraint('project_id', 'user_id', name='uk_project_user_request'),
        db.Index('idx_project', 'project_id'),
        db.Index('idx_user', 'user_id'),
        db.Index('idx_status', 'status'),
        db.Index('idx_expires', 'expires_at'),
    )


class ProjectExternalAccessModel(BaseModel):
    """项目外部访问记录模型"""
    __tablename__ = "project_external_access"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="訪問記錄ID")
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, comment="項目ID")
    user_id = db.Column(db.String(36), comment="用戶ID")
    access_token = db.Column(db.String(255), comment="訪問令牌")
    ip_address = db.Column(db.String(45), comment="IP地址")
    user_agent = db.Column(db.Text, comment="用戶代理")
    accessed_at = db.Column(db.TIMESTAMP, default=db.func.current_timestamp(), comment="訪問時間")
    access_duration = db.Column(db.Integer, comment="訪問時長")

    # 關係
    project = db.relationship('ProjectModel', backref='external_access_logs')

    # 索引
    __table_args__ = (
        db.Index('idx_project', 'project_id'),
        db.Index('idx_user', 'user_id'),
        db.Index('idx_token', 'access_token'),
        db.Index('idx_accessed_at', 'accessed_at'),
    )
