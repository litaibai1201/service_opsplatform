import React from 'react';
import { cn } from '@/utils/helpers';

interface RadioProps {
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

const Radio: React.FC<RadioProps> = ({
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

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  const colorClasses = {
    primary: {
      checked: 'border-primary-600 bg-white',
      unchecked: 'border-gray-300 bg-white',
      hover: 'hover:border-primary-500',
      focus: 'focus:ring-primary-500',
      dot: 'bg-primary-600',
    },
    secondary: {
      checked: 'border-gray-600 bg-white',
      unchecked: 'border-gray-300 bg-white',
      hover: 'hover:border-gray-500',
      focus: 'focus:ring-gray-500',
      dot: 'bg-gray-600',
    },
    success: {
      checked: 'border-green-600 bg-white',
      unchecked: 'border-gray-300 bg-white',
      hover: 'hover:border-green-500',
      focus: 'focus:ring-green-500',
      dot: 'bg-green-600',
    },
    warning: {
      checked: 'border-yellow-600 bg-white',
      unchecked: 'border-gray-300 bg-white',
      hover: 'hover:border-yellow-500',
      focus: 'focus:ring-yellow-500',
      dot: 'bg-yellow-600',
    },
    error: {
      checked: 'border-red-600 bg-white',
      unchecked: 'border-gray-300 bg-white',
      hover: 'hover:border-red-500',
      focus: 'focus:ring-red-500',
      dot: 'bg-red-600',
    },
  };

  const getRadioClasses = () => {
    const baseClasses = [
      'rounded-full border-2 transition-colors cursor-pointer flex items-center justify-center',
      sizeClasses[size],
    ];

    if (disabled) {
      baseClasses.push('opacity-50 cursor-not-allowed');
    } else {
      if (checked) {
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

  const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-1">
      <div className="flex items-start space-x-3">
        <div className="relative flex items-center justify-center">
          <input
            type="radio"
            id={radioId}
            name={name}
            value={value}
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            required={required}
            className="sr-only"
          />
          
          <label
            htmlFor={radioId}
            className={getRadioClasses()}
          >
            {checked && (
              <div className={cn(
                'rounded-full transition-all',
                dotSizeClasses[size],
                colorClasses[color].dot
              )} />
            )}
          </label>

          {/* Focus ring */}
          {!disabled && (
            <div
              className={cn(
                'absolute inset-0 rounded-full pointer-events-none opacity-0 transition-opacity',
                'ring-2 ring-offset-2',
                colorClasses[color].focus.replace('focus:', ''),
                {
                  'opacity-100': checked,
                }
              )}
            />
          )}
        </div>

        {(label || description) && (
          <div className="flex-1 min-w-0">
            {label && (
              <label
                htmlFor={radioId}
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

// 单选框组
interface RadioGroupProps {
  value?: string | number;
  onChange?: (value: string | number) => void;
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
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  direction?: 'horizontal' | 'vertical';
  className?: string;
  label?: string;
  required?: boolean;
  name?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onChange,
  options,
  disabled = false,
  error,
  success,
  size = 'md',
  color = 'primary',
  direction = 'vertical',
  className,
  label,
  required = false,
  name,
}) => {
  const handleOptionChange = (optionValue: string | number) => {
    if (onChange && !disabled) {
      onChange(optionValue);
    }
  };

  const groupName = name || `radio-group-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className={cn(
        'space-y-2',
        {
          'flex flex-wrap gap-4': direction === 'horizontal',
        },
        className
      )}>
        {options.map((option) => (
          <Radio
            key={option.value}
            checked={value === option.value}
            onChange={() => handleOptionChange(option.value)}
            disabled={disabled || option.disabled}
            label={option.label}
            description={option.description}
            size={size}
            color={color}
            error={error}
            success={success}
            name={groupName}
            value={option.value.toString()}
          />
        ))}
      </div>
    </div>
  );
};

// 单选框卡片组件
interface RadioCardProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
  id?: string;
}

export const RadioCard: React.FC<RadioCardProps> = ({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  color = 'primary',
  title,
  description,
  icon,
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
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const colorClasses = {
    primary: {
      checked: 'border-primary-500 bg-primary-50',
      unchecked: 'border-gray-200 bg-white hover:border-gray-300',
    },
    secondary: {
      checked: 'border-gray-500 bg-gray-50',
      unchecked: 'border-gray-200 bg-white hover:border-gray-300',
    },
    success: {
      checked: 'border-green-500 bg-green-50',
      unchecked: 'border-gray-200 bg-white hover:border-gray-300',
    },
    warning: {
      checked: 'border-yellow-500 bg-yellow-50',
      unchecked: 'border-gray-200 bg-white hover:border-gray-300',
    },
    error: {
      checked: 'border-red-500 bg-red-50',
      unchecked: 'border-gray-200 bg-white hover:border-gray-300',
    },
  };

  const getCardClasses = () => {
    const baseClasses = [
      'relative border-2 rounded-lg cursor-pointer transition-all',
      sizeClasses[size],
    ];

    if (disabled) {
      baseClasses.push('opacity-50 cursor-not-allowed');
    } else {
      if (checked) {
        baseClasses.push(colorClasses[color].checked);
      } else {
        baseClasses.push(colorClasses[color].unchecked);
      }
    }

    return cn(baseClasses, className);
  };

  const cardId = id || `radio-card-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={getCardClasses()}>
      <input
        type="radio"
        id={cardId}
        name={name}
        value={value}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
      />
      
      <label htmlFor={cardId} className="cursor-pointer">
        <div className="flex items-start space-x-3">
          {icon && (
            <div className="flex-shrink-0 w-6 h-6 text-current">
              {icon}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900">
              {title}
            </h3>
            
            {description && (
              <p className="text-xs text-gray-500 mt-1">
                {description}
              </p>
            )}
          </div>
          
          {/* Radio indicator */}
          <div className="flex-shrink-0">
            <div className={cn(
              'w-4 h-4 rounded-full border-2 flex items-center justify-center',
              checked 
                ? `border-${color}-600 bg-white`
                : 'border-gray-300 bg-white'
            )}>
              {checked && (
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  `bg-${color}-600`
                )} />
              )}
            </div>
          </div>
        </div>
      </label>
    </div>
  );
};

export default Radio;