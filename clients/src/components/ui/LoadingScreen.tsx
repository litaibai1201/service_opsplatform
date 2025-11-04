import React from 'react';
import { cn } from '@/utils/helpers';

interface LoadingScreenProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  overlay?: boolean;
  className?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = '加载中...',
  size = 'md',
  overlay = true,
  className,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const containerClasses = overlay
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm'
    : 'flex items-center justify-center py-12';

  return (
    <div className={cn(containerClasses, className)}>
      <div className="flex flex-col items-center space-y-4">
        {/* 加载动画 */}
        <div className="relative">
          <div className={cn(
            'animate-spin rounded-full border-4 border-gray-200',
            sizeClasses[size]
          )}>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-600 animate-spin"></div>
          </div>
        </div>

        {/* 加载消息 */}
        {message && (
          <p className="text-sm text-gray-600 font-medium">
            {message}
          </p>
        )}

        {/* Service Ops Platform 标识 */}
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <div className="w-4 h-4 rounded bg-primary-100 flex items-center justify-center">
            <div className="w-2 h-2 rounded bg-primary-600"></div>
          </div>
          <span>Service Ops Platform</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;