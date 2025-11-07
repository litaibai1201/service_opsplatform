import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { Button, Input } from '@/components/ui';
import { AuthLayout } from '@/components/layout';
import { validateEmail } from '@/utils/validation';
import { 
  InformationCircleIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  EnvelopeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import type { VerifyEmailRequest } from '@/services/api/authApi';

interface LocationState {
  email?: string;
  message?: string;
}

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { verifyEmail, resendVerificationEmail, isLoading, isAuthenticated, error, clearError } = useAuth();
  
  const [email, setEmail] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // 获取验证 token 和邮箱
  const token = searchParams.get('token');
  const locationState = location.state as LocationState;

  // 如果已登录，重定向到仪表板
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // 初始化邮箱地址
  useEffect(() => {
    if (locationState?.email) {
      setEmail(locationState.email);
    }
  }, [locationState]);

  // 倒计时
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // 自动验证 token
  useEffect(() => {
    if (token && !isVerifying && !isSuccess) {
      handleVerifyToken(token);
    }
  }, [token]);

  // 处理 token 验证
  const handleVerifyToken = async (verificationToken: string) => {
    setIsVerifying(true);
    setVerifyError(null);

    try {
      const verifyData: VerifyEmailRequest = {
        token: verificationToken,
      };

      const success = await verifyEmail(verifyData);
      
      if (success) {
        setIsSuccess(true);
        // 3秒后自动跳转到登录页
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: '邮箱验证成功，请登录' 
            }
          });
        }, 3000);
      } else {
        setVerifyError('邮箱验证失败，验证链接可能已过期或无效');
      }
    } catch (error: any) {
      setVerifyError(error.message || '邮箱验证失败');
    } finally {
      setIsVerifying(false);
    }
  };

  // 处理重新发送验证邮件
  const handleResendEmail = async () => {
    if (!email || countdown > 0) return;

    if (!validateEmail(email)) {
      setVerifyError('请输入有效的邮箱地址');
      return;
    }

    clearError();
    setVerifyError(null);

    const success = await resendVerificationEmail(email);
    
    if (success) {
      setCountdown(60);
    }
  };

  // 如果验证成功
  if (isSuccess) {
    return (
      <AuthLayout>
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">邮箱验证成功</h2>
          <p className="text-gray-600 mb-8">您的邮箱已成功验证，正在跳转到登录页面...</p>
          
        <div className="text-center space-y-6">
          {/* 成功图标 */}
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>

          {/* 成功信息 */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">
              邮箱验证成功
            </h3>
            <p className="text-sm text-gray-600">
              您的邮箱已成功验证！您现在可以正常使用所有功能。页面将在3秒后自动跳转到登录页面。
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

  // 如果正在验证
  if (isVerifying) {
    return (
      <AuthLayout>
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">正在验证邮箱</h2>
          <p className="text-gray-600 mb-8">请稍等，我们正在验证您的邮箱...</p>
          
        <div className="text-center space-y-6">
          {/* 加载图标 */}
          <div className="mx-auto flex items-center justify-center w-16 h-16">
            <ArrowPathIcon className="w-8 h-8 text-blue-600 animate-spin" />
          </div>

          {/* 验证信息 */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">
              正在验证邮箱
            </h3>
            <p className="text-sm text-gray-600">
              请稍等片刻，我们正在验证您的邮箱地址...
            </p>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // 如果验证失败或没有 token
  if (verifyError || (!token && !locationState?.email)) {
    return (
      <AuthLayout>
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">邮箱验证失败</h2>
          <p className="text-gray-600 mb-8">验证链接可能已过期或无效</p>
          
          <div className="text-center space-y-6">
          {/* 错误图标 */}
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          </div>

          {/* 错误信息 */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">
              邮箱验证失败
            </h3>
            <p className="text-sm text-gray-600">
              {verifyError || '验证链接可能已过期或无效。验证链接的有效期为24小时。'}
            </p>
          </div>

          {/* 重新发送验证邮件 */}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                邮箱地址
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入您的邮箱地址"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <Button
              variant="primary"
              onClick={handleResendEmail}
              disabled={countdown > 0 || isLoading || !email}
              loading={isLoading}
              fullWidth
            >
              {countdown > 0 ? `重新发送 (${countdown}s)` : '重新发送验证邮件'}
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

  // 等待验证邮件页面
  return (
    <AuthLayout>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">验证您的邮箱</h2>
        <p className="text-gray-600 mb-8">我们已向您的邮箱发送了验证链接</p>
        
        <div className="text-center space-y-6">
        {/* 邮件图标 */}
        <div className="mx-auto flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
          <EnvelopeIcon className="w-8 h-8 text-blue-600" />
        </div>

        {/* 验证信息 */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">
            请验证您的邮箱
          </h3>
          <p className="text-sm text-gray-600">
            我们已向 <span className="font-medium text-gray-900">{email}</span> 发送了验证邮件。
          </p>
          <p className="text-sm text-gray-600">
            请查收您的邮箱，并点击邮件中的验证链接来完成邮箱验证。
          </p>
          {locationState?.message && (
            <p className="text-sm text-green-600 font-medium">
              {locationState.message}
            </p>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="space-y-4">
          {/* 重新发送验证邮件 */}
          <div className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                邮箱地址
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入您的邮箱地址"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <Button
              variant="outline"
              onClick={handleResendEmail}
              disabled={countdown > 0 || isLoading || !email}
              loading={isLoading}
              fullWidth
            >
              {countdown > 0 ? `重新发送 (${countdown}s)` : '重新发送验证邮件'}
            </Button>
          </div>

          {/* 返回登录 */}
          <Button
            variant="primary"
            onClick={() => navigate('/login')}
            fullWidth
          >
            返回登录页面
          </Button>
        </div>

        {/* 帮助信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">
                验证邮件小贴士
              </h4>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>验证邮件可能需要几分钟才能到达</li>
                  <li>请检查您的垃圾邮件文件夹</li>
                  <li>验证链接的有效期为24小时</li>
                  <li>如果仍有问题，请联系客服支持</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default VerifyEmailPage;