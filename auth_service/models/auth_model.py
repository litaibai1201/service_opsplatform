# -*- coding: utf-8 -*-
"""
@文件: auth_model.py
@說明: 認證模型操作類 (新架構版本)
@時間: 2025-01-09
@作者: LiDong
"""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta
from sqlalchemy import and_, or_, func
from sqlalchemy.orm import load_only
from typing import List, Dict, Any, Optional, Tuple

from common.common_tools import CommonTools, TryExcept
from dbs.mysql_db import db
from dbs.mysql_db.model_tables import (
    UserModel, UserSessionModel,
    LoginAttemptModel, OAuthProviderModel, UserOAuthAccountModel
)


class OperUserModel:
    """用户模型操作类 (新架構版本)"""
    
    def __init__(self):
        self.model = UserModel
    
    @TryExcept("創建用戶失敗")
    def create_user(self, user_data):
        """创建新用户"""
        # 数据验证
        if not user_data.username or not user_data.username.strip():
            raise ValueError("用戶名不能為空")
        
        if not user_data.email or not user_data.email.strip():
            raise ValueError("郵箱不能為空")
            
        if not user_data.password_hash:
            raise ValueError("密碼不能為空")
        
        # 检查用户名和邮箱是否已存在
        existing_user = self.model.query.filter(
            or_(
                self.model.username == user_data.username.strip(),
                self.model.email == user_data.email.strip()
            )
        ).first()
        
        if existing_user:
            if existing_user.username == user_data.username.strip():
                raise ValueError("用戶名已存在")
            else:
                raise ValueError("郵箱已被註冊")
        
        db.session.add(user_data)
        return True
    
    def get_by_username(self, username):
        """根据用户名获取用户"""
        return self.model.query.filter(self.model.username == username).first()
    
    def get_by_email(self, email):
        """根据邮箱获取用户"""
        return self.model.query.filter(self.model.email == email).first()
    
    def get_by_id(self, user_id):
        """根据ID获取用户"""
        return self.model.query.filter(self.model.id == user_id).first()
    
    def get_by_login_credential(self, credential):
        """根据登录凭证获取用户(支持用户名或邮箱)"""
        return self.model.query.filter(
            or_(
                self.model.username == credential,
                self.model.email == credential
            )
        ).first()
    
    def get_users_by_ids(self, user_ids: List[str]) -> List[UserModel]:
        """批量获取用户信息"""
        return self.model.query.filter(self.model.id.in_(user_ids)).all()
    
    @TryExcept("更新用戶失敗")
    def update_user(self, user, update_data):
        """更新用户信息"""
        allowed_fields = [
            'display_name', 'phone', 'avatar_url', 'email_verified',
            'phone_verified', 'timezone', 'language', 'preferences',
            'status', 'failed_login_attempts', 'locked_until', 'platform_role'
        ]
        
        for field, value in update_data.items():
            if field in allowed_fields and hasattr(user, field):
                setattr(user, field, value)
        
        return True
    
    @TryExcept("更新最後登錄時間失敗")
    def update_last_login(self, user, ip_address=None):
        """更新最后登录时间和IP"""
        user.last_login_at = datetime.now()
        if ip_address:
            user.last_login_ip = ip_address
        user.failed_login_attempts = 0  # 成功登录后重置失败次数
        return True
    
    def verify_password(self, user, password):
        """验证密码"""
        # 使用盐值进行密码验证
        password_hash = self._hash_password_with_salt(password, user.salt)
        return user.password_hash == password_hash
    
    @TryExcept("更新密碼失敗")
    def update_password(self, user, new_password):
        """更新密码"""
        salt = self._generate_salt()
        password_hash = self._hash_password_with_salt(new_password, salt)
        
        user.password_hash = password_hash
        user.salt = salt
        user.password_reset_token = None
        user.password_reset_expires = None
        return True
    
    @TryExcept("設置密碼重置令牌失敗")
    def set_password_reset_token(self, user, token, expires_at):
        """设置密码重置令牌"""
        user.password_reset_token = token
        user.password_reset_expires = expires_at
        return True
    
    @TryExcept("設置郵箱驗證令牌失敗")
    def set_email_verification_token(self, user, token, expires_at):
        """设置邮箱验证令牌"""
        user.email_verification_token = token
        user.email_verification_expires = expires_at
        return True
    
    @TryExcept("驗證郵箱失敗")
    def verify_email(self, user):
        """验证邮箱"""
        user.email_verified = True
        user.email_verification_token = None
        user.email_verification_expires = None
        if user.status == 'pending_verification':
            user.status = 'active'
        return True
    
    @TryExcept("鎖定用戶失敗")
    def lock_user(self, user, lock_duration_minutes=30):
        """锁定用户账户"""
        user.failed_login_attempts += 1
        user.locked_until = datetime.now() + timedelta(minutes=lock_duration_minutes)
        return True
    
    def is_account_locked(self, user):
        """检查账户是否被锁定"""
        if not user.locked_until:
            return False
        return datetime.now() < user.locked_until
    
    @TryExcept("設置雙重認證失敗")
    def setup_two_factor(self, user, secret, backup_codes):
        """设置双重认证"""
        user.two_factor_enabled = True
        user.two_factor_secret = secret
        user.backup_codes = backup_codes
        return True
    
    @TryExcept("禁用雙重認證失敗")
    def disable_two_factor(self, user):
        """禁用双重认证"""
        user.two_factor_enabled = False
        user.two_factor_secret = None
        user.backup_codes = None
        return True
    
    @staticmethod
    def _generate_salt():
        """生成随机盐值"""
        return secrets.token_hex(32)
    
    @staticmethod
    def _hash_password_with_salt(password, salt):
        """使用盐值哈希密码"""
        return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
    
    @staticmethod
    def create_password_hash(password):
        """创建密码哈希（含盐值）"""
        salt = OperUserModel._generate_salt()
        password_hash = OperUserModel._hash_password_with_salt(password, salt)
        return password_hash, salt


