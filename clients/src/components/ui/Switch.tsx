import React from 'react';
import { cn } from '@/utils/helpers';

export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
  success?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  label?: string;
  description?: string;
  required?: boolean;
  className?: string;
  name?: string;
  value?: string;
  id?: string;
}

const Switch: React.FC<SwitchProps> = ({
  checked = false,
  onChange,
  disabled = false,
  error,
  success,
  size = 'md',
  color = 'primary',
  label,
  description,
  required = false,
  className,
  name,
  value,
  id,
}) => {
  const handleChange = () => {
    if (onChange && !disabled) {
      onChange(!checked);
    }
  };

  const sizeClasses = {
    sm: {
      switch: 'w-8 h-4',
      toggle: 'w-3 h-3',
      translate: checked ? 'translate-x-4' : 'translate-x-0',
    },
    md: {
      switch: 'w-11 h-6',
      toggle: 'w-5 h-5',
      translate: checked ? 'translate-x-5' : 'translate-x-0',
    },
    lg: {
      switch: 'w-14 h-7',
      toggle: 'w-6 h-6',
      translate: checked ? 'translate-x-7' : 'translate-x-0',
    },
  };

  const colorClasses = {
    primary: checked ? 'bg-primary-600' : 'bg-gray-200',
    secondary: checked ? 'bg-gray-600' : 'bg-gray-200',
    success: checked ? 'bg-green-600' : 'bg-gray-200',
    warning: checked ? 'bg-yellow-600' : 'bg-gray-200',
    error: checked ? 'bg-red-600' : 'bg-gray-200',
  };

  const getSwitchClasses = () => {
    return cn(
      'relative inline-flex flex-shrink-0 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200',
      sizeClasses[size].switch,
      colorClasses[color],
      disabled && 'opacity-50 cursor-not-allowed',
      error && 'ring-2 ring-red-500 ring-offset-2',
      success && 'ring-2 ring-green-500 ring-offset-2',
      !disabled && 'focus:outline-none focus:ring-2 focus:ring-offset-2',
      !disabled && color === 'primary' && 'focus:ring-primary-500',
      !disabled && color === 'secondary' && 'focus:ring-gray-500',
      !disabled && color === 'success' && 'focus:ring-green-500',
      !disabled && color === 'warning' && 'focus:ring-yellow-500',
      !disabled && color === 'error' && 'focus:ring-red-500'
    );
  };

  const getToggleClasses = () => {
    return cn(
      'pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200',
      sizeClasses[size].toggle,
      sizeClasses[size].translate
    );
  };

  const switchElement = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-required={required}
      className={getSwitchClasses()}
      onClick={handleChange}
      disabled={disabled}
      id={id}
      name={name}
      value={value}
    >
      <span className={getToggleClasses()} />
    </button>
  );

  if (!label && !description) {
    return <div className={className}>{switchElement}</div>;
  }

  return (
    <div className={cn('flex items-start', className)}>
      <div className="flex items-center h-6">
        {switchElement}
      </div>
      {(label || description) && (
        <div className="ml-3 text-sm">
          {label && (
            <label
              htmlFor={id}
              className={cn(
                'font-medium',
                disabled ? 'text-gray-400' : 'text-gray-700',
                !disabled && 'cursor-pointer'
              )}
            >
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          {description && (
            <p className="text-gray-500 text-xs mt-1">{description}</p>
          )}
          {error && (
            <p className="text-red-500 text-xs mt-1">{error}</p>
          )}
          {success && (
            <p className="text-green-500 text-xs mt-1">{success}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Switch;
