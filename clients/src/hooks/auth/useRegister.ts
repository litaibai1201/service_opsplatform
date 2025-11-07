import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api/authApi';
import { showToast } from '@/components/ui/ToastContainer';
import type { RegisterRequest, RegisterResponse } from '@/services/api/authApi';

export interface UseRegisterOptions {
  redirectOnSuccess?: boolean;
  redirectPath?: string;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  autoLogin?: boolean;
}

export interface UseRegisterReturn {
  register: (data: RegisterRequest, options?: UseRegisterOptions) => Promise<RegisterResponse | null>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useRegister = (defaultOptions?: UseRegisterOptions): UseRegisterReturn => {
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(async (
    data: RegisterRequest, 
    options?: UseRegisterOptions
  ): Promise<RegisterResponse | null> => {
    const opts = { ...defaultOptions, ...options };
    const {
      redirectOnSuccess = true,
      redirectPath,
      showSuccessToast = true,
      showErrorToast = true,
      autoLogin = false,
    } = opts;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authApi.register(data);
      
      if (showSuccessToast) {
        if (response.requiresEmailVerification) {
          showToast.success('注册成功！请查收邮件完成验证');
        } else {
          showToast.success('注册成功！');
        }
      }
      
      // 处理重定向
      if (redirectOnSuccess) {
        if (response.requiresEmailVerification) {
          // 跳转到邮箱验证页面
          navigate('/auth/verify-email', { 
            state: { 
              email: data.email,
              message: '注册成功，请查收邮件完成验证'
            }
          });
        } else if (autoLogin) {
          // 如果不需要邮箱验证且启用自动登录，跳转到仪表板
          navigate(redirectPath || '/dashboard');
        } else {
          // 跳转到登录页面
          navigate('/auth/login', { 
            state: { 
              email: data.email,
              message: '注册成功，请登录' 
            }
          });
        }
      }
      
      return response;
    } catch (err: any) {
      const errorMessage = err.message || '注册失败，请重试';
      setError(errorMessage);
      
      if (showErrorToast) {
        showToast.error(errorMessage);
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [navigate, defaultOptions]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    register,
    isLoading,
    error,
    clearError,
  };
};

// 快速注册Hook（预设配置）
export const useQuickRegister = () => {
  return useRegister({
    redirectOnSuccess: true,
    showSuccessToast: true,
    showErrorToast: true,
    autoLogin: false,
  });
};

// 静默注册Hook（不显示提示）
export const useSilentRegister = () => {
  return useRegister({
    redirectOnSuccess: false,
    showSuccessToast: false,
    showErrorToast: false,
  });
};

export default useRegister;