class OperUserSessionModel:
    """用户会话模型操作类 (新架構版本)"""
    
    def __init__(self):
        self.model = UserSessionModel
    
    @TryExcept("創建用戶會話失敗")
    def create_session(self, session_data):
        """创建用户会话"""
        db.session.add(session_data)
        return True
    
    def get_by_session_token(self, session_token):
        """根据会话令牌获取会话"""
        return self.model.query.filter(
            and_(
                self.model.session_token == session_token,
                self.model.is_active == True
            )
        ).first()
    
    def get_by_refresh_token_hash(self, refresh_token_hash):
        """根据刷新令牌哈希获取会话"""
        return self.model.query.filter(
            and_(
                self.model.refresh_token_hash == refresh_token_hash,
                self.model.is_active == True
            )
        ).first()
    
    def get_active_sessions_by_user(self, user_id, limit=10):
        """获取用户的活跃会话"""
        current_time = datetime.now()
        return self.model.query.filter(
            and_(
                self.model.user_id == user_id,
                self.model.is_active == True,
                self.model.expires_at > current_time
            )
        ).order_by(self.model.created_at.desc()).limit(limit).all()
    
    @TryExcept("終止會話失敗")
    def terminate_session(self, session):
        """终止会话"""
        session.is_active = False
        return True
    
    @TryExcept("更新會話活動時間失敗")
    def update_last_activity(self, session):
        """更新会话最后活动时间"""
        session.last_activity = datetime.now()
        return True
    
    def is_session_valid(self, session):
        """检查会话是否有效"""
        if not session or not session.is_active:
            return False
        
        current_time = datetime.now()
        return session.expires_at > current_time
    
    @TryExcept("清理過期會話失敗")
    def cleanup_expired_sessions(self):
        """清理过期会话"""
        current_time = datetime.now()
        expired_sessions = self.model.query.filter(
            and_(
                self.model.expires_at <= current_time,
                self.model.is_active == True
            )
        ).all()
        
        for session in expired_sessions:
            session.is_active = False
        
        return len(expired_sessions)




class OperLoginAttemptModel:
    """登录尝试记录模型操作类"""
    
    def __init__(self):
        self.model = LoginAttemptModel
    
    @TryExcept("記錄登錄嘗試失敗")
    def create_attempt(self, attempt_data):
        """创建登录尝试记录"""
        db.session.add(attempt_data)
        return True
    
    def get_recent_failed_attempts(self, identifier, identifier_type='email', hours=1):
        """获取最近的失败登录尝试"""
        since_time = datetime.now() - timedelta(hours=hours)
        
        filter_condition = self.model.ip_address == identifier
        if identifier_type == 'email':
            filter_condition = self.model.email == identifier
        elif identifier_type == 'username':
            filter_condition = self.model.username == identifier
        
        return self.model.query.filter(
            and_(
                filter_condition,
                self.model.success == False,
                self.model.attempted_at >= since_time
            )
        ).count()
    
    def get_login_history(self, user_identifier, page=1, size=20):
        """获取登录历史"""
        return self.model.query.filter(
            or_(
                self.model.email == user_identifier,
                self.model.username == user_identifier
            )
        ).order_by(self.model.attempted_at.desc()).paginate(
            page=page, per_page=size, error_out=False
        )


class OperOAuthProviderModel:
    """OAuth提供商模型操作类"""
    
    def __init__(self):
        self.model = OAuthProviderModel
        self.user_account_model = UserOAuthAccountModel
    
    def get_by_name(self, name):
        """根据名称获取OAuth提供商"""
        return self.model.query.filter(
            and_(
                self.model.name == name,
                self.model.is_enabled == True
            )
        ).first()
    
    def get_all_enabled_providers(self):
        """获取所有启用的OAuth提供商"""
        return self.model.query.filter(self.model.is_enabled == True).all()
    
    @TryExcept("創建OAuth帳戶關聯失敗")
    def create_user_oauth_account(self, account_data):
        """创建用户OAuth账户关联"""
        db.session.add(account_data)
        return True
    
    def get_user_oauth_account(self, provider_id, provider_user_id):
        """获取用户OAuth账户"""
        return self.user_account_model.query.filter(
            and_(
                self.user_account_model.provider_id == provider_id,
                self.user_account_model.provider_user_id == provider_user_id
            )
        ).first()
    
    def get_user_oauth_accounts(self, user_id):
        """获取用户的所有OAuth账户"""
        return self.user_account_model.query.filter(
            self.user_account_model.user_id == user_id
        ).all()
    
    @TryExcept("更新OAuth令牌失敗")
    def update_oauth_tokens(self, account, access_token_encrypted, refresh_token_encrypted, expires_at):
        """更新OAuth令牌"""
        account.access_token_encrypted = access_token_encrypted
        account.refresh_token_encrypted = refresh_token_encrypted
        account.token_expires_at = expires_at
        account.last_used_at = datetime.now()
        return True