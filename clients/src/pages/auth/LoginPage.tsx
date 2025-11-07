import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { Button, Input, Checkbox, Tooltip } from '@/components/ui';
import { AuthLayout } from '@/components/layout';
import { validateEmail, validatePassword } from '@/utils/validation';
import { EyeIcon, EyeSlashIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import type { LoginRequest } from '@/services/api/authApi';

interface FormData {
  email: string;
  password: string;
  rememberMe: boolean;
  captcha: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  captcha?: string;
  general?: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, isAuthenticated, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    rememberMe: false,
    captcha: '',
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [captchaData, setCaptchaData] = useState<{
    id: string;
    image: string;
  } | null>(null);

  // 获取重定向路径
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // 如果已登录，重定向到目标页面
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // 清除错误
  useEffect(() => {
    if (error) {
      setFormErrors(prev => ({ ...prev, general: error }));
    }
  }, [error]);

  // 获取验证码
  const fetchCaptcha = async () => {
    try {
      const { authApi } = await import('@/services/api/authApi');
      const captcha = await authApi.getCaptcha();
      setCaptchaData(captcha);
      setFormData(prev => ({ ...prev, captcha: '' }));
    } catch (error) {
      console.error('Failed to fetch captcha:', error);
    }
  };

  // 初始化验证码
  useEffect(() => {
    fetchCaptcha();
  }, []);

  // 处理输入变化
  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除相关错误
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if (formErrors.general) {
      setFormErrors(prev => ({ ...prev, general: undefined }));
      clearError();
    }
  };

  // 验证表单
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // 验证邮箱
    if (!formData.email) {
      errors.email = '请输入邮箱地址';
    } else if (!validateEmail(formData.email)) {
      errors.email = '请输入有效的邮箱地址';
    }

    // 验证密码
    if (!formData.password) {
      errors.password = '请输入密码';
    } else if (!validatePassword(formData.password)) {
      errors.password = '密码长度至少8位，且包含字母和数字';
    }

    // 验证验证码
    if (captchaData && !formData.captcha) {
      errors.captcha = '请输入验证码';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const loginData: LoginRequest = {
      email: formData.email,
      password: formData.password,
      rememberMe: formData.rememberMe,
      captcha: formData.captcha || undefined,
    };

    const success = await login(loginData);
    
    if (success) {
      navigate(from, { replace: true });
    } else {
      // 登录失败后刷新验证码
      if (captchaData) {
        fetchCaptcha();
      }
    }
  };

  // 处理第三方登录
  const handleSocialLogin = (provider: string) => {
    // TODO: 实现第三方登录
    console.log(`Login with ${provider}`);
  };

  return (
    <AuthLayout>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">登录账户</h2>
        <p className="text-gray-600 mb-8">欢迎回到 Service Ops Platform</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
        {/* 通用错误提示 */}
        {formErrors.general && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <InformationCircleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{formErrors.general}</p>
              </div>
            </div>
          </div>
        )}

        {/* 邮箱输入 */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            邮箱地址
          </label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            placeholder="请输入您的邮箱地址"
            error={formErrors.email}
            disabled={isLoading}
            autoComplete="email"
            autoFocus
          />
        </div>

        {/* 密码输入 */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            密码
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange('password')}
              placeholder="请输入您的密码"
              error={formErrors.password}
              disabled={isLoading}
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* 验证码 */}
        {captchaData && (
          <div>
            <label htmlFor="captcha" className="block text-sm font-medium text-gray-700 mb-2">
              验证码
            </label>
            <div className="flex space-x-3">
              <div className="flex-1">
                <Input
                  id="captcha"
                  type="text"
                  value={formData.captcha}
                  onChange={handleInputChange('captcha')}
                  placeholder="请输入验证码"
                  error={formErrors.captcha}
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>
              <div className="flex items-center space-x-2">
                <img
                  src={captchaData.image}
                  alt="验证码"
                  className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                  onClick={fetchCaptcha}
                />
                <Tooltip content="点击刷新验证码">
                  <button
                    type="button"
                    onClick={fetchCaptcha}
                    disabled={isLoading}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    刷新
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        )}

        {/* 记住我和忘记密码 */}
        <div className="flex items-center justify-between">
          <Checkbox
            id="rememberMe"
            checked={formData.rememberMe}
            onChange={handleInputChange('rememberMe')}
            disabled={isLoading}
            label="记住我"
          />
          <Link
            to="/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            忘记密码？
          </Link>
        </div>

        {/* 登录按钮 */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
        >
          登录
        </Button>

        {/* 分割线 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">或</span>
          </div>
        </div>

        {/* 第三方登录 */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialLogin('github')}
            disabled={isLoading}
            className="flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialLogin('google')}
            disabled={isLoading}
            className="flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </Button>
        </div>

        {/* 注册链接 */}
        <div className="text-center">
          <span className="text-sm text-gray-600">
            还没有账户？{' '}
            <Link
              to="/register"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              立即注册
            </Link>
          </span>
        </div>
        </form>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;