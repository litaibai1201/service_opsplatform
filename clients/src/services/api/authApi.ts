import httpClient from './httpClient';
import { API_CONFIG } from './apiConfig';
import { User, UserRole } from '@/types/entities';

// 登录请求数据
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// 登录响应数据
export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  permissions: string[];
}

// 注册请求数据
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  inviteCode?: string;
  agreementAccepted: boolean;
}

// 注册响应数据
export interface RegisterResponse {
  user: Partial<User>;
  message: string;
  requiresEmailVerification: boolean;
}

// 忘记密码请求数据
export interface ForgotPasswordRequest {
  email: string;
}

// 重置密码请求数据
export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

// 邮箱验证请求数据
export interface VerifyEmailRequest {
  token: string;
}

// 修改密码请求数据
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// 更新个人资料请求数据
export interface UpdateProfileRequest {
  username?: string;
  email?: string;
  avatar?: string;
  phone?: string;
  bio?: string;
  timezone?: string;
  language?: string;
  notifications?: {
    email: boolean;
    push: boolean;
    desktop: boolean;
  };
}

// 认证 API 服务类
class AuthApiService {
  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await httpClient.post<any>(
      API_CONFIG.ENDPOINTS.AUTH.LOGIN,
      data,
      { skipAuth: true }
    );

    // 调试日志
    console.log('🔍 Login API Response:', response);

    // 后端返回格式: { code, content: { access_token, refresh_token, user_info, permissions, ... }, msg }
    // 需要从 content 字段提取数据并转换字段名
    const result = response.content || response.data || response;

    console.log('🔍 Extracted Result:', result);

    // 验证必需字段是否存在
    const accessToken = result.access_token || result.accessToken;
    const refreshToken = result.refresh_token || result.refreshToken;

    if (!accessToken) {
      console.error('❌ 缺少访问令牌:', result);
      throw new Error('登录响应缺少访问令牌');
    }

    // 转换用户信息字段名（蛇形命名 -> 驼峰命名）
    const userInfo = result.user_info || result.user || {};

    console.log('🔍 User Info:', userInfo);

    const user = {
      id: userInfo.id || userInfo.user_id?.toString() || '',
      username: userInfo.username || '',
      email: userInfo.email || '',
      displayName: userInfo.display_name || userInfo.displayName || userInfo.username || '',
      avatarUrl: userInfo.avatar_url || userInfo.avatarUrl,
      status: userInfo.status || 'active',
      platformRole: userInfo.platform_role || userInfo.platformRole || 'platform_user',
      role: userInfo.role || userInfo.platform_role || userInfo.platformRole || 'platform_user',
      permissions: userInfo.permissions || [],
      emailVerified: userInfo.email_verified !== undefined ? userInfo.email_verified : userInfo.emailVerified !== undefined ? userInfo.emailVerified : false,
      twoFactorEnabled: userInfo.two_factor_enabled !== undefined ? userInfo.two_factor_enabled : userInfo.twoFactorEnabled !== undefined ? userInfo.twoFactorEnabled : false,
      timezone: userInfo.timezone || 'UTC',
      language: userInfo.language || 'zh-CN',
      lastLoginAt: userInfo.last_login_at || userInfo.lastLoginAt,
      createdAt: userInfo.created_at || userInfo.createdAt || new Date().toISOString(),
      updatedAt: userInfo.updated_at || userInfo.updatedAt || new Date().toISOString()
    };

    console.log('✅ Constructed User:', user);

    const loginResponse = {
      user,
      accessToken,
      refreshToken: refreshToken || '',
      expiresIn: result.expires_in || result.expiresIn || 3600,
      permissions: result.permissions || []
    };

    console.log('✅ Final Login Response:', loginResponse);

