import React from 'react';
import { Button } from '@/components/ui';

export interface OAuthProvider {
  id: string;
  name: string;
  icon?: React.ReactNode;
  iconUrl?: string;
  color?: string;
  textColor?: string;
}

export interface OAuthButtonsProps {
  providers?: OAuthProvider[];
  onProviderClick: (providerId: string) => void;
  isLoading?: boolean;
  loadingProvider?: string;
  className?: string;
  showDivider?: boolean;
  dividerText?: string;
}

// 默认支持的OAuth提供商
const defaultProviders: OAuthProvider[] = [
  {
    id: 'google',
    name: 'Google',
    iconUrl: 'https://www.google.com/favicon.ico',
    color: '#fff',
    textColor: '#000',
  },
  {
    id: 'github',
    name: 'GitHub',
    color: '#24292e',
    textColor: '#fff',
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    color: '#00a4ef',
    textColor: '#fff',
  },
];

const OAuthButtons: React.FC<OAuthButtonsProps> = ({
  providers = defaultProviders,
  onProviderClick,
  isLoading = false,
  loadingProvider,
  className = '',
  showDivider = true,
  dividerText = '或使用第三方账号登录',
}) => {
  // GitHub图标SVG
  const GitHubIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );

  // Microsoft图标SVG
  const MicrosoftIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
    </svg>
  );

  // 获取提供商图标
  const getProviderIcon = (provider: OAuthProvider) => {
    if (provider.icon) {
      return provider.icon;
    }

    if (provider.iconUrl) {
      return <img src={provider.iconUrl} alt={provider.name} className="w-5 h-5" />;
    }

    // 默认图标
    switch (provider.id) {
      case 'github':
        return <GitHubIcon />;
      case 'microsoft':
        return <MicrosoftIcon />;
      default:
        return null;
    }
  };

  return (
    <div className={className}>
      {/* 分隔线 */}
      {showDivider && (
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">{dividerText}</span>
          </div>
        </div>
      )}

      {/* OAuth按钮 */}
      <div className="space-y-3">
        {providers.map((provider) => {
          const isProviderLoading = isLoading && loadingProvider === provider.id;

          return (
            <button
              key={provider.id}
              onClick={() => onProviderClick(provider.id)}
              disabled={isLoading}
              className={`
                w-full flex items-center justify-center gap-3 px-4 py-3
                border border-gray-300 rounded-lg
                font-medium transition-all duration-200
                hover:bg-gray-50 hover:border-gray-400
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isProviderLoading ? 'bg-gray-50' : ''}
              `}
              style={{
                backgroundColor: provider.color || '#fff',
                color: provider.textColor || '#000',
              }}
            >
              {isProviderLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                getProviderIcon(provider)
              )}
              <span>
                {isProviderLoading ? '连接中...' : `使用 ${provider.name} 登录`}
              </span>
            </button>
          );
        })}
      </div>

      {/* 隐私提示 */}
      <p className="mt-4 text-xs text-center text-gray-500">
        使用第三方账号登录即表示您同意我们的
        <a href="/terms" className="text-blue-600 hover:text-blue-700">
          服务条款
        </a>
        和
        <a href="/privacy" className="text-blue-600 hover:text-blue-700 ml-1">
          隐私政策
        </a>
      </p>
    </div>
  );
};

export default OAuthButtons;
