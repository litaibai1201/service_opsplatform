# -*- coding: utf-8 -*-
"""
@文件: auth_serialize.py  
@說明: 認證序列化器 (优化版本)
@時間: 2025-01-09
@作者: LiDong
"""

from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from dbs.mysql_db import CommonModelDbSchema
from dbs.mysql_db.model_tables import (
    UserModel, UserSessionModel, LoginAttemptModel, 
    OAuthProviderModel
)
from marshmallow import post_load

class UserRegisterSchema(Schema):
    """用户注册请求参数"""
    username = fields.String(
        required=True,
        validate=validate.And(
            validate.Length(min=3, max=50),
            validate.Regexp(r'^[a-zA-Z0-9_]+$', error="用戶名只能包含字母、數字和下劃線")
        ),
        metadata={"description": "用戶名"}
    )
    email = fields.Email(
        required=True,
        validate=validate.Length(max=100),
        metadata={"description": "郵箱地址"}
    )
    password = fields.String(
        required=True,
        validate=validate.Length(min=6, max=128),
        metadata={"description": "密碼"}
    )
    full_name = fields.String(
        missing="",
        validate=validate.Length(max=100),
        metadata={"description": "全名"}
    )
    phone = fields.String(
        missing="",
        validate=validate.And(
            validate.Length(max=20),
            validate.Regexp(r'^[0-9+\-\s()]*$', error="手機號格式不正確")
        ),
        metadata={"description": "手機號"}
    )
    
    @validates_schema
    def validate_password_strength(self, data, **kwargs):
        """验证密码强度"""
        password = data.get('password', '')
        if len(password) < 6:
            raise ValidationError("密碼長度至少6位", field_name='password')
        
        # 检查是否包含数字和字母
        has_digit = any(c.isdigit() for c in password)
        has_letter = any(c.isalpha() for c in password)
        
        if not (has_digit and has_letter):
            raise ValidationError("密碼必須包含字母和數字", field_name='password')


class UserLoginSchema(Schema):
    """用户登录请求参数"""
    credential = fields.String(
        required=True,
        validate=validate.Length(min=1, max=100),
        metadata={"description": "登錄憑證(用戶名或郵箱)"}
    )
    password = fields.String(
        required=True,
        validate=validate.Length(min=1, max=128),
        metadata={"description": "密碼"}
    )
    remember_me = fields.Boolean(
        missing=False,
        metadata={"description": "記住我"}
    )


class TokenRefreshRequestSchema(Schema):
    """刷新令牌请求参数"""
    refresh_token = fields.String(
        required=True,
        validate=validate.Length(min=1),
        metadata={"description": "刷新令牌"}
    )


class UserInfoSchema(Schema):
    """用户信息响应Schema"""
    user_id = fields.Int(metadata={"description": "用戶ID"})
    username = fields.String(metadata={"description": "用戶名"})
    email = fields.String(metadata={"description": "郵箱"})
    full_name = fields.String(metadata={"description": "全名"})
    phone = fields.String(metadata={"description": "手機號"})
    avatar_url = fields.String(metadata={"description": "頭像URL"})
    role = fields.String(metadata={"description": "角色"})
    is_email_verified = fields.Boolean(metadata={"description": "郵箱是否已驗證"})
    last_login_at = fields.String(metadata={"description": "最後登錄時間"})
    created_at = fields.String(metadata={"description": "創建時間"})


class TokenResponseSchema(Schema):
    """令牌响应Schema"""
    access_token = fields.String(metadata={"description": "訪問令牌"})
    refresh_token = fields.String(metadata={"description": "刷新令牌"})
    token_type = fields.String(metadata={"description": "令牌類型"})
    expires_in = fields.Int(metadata={"description": "過期時間(秒)"})
    user_info = fields.Nested(UserInfoSchema, metadata={"description": "用戶信息"})


class UserProfileResponseSchema(Schema):
    """用户档案响应Schema"""
    user_info = fields.Nested(UserInfoSchema, metadata={"description": "用戶基本信息"})
    security_info = fields.Dict(metadata={"description": "安全信息"})


