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
    const response = await httpClient.post<LoginResponse>(
      API_CONFIG.ENDPOINTS.AUTH.LOGIN,
      data,
      { skipAuth: true }
    );
    return response.data;
  }

  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await httpClient.post<RegisterResponse>(
      API_CONFIG.ENDPOINTS.AUTH.REGISTER,
      data,
      { skipAuth: true }
    );
    return response.data;
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
    const response = await httpClient.get<User>(
      API_CONFIG.ENDPOINTS.AUTH.PROFILE
    );
    return response.data;
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
    const response = await httpClient.get(
      `/auth/check-username/${encodeURIComponent(username)}`,
      { skipAuth: true }
    );
    return response.data;
  }

  /**
   * 检查邮箱是否可用
   */
  async checkEmailAvailability(email: string): Promise<{
    available: boolean;
  }> {
    const response = await httpClient.get(
      `/auth/check-email/${encodeURIComponent(email)}`,
      { skipAuth: true }
    );
    return response.data;
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