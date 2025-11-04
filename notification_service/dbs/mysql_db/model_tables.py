# -*- coding: utf-8 -*-
"""
@文件: model_tables.py
@說明: 通知服务数据库模型
@時間: 2025-01-09
@作者: LiDong
"""
import uuid
from datetime import datetime, time
from enum import Enum
from sqlalchemy import JSON, Time, TIMESTAMP
from . import db


def generate_uuid():
    """生成UUID"""
    return str(uuid.uuid4())


class BaseMixinModel:
    """基础混合模型"""
    
    def to_dict(self):
        """转换为字典"""
        result = {}
        for key, value in self.__dict__.items():
            if not key.startswith('_'):
                if isinstance(value, datetime):
                    result[key] = value.isoformat()
                elif isinstance(value, time):
                    result[key] = value.strftime('%H:%M:%S')
                elif isinstance(value, Enum):
                    result[key] = value.value
                else:
                    result[key] = value
        return result


class NotificationTemplateModel(db.Model, BaseMixinModel):
    """通知模板表"""
    __tablename__ = "notification_templates"
    
    id = db.Column(db.String(36), nullable=False, primary_key=True, default=generate_uuid)
    name = db.Column(db.String(255), unique=True, nullable=False, comment="模板名称")
    type = db.Column(db.String(100), nullable=False, comment="通知类型")
    event_type = db.Column(db.String(100), nullable=False, comment="事件类型")
    subject_template = db.Column(db.Text, comment="主题模板")
    content_template = db.Column(db.Text, nullable=False, comment="内容模板")
    html_template = db.Column(db.Text, comment="HTML模板")
    variables = db.Column(JSON, comment="模板变量")
    is_active = db.Column(db.Boolean, default=True, comment="是否启用")
    locale = db.Column(db.String(10), default='en', comment="语言")
    created_by = db.Column(db.String(36), nullable=False, comment="创建者ID")
    created_at = db.Column(TIMESTAMP, default=datetime.now, comment="创建时间")
    updated_at = db.Column(TIMESTAMP, default=datetime.now, onupdate=datetime.now, comment="更新时间")
    
    # 创建索引
    __table_args__ = (
        db.Index('idx_event', 'event_type'),
        db.Index('idx_type', 'type'),
        db.Index('idx_locale', 'locale'),
        db.Index('idx_active', 'is_active'),
    )


class UserNotificationPreferenceModel(db.Model, BaseMixinModel):
    """用户通知偏好表"""
    __tablename__ = "user_notification_preferences"
    
    id = db.Column(db.String(36), nullable=False, primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), nullable=False, comment="用户ID")
    event_type = db.Column(db.String(100), nullable=False, comment="事件类型")
    email_enabled = db.Column(db.Boolean, default=True, comment="邮件通知启用")
    in_app_enabled = db.Column(db.Boolean, default=True, comment="应用内通知启用")
    push_enabled = db.Column(db.Boolean, default=False, comment="推送通知启用")
    sms_enabled = db.Column(db.Boolean, default=False, comment="短信通知启用")
    frequency = db.Column(db.String(50), default='immediate', comment="通知频率")
    quiet_hours_start = db.Column(Time, comment="免打扰开始时间")
    quiet_hours_end = db.Column(Time, comment="免打扰结束时间")
    timezone = db.Column(db.String(50), comment="时区")
    
    # 创建唯一约束和索引
    __table_args__ = (
        db.UniqueConstraint('user_id', 'event_type'),
        db.Index('idx_user', 'user_id'),
        db.Index('idx_event', 'event_type'),
    )


class NotificationPriorityEnum(Enum):
    """通知优先级枚举"""
    LOW = 'low'
    NORMAL = 'normal'
    HIGH = 'high'
    URGENT = 'urgent'


class NotificationModel(db.Model, BaseMixinModel):
    """通知记录表"""
    __tablename__ = "notifications"
    
    id = db.Column(db.String(36), nullable=False, primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), nullable=False, comment="用户ID")
    type = db.Column(db.String(100), nullable=False, comment="通知类型")
    priority = db.Column(db.Enum(NotificationPriorityEnum), default=NotificationPriorityEnum.NORMAL, comment="优先级")
    title = db.Column(db.String(255), nullable=False, comment="通知标题")
    content = db.Column(db.Text, nullable=False, comment="通知内容")
    data = db.Column(JSON, comment="附加数据")
    is_read = db.Column(db.Boolean, default=False, comment="是否已读")
    read_at = db.Column(TIMESTAMP, comment="阅读时间")
    expires_at = db.Column(TIMESTAMP, comment="过期时间")
    created_at = db.Column(TIMESTAMP, default=datetime.now, comment="创建时间")
    
    # 创建索引
    __table_args__ = (
        db.Index('idx_user_read', 'user_id', 'is_read'),
        db.Index('idx_created', 'created_at'),
        db.Index('idx_priority', 'priority'),
        db.Index('idx_expires', 'expires_at'),
    )