class SessionInfoSchema(Schema):
    """会话信息Schema"""
    token_id = fields.Int(metadata={"description": "令牌ID"})
    device_info = fields.String(metadata={"description": "設備信息"})
    ip_address = fields.String(metadata={"description": "IP地址"})
    created_at = fields.String(metadata={"description": "創建時間"})
    expires_at = fields.String(metadata={"description": "過期時間"})
    is_current = fields.Boolean(metadata={"description": "是否當前會話"})
    status = fields.String(metadata={"description": "會話狀態"})


class UserSessionsResponseSchema(Schema):
    """用户会话列表响应Schema"""
    user_id = fields.Int(metadata={"description": "用戶ID"})
    total_sessions = fields.Int(metadata={"description": "會話總數"})
    active_sessions = fields.Int(metadata={"description": "活躍會話數"})
    sessions = fields.List(
        fields.Nested(SessionInfoSchema),
        metadata={"description": "會話列表"}
    )


class SessionRevokeSchema(Schema):
    """撤销会话请求参数"""
    token_id = fields.Int(
        required=True,
        metadata={"description": "令牌ID"}
    )


class UserUpdateSchema(Schema):
    """用户更新请求参数"""
    full_name = fields.String(
        validate=validate.Length(max=100),
        metadata={"description": "全名"}
    )
    phone = fields.String(
        validate=validate.And(
            validate.Length(max=20),
            validate.Regexp(r'^[0-9+\-\s()]*$', error="手機號格式不正確")
        ),
        metadata={"description": "手機號"}
    )
    avatar_url = fields.String(
        validate=validate.Length(max=500),
        metadata={"description": "頭像URL"}
    )


class PasswordChangeSchema(Schema):
    """密码修改请求参数"""
    current_password = fields.String(
        required=True,
        validate=validate.Length(min=1, max=128),
        metadata={"description": "當前密碼"}
    )
    new_password = fields.String(
        required=True,
        validate=validate.Length(min=6, max=128),
        metadata={"description": "新密碼"}
    )
    confirm_password = fields.String(
        required=True,
        validate=validate.Length(min=6, max=128),
        metadata={"description": "確認密碼"}
    )
    
    @validates_schema
    def validate_passwords_match(self, data, **kwargs):
        """验证密码匹配"""
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        if new_password != confirm_password:
            raise ValidationError("新密碼和確認密碼不匹配", field_name='confirm_password')


# 数据库模型序列化器
class UserModelSchema(CommonModelDbSchema):
    """用户模型Schema"""
    __modelclass__ = UserModel
    
    password_hash = fields.String(load_only=True)  # 只用于加载，不序列化输出

    @post_load
    def post_load(self, instance, **kwargs):
        return UserModel(**instance)
    
    class Meta:
        load_instance = True




# ==================== 新增的Schema ====================

class ForgotPasswordSchema(Schema):
    """忘记密码请求参数"""
    email = fields.Email(
        required=True,
        validate=validate.Length(max=255),
        metadata={"description": "註冊郵箱地址"}
    )


class ResetPasswordSchema(Schema):
    """重置密码请求参数"""
    token = fields.String(
        required=True,
        validate=validate.Length(min=1),
        metadata={"description": "密碼重置令牌"}
    )
    new_password = fields.String(
        required=True,
        validate=validate.Length(min=6, max=128),
        metadata={"description": "新密碼"}
    )
    confirm_password = fields.String(
        required=True,
        validate=validate.Length(min=6, max=128),
        metadata={"description": "確認新密碼"}
    )
    
    @validates_schema
    def validate_passwords_match(self, data, **kwargs):
        """验证密码匹配"""
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        if new_password != confirm_password:
            raise ValidationError("新密碼和確認密碼不匹配", field_name='confirm_password')
    
    @validates_schema
    def validate_password_strength(self, data, **kwargs):
        """验证密码强度"""
        password = data.get('new_password', '')
        if len(password) < 6:
            raise ValidationError("密碼長度至少6位", field_name='new_password')
        
        # 检查是否包含数字和字母
        has_digit = any(c.isdigit() for c in password)
        has_letter = any(c.isalpha() for c in password)
        
        if not (has_digit and has_letter):
            raise ValidationError("密碼必須包含字母和數字", field_name='new_password')


