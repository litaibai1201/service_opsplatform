import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/services/api/authApi';
import { showToast } from '@/components/ui/ToastContainer';
import type { 
  ForgotPasswordRequest, 
  ResetPasswordRequest,
  VerifyEmailRequest 
} from '@/services/api/authApi';

export interface UsePasswordResetReturn {
  // 忘记密码
  forgotPassword: (data: ForgotPasswordRequest) => Promise<boolean>;
  // 重置密码
  resetPassword: (data: ResetPasswordRequest) => Promise<boolean>;
  // 验证重置令牌
  validateResetToken: (token: string) => Promise<boolean>;
  // 验证邮箱
  verifyEmail: (data: VerifyEmailRequest) => Promise<boolean>;
  // 重新发送验证邮件
  resendVerificationEmail: (email: string) => Promise<boolean>;
  
  // 状态
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const usePasswordReset = (): UsePasswordResetReturn => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 忘记密码
  const forgotPassword = useCallback(async (data: ForgotPasswordRequest): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await authApi.forgotPassword(data);
      
      showToast.success('重置密码邮件已发送到您的邮箱');
      return true;
    } catch (err: any) {
      const errorMessage = err.message || '发送重置密码邮件失败';
      setError(errorMessage);
      showToast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 重置密码
  const resetPassword = useCallback(async (data: ResetPasswordRequest): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await authApi.resetPassword(data);
      
      showToast.success('密码重置成功，正在跳转到登录页面');
      
      // 延迟跳转，让用户看到成功消息
      setTimeout(() => {
        navigate('/auth/login', {
          state: { message: '密码已重置，请使用新密码登录' }
        });
      }, 2000);
      
      return true;
    } catch (err: any) {
      const errorMessage = err.message || '密码重置失败';
      setError(errorMessage);
      showToast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // 验证重置令牌
  const validateResetToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 这里应该调用验证令牌的API
      // 暂时模拟一个简单的验证
      if (!token || token.length < 10) {
        throw new Error('无效的重置令牌');
      }
      
      return true;
    } catch (err: any) {
      const errorMessage = err.message || '令牌验证失败';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 验证邮箱
  const verifyEmail = useCallback(async (data: VerifyEmailRequest): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await authApi.verifyEmail(data);
      
      showToast.success('邮箱验证成功，正在跳转到登录页面');
      
      // 延迟跳转，让用户看到成功消息
      setTimeout(() => {
        navigate('/auth/login', {
          state: { message: '邮箱验证成功，请登录' }
        });
      }, 2000);
      
      return true;
    } catch (err: any) {
      const errorMessage = err.message || '邮箱验证失败';
      setError(errorMessage);
      showToast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // 重新发送验证邮件
  const resendVerificationEmail = useCallback(async (email: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await authApi.resendVerificationEmail(email);
      
      showToast.success('验证邮件已重新发送');
      return true;
    } catch (err: any) {
      const errorMessage = err.message || '发送验证邮件失败';
      setError(errorMessage);
      showToast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    forgotPassword,
    resetPassword,
    validateResetToken,
    verifyEmail,
    resendVerificationEmail,
    isLoading,
    error,
    clearError,
  };
};

// 专门的忘记密码Hook
export const useForgotPassword = () => {
  const { forgotPassword, isLoading, error, clearError } = usePasswordReset();
  return { forgotPassword, isLoading, error, clearError };
};

// 专门的重置密码Hook
export const useResetPassword = () => {
  const { resetPassword, validateResetToken, isLoading, error, clearError } = usePasswordReset();
  return { resetPassword, validateResetToken, isLoading, error, clearError };
};

// 专门的邮箱验证Hook
export const useEmailVerification = () => {
  const { verifyEmail, resendVerificationEmail, isLoading, error, clearError } = usePasswordReset();
  return { verifyEmail, resendVerificationEmail, isLoading, error, clearError };
};

export default usePasswordReset;