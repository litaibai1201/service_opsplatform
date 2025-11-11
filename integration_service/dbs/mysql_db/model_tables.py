# -*- coding: utf-8 -*-
"""
@文件: model_tables.py
@說明: Integration Service数据库模型表定义
@時間: 2025-01-09
@作者: LiDong
"""
import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import JSON, text
from . import db


class BaseMixinModel:
    """基础混合模型类"""
    
    @classmethod
    def generate_uuid(cls):
        """生成UUID"""
        return str(uuid.uuid4())


class WebhookModel(db.Model, BaseMixinModel):
    """Webhook配置表模型"""
    __tablename__ = "webhooks"
    
    id = db.Column(db.String(36), nullable=False, primary_key=True, default=BaseMixinModel.generate_uuid, comment="主键ID")
    project_id = db.Column(db.String(36), nullable=False, comment="项目ID")
    name = db.Column(db.String(255), nullable=False, comment="Webhook名称")
    url = db.Column(db.String(500), nullable=False, comment="回调URL")
    events = db.Column(JSON, nullable=False, comment="监听事件列表")
    headers = db.Column(JSON, nullable=True, comment="自定义请求头")
    secret = db.Column(db.String(255), nullable=True, comment="签名密钥")
    is_active = db.Column(db.Boolean, nullable=False, default=True, comment="是否激活")
    retry_config = db.Column(JSON, nullable=True, comment="重试配置")
    timeout_seconds = db.Column(db.Integer, nullable=False, default=30, comment="超时时间(秒)")
    last_triggered_at = db.Column(db.DateTime, nullable=True, comment="最后触发时间")
    success_count = db.Column(db.Integer, nullable=False, default=0, comment="成功次数")
    failure_count = db.Column(db.Integer, nullable=False, default=0, comment="失败次数")
    created_by = db.Column(db.String(36), nullable=False, comment="创建者ID")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now, comment="创建时间")
    
    # 建立索引
    __table_args__ = (
        db.Index('idx_project', 'project_id'),
        db.Index('idx_active', 'is_active'),
        db.Index('idx_created_by', 'created_by'),
    )
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'project_id': self.project_id,
            'name': self.name,
            'url': self.url,
            'events': self.events,
            'headers': self.headers,
            'secret': self.secret,
            'is_active': self.is_active,
            'retry_config': self.retry_config,
            'timeout_seconds': self.timeout_seconds,
            'last_triggered_at': self.last_triggered_at.isoformat() if self.last_triggered_at else None,
            'success_count': self.success_count,
            'failure_count': self.failure_count,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class WebhookLogModel(db.Model, BaseMixinModel):
    """Webhook执行日志表模型"""
    __tablename__ = "webhook_logs"
    
    id = db.Column(db.String(36), nullable=False, primary_key=True, default=BaseMixinModel.generate_uuid, comment="主键ID")
    webhook_id = db.Column(db.String(36), nullable=False, comment="Webhook ID")
    event_type = db.Column(db.String(100), nullable=False, comment="事件类型")
    payload = db.Column(JSON, nullable=False, comment="请求载荷")
    response_status = db.Column(db.Integer, nullable=True, comment="响应状态码")
    response_body = db.Column(db.Text, nullable=True, comment="响应内容")
    response_headers = db.Column(JSON, nullable=True, comment="响应头")
    execution_time_ms = db.Column(db.Integer, nullable=True, comment="执行时间(毫秒)")
    error_message = db.Column(db.Text, nullable=True, comment="错误信息")
    retry_count = db.Column(db.Integer, nullable=False, default=0, comment="重试次数")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now, comment="创建时间")
    
    # 外键关系
    webhook = db.relationship('WebhookModel', backref='logs', foreign_keys=[webhook_id], 
                             primaryjoin="WebhookLogModel.webhook_id == WebhookModel.id")
    
    # 建立索引
    __table_args__ = (
        db.Index('idx_webhook', 'webhook_id'),
        db.Index('idx_event', 'event_type'),
        db.Index('idx_status', 'response_status'),
        db.Index('idx_created', 'created_at'),
    )
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'webhook_id': self.webhook_id,
            'event_type': self.event_type,
            'payload': self.payload,
            'response_status': self.response_status,
            'response_body': self.response_body,
            'response_headers': self.response_headers,
            'execution_time_ms': self.execution_time_ms,
            'error_message': self.error_message,
            'retry_count': self.retry_count,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class PluginModel(db.Model, BaseMixinModel):
    """插件管理表模型"""
    __tablename__ = "plugins"
    
    id = db.Column(db.String(36), nullable=False, primary_key=True, default=BaseMixinModel.generate_uuid, comment="主键ID")
    name = db.Column(db.String(255), nullable=False, unique=True, comment="插件名称")
    version = db.Column(db.String(50), nullable=False, comment="版本号")
    description = db.Column(db.Text, nullable=True, comment="插件描述")
    author = db.Column(db.String(255), nullable=True, comment="作者")
    repository_url = db.Column(db.String(500), nullable=True, comment="代码仓库URL")
    documentation_url = db.Column(db.String(500), nullable=True, comment="文档URL")
    manifest = db.Column(JSON, nullable=False, comment="插件清单")
    permissions = db.Column(JSON, nullable=True, comment="权限列表")
    configuration_schema = db.Column(JSON, nullable=True, comment="配置架构")
    is_enabled = db.Column(db.Boolean, nullable=False, default=True, comment="是否启用")
    is_verified = db.Column(db.Boolean, nullable=False, default=False, comment="是否已验证")
    verification_date = db.Column(db.Date, nullable=True, comment="验证日期")
    download_count = db.Column(db.Integer, nullable=False, default=0, comment="下载次数")
    rating = db.Column(db.Numeric(3, 2), nullable=False, default=Decimal('0.00'), comment="评分")
    review_count = db.Column(db.Integer, nullable=False, default=0, comment="评价数量")
    installed_by = db.Column(db.String(36), nullable=False, comment="安装者ID")
    installed_at = db.Column(db.DateTime, nullable=False, default=datetime.now, comment="安装时间")
    
    # 建立索引
    __table_args__ = (
        db.Index('idx_enabled', 'is_enabled'),
        db.Index('idx_verified', 'is_verified'),
        db.Index('idx_rating', 'rating', postgresql_ops={'rating': 'DESC'}),
        db.Index('idx_downloads', 'download_count', postgresql_ops={'download_count': 'DESC'}),
    )
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'name': self.name,
            'version': self.version,
            'description': self.description,
            'author': self.author,
            'repository_url': self.repository_url,
            'documentation_url': self.documentation_url,
            'manifest': self.manifest,
            'permissions': self.permissions,
            'configuration_schema': self.configuration_schema,
            'is_enabled': self.is_enabled,
            'is_verified': self.is_verified,
            'verification_date': self.verification_date.isoformat() if self.verification_date else None,
            'download_count': self.download_count,
            'rating': float(self.rating) if self.rating else 0.0,
            'review_count': self.review_count,
            'installed_by': self.installed_by,
            'installed_at': self.installed_at.isoformat() if self.installed_at else None
        }


