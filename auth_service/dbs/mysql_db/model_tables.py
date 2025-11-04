# -*- coding: utf-8 -*-
"""
@文件: model_tables.py
@說明: 認證相關數據模型表 (优化新版本)
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


class UserModel(BaseModel):
    """用户模型 - 增强版本"""
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="用戶ID")
    username = db.Column(db.String(255), nullable=False, unique=True, comment="用戶名")
    email = db.Column(db.String(255), nullable=False, unique=True, comment="郵箱")
    password_hash = db.Column(db.String(255), nullable=False, comment="密碼哈希")
    salt = db.Column(db.String(255), nullable=False, comment="密碼鹽值")
    avatar_url = db.Column(db.String(255), comment="頭像URL")
    display_name = db.Column(db.String(255), comment="顯示名稱")
    status = db.Column(
        db.Enum('active', 'inactive', 'suspended', 'pending_verification', name='user_status'),
        default='pending_verification',
        comment="用戶狀態"
    )
    email_verified = db.Column(db.Boolean, default=False, comment="郵箱是否已驗證")
    email_verification_token = db.Column(db.String(255), comment="郵箱驗證令牌")
    email_verification_expires = db.Column(db.TIMESTAMP, comment="郵箱驗證過期時間")
    phone = db.Column(db.String(20), comment="手機號")
    phone_verified = db.Column(db.Boolean, default=False, comment="手機是否已驗證")
    timezone = db.Column(db.String(50), default='UTC', comment="時區")
    language = db.Column(db.String(10), default='en', comment="語言偏好")
    last_login_at = db.Column(db.TIMESTAMP, comment="最後登錄時間")
    last_login_ip = db.Column(db.String(45), comment="最後登錄IP")
    failed_login_attempts = db.Column(db.Integer, default=0, comment="失敗登錄嘗試次數")
    locked_until = db.Column(db.TIMESTAMP, comment="鎖定至")
    password_reset_token = db.Column(db.String(255), comment="密碼重置令牌")
    password_reset_expires = db.Column(db.TIMESTAMP, comment="密碼重置過期時間")
    two_factor_enabled = db.Column(db.Boolean, default=False, comment="是否啟用雙重認證")
    two_factor_secret = db.Column(db.String(255), comment="雙重認證密鑰")
    backup_codes = db.Column(db.JSON, comment="備用驗證碼")
    preferences = db.Column(db.JSON, comment="用戶偏好設置")
    # 新增平台級權限字段
    platform_role = db.Column(
        db.Enum('platform_admin', 'platform_user', name='platform_role'),
        default='platform_user',
        comment="平台級角色"
    )

    # 索引
    __table_args__ = (
        db.Index('idx_email', 'email'),
        db.Index('idx_username', 'username'),
        db.Index('idx_status', 'status'),
        db.Index('idx_platform_role', 'platform_role'),
        db.Index('idx_verification_token', 'email_verification_token'),
        db.Index('idx_reset_token', 'password_reset_token'),
    )


class UserSessionModel(BaseModel):
    """用户会话模型 - 增强版本"""
    __tablename__ = "user_sessions"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="會話ID")
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, comment="用戶ID")
    session_token = db.Column(db.String(255), nullable=False, unique=True, comment="會話令牌")
    refresh_token_hash = db.Column(db.String(255), nullable=False, comment="刷新令牌哈希")
    device_info = db.Column(db.JSON, comment="設備信息")
    ip_address = db.Column(db.String(45), comment="IP地址")
    user_agent = db.Column(db.Text, comment="用戶代理")
    is_active = db.Column(db.Boolean, default=True, comment="是否活躍")
    expires_at = db.Column(db.TIMESTAMP, nullable=False, comment="過期時間")
    last_activity = db.Column(db.TIMESTAMP, default=db.func.current_timestamp(), comment="最後活動時間")

    # 關係
    user = db.relationship('UserModel', backref='sessions')

    # 索引
    __table_args__ = (
        db.Index('idx_user', 'user_id'),
        db.Index('idx_session_token', 'session_token'),
        db.Index('idx_refresh_token', 'refresh_token_hash'),
        db.Index('idx_expires', 'expires_at'),
        db.Index('idx_active', 'is_active'),
    )




class LoginAttemptModel(BaseModel):
    """登录尝试记录模型"""
    __tablename__ = "login_attempts"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="記錄ID")
    email = db.Column(db.String(255), comment="郵箱")
    username = db.Column(db.String(255), comment="用戶名")
    ip_address = db.Column(db.String(45), nullable=False, comment="IP地址")
    user_agent = db.Column(db.Text, comment="用戶代理")
    success = db.Column(db.Boolean, nullable=False, comment="是否成功")
    failure_reason = db.Column(db.String(100), comment="失敗原因")
    attempted_at = db.Column(db.TIMESTAMP, default=db.func.current_timestamp(), comment="嘗試時間")

    # 索引
    __table_args__ = (
        db.Index('idx_email', 'email'),
        db.Index('idx_ip', 'ip_address'),
        db.Index('idx_attempted_at', 'attempted_at'),
        db.Index('idx_success', 'success'),
    )


class OAuthProviderModel(BaseModel):
    """OAuth提供商模型"""
    __tablename__ = "oauth_providers"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="提供商ID")
    name = db.Column(db.String(100), nullable=False, unique=True, comment="提供商名稱")
    client_id = db.Column(db.String(255), nullable=False, comment="客戶端ID")
    client_secret_encrypted = db.Column(db.String(500), nullable=False, comment="加密的客戶端密鑰")
    authorization_url = db.Column(db.String(500), nullable=False, comment="授權URL")
    token_url = db.Column(db.String(500), nullable=False, comment="令牌URL")
    user_info_url = db.Column(db.String(500), nullable=False, comment="用戶信息URL")
    scope = db.Column(db.String(255), default='email profile', comment="授權範圍")
    is_enabled = db.Column(db.Boolean, default=True, comment="是否啟用")


class UserOAuthAccountModel(BaseModel):
    """用户OAuth关联模型"""
    __tablename__ = "user_oauth_accounts"

    id = db.Column(db.String(36), primary_key=True, default=db.text('(UUID())'), comment="關聯ID")
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, comment="用戶ID")
    provider_id = db.Column(db.String(36), db.ForeignKey('oauth_providers.id', ondelete='CASCADE'), nullable=False, comment="提供商ID")
    provider_user_id = db.Column(db.String(255), nullable=False, comment="提供商用戶ID")
    email = db.Column(db.String(255), comment="郵箱")
    display_name = db.Column(db.String(255), comment="顯示名稱")
    avatar_url = db.Column(db.String(255), comment="頭像URL")
    access_token_encrypted = db.Column(db.String(1000), comment="加密的訪問令牌")
    refresh_token_encrypted = db.Column(db.String(1000), comment="加密的刷新令牌")
    token_expires_at = db.Column(db.TIMESTAMP, comment="令牌過期時間")
    connected_at = db.Column(db.TIMESTAMP, default=db.func.current_timestamp(), comment="關聯時間")
    last_used_at = db.Column(db.TIMESTAMP, default=db.func.current_timestamp(), comment="最後使用時間")

    # 關係
    user = db.relationship('UserModel', backref='oauth_accounts')
    provider = db.relationship('OAuthProviderModel', backref='user_accounts')

    # 唯一約束和索引
    __table_args__ = (
        db.UniqueConstraint('provider_id', 'provider_user_id', name='uk_provider_user'),
        db.Index('idx_user', 'user_id'),
        db.Index('idx_provider_user', 'provider_id', 'provider_user_id'),
    )