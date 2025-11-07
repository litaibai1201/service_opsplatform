import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '@/services/api/authApi';
import { storage } from '@/services/api/apiConfig';
import { showToast } from '@/components/ui/ToastContainer';
import { useAppDispatch } from '@/store';
import { setCredentials, clearCredentials } from '@/store/slices/authSlice';
import type { LoginRequest, LoginResponse } from '@/services/api/authApi';

export interface UseLoginOptions {
  redirectOnSuccess?: boolean;
  redirectPath?: string;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

export interface UseLoginReturn {
  login: (data: LoginRequest, options?: UseLoginOptions) => Promise<LoginResponse | null>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useLogin = (defaultOptions?: UseLoginOptions): UseLoginReturn => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (
    data: LoginRequest, 
    options?: UseLoginOptions
  ): Promise<LoginResponse | null> => {
    const opts = { ...defaultOptions, ...options };
    const {
      redirectOnSuccess = true,
      redirectPath,
      showSuccessToast = true,
      showErrorToast = true,
    } = opts;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authApi.login(data);
      
      // 存储认证信息
      storage.setToken(response.accessToken);
      storage.setRefreshToken(response.refreshToken);
      
      // 更新Redux状态
      dispatch(setCredentials({
        user: response.user,
        token: response.accessToken,
        refreshToken: response.refreshToken,
        permissions: response.permissions,
      }));
      
      if (showSuccessToast) {
        showToast.success(`欢迎回来，${response.user.username}！`);
      }
      
      // 处理重定向
      if (redirectOnSuccess) {
        const from = (location.state as any)?.from?.pathname || redirectPath || '/dashboard';
        navigate(from, { replace: true });
      }
      
      return response;
    } catch (err: any) {
      const errorMessage = err.message || '登录失败，请重试';
      setError(errorMessage);
      
      if (showErrorToast) {
        showToast.error(errorMessage);
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [navigate, location, dispatch, defaultOptions]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    login,
    isLoading,
    error,
    clearError,
  };
};

// 快速登录Hook（预设配置）
export const useQuickLogin = () => {
  return useLogin({
    redirectOnSuccess: true,
    showSuccessToast: true,
    showErrorToast: true,
  });
};

// 静默登录Hook（不显示提示）
export const useSilentLogin = () => {
  return useLogin({
    redirectOnSuccess: false,
    showSuccessToast: false,
    showErrorToast: false,
  });
};

export default useLogin;