class ChangePasswordSchema(Schema):
    """修改密码请求参数"""
    old_password = fields.String(
        required=True,
        validate=validate.Length(min=1, max=128),
        metadata={"description": "原密碼"}
    )
    new_password = fields.String(
        required=True,
        validate=validate.Length(min=6, max=128),
        metadata={"description": "新密碼"}
    )
    confirm_password = fields.String(
        required=True,
        validate=validate.Length(min=6, max=128),
        metadata={"description": "確認新密碼"}
    )
    
    @validates_schema
    def validate_passwords_match(self, data, **kwargs):
        """验证密码匹配"""
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        if new_password != confirm_password:
            raise ValidationError("新密碼和確認密碼不匹配", field_name='confirm_password')
    
    @validates_schema
    def validate_password_strength(self, data, **kwargs):
        """验证密码强度"""
        password = data.get('new_password', '')
        if len(password) < 6:
            raise ValidationError("密碼長度至少6位", field_name='new_password')
        
        # 检查是否包含数字和字母
        has_digit = any(c.isdigit() for c in password)
        has_letter = any(c.isalpha() for c in password)
        
        if not (has_digit and has_letter):
            raise ValidationError("密碼必須包含字母和數字", field_name='new_password')


class EmailVerificationSchema(Schema):
    """邮箱验证请求参数"""
    token = fields.String(
        required=True,
        validate=validate.Length(min=1),
        metadata={"description": "郵箱驗證令牌"}
    )


class TwoFactorSetupSchema(Schema):
    """双重认证设置响应Schema"""
    secret = fields.String(metadata={"description": "2FA密鑰"})
    backup_codes = fields.List(
        fields.String(),
        metadata={"description": "備用驗證碼"}
    )
    qr_code_url = fields.String(metadata={"description": "二維碼URL"})


class TwoFactorVerifySchema(Schema):
    """双重认证验证请求参数"""
    token = fields.String(
        required=True,
        validate=validate.And(
            validate.Length(min=4, max=10),
            validate.Regexp(r'^[0-9A-F]+$', error="驗證碼格式不正確")
        ),
        metadata={"description": "2FA驗證碼或備用碼"}
    )


class TwoFactorDisableSchema(Schema):
    """禁用双重认证请求参数"""
    password = fields.String(
        required=True,
        validate=validate.Length(min=1, max=128),
        metadata={"description": "當前密碼"}
    )


class InternalTokenValidateSchema(Schema):
    """内部服务令牌验证请求参数"""
    token = fields.String(
        required=True,
        validate=validate.Length(min=1),
        metadata={"description": "JWT訪問令牌"}
    )


class UserBatchRequestSchema(Schema):
    """批量获取用户信息请求参数"""
    user_ids = fields.List(
        fields.String(),
        required=True,
        validate=validate.Length(min=1, max=100),
        metadata={"description": "用戶ID列表"}
    )


class OAuthProviderInfoSchema(Schema):
    """OAuth提供商信息Schema"""
    provider = fields.String(metadata={"description": "提供商名稱"})
    authorization_url = fields.String(metadata={"description": "授權URL"})
    state = fields.String(metadata={"description": "狀態參數"})


class OAuthCallbackSchema(Schema):
    """OAuth回调请求参数"""
    code = fields.String(
        required=True,
        metadata={"description": "授權碼"}
    )
    state = fields.String(
        required=True,
        metadata={"description": "狀態參數"}
    )


# ==================== 更新的用户相关Schema ====================

class UserInfoSchema(Schema):
    """用户信息响应Schema (更新版本)"""
    user_id = fields.String(metadata={"description": "用戶ID"})
    username = fields.String(metadata={"description": "用戶名"})
    email = fields.String(metadata={"description": "郵箱"})
    display_name = fields.String(metadata={"description": "顯示名稱"})
    phone = fields.String(metadata={"description": "手機號"})
    avatar_url = fields.String(metadata={"description": "頭像URL"})
    status = fields.String(metadata={"description": "用戶狀態"})
    platform_role = fields.String(metadata={"description": "平台角色"})
    email_verified = fields.Boolean(metadata={"description": "郵箱是否已驗證"})
    phone_verified = fields.Boolean(metadata={"description": "手機是否已驗證"})
    two_factor_enabled = fields.Boolean(metadata={"description": "是否啟用雙重認證"})
    timezone = fields.String(metadata={"description": "時區"})
    language = fields.String(metadata={"description": "語言偏好"})
    last_login_at = fields.String(metadata={"description": "最後登錄時間"})
    created_at = fields.String(metadata={"description": "創建時間"})