    return loginResponse;
  }

  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await httpClient.post<any>(
      API_CONFIG.ENDPOINTS.AUTH.REGISTER,
      data,
      { skipAuth: true }
    );
    // 后端返回格式: { code, content: RegisterResponse, msg }
    // 需要从 content 字段提取数据
    const result = response.content || response.data || response;

    // 确保返回的数据符合 RegisterResponse 接口
    return {
      user: result.user || result,
      message: result.message || response.msg || '注册成功',
      requiresEmailVerification: result.requiresEmailVerification || false
    };
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      await httpClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      // 即使登出失败也要清除本地存储
      console.warn('Logout API failed, but continuing with local cleanup');
    }
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const response = await httpClient.post(
      API_CONFIG.ENDPOINTS.AUTH.REFRESH,
      { refreshToken },
      { skipAuth: true }
    );
    return response.data;
  }

  /**
   * 获取用户个人资料
   */
  async getProfile(): Promise<User> {
    const response = await httpClient.get<any>(
      API_CONFIG.ENDPOINTS.AUTH.PROFILE
    );

    // 后端返回格式: { code, content: { user_info, security_info }, msg }
    const result = response.content || response.data || response;
    const userInfo = result.user_info || result.user || result;

    // 转换字段名（蛇形命名 -> 驼峰命名）
    return {
      id: userInfo.user_id?.toString() || userInfo.id || '',
      username: userInfo.username || '',
      email: userInfo.email || '',
      displayName: userInfo.display_name || userInfo.displayName || userInfo.username || '',
      avatarUrl: userInfo.avatar_url || userInfo.avatarUrl || undefined,
      status: userInfo.status || 'active',
      platformRole: userInfo.platform_role || userInfo.platformRole || 'platform_user',
      role: userInfo.role || userInfo.platform_role || userInfo.platformRole || 'platform_user',
      permissions: userInfo.permissions || [],
      emailVerified: userInfo.email_verified !== undefined ? userInfo.email_verified : false,
      twoFactorEnabled: userInfo.two_factor_enabled !== undefined ? userInfo.two_factor_enabled : false,
      timezone: userInfo.timezone || 'UTC',
      language: userInfo.language || 'zh-CN',
      lastLoginAt: userInfo.last_login_at || userInfo.lastLoginAt,
      createdAt: userInfo.created_at || userInfo.createdAt || new Date().toISOString(),
      updatedAt: userInfo.updated_at || userInfo.updatedAt || new Date().toISOString()
    };
  }

  /**
   * 更新用户个人资料
   */
  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    const response = await httpClient.put<User>(
      API_CONFIG.ENDPOINTS.AUTH.PROFILE,
      data
    );
    return response.data;
  }

  /**
   * 忘记密码
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<{
    message: string;
  }> {
    const response = await httpClient.post(
      API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD,
      data,
      { skipAuth: true }
    );
    return response.data;
  }

  /**
   * 重置密码
   */
  async resetPassword(data: ResetPasswordRequest): Promise<{
    message: string;
  }> {
    const response = await httpClient.post(
      API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD,
      data,
      { skipAuth: true }
    );
    return response.data;
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(data: VerifyEmailRequest): Promise<{
    message: string;
    user: User;
  }> {
    const response = await httpClient.post(
      API_CONFIG.ENDPOINTS.AUTH.VERIFY_EMAIL,
      data,
      { skipAuth: true }
    );
    return response.data;
  }

  /**
   * 重新发送验证邮件
   */
  async resendVerificationEmail(email: string): Promise<{
    message: string;
  }> {
    const response = await httpClient.post(
      API_CONFIG.ENDPOINTS.AUTH.RESEND_VERIFICATION,
      { email },
      { skipAuth: true }
    );
    return response.data;
  }

  /**
   * 修改密码
   */
  async changePassword(data: ChangePasswordRequest): Promise<{
    message: string;
  }> {
    const response = await httpClient.post(
      API_CONFIG.ENDPOINTS.AUTH.CHANGE_PASSWORD,
      data
    );
    return response.data;
  }

  /**
   * 上传头像
   */
  async uploadAvatar(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{
    avatarUrl: string;
  }> {
    const response = await httpClient.upload(
      `/users/avatar`,
      file,
      onProgress
    );
    return response.data;
  }

  /**
   * 检查用户名是否可用
   */
  async checkUsernameAvailability(username: string): Promise<{
    available: boolean;
    suggestions?: string[];
  }> {
    const response = await httpClient.get<any>(
      `/auth/check-username/${encodeURIComponent(username)}`,
      { skipAuth: true }
    );
    // 后端返回格式: { code, content: { available, username, suggestions? }, msg }
    // 需要从 content 字段提取数据
    return response.content || response.data || response;
  }

  /**
   * 检查邮箱是否可用
   */
  async checkEmailAvailability(email: string): Promise<{
    available: boolean;
  }> {
    const response = await httpClient.get<any>(
      `/auth/check-email/${encodeURIComponent(email)}`,
      { skipAuth: true }
    );
    // 后端返回格式: { code, content: { available, email }, msg }
    // 需要从 content 字段提取数据
    return response.content || response.data || response;
  }

  /**
   * 验证邀请码
   */
  async validateInviteCode(code: string): Promise<{
    valid: boolean;
    teamName?: string;
    inviterName?: string;
  }> {
    const response = await httpClient.get(
      `/auth/invite/${encodeURIComponent(code)}`,
      { skipAuth: true }
    );
    return response.data;
  }

  /**
   * 启用双因子认证
   */
  async enableTwoFactor(): Promise<{
    qrCode: string;
    secret: string;
    backupCodes: string[];
  }> {
    const response = await httpClient.post('/auth/2fa/enable');
    return response.data;
  }

  /**
   * 确认双因子认证设置
   */
  async confirmTwoFactor(token: string): Promise<{
    backupCodes: string[];
  }> {
    const response = await httpClient.post('/auth/2fa/confirm', { token });
    return response.data;
  }

  /**
   * 禁用双因子认证
   */
  async disableTwoFactor(token: string): Promise<{
    message: string;
  }> {
    const response = await httpClient.post('/auth/2fa/disable', { token });
    return response.data;
  }

  /**
   * 验证双因子认证令牌
   */
  async verifyTwoFactor(token: string): Promise<{
    valid: boolean;
  }> {
    const response = await httpClient.post('/auth/2fa/verify', { token });
    return response.data;
  }

  /**
   * 生成新的备用代码
   */
  async generateBackupCodes(): Promise<{
    backupCodes: string[];
  }> {
    const response = await httpClient.post('/auth/2fa/backup-codes');
    return response.data;
  }

  /**
   * 获取登录历史
   */
  async getLoginHistory(params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    items: Array<{
      id: string;
      ip: string;
      userAgent: string;
      location?: string;
      loginTime: string;
      success: boolean;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await httpClient.get('/auth/login-history', {
      params,
    });
    return response.data;
  }

  /**
   * 获取活跃会话
   */
  async getActiveSessions(): Promise<Array<{
    id: string;
    ip: string;
    userAgent: string;
    location?: string;
    loginTime: string;
    lastActivity: string;
    current: boolean;
  }>> {
    const response = await httpClient.get('/auth/sessions');
    return response.data;
  }

  /**
   * 撤销会话
   */
  async revokeSession(sessionId: string): Promise<{
    message: string;
  }> {
    const response = await httpClient.delete(`/auth/sessions/${sessionId}`);
    return response.data;
  }

  /**
   * 撤销所有其他会话
   */
  async revokeAllOtherSessions(): Promise<{
    message: string;
    revokedCount: number;
  }> {
    const response = await httpClient.post('/auth/sessions/revoke-others');
    return response.data;
  }
}

// 创建并导出服务实例
export const authApi = new AuthApiService();
export default authApi;