import React from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export interface PasswordStrengthProps {
  password: string;
  showRules?: boolean;
  className?: string;
}

interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

const passwordRules: PasswordRule[] = [
  {
    id: 'length',
    label: '至少8个字符',
    test: (password) => password.length >= 8,
  },
  {
    id: 'uppercase',
    label: '包含大写字母',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'lowercase',
    label: '包含小写字母',
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: 'number',
    label: '包含数字',
    test: (password) => /[0-9]/.test(password),
  },
  {
    id: 'special',
    label: '包含特殊字符 (!@#$%^&*)',
    test: (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  },
];

// 计算密码强度
const calculateStrength = (password: string): number => {
  if (!password) return 0;

  let strength = 0;
  const passedRules = passwordRules.filter((rule) => rule.test(password));
  strength = (passedRules.length / passwordRules.length) * 100;

  return Math.min(strength, 100);
};

// 获取强度等级
const getStrengthLevel = (strength: number): {
  label: string;
  color: string;
  barColor: string;
} => {
  if (strength === 0) {
    return { label: '', color: '', barColor: '' };
  } else if (strength < 40) {
    return { label: '弱', color: 'text-red-600', barColor: 'bg-red-500' };
  } else if (strength < 70) {
    return { label: '中等', color: 'text-yellow-600', barColor: 'bg-yellow-500' };
  } else if (strength < 100) {
    return { label: '强', color: 'text-green-600', barColor: 'bg-green-500' };
  } else {
    return { label: '非常强', color: 'text-green-700', barColor: 'bg-green-600' };
  }
};

const PasswordStrength: React.FC<PasswordStrengthProps> = ({
  password,
  showRules = true,
  className = '',
}) => {
  const strength = calculateStrength(password);
  const { label, color, barColor } = getStrengthLevel(strength);

  // 如果没有输入密码，不显示任何内容
  if (!password) {
    return showRules ? (
      <div className={`space-y-2 ${className}`}>
        <p className="text-sm font-medium text-gray-700">密码要求：</p>
        <ul className="space-y-1">
          {passwordRules.map((rule) => (
            <li key={rule.id} className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 rounded-full border border-gray-300"></div>
              <span>{rule.label}</span>
            </li>
          ))}
        </ul>
      </div>
    ) : null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 强度条 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">密码强度</span>
          {label && <span className={`text-sm font-semibold ${color}`}>{label}</span>}
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ease-out ${barColor}`}
            style={{ width: `${strength}%` }}
          ></div>
        </div>
      </div>

      {/* 规则列表 */}
      {showRules && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">密码要求：</p>
          <ul className="space-y-1">
            {passwordRules.map((rule) => {
              const passed = rule.test(password);
              return (
                <li
                  key={rule.id}
                  className={`flex items-center gap-2 text-sm transition-colors ${
                    passed ? 'text-green-600' : 'text-gray-500'
                  }`}
                >
                  {passed ? (
                    <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <XCircleIcon className="w-4 h-4 flex-shrink-0 text-gray-300" />
                  )}
                  <span>{rule.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 安全提示 */}
      {strength >= 100 && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-medium">密码强度很好！</p>
            <p className="text-xs mt-1">您的密码符合所有安全要求</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordStrength;