class UserRegisterSchema(Schema):
    """用户注册请求参数 (更新版本)"""
    username = fields.String(
        required=True,
        validate=validate.And(
            validate.Length(min=3, max=255),
            validate.Regexp(r'^[a-zA-Z0-9_]+$', error="用戶名只能包含字母、數字和下劃線")
        ),
        metadata={"description": "用戶名"}
    )
    email = fields.Email(
        required=True,
        validate=validate.Length(max=255),
        metadata={"description": "郵箱地址"}
    )
    password = fields.String(
        required=True,
        validate=validate.Length(min=6, max=128),
        metadata={"description": "密碼"}
    )
    confirmPassword = fields.String(
        required=True,
        validate=validate.Length(min=6, max=128),
        metadata={"description": "確認密碼"}
    )
    display_name = fields.String(
        missing="",
        validate=validate.Length(max=255),
        metadata={"description": "顯示名稱"}
    )
    phone = fields.String(
        missing="",
        validate=validate.And(
            validate.Length(max=20),
            validate.Regexp(r'^[0-9+\-\s()]*$', error="手機號格式不正確")
        ),
        metadata={"description": "手機號"}
    )
    timezone = fields.String(
        missing="UTC",
        validate=validate.Length(max=50),
        metadata={"description": "時區"}
    )
    language = fields.String(
        missing="en",
        validate=validate.Length(max=10),
        metadata={"description": "語言偏好"}
    )
    inviteCode = fields.String(
        missing="",
        validate=validate.Length(max=50),
        metadata={"description": "邀請碼"}
    )
    agreementAccepted = fields.Boolean(
        required=True,
        metadata={"description": "是否同意用戶協議"}
    )

    @validates_schema
    def validate_password_strength(self, data, **kwargs):
        """验证密码强度"""
        password = data.get('password', '')
        if len(password) < 6:
            raise ValidationError("密碼長度至少6位", field_name='password')

        # 检查是否包含数字和字母
        has_digit = any(c.isdigit() for c in password)
        has_letter = any(c.isalpha() for c in password)

        if not (has_digit and has_letter):
            raise ValidationError("密碼必須包含字母和數字", field_name='password')

    @validates_schema
    def validate_passwords_match(self, data, **kwargs):
        """验证两次密码是否一致"""
        password = data.get('password')
        confirm_password = data.get('confirmPassword')

        if password and confirm_password and password != confirm_password:
            raise ValidationError("兩次輸入的密碼不一致", field_name='confirmPassword')

    @validates_schema
    def validate_agreement(self, data, **kwargs):
        """验证是否同意用户协议"""
        agreement_accepted = data.get('agreementAccepted', False)

        if not agreement_accepted:
            raise ValidationError("必須同意用戶協議才能註冊", field_name='agreementAccepted')


class SessionInfoSchema(Schema):
    """会话信息Schema (更新版本)"""
    session_id = fields.String(metadata={"description": "會話ID"})
    device_info = fields.Dict(metadata={"description": "設備信息"})
    ip_address = fields.String(metadata={"description": "IP地址"})
    user_agent = fields.String(metadata={"description": "用戶代理"})
    created_at = fields.String(metadata={"description": "創建時間"})
    expires_at = fields.String(metadata={"description": "過期時間"})
    last_activity = fields.String(metadata={"description": "最後活動時間"})
    is_current = fields.Boolean(metadata={"description": "是否當前會話"})
    is_active = fields.Boolean(metadata={"description": "是否活躍"})


class UserSessionsResponseSchema(Schema):
    """用户会话列表响应Schema (更新版本)"""
    user_id = fields.String(metadata={"description": "用戶ID"})
    total_sessions = fields.Int(metadata={"description": "會話總數"})
    active_sessions = fields.Int(metadata={"description": "活躍會話數"})
    sessions = fields.List(
        fields.Nested(SessionInfoSchema),
        metadata={"description": "會話列表"}
    )


# 数据库模型序列化器 (更新版本)
class UserModelSchema(CommonModelDbSchema):
    """用户模型Schema (更新版本)"""
    __modelclass__ = UserModel
    
    password_hash = fields.String(load_only=True)  # 只用于加载，不序列化输出
    salt = fields.String(load_only=True)  # 只用于加载，不序列化输出
    
    @post_load
    def post_load(self, instance, **kwargs):
        return UserModel(**instance)
    
    class Meta:
        load_instance = True


