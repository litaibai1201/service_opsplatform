import React from 'react';
import { cn } from '@/utils/helpers';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'gray';
  variant?: 'circle' | 'dots' | 'pulse' | 'spin' | 'ping';
  className?: string;
  label?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'primary',
  variant = 'circle',
  className,
  label,
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const colorClasses = {
    primary: 'text-primary-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    info: 'text-blue-600',
    gray: 'text-gray-400',
  };

  const renderCircleSpinner = () => (
    <svg
      className={cn(
        'animate-spin',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label={label || '加载中'}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const renderDotsSpinner = () => {
    const dotSize = {
      xs: 'w-1 h-1',
      sm: 'w-1.5 h-1.5',
      md: 'w-2 h-2',
      lg: 'w-2.5 h-2.5',
      xl: 'w-3 h-3',
    };

    return (
      <div className={cn('flex space-x-1', className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'rounded-full animate-pulse',
              dotSize[size],
              `bg-${color}-600`,
              colorClasses[color].replace('text-', 'bg-')
            )}
            style={{
              animationDelay: `${i * 0.15}s`,
              animationDuration: '0.8s',
            }}
          />
        ))}
      </div>
    );
  };

  const renderPulseSpinner = () => (
    <div
      className={cn(
        'rounded-full animate-pulse',
        sizeClasses[size],
        `bg-${color}-600`,
        colorClasses[color].replace('text-', 'bg-'),
        className
      )}
    />
  );

  const renderSpinSpinner = () => (
    <div
      className={cn(
        'border-4 border-gray-200 border-t-transparent rounded-full animate-spin',
        sizeClasses[size],
        `border-t-${color}-600`,
        className
      )}
      style={{
        borderTopColor: colorClasses[color].includes('primary') ? '#2563eb' :
                       colorClasses[color].includes('success') ? '#16a34a' :
                       colorClasses[color].includes('warning') ? '#ca8a04' :
                       colorClasses[color].includes('error') ? '#dc2626' :
                       colorClasses[color].includes('info') ? '#2563eb' :
                       '#6b7280'
      }}
    />
  );

  const renderPingSpinner = () => (
    <div className={cn('relative', sizeClasses[size], className)}>
      <div
        className={cn(
          'absolute inset-0 rounded-full animate-ping',
          `bg-${color}-400`,
          colorClasses[color].replace('text-', 'bg-').replace('600', '400')
        )}
      />
      <div
        className={cn(
          'relative rounded-full',
          sizeClasses[size],
          `bg-${color}-600`,
          colorClasses[color].replace('text-', 'bg-')
        )}
      />
    </div>
  );

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return renderDotsSpinner();
      case 'pulse':
        return renderPulseSpinner();
      case 'spin':
        return renderSpinSpinner();
      case 'ping':
        return renderPingSpinner();
      case 'circle':
      default:
        return renderCircleSpinner();
    }
  };

  if (label) {
    return (
      <div className="flex items-center space-x-2">
        {renderSpinner()}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
    );
  }

  return renderSpinner();
};

export default Spinner;