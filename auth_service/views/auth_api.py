# -*- coding: utf-8 -*-
"""
@文件: auth_api.py
@說明: 認證API (优化版本)
@時間: 2025-01-09
@作者: LiDong
"""

from flask import request, g
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from common.common_method import fail_response_result, response_result
from controllers.auth_controller import AuthController
from serializes.response_serialize import (RspMsgDictSchema, RspMsgSchema)
from serializes.auth_serialize import (
    UserRegisterSchema, UserLoginSchema, TokenRefreshRequestSchema,
    SessionRevokeSchema, ForgotPasswordSchema, ResetPasswordSchema,
    ChangePasswordSchema, EmailVerificationSchema, TwoFactorSetupSchema,
    TwoFactorVerifySchema, TwoFactorDisableSchema, InternalTokenValidateSchema,
    UserBatchRequestSchema, UserProfileUpdateSchema, AdminUsersQuerySchema,
    UpdatePlatformRoleSchema, SuspendUserSchema, InternalCheckPlatformPermissionSchema,
    CacheWarmUpSchema, CheckUsernameAvailabilityResponseSchema, CheckEmailAvailabilityResponseSchema
)
from common.common_tools import CommonTools
from loggers import logger


blp = Blueprint("auth_api", __name__)


class BaseAuthView(MethodView):
    """认证API基类 - 统一控制器管理和错误处理"""
    
    def __init__(self):
        super().__init__()
        # 使用单例模式的控制器，避免重复初始化
        if not hasattr(g, 'auth_controller'):
            g.auth_controller = AuthController()
        self.ac = g.auth_controller
    
    def _build_response(self, result, flag, success_msg="操作成功", error_prefix=""):
        """统一响应构建"""
        if flag:
            return response_result(content=result, msg=success_msg)
        error_msg = f"{error_prefix}{result}" if error_prefix else str(result)
        logger.warning(f"API操作失败: {error_msg}")
        return fail_response_result(msg=error_msg)


