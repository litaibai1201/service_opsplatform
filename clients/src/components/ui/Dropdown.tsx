import React from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/helpers';
import Button from './Button';

export interface DropdownItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  divided?: boolean;
  children?: DropdownItem[];
  onClick?: () => void;
}

interface DropdownProps {
  items: DropdownItem[];
  trigger?: 'hover' | 'click';
  placement?: 'bottom' | 'top' | 'left' | 'right';
  disabled?: boolean;
  className?: string;
  overlayClassName?: string;
  children?: React.ReactNode;
  // Button props when using default trigger
  buttonText?: string;
  buttonVariant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  buttonSize?: 'sm' | 'md' | 'lg';
  buttonIcon?: React.ReactNode;
  showArrow?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  items,
  trigger = 'click',
  placement = 'bottom',
  disabled = false,
  className,
  overlayClassName,
  children,
  buttonText,
  buttonVariant = 'outline',
  buttonSize = 'md',
  buttonIcon,
  showArrow = true,
}) => {
  const placementClasses = {
    bottom: 'top-full left-0 mt-1',
    top: 'bottom-full left-0 mb-1',
    left: 'right-full top-0 mr-1',
    right: 'left-full top-0 ml-1',
  };

  const renderItem = (item: DropdownItem, depth = 0) => {
    if (item.children) {
      // 子菜单项
      return (
        <Menu as="div" className="relative" key={item.key}>
          <Menu.Button className={cn(
            'group flex w-full items-center justify-between px-4 py-2 text-sm',
            {
              'text-gray-900 hover:bg-gray-100': !item.disabled,
              'text-gray-400 cursor-not-allowed': item.disabled,
            }
          )}>
            <div className="flex items-center">
              {item.icon && (
                <span className="mr-3 w-4 h-4">{item.icon}</span>
              )}
              {item.label}
            </div>
            <ChevronDownIcon className="ml-2 h-4 w-4 transform -rotate-90" />
          </Menu.Button>
          
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute left-full top-0 z-10 w-48 origin-top-left rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              {item.children.map(child => renderItem(child, depth + 1))}
            </Menu.Items>
          </Transition>
        </Menu>
      );
    }

    // 普通菜单项
    return (
      <React.Fragment key={item.key}>
        {item.divided && depth === 0 && (
          <div className="border-t border-gray-100 my-1" />
        )}
        <Menu.Item disabled={item.disabled}>
          {({ active }) => (
            <button
              className={cn(
                'group flex w-full items-center px-4 py-2 text-sm text-left',
                {
                  'bg-gray-100 text-gray-900': active && !item.disabled,
                  'text-gray-900': !active && !item.disabled && !item.danger,
                  'text-red-600': !item.disabled && item.danger,
                  'text-gray-400 cursor-not-allowed': item.disabled,
                }
              )}
              onClick={item.onClick}
            >
              {item.icon && (
                <span className="mr-3 w-4 h-4">{item.icon}</span>
              )}
              {item.label}
            </button>
          )}
        </Menu.Item>
      </React.Fragment>
    );
  };

  const renderTrigger = () => {
    if (children) {
      return children;
    }

    return (
      <Button
        variant={buttonVariant}
        size={buttonSize}
        disabled={disabled}
        icon={buttonIcon}
        iconPosition="left"
      >
        {buttonText}
        {showArrow && (
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        )}
      </Button>
    );
  };

  return (
    <Menu as="div" className={cn('relative inline-block text-left', className)}>
      <Menu.Button as="div" className="cursor-pointer">
        {renderTrigger()}
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className={cn(
          'absolute z-10 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
          placementClasses[placement],
          overlayClassName
        )}>
          {items.map(item => renderItem(item))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

// 下拉选择组件（选择型下拉菜单）
interface DropdownSelectProps {
  value?: string | string[];
  options: Array<{
    value: string;
    label: string;
    icon?: React.ReactNode;
    disabled?: boolean;
  }>;
  onChange?: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const DropdownSelect: React.FC<DropdownSelectProps> = ({
  value,
  options,
  onChange,
  multiple = false,
  placeholder = '请选择',
  disabled = false,
  className,
}) => {
  const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
  
  const handleOptionClick = (optionValue: string) => {
    if (multiple) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter(v => v !== optionValue)
        : [...selectedValues, optionValue];
      onChange?.(newValues);
    } else {
      onChange?.(optionValue);
    }
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    
    if (multiple) {
      return `已选择 ${selectedValues.length} 项`;
    }
    
    const selectedOption = options.find(opt => opt.value === selectedValues[0]);
    return selectedOption?.label || selectedValues[0];
  };

  const items: DropdownItem[] = options.map(option => ({
    key: option.value,
    label: option.label,
    icon: option.icon,
    disabled: option.disabled,
    onClick: () => handleOptionClick(option.value),
  }));

  return (
    <Dropdown
      items={items}
      disabled={disabled}
      className={className}
      overlayClassName="w-48"
    >
      <Button
        variant="outline"
        disabled={disabled}
        className="justify-between w-full"
      >
        <span className={cn(
          'truncate',
          { 'text-gray-500': selectedValues.length === 0 }
        )}>
          {getDisplayText()}
        </span>
        <ChevronDownIcon className="ml-2 h-4 w-4 flex-shrink-0" />
      </Button>
    </Dropdown>
  );
};

export default Dropdown;