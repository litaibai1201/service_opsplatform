import React from 'react';
import { CheckIcon, MinusIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/helpers';

interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
  success?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'rounded' | 'square';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  label?: string;
  description?: string;
  required?: boolean;
  className?: string;
  name?: string;
  value?: string;
  id?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  checked = false,
  indeterminate = false,
  onChange,
  disabled = false,
  error,
  success,
  size = 'md',
  variant = 'default',
  color = 'primary',
  label,
  description,
  required = false,
  className,
  name,
  value,
  id,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange && !disabled) {
      onChange(e.target.checked);
    }
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const colorClasses = {
    primary: {
      checked: 'bg-primary-600 border-primary-600',
      unchecked: 'border-gray-300 bg-white',
      hover: 'hover:border-primary-500',
      focus: 'focus:ring-primary-500',
    },
    secondary: {
      checked: 'bg-gray-600 border-gray-600',
      unchecked: 'border-gray-300 bg-white',
      hover: 'hover:border-gray-500',
      focus: 'focus:ring-gray-500',
    },
    success: {
      checked: 'bg-green-600 border-green-600',
      unchecked: 'border-gray-300 bg-white',
      hover: 'hover:border-green-500',
      focus: 'focus:ring-green-500',
    },
    warning: {
      checked: 'bg-yellow-600 border-yellow-600',
      unchecked: 'border-gray-300 bg-white',
      hover: 'hover:border-yellow-500',
      focus: 'focus:ring-yellow-500',
    },
    error: {
      checked: 'bg-red-600 border-red-600',
      unchecked: 'border-gray-300 bg-white',
      hover: 'hover:border-red-500',
      focus: 'focus:ring-red-500',
    },
  };

  const variantClasses = {
    default: 'rounded',
    rounded: 'rounded-full',
    square: 'rounded-none',
  };

  const getCheckboxClasses = () => {
    const baseClasses = [
      'border-2 transition-colors cursor-pointer',
      sizeClasses[size],
      variantClasses[variant],
    ];

    if (disabled) {
      baseClasses.push('opacity-50 cursor-not-allowed');
    } else {
      if (checked || indeterminate) {
        baseClasses.push(colorClasses[color].checked);
      } else {
        baseClasses.push(
          colorClasses[color].unchecked,
          colorClasses[color].hover
        );
      }
    }

    if (error) {
      baseClasses.push('border-red-500');
    } else if (success && !error) {
      baseClasses.push('border-green-500');
    }

    return cn(baseClasses, className);
  };

  const getLabelClasses = () => {
    return cn(
      'text-sm font-medium cursor-pointer',
      {
        'text-gray-900': !disabled && !error,
        'text-gray-500': disabled,
        'text-red-700': error,
        'text-green-700': success && !error,
      }
    );
  };

  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-1">
      <div className="flex items-start space-x-3">
        <div className="relative flex items-center justify-center">
          <input
            type="checkbox"
            id={checkboxId}
            name={name}
            value={value}
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            required={required}
            className="sr-only"
            ref={(input) => {
              if (input) {
                input.indeterminate = indeterminate;
              }
            }}
          />
          
          <label
            htmlFor={checkboxId}
            className={getCheckboxClasses()}
          >
            {(checked || indeterminate) && (
              <div className="flex items-center justify-center w-full h-full">
                {indeterminate ? (
                  <MinusIcon className={cn('text-white', iconSizeClasses[size])} />
                ) : (
                  <CheckIcon className={cn('text-white', iconSizeClasses[size])} />
                )}
              </div>
            )}
          </label>

          {/* Focus ring */}
          {!disabled && (
            <div
              className={cn(
                'absolute inset-0 rounded pointer-events-none opacity-0 transition-opacity',
                'ring-2 ring-offset-2',
                colorClasses[color].focus.replace('focus:', ''),
                {
                  'opacity-100': checked || indeterminate,
                }
              )}
            />
          )}
        </div>

        {(label || description) && (
          <div className="flex-1 min-w-0">
            {label && (
              <label
                htmlFor={checkboxId}
                className={getLabelClasses()}
              >
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            
            {description && (
              <p className={cn(
                'text-xs mt-1',
                {
                  'text-gray-500': !error && !success,
                  'text-red-600': error,
                  'text-green-600': success && !error,
                }
              )}>
                {description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Error and success messages */}
      {(error || success) && (
        <div className="ml-8">
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          {success && !error && (
            <p className="text-xs text-green-600">{success}</p>
          )}
        </div>
      )}
    </div>
  );
};

// 复选框组
interface CheckboxGroupProps {
  value?: (string | number)[];
  onChange?: (value: (string | number)[]) => void;
  options: Array<{
    value: string | number;
    label: string;
    description?: string;
    disabled?: boolean;
  }>;
  disabled?: boolean;
  error?: string;
  success?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'rounded' | 'square';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  direction?: 'horizontal' | 'vertical';
  className?: string;
  label?: string;
  required?: boolean;
  name?: string;
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  value = [],
  onChange,
  options,
  disabled = false,
  error,
  success,
  size = 'md',
  variant = 'default',
  color = 'primary',
  direction = 'vertical',
  className,
  label,
  required = false,
  name,
}) => {
  const handleOptionChange = (optionValue: string | number, checked: boolean) => {
    if (!onChange) return;

    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter(v => v !== optionValue));
    }
  };

  const isIndeterminate = value.length > 0 && value.length < options.filter(opt => !opt.disabled).length;
  const isAllChecked = options.filter(opt => !opt.disabled).every(opt => value.includes(opt.value));

  const handleSelectAll = (checked: boolean) => {
    if (!onChange) return;

    if (checked) {
      const allValues = options.filter(opt => !opt.disabled).map(opt => opt.value);
      onChange(allValues);
    } else {
      onChange([]);
    }
  };

  return (
    <div className="space-y-3">
      {label && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {options.length > 1 && (
              <Checkbox
                checked={isAllChecked}
                indeterminate={isIndeterminate}
                onChange={handleSelectAll}
                disabled={disabled}
                size="sm"
                label="全选"
                color={color}
              />
            )}
          </div>
        </div>
      )}

      <div className={cn(
        'space-y-2',
        {
          'flex flex-wrap gap-4': direction === 'horizontal',
        },
        className
      )}>
        {options.map((option) => (
          <Checkbox
            key={option.value}
            checked={value.includes(option.value)}
            onChange={(checked) => handleOptionChange(option.value, checked)}
            disabled={disabled || option.disabled}
            label={option.label}
            description={option.description}
            size={size}
            variant={variant}
            color={color}
            error={error}
            success={success}
            name={name}
            value={option.value.toString()}
          />
        ))}
      </div>
    </div>
  );
};

export default Checkbox;