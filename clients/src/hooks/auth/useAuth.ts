import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api/authApi';
import { storage } from '@/services/api/apiConfig';
import { showToast } from '@/components/ui/ToastContainer';
import { User } from '@/types/entities';
import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  RegisterResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  ChangePasswordRequest,
  UpdateProfileRequest
} from '@/services/api/authApi';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  permissions: string[];
  error: string | null;
}

export interface AuthActions {
  login: (data: LoginRequest) => Promise<LoginResponse | null>;
  register: (data: RegisterRequest) => Promise<RegisterResponse | null>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<User | null>;
  changePassword: (data: ChangePasswordRequest) => Promise<boolean>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<boolean>;
  resetPassword: (data: ResetPasswordRequest) => Promise<boolean>;
  verifyEmail: (data: VerifyEmailRequest) => Promise<boolean>;
  resendVerificationEmail: (email: string) => Promise<boolean>;
  checkPermission: (permission: string) => boolean;
  checkRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  clearError: () => void;
}

export interface UseAuthReturn extends AuthState, AuthActions {}

export const useAuth = (): UseAuthReturn => {
  const navigate = useNavigate();
  
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,
    permissions: [],
    error: null,
  });

  // 使用 useRef 跟踪初始化状态，防止多次初始化
  const initializeRef = useRef(false);

  // 初始化认证状态
  const initialize = useCallback(async () => {
    // 防止重复初始化
    if (initializeRef.current) {
      console.log('⏭️ Initialize already called, skipping...');
      return;
    }

    initializeRef.current = true;
    console.log('🔄 Initializing auth state...');

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const token = storage.getToken();
      if (!token) {
        console.log('❌ No token found');
        setState(prev => ({
          ...prev,
          isLoading: false,
          isInitialized: true
        }));
        return;
      }

      console.log('✅ Token found, fetching profile...');
      // 验证 token 有效性并获取用户信息
      const user = await authApi.getProfile();

      console.log('✅ Profile fetched:', user);
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        permissions: user.permissions || [],
        isLoading: false,
        isInitialized: true,
        error: null,
      }));
    } catch (error) {
      console.error('❌ Initialize failed:', error);
      // Token 无效，清除本地存储
      storage.clearAuth();
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        permissions: [],
        isLoading: false,
        isInitialized: true,
        error: null,
      }));
    }
  }, []);

  // 登录
  const login = useCallback(async (data: LoginRequest): Promise<LoginResponse | null> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await authApi.login(data);

      // 验证响应数据
      if (!response || !response.user || !response.accessToken) {
        throw new Error('登录响应数据不完整');
      }

      // 存储 token
      storage.setToken(response.accessToken);
      storage.setRefreshToken(response.refreshToken);

      // 确保 user 对象和 permissions 字段都有值
      const user = response.user;
      const permissions = response.permissions || user.permissions || [];

      setState(prev => ({
        ...prev,
        user: user,
        isAuthenticated: true,
        permissions: permissions,
        isLoading: false,
        isInitialized: true,  // 设置为 true，防止再次调用 initialize
        error: null,
      }));

      showToast.success('登录成功');
      return response;
    } catch (error: any) {
      const errorMessage = error.message || '登录失败';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      showToast.error(errorMessage);
      return null;
    }
  }, []);

  // 注册
  const register = useCallback(async (data: RegisterRequest): Promise<RegisterResponse | null> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await authApi.register(data);
      
      setState(prev => ({ ...prev, isLoading: false, error: null }));
      
      if (response.requiresEmailVerification) {
        showToast.success('注册成功，请查收邮件完成验证');
      } else {
        showToast.success('注册成功');
      }
      
      return response;
    } catch (error: any) {
      const errorMessage = error.message || '注册失败';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      showToast.error(errorMessage);
      return null;
    }
  }, []);

  // 登出
  const logout = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // 调用登出 API
      await authApi.logout();
    } catch (error) {
      // 即使 API 调用失败也要清除本地状态
      console.warn('Logout API failed, but continuing with local cleanup');
    } finally {
      // 清除本地存储和状态
      storage.clearAuth();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        permissions: [],
        error: null,
      });
      
      showToast.success('已安全退出');
      navigate('/login');
    }
  }, [navigate]);

  // 刷新用户资料
  const refreshProfile = useCallback(async (): Promise<void> => {
    try {
      const user = await authApi.getProfile();
      setState(prev => ({
        ...prev,
        user,
        permissions: user.permissions || [],
      }));
    } catch (error: any) {
      console.error('Failed to refresh profile:', error);
    }
  }, []);

  // 更新用户资料
  const updateProfile = useCallback(async (data: UpdateProfileRequest): Promise<User | null> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const updatedUser = await authApi.updateProfile(data);
      
      setState(prev => ({
        ...prev,
        user: updatedUser,
        isLoading: false,
        error: null,
      }));
      
      showToast.success('资料更新成功');
      return updatedUser;
    } catch (error: any) {
      const errorMessage = error.message || '资料更新失败';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      showToast.error(errorMessage);
      return null;
    }
  }, []);

  // 修改密码
  const changePassword = useCallback(async (data: ChangePasswordRequest): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await authApi.changePassword(data);
      
      setState(prev => ({ ...prev, isLoading: false, error: null }));
      showToast.success('密码修改成功');
      return true;
    } catch (error: any) {
      const errorMessage = error.message || '密码修改失败';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      showToast.error(errorMessage);
      return false;
    }
  }, []);

  // 忘记密码
  const forgotPassword = useCallback(async (data: ForgotPasswordRequest): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await authApi.forgotPassword(data);
      
      setState(prev => ({ ...prev, isLoading: false, error: null }));
      showToast.success('重置密码邮件已发送');
      return true;
    } catch (error: any) {
      const errorMessage = error.message || '发送重置密码邮件失败';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      showToast.error(errorMessage);
      return false;
    }
  }, []);

  // 重置密码
  const resetPassword = useCallback(async (data: ResetPasswordRequest): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await authApi.resetPassword(data);
      
      setState(prev => ({ ...prev, isLoading: false, error: null }));
      showToast.success('密码重置成功');
      return true;
    } catch (error: any) {
      const errorMessage = error.message || '密码重置失败';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      showToast.error(errorMessage);
      return false;
    }
  }, []);

  // 验证邮箱
  const verifyEmail = useCallback(async (data: VerifyEmailRequest): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await authApi.verifyEmail(data);
      
      setState(prev => ({
        ...prev,
        user: response.user,
        isLoading: false,
        error: null,
      }));
      
      showToast.success('邮箱验证成功');
      return true;
    } catch (error: any) {
      const errorMessage = error.message || '邮箱验证失败';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      showToast.error(errorMessage);
      return false;
    }
  }, []);

  // 重新发送验证邮件
  const resendVerificationEmail = useCallback(async (email: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await authApi.resendVerificationEmail(email);
      
      setState(prev => ({ ...prev, isLoading: false, error: null }));
      showToast.success('验证邮件已重新发送');
      return true;
    } catch (error: any) {
      const errorMessage = error.message || '发送验证邮件失败';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      showToast.error(errorMessage);
      return false;
    }
  }, []);

  // 权限检查函数
  const checkPermission = useCallback((permission: string): boolean => {
    return state.permissions.includes(permission);
  }, [state.permissions]);

  const checkRole = useCallback((role: string): boolean => {
    return state.user?.role === role;
  }, [state.user?.role]);

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    return permissions.some(permission => state.permissions.includes(permission));
  }, [state.permissions]);

  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    return permissions.every(permission => state.permissions.includes(permission));
  }, [state.permissions]);

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 初始化 - 只在组件挂载时执行一次
  useEffect(() => {
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // 状态
    ...state,
    
    // 动作
    login,
    register,
    logout,
    refreshProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerificationEmail,
    checkPermission,
    checkRole,
    hasAnyPermission,
    hasAllPermissions,
    clearError,
  };
};

export default useAuth;