class UserSessionModelSchema(CommonModelDbSchema):
    """用户会话模型Schema"""
    __modelclass__ = UserSessionModel
    
    refresh_token_hash = fields.String(load_only=True)  # 敏感信息不输出
    
    class Meta:
        load_instance = True


class LoginAttemptModelSchema(CommonModelDbSchema):
    """登录尝试记录模型Schema"""
    __modelclass__ = LoginAttemptModel
    
    class Meta:
        load_instance = True


# ==================== 管理员和平台相关Schema ====================

class UserProfileUpdateSchema(Schema):
    """用户档案更新请求参数"""
    display_name = fields.String(
        validate=validate.Length(max=255),
        metadata={"description": "显示名称"}
    )
    phone = fields.String(
        validate=validate.And(
            validate.Length(max=20),
            validate.Regexp(r'^[0-9+\-\s()]*$', error="手机号格式不正确")
        ),
        metadata={"description": "手机号"}
    )
    avatar_url = fields.String(
        validate=validate.Length(max=500),
        metadata={"description": "头像URL"}
    )
    timezone = fields.String(
        validate=validate.Length(max=50),
        metadata={"description": "时区"}
    )
    language = fields.String(
        validate=validate.Length(max=10),
        metadata={"description": "语言偏好"}
    )
    preferences = fields.Dict(
        metadata={"description": "用户偏好设置"}
    )


class AdminUsersQuerySchema(Schema):
    """管理员获取用户列表查询参数"""
    page = fields.Int(
        load_default=1,
        validate=validate.Range(min=1),
        metadata={"description": "页码"}
    )
    size = fields.Int(
        load_default=20,
        validate=validate.Range(min=1, max=100),
        metadata={"description": "每页数量"}
    )
    status = fields.String(
        validate=validate.OneOf(['active', 'suspended', 'inactive']),
        metadata={"description": "用户状态过滤"}
    )
    platform_role = fields.String(
        validate=validate.OneOf(['platform_admin', 'platform_user']),
        metadata={"description": "平台角色过滤"}
    )
    email_verified = fields.Boolean(
        metadata={"description": "邮箱验证状态过滤"}
    )
    search = fields.String(
        validate=validate.Length(max=100),
        metadata={"description": "搜索关键词"}
    )


class UpdatePlatformRoleSchema(Schema):
    """更新用户平台角色请求参数"""
    platform_role = fields.String(
        required=True,
        validate=validate.OneOf(['platform_admin', 'platform_user']),
        metadata={"description": "新的平台角色"}
    )


class SuspendUserSchema(Schema):
    """暂停用户请求参数"""
    reason = fields.String(
        load_default="管理员暂停",
        validate=validate.Length(max=500),
        metadata={"description": "暂停原因"}
    )


class InternalCheckPlatformPermissionSchema(Schema):
    """内部服务检查平台权限请求参数"""
    user_id = fields.String(
        required=True,
        validate=validate.Length(min=1),
        metadata={"description": "用户ID"}
    )
    required_role = fields.String(
        load_default="platform_admin",
        validate=validate.OneOf(['platform_admin', 'platform_user']),
        metadata={"description": "所需角色"}
    )


class CacheWarmUpSchema(Schema):
    """缓存预热请求参数"""
    user_ids = fields.List(
        fields.String(),
        metadata={"description": "用户ID列表"}
    )
    limit = fields.Int(
        load_default=100,
        validate=validate.Range(min=1, max=1000),
        metadata={"description": "预热数量限制"}
    )


# ==================== 注册辅助验证Schema ====================

class CheckUsernameAvailabilityResponseSchema(Schema):
    """检查用户名可用性响应Schema"""
    available = fields.Boolean(metadata={"description": "用户名是否可用"})
    username = fields.String(metadata={"description": "查询的用户名"})
    suggestions = fields.List(
        fields.String(),
        metadata={"description": "用户名建议列表（当不可用时）"}
    )


class CheckEmailAvailabilityResponseSchema(Schema):
    """检查邮箱可用性响应Schema"""
    available = fields.Boolean(metadata={"description": "邮箱是否可用"})
    email = fields.String(metadata={"description": "查询的邮箱地址"})