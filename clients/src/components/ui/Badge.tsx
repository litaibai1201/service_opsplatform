import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/helpers';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  shape?: 'rounded' | 'square' | 'pill';
  dot?: boolean;
  outline?: boolean;
  closable?: boolean;
  onClose?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  shape = 'rounded',
  dot = false,
  outline = false,
  closable = false,
  onClose,
  icon,
  className,
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1',
  };

  const shapeClasses = {
    rounded: 'rounded-md',
    square: 'rounded-none',
    pill: 'rounded-full',
  };

  const variantClasses = {
    default: outline
      ? 'bg-white text-gray-700 border border-gray-300'
      : 'bg-gray-100 text-gray-800',
    secondary: outline
      ? 'bg-white text-gray-600 border border-gray-400'
      : 'bg-gray-200 text-gray-700',
    success: outline
      ? 'bg-white text-green-700 border border-green-300'
      : 'bg-green-100 text-green-800',
    warning: outline
      ? 'bg-white text-yellow-700 border border-yellow-300'
      : 'bg-yellow-100 text-yellow-800',
    error: outline
      ? 'bg-white text-red-700 border border-red-300'
      : 'bg-red-100 text-red-800',
    info: outline
      ? 'bg-white text-blue-700 border border-blue-300'
      : 'bg-blue-100 text-blue-800',
  };

  const dotColors = {
    default: 'bg-gray-400',
    secondary: 'bg-gray-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  const getBadgeClasses = () => {
    return cn(
      'inline-flex items-center font-medium',
      sizeClasses[size],
      shapeClasses[shape],
      variantClasses[variant],
      className
    );
  };

  if (dot) {
    return (
      <span className="inline-flex items-center">
        <span className={cn('w-2 h-2 rounded-full mr-2', dotColors[variant])} />
        {children}
      </span>
    );
  }

  return (
    <span className={getBadgeClasses()}>
      {icon && <span className="mr-1 w-3 h-3">{icon}</span>}
      {children}
      {closable && (
        <button
          type="button"
          onClick={onClose}
          className="ml-1 inline-flex items-center justify-center w-4 h-4 text-current hover:bg-black hover:bg-opacity-20 rounded-full focus:outline-none"
        >
          <XMarkIcon className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};

export default Badge;