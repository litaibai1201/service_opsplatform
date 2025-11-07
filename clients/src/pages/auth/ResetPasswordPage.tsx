import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { Button, Input } from '@/components/ui';
import { AuthLayout } from '@/components/layout';
import { validatePassword } from '@/utils/validation';
import { EyeIcon, EyeSlashIcon, InformationCircleIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { ResetPasswordRequest } from '@/services/api/authApi';

interface FormData {
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword, isLoading, isAuthenticated, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    password: '',
    confirmPassword: '',
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // 获取重置 token
  const token = searchParams.get('token');

  // 如果已登录，重定向到仪表板
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // 验证 token
  useEffect(() => {
    if (!token) {
      setTokenError('重置密码链接无效或已过期');
    }
  }, [token]);

  // 清除错误
  useEffect(() => {
    if (error) {
      setFormErrors(prev => ({ ...prev, general: error }));
    }
  }, [error]);

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

    // 验证密码
    if (!formData.password) {
      errors.password = '请输入新密码';
    } else if (!validatePassword(formData.password)) {
      errors.password = '密码长度至少8位，且包含字母和数字';
    }

    // 验证确认密码
    if (!formData.confirmPassword) {
      errors.confirmPassword = '请确认新密码';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !validateForm()) return;

    const resetPasswordData: ResetPasswordRequest = {
      token,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    };

    const success = await resetPassword(resetPasswordData);
    
    if (success) {
      setIsSuccess(true);
      // 3秒后自动跳转到登录页
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: '密码重置成功，请使用新密码登录' 
          }
        });
      }, 3000);
    }
  };

  // 密码强度指示器
  const getPasswordStrength = (password: string) => {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    score = Object.values(checks).filter(Boolean).length;

    let strength = '';
    let color = '';
    let width = '0%';

    if (score === 0) {
      strength = '';
    } else if (score <= 2) {
      strength = '弱';
      color = 'bg-red-500';
      width = '33%';
    } else if (score <= 3) {
      strength = '中';
      color = 'bg-yellow-500';
      width = '66%';
    } else {
      strength = '强';
      color = 'bg-green-500';
      width = '100%';
    }

    return { strength, color, width, checks };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  // 如果token无效
  if (tokenError) {
    return (
      <AuthLayout>
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">重置密码链接无效</h2>
          <p className="text-gray-600 mb-8">该链接可能已过期或无效</p>
          
          <div className="text-center space-y-6">
            {/* 错误图标 */}
            <div className="mx-auto flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          </div>

          {/* 错误信息 */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">
              重置密码链接无效
            </h3>
            <p className="text-sm text-gray-600">
              该重置密码链接可能已过期或无效。重置密码链接的有效期为24小时。
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <Button
              variant="primary"
              onClick={() => navigate('/forgot-password')}
              fullWidth
            >
              重新发送重置邮件
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/login')}
              fullWidth
            >
              返回登录页面
            </Button>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // 如果重置成功
  if (isSuccess) {
    return (
      <AuthLayout>
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">密码重置成功</h2>
          <p className="text-gray-600 mb-8">您的密码已成功重置，正在跳转到登录页面...</p>
          
          <div className="text-center space-y-6">
            {/* 成功图标 */}
            <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>

          {/* 成功信息 */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">
              密码重置成功
            </h3>
            <p className="text-sm text-gray-600">
              您的密码已成功重置。页面将在3秒后自动跳转到登录页面，或者您可以点击下方按钮立即前往。
            </p>
          </div>

          {/* 立即登录按钮 */}
          <Button
            variant="primary"
            onClick={() => navigate('/login')}
            fullWidth
          >
            立即登录
          </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">重置密码</h2>
        <p className="text-gray-600 mb-8">请输入您的新密码</p>
        
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

        {/* 新密码输入 */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            新密码
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange('password')}
              placeholder="请输入新密码"
              error={formErrors.password}
              disabled={isLoading}
              autoComplete="new-password"
              autoFocus
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

          {/* 密码强度指示器 */}
          {formData.password && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">密码强度</span>
                <span className={`font-medium ${
                  passwordStrength.strength === '弱' ? 'text-red-600' :
                  passwordStrength.strength === '中' ? 'text-yellow-600' :
                  passwordStrength.strength === '强' ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {passwordStrength.strength}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                  style={{ width: passwordStrength.width }}
                />
              </div>
              
              {/* 密码要求检查 */}
              <div className="mt-2 space-y-1">
                <div className={`text-xs flex items-center ${passwordStrength.checks.length ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className="mr-2">{passwordStrength.checks.length ? '✓' : '○'}</span>
                  至少8个字符
                </div>
                <div className={`text-xs flex items-center ${passwordStrength.checks.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className="mr-2">{passwordStrength.checks.lowercase ? '✓' : '○'}</span>
                  包含小写字母
                </div>
                <div className={`text-xs flex items-center ${passwordStrength.checks.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className="mr-2">{passwordStrength.checks.uppercase ? '✓' : '○'}</span>
                  包含大写字母
                </div>
                <div className={`text-xs flex items-center ${passwordStrength.checks.number ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className="mr-2">{passwordStrength.checks.number ? '✓' : '○'}</span>
                  包含数字
                </div>
                <div className={`text-xs flex items-center ${passwordStrength.checks.special ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className="mr-2">{passwordStrength.checks.special ? '✓' : '○'}</span>
                  包含特殊字符
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 确认新密码输入 */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            确认新密码
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              placeholder="请再次输入新密码"
              error={formErrors.confirmPassword}
              disabled={isLoading}
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* 重置密码按钮 */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={isLoading || !token}
        >
          重置密码
        </Button>

        {/* 返回登录 */}
        <div className="text-center">
          <Link
            to="/login"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            返回登录页面
          </Link>
        </div>

        {/* 安全提示 */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">
                密码安全建议
              </h4>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>使用至少8个字符的强密码</li>
                  <li>包含大小写字母、数字和特殊字符</li>
                  <li>不要使用个人信息作为密码</li>
                  <li>定期更换密码以确保账户安全</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        </form>
      </div>
    </AuthLayout>
  );
};

export default ResetPasswordPage;