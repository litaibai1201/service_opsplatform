import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/helpers';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outlined';
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  autoResize?: boolean;
  showCount?: boolean;
  maxLength?: number;
  icon?: React.ReactNode;
  className?: string;
  required?: boolean;
}

const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  success,
  helperText,
  size = 'md',
  variant = 'default',
  resize = 'vertical',
  autoResize = false,
  showCount = false,
  maxLength,
  icon,
  className,
  required = false,
  value,
  onChange,
  onFocus,
  onBlur,
  disabled,
  placeholder,
  rows = 3,
  id,
  name,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const [currentValue, setCurrentValue] = useState(value || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整高度
  useEffect(() => {
    if (autoResize && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [currentValue, autoResize]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // 检查最大长度限制
    if (maxLength && newValue.length > maxLength) {
      return;
    }
    
    setCurrentValue(newValue);
    if (onChange) {
      onChange(e);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setFocused(true);
    if (onFocus) {
      onFocus(e);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setFocused(false);
    if (onBlur) {
      onBlur(e);
    }
  };

  // 同步外部 value 变化
  useEffect(() => {
    setCurrentValue(value || '');
  }, [value]);

  const sizeClasses = {
    sm: 'text-xs py-2 px-3 min-h-[2rem]',
    md: 'text-sm py-2.5 px-3 min-h-[2.5rem]',
    lg: 'text-base py-3 px-4 min-h-[3rem]',
  };

  const variantClasses = {
    default: cn(
      'bg-white border border-gray-300',
      'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
      error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
      success && !error && 'border-green-300 focus:border-green-500 focus:ring-green-500'
    ),
    filled: cn(
      'bg-gray-50 border border-transparent',
      'focus:bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
      error && 'bg-red-50 focus:border-red-500 focus:ring-red-500',
      success && !error && 'bg-green-50 focus:border-green-500 focus:ring-green-500'
    ),
    outlined: cn(
      'bg-transparent border-2 border-gray-300',
      'focus:border-primary-500',
      error && 'border-red-300 focus:border-red-500',
      success && !error && 'border-green-300 focus:border-green-500'
    ),
  };

  const resizeClasses = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize',
  };

  const getTextareaClasses = () => {
    return cn(
      'block w-full rounded-md transition-colors',
      'placeholder:text-gray-400 text-gray-900',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100',
      sizeClasses[size],
      variantClasses[variant],
      resizeClasses[resize],
      {
        'pr-10': icon,
      },
      className
    );
  };

  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  const characterCount = (currentValue as string).length;
  const isOverLimit = maxLength ? characterCount > maxLength : false;

  return (
    <div className="space-y-1">
      {/* Label */}
      {label && (
        <label
          htmlFor={textareaId}
          className={cn(
            'block text-sm font-medium',
            {
              'text-gray-700': !error && !success,
              'text-red-700': error,
              'text-green-700': success && !error,
            }
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Textarea Container */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          id={textareaId}
          name={name}
          value={currentValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          rows={autoResize ? 1 : rows}
          maxLength={maxLength}
          className={getTextareaClasses()}
          style={{
            resize: autoResize ? 'none' : undefined,
          }}
          {...props}
        />

        {/* Icon */}
        {icon && (
          <div className="absolute top-3 right-3 pointer-events-none">
            <div className="w-5 h-5 text-gray-400">
              {icon}
            </div>
          </div>
        )}

        {/* Status Icon */}
        {(error || success) && (
          <div className="absolute top-3 right-3 pointer-events-none">
            {error ? (
              <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
            ) : success ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            ) : null}
          </div>
        )}
      </div>

      {/* Footer: Character count and helper text */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex-1">
          {/* Helper text, error, or success message */}
          {error ? (
            <p className="text-red-600">{error}</p>
          ) : success ? (
            <p className="text-green-600">{success}</p>
          ) : helperText ? (
            <p className="text-gray-500">{helperText}</p>
          ) : null}
        </div>

        {/* Character count */}
        {showCount && (
          <div className={cn(
            'ml-2 flex-shrink-0',
            {
              'text-gray-500': !isOverLimit && !error,
              'text-red-600': isOverLimit || error,
              'text-green-600': success && !error && !isOverLimit,
            }
          )}>
            {maxLength ? (
              <span>
                {characterCount}/{maxLength}
              </span>
            ) : (
              <span>{characterCount}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 带工具栏的富文本编辑器（简化版）
interface RichTextareaProps extends Omit<TextareaProps, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  showToolbar?: boolean;
  toolbarActions?: Array<{
    label: string;
    action: (currentValue: string, selectionStart: number, selectionEnd: number) => string;
    icon?: React.ReactNode;
    shortcut?: string;
  }>;
}

export const RichTextarea: React.FC<RichTextareaProps> = ({
  value,
  onChange,
  showToolbar = true,
  toolbarActions = [],
  ...textareaProps
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const defaultActions = [
    {
      label: '粗体',
      action: (text: string, start: number, end: number) => {
        const selectedText = text.slice(start, end) || '粗体文本';
        return text.slice(0, start) + `**${selectedText}**` + text.slice(end);
      },
      shortcut: 'Ctrl+B',
    },
    {
      label: '斜体',
      action: (text: string, start: number, end: number) => {
        const selectedText = text.slice(start, end) || '斜体文本';
        return text.slice(0, start) + `*${selectedText}*` + text.slice(end);
      },
      shortcut: 'Ctrl+I',
    },
    {
      label: '链接',
      action: (text: string, start: number, end: number) => {
        const selectedText = text.slice(start, end) || '链接文本';
        return text.slice(0, start) + `[${selectedText}](url)` + text.slice(end);
      },
      shortcut: 'Ctrl+K',
    },
    {
      label: '代码',
      action: (text: string, start: number, end: number) => {
        const selectedText = text.slice(start, end) || '代码';
        return text.slice(0, start) + `\`${selectedText}\`` + text.slice(end);
      },
      shortcut: 'Ctrl+`',
    },
  ];

  const actions = toolbarActions.length > 0 ? toolbarActions : defaultActions;

  const handleAction = (action: typeof actions[0]) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const newValue = action.action(value, start, end);
    onChange(newValue);

    // 保持焦点
    setTimeout(() => {
      textarea.focus();
    }, 0);
  };

  return (
    <div className="space-y-2">
      {showToolbar && (
        <div className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md bg-gray-50">
          {actions.map((action, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleAction(action)}
              className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-primary-500"
              title={`${action.label} (${action.shortcut})`}
            >
              {action.icon || action.label}
            </button>
          ))}
        </div>
      )}

      <Textarea
        {...textareaProps}
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default Textarea;