class EmailStatusEnum(Enum):
    """邮件状态枚举"""
    PENDING = 'pending'
    PROCESSING = 'processing'
    SENT = 'sent'
    FAILED = 'failed'


class EmailPriorityEnum(Enum):
    """邮件优先级枚举"""
    LOW = 'low'
    NORMAL = 'normal'
    HIGH = 'high'


class EmailQueueModel(db.Model, BaseMixinModel):
    """邮件队列表"""
    __tablename__ = "email_queue"
    
    id = db.Column(db.String(36), nullable=False, primary_key=True, default=generate_uuid)
    to_email = db.Column(db.String(255), nullable=False, comment="收件人邮箱")
    to_name = db.Column(db.String(255), comment="收件人姓名")
    from_email = db.Column(db.String(255), comment="发件人邮箱")
    from_name = db.Column(db.String(255), comment="发件人姓名")
    subject = db.Column(db.String(255), nullable=False, comment="邮件主题")
    content = db.Column(db.Text, nullable=False, comment="邮件内容")
    html_content = db.Column(db.Text, comment="HTML内容")
    template_id = db.Column(db.String(36), comment="模板ID")
    template_data = db.Column(JSON, comment="模板数据")
    attachments = db.Column(JSON, comment="附件信息")
    priority = db.Column(db.Enum(EmailPriorityEnum), default=EmailPriorityEnum.NORMAL, comment="优先级")
    status = db.Column(db.Enum(EmailStatusEnum), default=EmailStatusEnum.PENDING, comment="状态")
    retry_count = db.Column(db.Integer, default=0, comment="重试次数")
    max_retries = db.Column(db.Integer, default=3, comment="最大重试次数")
    error_message = db.Column(db.Text, comment="错误信息")
    scheduled_at = db.Column(TIMESTAMP, default=datetime.now, comment="计划发送时间")
    sent_at = db.Column(TIMESTAMP, comment="发送时间")
    
    # 创建索引
    __table_args__ = (
        db.Index('idx_status', 'status'),
        db.Index('idx_scheduled', 'scheduled_at'),
        db.Index('idx_priority', 'priority'),
    )


class PushStatusEnum(Enum):
    """推送状态枚举"""
    PENDING = 'pending'
    SENT = 'sent'
    FAILED = 'failed'


class PushNotificationModel(db.Model, BaseMixinModel):
    """推送通知表"""
    __tablename__ = "push_notifications"
    
    id = db.Column(db.String(36), nullable=False, primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), nullable=False, comment="用户ID")
    device_token = db.Column(db.String(500), nullable=False, comment="设备令牌")
    title = db.Column(db.String(255), nullable=False, comment="推送标题")
    body = db.Column(db.Text, nullable=False, comment="推送内容")
    data = db.Column(JSON, comment="附加数据")
    status = db.Column(db.Enum(PushStatusEnum), default=PushStatusEnum.PENDING, comment="状态")
    error_message = db.Column(db.Text, comment="错误信息")
    sent_at = db.Column(TIMESTAMP, comment="发送时间")
    created_at = db.Column(TIMESTAMP, default=datetime.now, comment="创建时间")
    
    # 创建索引
    __table_args__ = (
        db.Index('idx_user', 'user_id'),
        db.Index('idx_status', 'status'),
        db.Index('idx_device_token', 'device_token'),
    )


class DeviceTypeEnum(Enum):
    """设备类型枚举"""
    IOS = 'ios'
    ANDROID = 'android'
    WEB = 'web'


class UserDeviceModel(db.Model, BaseMixinModel):
    """设备令牌表"""
    __tablename__ = "user_devices"
    
    id = db.Column(db.String(36), nullable=False, primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), nullable=False, comment="用户ID")
    device_token = db.Column(db.String(500), nullable=False, comment="设备令牌")
    device_type = db.Column(db.Enum(DeviceTypeEnum), nullable=False, comment="设备类型")
    device_name = db.Column(db.String(255), comment="设备名称")
    is_active = db.Column(db.Boolean, default=True, comment="是否活跃")
    registered_at = db.Column(TIMESTAMP, default=datetime.now, comment="注册时间")
    last_used_at = db.Column(TIMESTAMP, default=datetime.now, comment="最后使用时间")
    
    # 创建唯一约束和索引
    __table_args__ = (
        db.UniqueConstraint('user_id', 'device_token'),
        db.Index('idx_user', 'user_id'),
        db.Index('idx_active', 'is_active'),
    )