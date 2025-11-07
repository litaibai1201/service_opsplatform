import React, { useState } from 'react';
import { cn } from '@/utils/helpers';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface TabItem {
  key: string;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  closable?: boolean;
  icon?: React.ReactNode;
}

interface TabsProps {
  items: TabItem[];
  activeKey?: string;
  defaultActiveKey?: string;
  onChange?: (key: string) => void;
  onTabClose?: (key: string) => void;
  type?: 'line' | 'card' | 'editable-card';
  size?: 'sm' | 'md' | 'lg';
  position?: 'top' | 'bottom' | 'left' | 'right';
  centered?: boolean;
  className?: string;
  tabBarClassName?: string;
  contentClassName?: string;
}

const Tabs: React.FC<TabsProps> = ({
  items,
  activeKey: controlledActiveKey,
  defaultActiveKey,
  onChange,
  onTabClose,
  type = 'line',
  size = 'md',
  position = 'top',
  centered = false,
  className,
  tabBarClassName,
  contentClassName,
}) => {
  const [internalActiveKey, setInternalActiveKey] = useState(
    controlledActiveKey || defaultActiveKey || items[0]?.key
  );

  const activeKey = controlledActiveKey || internalActiveKey;

  const handleTabClick = (key: string, disabled?: boolean) => {
    if (disabled) return;
    
    if (!controlledActiveKey) {
      setInternalActiveKey(key);
    }
    onChange?.(key);
  };

  const handleTabClose = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    onTabClose?.(key);
  };

  const sizeClasses = {
    sm: 'text-xs px-3 py-2',
    md: 'text-sm px-4 py-2.5',
    lg: 'text-base px-6 py-3',
  };

  const typeClasses = {
    line: {
      tabBar: 'border-b border-gray-200',
      tab: 'border-b-2 border-transparent hover:border-gray-300',
      activeTab: 'border-primary-500 text-primary-600',
      content: 'pt-4',
    },
    card: {
      tabBar: 'border-b border-gray-200',
      tab: 'border border-transparent bg-gray-50 rounded-t-lg mr-1 hover:bg-gray-100',
      activeTab: 'bg-white border-gray-200 border-b-white text-primary-600',
      content: 'border border-gray-200 border-t-0 rounded-b-lg p-4',
    },
    'editable-card': {
      tabBar: 'border-b border-gray-200',
      tab: 'border border-transparent bg-gray-50 rounded-t-lg mr-1 hover:bg-gray-100',
      activeTab: 'bg-white border-gray-200 border-b-white text-primary-600',
      content: 'border border-gray-200 border-t-0 rounded-b-lg p-4',
    },
  };

  const isVertical = position === 'left' || position === 'right';
  const isBottom = position === 'bottom';

  const getTabClasses = (item: TabItem, isActive: boolean) => {
    return cn(
      'inline-flex items-center cursor-pointer transition-colors whitespace-nowrap',
      sizeClasses[size],
      typeClasses[type].tab,
      {
        [typeClasses[type].activeTab]: isActive,
        'opacity-50 cursor-not-allowed': item.disabled,
        'text-gray-500 hover:text-gray-700': !isActive && !item.disabled,
      }
    );
  };

  const getTabBarClasses = () => {
    return cn(
      'flex',
      typeClasses[type].tabBar,
      {
        'flex-col': isVertical,
        'justify-center': centered && !isVertical,
        'border-t border-b-0': isBottom,
      },
      tabBarClassName
    );
  };

  const getContentClasses = () => {
    return cn(
      typeClasses[type].content,
      contentClassName
    );
  };

  const activeItem = items.find(item => item.key === activeKey);

  const renderTabBar = () => (
    <div className={getTabBarClasses()}>
      {items.map((item) => {
        const isActive = item.key === activeKey;
        
        return (
          <div
            key={item.key}
            className={getTabClasses(item, isActive)}
            onClick={() => handleTabClick(item.key, item.disabled)}
          >
            {item.icon && (
              <span className="mr-2 w-4 h-4">{item.icon}</span>
            )}
            <span>{item.label}</span>
            
            {(type === 'editable-card' || item.closable) && (
              <button
                type="button"
                onClick={(e) => handleTabClose(e, item.key)}
                className="ml-2 p-0.5 rounded hover:bg-gray-200 focus:outline-none"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderContent = () => (
    <div className={getContentClasses()}>
      {activeItem?.children}
    </div>
  );

  const layout = {
    top: (
      <>
        {renderTabBar()}
        {renderContent()}
      </>
    ),
    bottom: (
      <>
        {renderContent()}
        {renderTabBar()}
      </>
    ),
    left: (
      <div className="flex">
        <div className="flex-shrink-0">
          {renderTabBar()}
        </div>
        <div className="flex-1 ml-4">
          {renderContent()}
        </div>
      </div>
    ),
    right: (
      <div className="flex">
        <div className="flex-1 mr-4">
          {renderContent()}
        </div>
        <div className="flex-shrink-0">
          {renderTabBar()}
        </div>
      </div>
    ),
  };

  return (
    <div className={cn('w-full', className)}>
      {layout[position]}
    </div>
  );
};

// Tab Panel 组件（用于更灵活的用法）
interface TabPanelProps {
  children: React.ReactNode;
  value: string;
  activeValue: string;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  children,
  value,
  activeValue,
  className,
}) => {
  if (value !== activeValue) {
    return null;
  }

  return (
    <div className={className}>
      {children}
    </div>
  );
};

export default Tabs;