@blp.route("/auth/register")
class UserRegisterApi(BaseAuthView):
    """用户注册API (优化版本)"""

    @blp.arguments(UserRegisterSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """用户注册"""
        try:
            result, flag = self.ac.register(payload)
            return self._build_response(result, flag, "註冊成功")
        except Exception as e:
            logger.error(f"用戶註冊異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 注册辅助验证API ====================

@blp.route("/auth/check-username/<username>")
class CheckUsernameAvailabilityApi(BaseAuthView):
    """检查用户名可用性API"""

    @blp.response(200, RspMsgDictSchema)
    def get(self, username):
        """检查用户名是否可用"""
        try:
            # URL解码
            from urllib.parse import unquote
            username = unquote(username)

            result, flag = self.ac.check_username_availability(username)
            return self._build_response(result, flag, "查詢成功")
        except Exception as e:
            logger.error(f"檢查用戶名可用性異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/auth/check-email/<email>")
class CheckEmailAvailabilityApi(BaseAuthView):
    """检查邮箱可用性API"""

    @blp.response(200, RspMsgDictSchema)
    def get(self, email):
        """检查邮箱是否可用"""
        try:
            # URL解码
            from urllib.parse import unquote
            email = unquote(email)

            result, flag = self.ac.check_email_availability(email)
            return self._build_response(result, flag, "查詢成功")
        except Exception as e:
            logger.error(f"檢查郵箱可用性異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/auth/login")
class UserLoginApi(BaseAuthView):
    """用户登录API (优化版本)"""

    @blp.arguments(UserLoginSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """用户登录"""
        try:
            result, flag = self.ac.login(payload)
            return self._build_response(result, flag, "登錄成功")
        except Exception as e:
            logger.error(f"用戶登錄異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/auth/refresh")
class TokenRefreshApi(BaseAuthView):
    """刷新令牌API (优化版本)"""

    @blp.arguments(TokenRefreshRequestSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """刷新访问令牌"""
        try:
            refresh_token = payload.get('refresh_token')
            if not refresh_token:
                return fail_response_result(msg="缺少刷新令牌")
            
            result, flag = self.ac.refresh_token(refresh_token)
            return self._build_response(result, flag, "令牌刷新成功")
        except Exception as e:
            logger.error(f"刷新令牌異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/auth/profile")
class UserProfileApi(BaseAuthView):
    """用户档案API (优化版本)"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """获取当前用户信息"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            user_id = int(current_user_id) if current_user_id.isdigit() else current_user_id
            result, flag = self.ac.get_profile(user_id)
            return self._build_response(result, flag, "獲取用戶信息成功")
        except Exception as e:
            logger.error(f"獲取用戶檔案異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")
    
    @jwt_required()
    @blp.arguments(UserProfileUpdateSchema)
    @blp.response(200, RspMsgDictSchema)
    def put(self, payload):
        """更新用戶信息"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return fail_response_result(msg="無效的用戶身份")
            
            # 過濾掉空值
            update_data = {k: v for k, v in payload.items() if v is not None}
            
            if not update_data:
                return fail_response_result(msg="沒有可更新的字段")
            
            # 獲取用戶
            user = self.ac.oper_user.get_by_id(current_user_id)
            if not user:
                return fail_response_result(msg="用戶不存在")
            
            # 更新用戶信息
            result, flag = self.ac.oper_user.update_user(user, update_data)
            if not flag:
                return fail_response_result(msg=f"更新失敗: {result}")
            
            # 提交事務
            from dbs.mysql_db import DBFunction
            commit_result, commit_flag = DBFunction.do_commit("更新用戶信息", True)
            if not commit_flag:
                return fail_response_result(msg=f"提交失敗: {commit_result}")
            
            # 清除緩存
            self.ac.ensure_cache_consistency_on_user_update(current_user_id)
            
            # 返回更新後的用戶信息
            result, flag = self.ac.get_profile(current_user_id)
            return self._build_response(result, flag, "更新用戶信息成功")
            
        except Exception as e:
            logger.error(f"更新用戶檔案異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/auth/logout")
class UserLogoutApi(BaseAuthView):
    """用户登出API (优化版本)"""

    @jwt_required()  # 需要有效的access token才能logout
    @blp.arguments(TokenRefreshRequestSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, payload):
        """用户登出"""
        try:
            # 从Authorization header获取access token (已通过@jwt_required验证)
            auth_header = request.headers.get('Authorization')
            access_token = None
            if auth_header and auth_header.startswith('Bearer '):
                access_token = auth_header.split(' ')[1]
            
            # 从请求体获取refresh token
            refresh_token = payload.get('refresh_token')
            
            if not refresh_token:
                return fail_response_result(msg="缺少刷新令牌")
            
            result, flag = self.ac.logout(refresh_token, access_token)
            return self._build_response(result, flag, "登出成功")
        except Exception as e:
            logger.error(f"用戶登出異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# 额外的管理API
@blp.route("/auth/sessions")
class UserSessionsApi(BaseAuthView):
    """用户会话管理API (MVC架构优化版本)"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """获取用户的活跃会话列表"""
        try:
            current_user_id = get_jwt_identity()
            user_id = int(current_user_id)
            
            # 通过控制器获取会话列表，符合MVC架构
            result, flag = self.ac.get_user_sessions(user_id)
            return self._build_response(result, flag, "獲取會話列表成功")
        except Exception as e:
            logger.error(f"獲取會話列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")

    @jwt_required()
    @blp.arguments(SessionRevokeSchema)
    @blp.response(200, RspMsgSchema)
    def delete(self, payload):
        """撤销指定会话"""
        try:
            current_user_id = get_jwt_identity()
            user_id = int(current_user_id)
            token_id = payload['token_id']
            
            # 通过控制器撤销会话，符合MVC架构
            result, flag = self.ac.revoke_user_session(user_id, token_id)
            return self._build_response(result, flag, "會話撤銷成功")
        except Exception as e:
            logger.error(f"撤銷會話異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/auth/health")
class AuthHealthApi(MethodView):
    """认证服务健康检查API"""

    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """健康检查"""
        health_data = {
            'status': 'healthy',
            'service': 'auth-api',
            'timestamp': CommonTools.get_now(),
            'version': '1.0.0'
        }
        
        issues = []
        
        # 检查数据库连接
        try:
            from dbs.mysql_db import db
            from sqlalchemy import text
            result = db.session.execute(text('SELECT 1'))
            result.fetchone()  # 确保查询执行成功
            health_data['database'] = 'connected'
        except Exception as db_error:
            logger.error(f"数据库连接检查失敗: {str(db_error)}")
            health_data['database'] = f'error: {str(db_error)}'
            issues.append(f'数据库: {str(db_error)}')
        
        # 检查缓存连接
        try:
            from cache import redis_client
            if redis_client.redis_client is None:
                health_data['cache'] = 'not_initialized'
                issues.append('缓存: Redis客户端未初始化')
            else:
                redis_client.ping()
                health_data['cache'] = 'connected'
        except Exception as cache_error:
            logger.error(f"缓存连接检查失敗: {str(cache_error)}")
            health_data['cache'] = f'error: {str(cache_error)}'
            issues.append(f'缓存: {str(cache_error)}')
        
        # 判断整体健康状态
        if issues:
            health_data['status'] = 'unhealthy'
            health_data['issues'] = issues
            return fail_response_result(content=health_data, msg="服務異常")
        else:
            return response_result(content=health_data, msg="服務正常")


# ==================== 密码管理API ====================

@blp.route("/auth/forgot-password")
class ForgotPasswordApi(BaseAuthView):
    """忘记密码API"""

    @blp.arguments(ForgotPasswordSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """忘记密码"""
        try:
            email = payload.get('email')
            result, flag = self.ac.forgot_password(email)
            return self._build_response(result, flag, "處理成功")
        except Exception as e:
            logger.error(f"忘記密碼異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/auth/reset-password")
class ResetPasswordApi(BaseAuthView):
    """重置密码API"""

    @blp.arguments(ResetPasswordSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, payload):
        """重置密码"""
        try:
            token = payload.get('token')
            new_password = payload.get('new_password')
            result, flag = self.ac.reset_password(token, new_password)
            return self._build_response(result, flag, "密碼重置成功")
        except Exception as e:
            logger.error(f"重置密碼異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/auth/change-password")
class ChangePasswordApi(BaseAuthView):
    """修改密码API"""

    @jwt_required()
    @blp.arguments(ChangePasswordSchema)
    @blp.response(200, RspMsgSchema)
    def put(self, payload):
        """修改密码"""
        try:
            current_user_id = get_jwt_identity()
            old_password = payload.get('old_password')
            new_password = payload.get('new_password')
            
            result, flag = self.ac.change_password(current_user_id, old_password, new_password)
            return self._build_response(result, flag, "密碼修改成功")
        except Exception as e:
            logger.error(f"修改密碼異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 邮箱验证API ====================

@blp.route("/auth/send-verification")
class SendVerificationEmailApi(BaseAuthView):
    """发送验证邮件API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self):
        """发送验证邮件"""
        try:
            current_user_id = get_jwt_identity()
            result, flag = self.ac.send_verification_email(current_user_id)
            return self._build_response(result, flag, "驗證郵件已發送")
        except Exception as e:
            logger.error(f"發送驗證郵件異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/auth/verify-email")
class VerifyEmailApi(BaseAuthView):
    """验证邮箱API"""

    @blp.arguments(EmailVerificationSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, payload):
        """验证邮箱"""
        try:
            token = payload.get('token')
            result, flag = self.ac.verify_email(token)
            return self._build_response(result, flag, "郵箱驗證成功")
        except Exception as e:
            logger.error(f"驗證郵箱異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 双重认证API ====================

@blp.route("/auth/2fa/setup")
class TwoFactorSetupApi(BaseAuthView):
    """设置双重认证API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self):
        """设置双重认证"""
        try:
            current_user_id = get_jwt_identity()
            result, flag = self.ac.setup_two_factor(current_user_id)
            return self._build_response(result, flag, "雙重認證設置成功")
        except Exception as e:
            logger.error(f"設置雙重認證異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/auth/2fa/verify")
class TwoFactorVerifyApi(BaseAuthView):
    """验证双重认证API"""

    @jwt_required()
    @blp.arguments(TwoFactorVerifySchema)
    @blp.response(200, RspMsgSchema)
    def post(self, payload):
        """验证双重认证"""
        try:
            current_user_id = get_jwt_identity()
            token = payload.get('token')
            result, flag = self.ac.verify_two_factor(current_user_id, token)
            return self._build_response(result, flag, "雙重認證驗證成功")
        except Exception as e:
            logger.error(f"驗證雙重認證異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/auth/2fa/disable")
class TwoFactorDisableApi(BaseAuthView):
    """禁用双重认证API"""

    @jwt_required()
    @blp.arguments(TwoFactorDisableSchema)
    @blp.response(200, RspMsgSchema)
    def post(self, payload):
        """禁用双重认证"""
        try:
            current_user_id = get_jwt_identity()
            password = payload.get('password')
            result, flag = self.ac.disable_two_factor(current_user_id, password)
            return self._build_response(result, flag, "雙重認證已禁用")
        except Exception as e:
            logger.error(f"禁用雙重認證異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/auth/2fa/backup-codes")
class TwoFactorBackupCodesApi(BaseAuthView):
    """获取备用验证码API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """获取备用验证码"""
        try:
            current_user_id = get_jwt_identity()
            result, flag = self.ac.get_profile(current_user_id)
            
            if not flag:
                return self._build_response(result, flag)
            
            # 只返回备用码信息，不返回完整用户信息
            user_info = result.get('user_info', {})
            backup_codes = []  # 从数据库获取的备用码，这里需要从用户信息中提取
            
            backup_result = {
                'backup_codes': backup_codes,
                'remaining_codes': len(backup_codes)
            }
            
            return self._build_response(backup_result, True, "獲取備用碼成功")
        except Exception as e:
            logger.error(f"獲取備用碼異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 平台管理員API ====================

@blp.route("/auth/admin/users")
class AdminUsersListApi(BaseAuthView):
    """平台管理員獲取用戶列表API"""

    @jwt_required()
    @blp.arguments(AdminUsersQuerySchema, location="query")
    @blp.response(200, RspMsgDictSchema)
    def get(self, query_params):
        """獲取用戶列表（平台管理員）"""
        try:
            current_user_id = get_jwt_identity()
            
            # 檢查平台權限
            perm_result, perm_flag = self.ac.check_platform_permission(current_user_id, 'platform_admin')
            if not perm_flag or not perm_result.get('has_permission'):
                return fail_response_result(msg="權限不足，需要平台管理員權限")
            
            # 獲取查詢參數
            page = query_params.get('page', 1)
            size = query_params.get('size', 20)
            
            # 過濾條件
            filters = {}
            if query_params.get('status'):
                filters['status'] = query_params.get('status')
            if query_params.get('platform_role'):
                filters['platform_role'] = query_params.get('platform_role')
            if query_params.get('email_verified') is not None:
                filters['email_verified'] = query_params.get('email_verified')
            if query_params.get('search'):
                filters['search'] = query_params.get('search')
            
            result, flag = self.ac.get_users_list(page, size, filters)
            return self._build_response(result, flag, "獲取用戶列表成功")
        except Exception as e:
            logger.error(f"獲取用戶列表異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/auth/admin/users/<user_id>/platform-role")
class AdminUpdatePlatformRoleApi(BaseAuthView):
    """更新用戶平台角色API"""

    @jwt_required()
    @blp.arguments(UpdatePlatformRoleSchema)
    @blp.response(200, RspMsgDictSchema)
    def put(self, payload, user_id):
        """更新用戶平台角色（平台管理員）"""
        try:
            current_user_id = get_jwt_identity()
            
            # 檢查平台權限
            perm_result, perm_flag = self.ac.check_platform_permission(current_user_id, 'platform_admin')
            if not perm_flag or not perm_result.get('has_permission'):
                return fail_response_result(msg="權限不足，需要平台管理員權限")
            
            # 獲取新角色
            new_role = payload.get('platform_role')
            
            result, flag = self.ac.update_user_platform_role(current_user_id, user_id, new_role)
            return self._build_response(result, flag, "更新平台角色成功")
        except Exception as e:
            logger.error(f"更新平台角色異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/auth/admin/users/<user_id>/suspend")
class AdminSuspendUserApi(BaseAuthView):
    """暫停用戶API"""

    @jwt_required()
    @blp.arguments(SuspendUserSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload, user_id):
        """暫停用戶（平台管理員）"""
        try:
            current_user_id = get_jwt_identity()
            
            # 檢查平台權限
            perm_result, perm_flag = self.ac.check_platform_permission(current_user_id, 'platform_admin')
            if not perm_flag or not perm_result.get('has_permission'):
                return fail_response_result(msg="權限不足，需要平台管理員權限")
            
            # 獲取暫停原因
            reason = payload.get('reason', '管理員暫停')
            
            result, flag = self.ac.suspend_user(current_user_id, user_id, reason)
            return self._build_response(result, flag, "暫停用戶成功")
        except Exception as e:
            logger.error(f"暫停用戶異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/auth/admin/users/<user_id>/activate")
class AdminActivateUserApi(BaseAuthView):
    """激活用戶API"""

    @jwt_required()
    @blp.response(200, RspMsgDictSchema)
    def post(self, user_id):
        """激活用戶（平台管理員）"""
        try:
            current_user_id = get_jwt_identity()
            
            # 檢查平台權限
            perm_result, perm_flag = self.ac.check_platform_permission(current_user_id, 'platform_admin')
            if not perm_flag or not perm_result.get('has_permission'):
                return fail_response_result(msg="權限不足，需要平台管理員權限")
            
            result, flag = self.ac.activate_user(current_user_id, user_id)
            return self._build_response(result, flag, "激活用戶成功")
        except Exception as e:
            logger.error(f"激活用戶異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 内部服务API ====================

@blp.route("/internal/validate-token")
class InternalTokenValidateApi(BaseAuthView):
    """内部服务验证令牌API"""

    @blp.arguments(InternalTokenValidateSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """验证令牌"""
        try:
            token = payload.get('token')
            result, flag = self.ac.validate_token_internal(token)
            return self._build_response(result, flag, "令牌驗證成功")
        except Exception as e:
            logger.error(f"內部服務驗證令牌異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/internal/user/<user_id>")
class InternalUserInfoApi(BaseAuthView):
    """内部服务获取用户信息API"""

    @blp.response(200, RspMsgDictSchema)
    def get(self, user_id):
        """获取用户信息"""
        try:
            result, flag = self.ac.get_profile(user_id)
            if flag and result.get('user_info'):
                # 只返回基本用户信息，不返回敏感信息
                user_info = result['user_info']
                clean_result = {
                    'user_id': user_info.get('user_id'),
                    'username': user_info.get('username'),
                    'email': user_info.get('email'),
                    'display_name': user_info.get('display_name'),
                    'status': user_info.get('status'),
                    'platform_role': user_info.get('platform_role', 'platform_user'),
                    'avatar_url': user_info.get('avatar_url'),
                    'created_at': user_info.get('created_at')
                }
                return self._build_response(clean_result, flag, "獲取用戶信息成功")
            return self._build_response(result, flag)
        except Exception as e:
            logger.error(f"內部服務獲取用戶信息異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/internal/user/batch")
class InternalUserBatchApi(BaseAuthView):
    """内部服务批量获取用户信息API"""

    @blp.arguments(UserBatchRequestSchema)
    @blp.response(200, RspMsgDictSchema)
    def get(self, payload):
        """批量获取用户信息"""
        try:
            user_ids = payload.get('user_ids', [])
            result, flag = self.ac.get_user_batch(user_ids)
            return self._build_response(result, flag, "批量獲取用戶信息成功")
        except Exception as e:
            logger.error(f"內部服務批量獲取用戶信息異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/internal/check-platform-permission")
class InternalCheckPlatformPermissionApi(BaseAuthView):
    """內部服務檢查平台權限API"""

    @blp.arguments(InternalCheckPlatformPermissionSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """檢查平台權限"""
        try:
            user_id = payload.get('user_id')
            required_role = payload.get('required_role', 'platform_admin')
            
            result, flag = self.ac.check_platform_permission(user_id, required_role)
            return self._build_response(result, flag, "檢查平台權限成功")
        except Exception as e:
            logger.error(f"內部服務檢查平台權限異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== OAuth API (预留接口) ====================

@blp.route("/auth/oauth/<provider>/url")
class OAuthUrlApi(BaseAuthView):
    """获取OAuth授权URL API"""

    @blp.response(200, RspMsgDictSchema)
    def get(self, provider):
        """获取OAuth授权URL"""
        try:
            # TODO: 实现OAuth授权URL生成逻辑
            result = {
                'provider': provider,
                'authorization_url': f'https://oauth.example.com/{provider}/authorize',
                'state': 'random_state_string',
                'message': 'OAuth授权URL已生成'
            }
            return response_result(content=result, msg="獲取授權URL成功")
        except Exception as e:
            logger.error(f"獲取OAuth授權URL異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/auth/oauth/<provider>/callback")
class OAuthCallbackApi(BaseAuthView):
    """OAuth回调处理API"""

    @blp.response(200, RspMsgDictSchema)
    def post(self, provider):
        """OAuth回调处理"""
        try:
            # TODO: 实现OAuth回调处理逻辑
            result = {
                'provider': provider,
                'message': 'OAuth回调处理成功',
                'user_info': {
                    'provider_user_id': 'example_id',
                    'email': 'user@example.com',
                    'display_name': 'Example User'
                }
            }
            return response_result(content=result, msg="OAuth回調處理成功")
        except Exception as e:
            logger.error(f"OAuth回調處理異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# ==================== 缓存管理API (内部使用) ====================

@blp.route("/internal/cache/stats")
class CacheStatsApi(BaseAuthView):
    """缓存统计API"""

    @blp.response(200, RspMsgDictSchema)
    def get(self):
        """获取缓存统计信息"""
        try:
            result, flag = self.ac.get_cache_stats()
            return self._build_response(result, flag, "獲取緩存統計成功")
        except Exception as e:
            logger.error(f"獲取緩存統計異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/internal/cache/warm-up")
class CacheWarmUpApi(BaseAuthView):
    """缓存预热API"""

    @blp.arguments(CacheWarmUpSchema)
    @blp.response(200, RspMsgDictSchema)
    def post(self, payload):
        """缓存预热"""
        try:
            # 可以从请求参数获取用户ID列表和限制数量
            user_ids = payload.get('user_ids')
            limit = payload.get('limit', 100)
            
            result, flag = self.ac.warm_up_cache(user_ids, limit)
            return self._build_response(result, flag, "緩存預熱成功")
        except Exception as e:
            logger.error(f"緩存預熱異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/internal/cache/invalidate-user/<user_id>")
class CacheInvalidateUserApi(BaseAuthView):
    """用户缓存失效API"""

    @blp.response(200, RspMsgSchema)
    def delete(self, user_id):
        """使用户缓存失效"""
        try:
            success = self.ac.invalidate_user_cache(user_id)
            if success:
                return response_result(msg=f"用戶 {user_id} 緩存已清除")
            else:
                return fail_response_result(msg="清除用戶緩存失敗")
        except Exception as e:
            logger.error(f"清除用戶緩存異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


@blp.route("/internal/cache/invalidate-session/<session_id>")
class CacheInvalidateSessionApi(BaseAuthView):
    """会话缓存失效API"""

    @blp.response(200, RspMsgSchema)
    def delete(self, session_id):
        """使会话缓存失效"""
        try:
            success = self.ac.invalidate_session_cache(session_id)
            if success:
                return response_result(msg=f"會話 {session_id} 緩存已清除")
            else:
                return fail_response_result(msg="清除會話緩存失敗")
        except Exception as e:
            logger.error(f"清除會話緩存異常: {str(e)}")
            return fail_response_result(msg="系統內部錯誤，請稍後重試")


# 错误处理器
@blp.errorhandler(401)
def handle_unauthorized(error):
    """处理401未授权错误"""
    _ = error  # 避免未使用参数警告
    return fail_response_result(msg="未授權訪問，請先登錄")


@blp.errorhandler(403)
def handle_forbidden(error):
    """处理403禁止访问错误"""
    _ = error  # 避免未使用参数警告
    return fail_response_result(msg="禁止訪問，權限不足")


@blp.errorhandler(422)
def handle_validation_error(error):
    """处理422验证错误"""
    _ = error  # 避免未使用参数警告
    return fail_response_result(msg="請求參數驗證失敗")


@blp.errorhandler(500)
def handle_internal_error(error):
    """处理500内部错误"""
    logger.error(f"內部服務器錯誤: {str(error)}")
    return fail_response_result(msg="內部服務器錯誤")


# 请求前处理
@blp.before_request
def before_request():
    """请求前处理"""
    # 记录API访问日志
    if request.endpoint and not request.endpoint.endswith('health'):
        logger.info(f"API訪問: {request.method} {request.path} - IP: {request.remote_addr}")


# 响应后处理
@blp.after_request
def after_request(response):
    """响应后处理"""
    # 添加安全头
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response