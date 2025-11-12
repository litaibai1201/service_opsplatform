import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { Button, Input, Tooltip } from '@/components/ui';
// AuthLayout is handled by App.tsx routing
import { validateEmail } from '@/utils/validation';
import { InformationCircleIcon, CheckCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import type { ForgotPasswordRequest } from '@/services/api/authApi';

interface FormData {
  email: string;
  captcha: string;
}

interface FormErrors {
  email?: string;
  captcha?: string;
  general?: string;
}

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { forgotPassword, isLoading, isAuthenticated, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    captcha: '',
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const [captchaData, setCaptchaData] = useState<{
    id: string;
    image: string;
  } | null>(null);

  // 如果已登录，重定向到仪表板
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // 清除错误
  useEffect(() => {
    if (error) {
      setFormErrors(prev => ({ ...prev, general: error }));
    }
  }, [error]);

  // 倒计时
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // 获取验证码
  const fetchCaptcha = async () => {
    try {
      const { authApi } = await import('@/services/api/authApi');
      const captcha = await authApi.getCaptcha();
      setCaptchaData({
        id: captcha.captchaId,
        image: captcha.captchaImage
      });
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
    const value = e.target.value;
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

    const forgotPasswordData: ForgotPasswordRequest = {
      email: formData.email,
      captcha: formData.captcha || undefined,
    };

    const success = await forgotPassword(forgotPasswordData);
    
    if (success) {
      setIsSubmitted(true);
      setCountdown(60); // 60秒倒计时
    } else {
      // 发送失败后刷新验证码
      if (captchaData) {
        fetchCaptcha();
      }
    }
  };

  // 重新发送
  const handleResend = async () => {
    if (countdown > 0) return;
    
    const success = await forgotPassword({
      email: formData.email,
      captcha: formData.captcha,
    });
    
    if (success) {
      setCountdown(60);
    } else {
      // 发送失败后刷新验证码
      if (captchaData) {
        fetchCaptcha();
      }
    }
  };

  // 如果已提交，显示成功页面
  if (isSubmitted) {
    return (
      <div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">重置密码邮件已发送</h2>
          <p className="text-gray-600 mb-8">我们已向您的邮箱发送了重置密码的邮件</p>
          
          <div className="text-center space-y-6">
          {/* 成功图标 */}
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>

          {/* 成功信息 */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">
              重置密码邮件已发送
            </h3>
            <p className="text-sm text-gray-600">
              我们已向 <span className="font-medium text-gray-900">{formData.email}</span> 发送了重置密码的邮件。
            </p>
            <p className="text-sm text-gray-600">
              请查收您的邮箱，并点击邮件中的链接来重置您的密码。如果您没有收到邮件，请检查垃圾邮件文件夹。
            </p>
          </div>

          {/* 重新发送按钮 */}
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={countdown > 0 || isLoading}
              fullWidth
            >
              {countdown > 0 ? `重新发送 (${countdown}s)` : '重新发送邮件'}
            </Button>

            {/* 返回登录 */}
            <div className="flex items-center justify-center space-x-2">
              <ArrowLeftIcon className="w-4 h-4 text-gray-400" />
              <Link
                to="/login"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                返回登录页面
              </Link>
            </div>
          </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">忘记密码</h2>
        <p className="text-gray-600 mb-8">输入您的邮箱地址，我们将发送重置密码的链接</p>
        
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
            placeholder="请输入您注册时使用的邮箱地址"
            error={formErrors.email}
            disabled={isLoading}
            autoComplete="email"
            autoFocus
          />
          <p className="mt-1 text-sm text-gray-500">
            请输入您注册时使用的邮箱地址，我们将向该邮箱发送重置密码的链接
          </p>
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

        {/* 发送重置邮件按钮 */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
        >
          发送重置密码邮件
        </Button>

        {/* 返回登录 */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2">
            <ArrowLeftIcon className="w-4 h-4 text-gray-400" />
            <Link
              to="/login"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              返回登录页面
            </Link>
          </div>
        </div>

        {/* 帮助信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">
                找回密码小贴士
              </h4>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>重置密码邮件的有效期为24小时</li>
                  <li>如果没有收到邮件，请检查垃圾邮件文件夹</li>
                  <li>确保邮箱地址是您注册时使用的邮箱</li>
                  <li>如仍有问题，请联系客服支持</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;