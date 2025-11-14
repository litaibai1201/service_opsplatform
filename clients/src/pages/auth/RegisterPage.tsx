import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { Button, Input, Checkbox, Tooltip } from '@/components/ui';
// AuthLayout is handled by App.tsx routing
import { validateEmail, validatePassword, validateUsername } from '@/utils/validation';
import { EyeIcon, EyeSlashIcon, InformationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import type { RegisterRequest } from '@/services/api/authApi';

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  inviteCode: string;
  agreementAccepted: boolean;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  inviteCode?: string;
  agreementAccepted?: string;
  general?: string;
}

interface ValidationState {
  username: 'checking' | 'available' | 'unavailable' | null;
  email: 'checking' | 'available' | 'unavailable' | null;
  inviteCode: 'checking' | 'valid' | 'invalid' | null;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, isAuthenticated, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
    agreementAccepted: false,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationState, setValidationState] = useState<ValidationState>({
    username: null,
    email: null,
    inviteCode: null,
  });

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

  // 检查用户名可用性
  const checkUsernameAvailability = async (username: string) => {
    if (!username || !validateUsername(username)) return;

    setValidationState(prev => ({ ...prev, username: 'checking' }));
    
    try {
      const { authApi } = await import('@/services/api/authApi');
      const result = await authApi.checkUsernameAvailability(username);
      setValidationState(prev => ({ 
        ...prev, 
        username: result.available ? 'available' : 'unavailable' 
      }));
    } catch (error) {
      setValidationState(prev => ({ ...prev, username: null }));
    }
  };

  // 检查邮箱可用性
  const checkEmailAvailability = async (email: string) => {
    if (!email || !validateEmail(email)) return;

    setValidationState(prev => ({ ...prev, email: 'checking' }));
    
    try {
      const { authApi } = await import('@/services/api/authApi');
      const result = await authApi.checkEmailAvailability(email);
      setValidationState(prev => ({ 
        ...prev, 
        email: result.available ? 'available' : 'unavailable' 
      }));
    } catch (error) {
      setValidationState(prev => ({ ...prev, email: null }));
    }
  };

  // 验证邀请码
  const validateInviteCode = async (code: string) => {
    if (!code) {
      setValidationState(prev => ({ ...prev, inviteCode: null }));
      return;
    }

    setValidationState(prev => ({ ...prev, inviteCode: 'checking' }));
    
    try {
      const { authApi } = await import('@/services/api/authApi');
      const result = await authApi.validateInviteCode(code);
      setValidationState(prev => ({ 
        ...prev, 
        inviteCode: result.valid ? 'valid' : 'invalid' 
      }));
    } catch (error) {
      setValidationState(prev => ({ ...prev, inviteCode: 'invalid' }));
    }
  };

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

  // 处理复选框变化
  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, agreementAccepted: checked }));
    // 清除相关错误
    if (formErrors.agreementAccepted) {
      setFormErrors(prev => ({ ...prev, agreementAccepted: undefined }));
    }
  };

  // 防抖检查用户名
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.username) {
        checkUsernameAvailability(formData.username);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username]);

  // 防抖检查邮箱
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.email) {
        checkEmailAvailability(formData.email);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.email]);

  // 防抖验证邀请码
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.inviteCode) {
        validateInviteCode(formData.inviteCode);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.inviteCode]);

  // 验证表单
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // 验证用户名
    if (!formData.username) {
      errors.username = '请输入用户名';
    } else if (!validateUsername(formData.username)) {
      errors.username = '用户名长度3-20位，只能包含字母、数字和下划线';
    } else if (validationState.username === 'unavailable') {
      errors.username = '用户名已被使用';
    }

    // 验证邮箱
    if (!formData.email) {
      errors.email = '请输入邮箱地址';
    } else if (!validateEmail(formData.email)) {
      errors.email = '请输入有效的邮箱地址';
    } else if (validationState.email === 'unavailable') {
      errors.email = '邮箱已被注册';
    }

    // 验证密码
    if (!formData.password) {
      errors.password = '请输入密码';
    } else if (!validatePassword(formData.password)) {
      errors.password = '密码长度至少8位，且包含字母和数字';
    }

    // 验证确认密码
    if (!formData.confirmPassword) {
      errors.confirmPassword = '请确认密码';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致';
    }

    // 验证邀请码（如果有输入）
    if (formData.inviteCode && validationState.inviteCode === 'invalid') {
      errors.inviteCode = '邀请码无效';
    }

    // 验证协议同意
    if (!formData.agreementAccepted) {
      errors.agreementAccepted = '请阅读并同意用户协议和隐私政策';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const registerData: RegisterRequest = {
      username: formData.username,
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      inviteCode: formData.inviteCode || undefined,
      agreementAccepted: formData.agreementAccepted,
    };

    const result = await register(registerData);

    // 注册成功时，result 不为 null
    if (result && typeof result === 'object') {
      if (result.requiresEmailVerification) {
        navigate('/verify-email', {
          state: {
            email: formData.email,
            message: '注册成功，请查收邮件完成验证'
          }
        });
      } else {
        navigate('/login', {
          state: {
            message: '注册成功，请登录'
          }
        });
      }
    }
    // 注册失败时，result 为 null，错误信息已通过 toast 显示，这里不需要额外处理
  };

  // 获取验证状态图标
  const getValidationIcon = (state: ValidationState[keyof ValidationState]) => {
    switch (state) {
      case 'checking':
        return <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />;
      case 'available':
      case 'valid':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'unavailable':
      case 'invalid':
        return <InformationCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">创建账户</h2>
        <p className="text-gray-600 mb-8">加入 Service Ops Platform，开始协作之旅</p>
        
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

        {/* 用户名输入 */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
            用户名
          </label>
          <div className="relative">
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange('username')}
              placeholder="请输入用户名"
              error={formErrors.username}
              disabled={isLoading}
              autoComplete="username"
              autoFocus
              className="pr-10"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {getValidationIcon(validationState.username)}
            </div>
          </div>
          {validationState.username === 'available' && (
            <p className="mt-1 text-sm text-green-600">用户名可用</p>
          )}
        </div>

        {/* 邮箱输入 */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            邮箱地址
          </label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              placeholder="请输入您的邮箱地址"
              error={formErrors.email}
              disabled={isLoading}
              autoComplete="email"
              className="pr-10"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {getValidationIcon(validationState.email)}
            </div>
          </div>
          {validationState.email === 'available' && (
            <p className="mt-1 text-sm text-green-600">邮箱可用</p>
          )}
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
              placeholder="请输入密码"
              error={formErrors.password}
              disabled={isLoading}
              autoComplete="new-password"
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
          <p className="mt-1 text-sm text-gray-500">
            密码长度至少8位，且包含字母和数字
          </p>
        </div>

        {/* 确认密码输入 */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            确认密码
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              placeholder="请再次输入密码"
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

        {/* 邀请码输入 */}
        <div>
          <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-2">
            邀请码（可选）
          </label>
          <div className="relative">
            <Input
              id="inviteCode"
              type="text"
              value={formData.inviteCode}
              onChange={handleInputChange('inviteCode')}
              placeholder="请输入邀请码"
              error={formErrors.inviteCode}
              disabled={isLoading}
              autoComplete="off"
              className="pr-10"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {getValidationIcon(validationState.inviteCode)}
            </div>
          </div>
          {validationState.inviteCode === 'valid' && (
            <p className="mt-1 text-sm text-green-600">邀请码有效</p>
          )}
        </div>

        {/* 用户协议 */}
        <div>
          <Checkbox
            id="agreementAccepted"
            checked={formData.agreementAccepted}
            onChange={handleCheckboxChange}
            disabled={isLoading}
            error={formErrors.agreementAccepted}
          />
          <span className="text-sm text-gray-600 ml-2">
            我已阅读并同意{' '}
            <Link to="/terms" className="text-blue-600 hover:text-blue-800">
              用户协议
            </Link>
            {' '}和{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-800">
              隐私政策
            </Link>
          </span>
        </div>

        {/* 注册按钮 */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
        >
          注册
        </Button>

        {/* 登录链接 */}
        <div className="text-center">
          <span className="text-sm text-gray-600">
            已有账户？{' '}
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              立即登录
            </Link>
          </span>
        </div>
        </form>
      </div>
  );
};

export default RegisterPage;