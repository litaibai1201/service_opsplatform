import React, { useState, useRef, useEffect } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  ChevronUpDownIcon, 
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/helpers';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  description?: string;
  avatar?: string;
  icon?: React.ReactNode;
}

interface SelectProps {
  value?: string | number | (string | number)[];
  options: SelectOption[];
  onChange: (value: string | number | (string | number)[]) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  success?: string;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'bordered' | 'filled';
  className?: string;
  optionClassName?: string;
  label?: string;
  required?: boolean;
  helpText?: string;
}

const Select: React.FC<SelectProps> = ({
  value,
  options,
  onChange,
  placeholder = '请选择...',
  disabled = false,
  error,
  success,
  multiple = false,
  searchable = false,
  clearable = false,
  loading = false,
  size = 'md',
  variant = 'default',
  className,
  optionClassName,
  label,
  required = false,
  helpText,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 筛选选项
  const filteredOptions = searchable && searchQuery
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        option.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // 获取选中的选项
  const selectedOptions = multiple
    ? options.filter(option => Array.isArray(value) && value.includes(option.value))
    : options.find(option => option.value === value);

  // 处理值变化
  const handleChange = (newValue: SelectOption | SelectOption[]) => {
    if (multiple && Array.isArray(newValue)) {
      onChange(newValue.map(option => option.value));
    } else if (!multiple && !Array.isArray(newValue)) {
      onChange(newValue.value);
    }
  };

  // 处理清除
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(multiple ? [] : '');
  };

  // 移除单个选中项（多选模式）
  const handleRemoveOption = (optionValue: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple && Array.isArray(value)) {
      const newValue = value.filter(v => v !== optionValue);
      onChange(newValue);
    }
  };

  // 搜索框聚焦
  useEffect(() => {
    if (searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchable]);

  const sizeClasses = {
    sm: 'text-sm py-1.5 px-3',
    md: 'text-sm py-2 px-3',
    lg: 'text-base py-2.5 px-4',
  };

  const variantClasses = {
    default: 'bg-white border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
    bordered: 'bg-transparent border-2 border-gray-300 focus:border-primary-500',
    filled: 'bg-gray-100 border border-transparent focus:bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
  };

  const getButtonClasses = () => {
    return cn(
      'relative w-full cursor-default rounded-md text-left transition-colors',
      sizeClasses[size],
      variantClasses[variant],
      {
        'border-red-300 focus:border-red-500 focus:ring-red-500': error,
        'border-green-300 focus:border-green-500 focus:ring-green-500': success && !error,
        'opacity-50 cursor-not-allowed': disabled,
      },
      className
    );
  };

  const renderDisplayValue = () => {
    if (multiple && Array.isArray(selectedOptions) && selectedOptions.length > 0) {
      return (
        <div className="flex flex-wrap gap-1">
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-100 text-primary-800 text-xs"
            >
              {option.icon && <span className="w-3 h-3">{option.icon}</span>}
              {option.label}
              <button
                type="button"
                onClick={(e) => handleRemoveOption(option.value, e)}
                className="hover:text-primary-600"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      );
    }

    if (!multiple && selectedOptions && !Array.isArray(selectedOptions)) {
      return (
        <span className="flex items-center gap-2">
          {selectedOptions.icon && <span className="w-4 h-4">{selectedOptions.icon}</span>}
          {selectedOptions.avatar && (
            <img src={selectedOptions.avatar} alt="" className="w-5 h-5 rounded-full" />
          )}
          {selectedOptions.label}
        </span>
      );
    }

    return <span className="text-gray-500">{placeholder}</span>;
  };

  const showClearButton = clearable && (
    (multiple && Array.isArray(value) && value.length > 0) ||
    (!multiple && value !== '' && value !== undefined)
  );

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <Listbox
        value={multiple ? selectedOptions : selectedOptions || null}
        onChange={handleChange}
        disabled={disabled || loading}
        multiple={multiple}
      >
        <div className="relative">
          <Listbox.Button className={getButtonClasses()}>
            <span className="block truncate pr-8">
              {renderDisplayValue()}
            </span>
            
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 space-x-1">
              {showClearButton && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="pointer-events-auto text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
              
              {loading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin" />
              ) : (
                <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
              )}
            </span>
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              {searchable && (
                <div className="sticky top-0 z-10 bg-white px-3 py-2 border-b border-gray-200">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="搜索选项..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              )}

              {filteredOptions.length === 0 ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700 text-center">
                  {searchQuery ? '未找到匹配的选项' : '暂无选项'}
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <Listbox.Option
                    key={option.value}
                    value={option}
                    disabled={option.disabled}
                    className={({ active, selected, disabled }) =>
                      cn(
                        'relative cursor-default select-none py-2 px-4',
                        {
                          'bg-primary-100 text-primary-900': active && !disabled,
                          'text-gray-900': !active && !disabled,
                          'opacity-50 cursor-not-allowed': disabled,
                        },
                        optionClassName
                      )
                    }
                  >
                    {({ selected }) => (
                      <>
                        <div className="flex items-center space-x-3">
                          {option.avatar && (
                            <img
                              src={option.avatar}
                              alt=""
                              className="w-6 h-6 rounded-full flex-shrink-0"
                            />
                          )}
                          {option.icon && (
                            <span className="w-5 h-5 flex-shrink-0">{option.icon}</span>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <span
                              className={cn(
                                'block truncate',
                                selected ? 'font-medium' : 'font-normal'
                              )}
                            >
                              {option.label}
                            </span>
                            {option.description && (
                              <span className="block text-xs text-gray-500 truncate">
                                {option.description}
                              </span>
                            )}
                          </div>
                        </div>

                        {selected && (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-primary-600">
                            <CheckIcon className="h-4 w-4" />
                          </span>
                        )}
                      </>
                    )}
                  </Listbox.Option>
                ))
              )}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>

      {/* 帮助文本和错误信息 */}
      {(helpText || error || success) && (
        <div className="space-y-1">
          {helpText && !error && !success && (
            <p className="text-xs text-gray-500">{helpText}</p>
          )}
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

export default Select;