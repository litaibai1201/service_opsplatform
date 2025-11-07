import React from 'react';
import { cn } from '@/utils/helpers';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  clickable?: boolean;
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  hoverable = false,
  clickable = false,
  className,
  onClick,
}) => {
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const variantClasses = {
    default: 'bg-white border border-gray-200',
    outlined: 'bg-white border-2 border-gray-300',
    elevated: 'bg-white shadow-lg border border-gray-100',
    filled: 'bg-gray-50 border border-gray-200',
  };

  const getCardClasses = () => {
    return cn(
      'rounded-lg transition-all duration-200',
      sizeClasses[size],
      variantClasses[variant],
      {
        'hover:shadow-md': hoverable,
        'cursor-pointer': clickable || onClick,
        'hover:shadow-lg transform hover:-translate-y-0.5': clickable,
      },
      className
    );
  };

  return (
    <div className={getCardClasses()} onClick={onClick}>
      {children}
    </div>
  );
};

// Card Header 组件
interface CardHeaderProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  children,
  className,
}) => {
  return (
    <div className={cn('flex items-start justify-between mb-4', className)}>
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
        {children}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
};

// Card Body 组件
interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className }) => {
  return <div className={cn('text-gray-700', className)}>{children}</div>;
};

// Card Footer 组件
interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  bordered?: boolean;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className,
  bordered = false,
}) => {
  return (
    <div
      className={cn(
        'mt-4 pt-4',
        {
          'border-t border-gray-200': bordered,
        },
        className
      )}
    >
      {children}
    </div>
  );
};

export default Card;