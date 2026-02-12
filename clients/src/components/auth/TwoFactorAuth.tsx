import React, { useState, useRef, useEffect } from 'react';
import { Button, Input } from '@/components/ui';
import { ShieldCheckIcon, KeyIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { showToast } from '@/components/ui/ToastContainer';

export interface TwoFactorAuthProps {
  onVerify: (code: string) => Promise<void>;
  onResend?: () => Promise<void>;
  isLoading?: boolean;
  method?: 'totp' | 'sms' | 'email';
  phoneNumber?: string;
  email?: string;
}

const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({
  onVerify,
  onResend,
  isLoading = false,
  method = 'totp',
  phoneNumber,
  email,
}) => {
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 处理输入变化
  const handleChange = (index: number, value: string) => {
    // 只允许数字
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // 自动聚焦下一个输入框
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // 如果填满了，自动提交
    if (index === 5 && value) {
      const fullCode = [...newCode.slice(0, 5), value].join('');
      handleSubmit(fullCode);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        // 如果当前输入框为空，删除前一个
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else if (code[index]) {
        // 如果当前输入框有值，删除当前值
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // 处理粘贴
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();

    if (/^\d{6}$/.test(pastedData)) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      handleSubmit(pastedData);
    } else {
      showToast.error('请粘贴6位数字验证码');
    }
  };

  // 提交验证
  const handleSubmit = async (fullCode?: string) => {
    const verificationCode = fullCode || code.join('');

    if (verificationCode.length !== 6) {
      showToast.error('请输入完整的6位验证码');
      return;
    }

    try {
      await onVerify(verificationCode);
    } catch (error) {
      // 清空输入
      setCode(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  // 重新发送验证码
  const handleResend = async () => {
    if (!onResend || countdown > 0) return;

    try {
      await onResend();
      setCountdown(60);
      showToast.success('验证码已重新发送');
    } catch (error) {
      showToast.error('发送失败，请稍后再试');
    }
  };

  // 获取方法说明文本
  const getMethodText = () => {
    switch (method) {
      case 'sms':
        return `我们已向 ${phoneNumber || '您的手机'} 发送了验证码`;
      case 'email':
        return `我们已向 ${email || '您的邮箱'} 发送了验证码`;
      case 'totp':
      default:
        return '请输入您的身份验证器应用中的6位验证码';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">双因素认证</h2>
        <p className="text-sm text-gray-600">{getMethodText()}</p>
      </div>

      <div className="space-y-6">
        {/* 验证码输入框 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            验证码
          </label>
          <div className="flex gap-2 justify-center">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                disabled={isLoading}
                className={`
                  w-12 h-14 text-center text-2xl font-semibold
                  border-2 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-all duration-200
                  ${digit ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              />
            ))}
          </div>
        </div>

        {/* 重新发送按钮 */}
        {method !== 'totp' && onResend && (
          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-gray-500">
                {countdown} 秒后可重新发送
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={isLoading}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 disabled:opacity-50"
              >
                <ArrowPathIcon className="w-4 h-4" />
                重新发送验证码
              </button>
            )}
          </div>
        )}

        {/* 提交按钮 */}
        <Button
          onClick={() => handleSubmit()}
          disabled={isLoading || code.join('').length !== 6}
          className="w-full"
          loading={isLoading}
        >
          <KeyIcon className="w-5 h-5 mr-2" />
          验证
        </Button>

        {/* 帮助提示 */}
        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>没有收到验证码？</p>
          <p>请检查您的垃圾邮件文件夹或稍后再试</p>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorAuth;