class PluginConfigurationModel(db.Model, BaseMixinModel):
    """插件配置表模型"""
    __tablename__ = "plugin_configurations"
    
    id = db.Column(db.String(36), nullable=False, primary_key=True, default=BaseMixinModel.generate_uuid, comment="主键ID")
    plugin_id = db.Column(db.String(36), nullable=False, comment="插件ID")
    project_id = db.Column(db.String(36), nullable=True, comment="项目ID")
    configuration = db.Column(JSON, nullable=False, comment="配置信息")
    is_active = db.Column(db.Boolean, nullable=False, default=True, comment="是否激活")
    created_by = db.Column(db.String(36), nullable=False, comment="创建者ID")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now, comment="创建时间")
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.now, onupdate=datetime.now, comment="更新时间")
    
    # 外键关系
    plugin = db.relationship('PluginModel', backref='configurations', foreign_keys=[plugin_id],
                           primaryjoin="PluginConfigurationModel.plugin_id == PluginModel.id")
    
    # 建立索引
    __table_args__ = (
        db.Index('idx_plugin_project', 'plugin_id', 'project_id'),
        db.Index('idx_active', 'is_active'),
    )
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'plugin_id': self.plugin_id,
            'project_id': self.project_id,
            'configuration': self.configuration,
            'is_active': self.is_active,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class ExternalIntegrationModel(db.Model, BaseMixinModel):
    """外部集成配置表模型"""
    __tablename__ = "external_integrations"
    
    id = db.Column(db.String(36), nullable=False, primary_key=True, default=BaseMixinModel.generate_uuid, comment="主键ID")
    project_id = db.Column(db.String(36), nullable=False, comment="项目ID")
    integration_type = db.Column(db.String(100), nullable=False, comment="集成类型")
    name = db.Column(db.String(255), nullable=False, comment="集成名称")
    configuration = db.Column(JSON, nullable=False, comment="配置信息")
    auth_config = db.Column(JSON, nullable=True, comment="认证配置")
    sync_settings = db.Column(JSON, nullable=True, comment="同步设置")
    status = db.Column(db.Enum('active', 'inactive', 'error', name='integration_status'), 
                      nullable=False, default='active', comment="状态")
    last_sync_at = db.Column(db.DateTime, nullable=True, comment="最后同步时间")
    sync_error_message = db.Column(db.Text, nullable=True, comment="同步错误信息")
    created_by = db.Column(db.String(36), nullable=False, comment="创建者ID")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now, comment="创建时间")
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.now, onupdate=datetime.now, comment="更新时间")
    
    # 建立索引
    __table_args__ = (
        db.Index('idx_project_type', 'project_id', 'integration_type'),
        db.Index('idx_status', 'status'),
        db.Index('idx_last_sync', 'last_sync_at'),
    )
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'project_id': self.project_id,
            'integration_type': self.integration_type,
            'name': self.name,
            'configuration': self.configuration,
            'auth_config': self.auth_config,
            'sync_settings': self.sync_settings,
            'status': self.status,
            'last_sync_at': self.last_sync_at.isoformat() if self.last_sync_at else None,
            'sync_error_message': self.sync_error_message,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class IntegrationSyncLogModel(db.Model, BaseMixinModel):
    """集成同步日志表模型"""
    __tablename__ = "integration_sync_logs"
    
    id = db.Column(db.String(36), nullable=False, primary_key=True, default=BaseMixinModel.generate_uuid, comment="主键ID")
    integration_id = db.Column(db.String(36), nullable=False, comment="集成ID")
    sync_type = db.Column(db.String(100), nullable=False, comment="同步类型")
    status = db.Column(db.Enum('success', 'failure', 'partial', name='sync_status'), 
                      nullable=False, comment="同步状态")
    records_processed = db.Column(db.Integer, nullable=False, default=0, comment="处理记录数")
    errors_count = db.Column(db.Integer, nullable=False, default=0, comment="错误数量")
    sync_details = db.Column(JSON, nullable=True, comment="同步详情")
    error_details = db.Column(JSON, nullable=True, comment="错误详情")
    started_at = db.Column(db.DateTime, nullable=False, default=datetime.now, comment="开始时间")
    completed_at = db.Column(db.DateTime, nullable=True, comment="完成时间")
    
    # 外键关系
    integration = db.relationship('ExternalIntegrationModel', backref='sync_logs', foreign_keys=[integration_id],
                                primaryjoin="IntegrationSyncLogModel.integration_id == ExternalIntegrationModel.id")
    
    # 建立索引
    __table_args__ = (
        db.Index('idx_integration', 'integration_id'),
        db.Index('idx_status', 'status'),
        db.Index('idx_started', 'started_at'),
    )
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'integration_id': self.integration_id,
            'sync_type': self.sync_type,
            'status': self.status,
            'records_processed': self.records_processed,
            'errors_count': self.errors_count,
            'sync_details': self.sync_details,
            'error_details': self.error_details,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }