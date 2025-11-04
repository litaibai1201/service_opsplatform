import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  HomeIcon,
  UserGroupIcon,
  FolderIcon,
  PresentationChartBarIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Squares2X2Icon,
  DocumentIcon,
  CircleStackIcon,
  MapIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/helpers';

interface SidebarProps {
  isOpen: boolean;
  isMobileOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavigationItem[];
}

const navigation: NavigationItem[] = [
  {
    name: '仪表板',
    href: '/dashboard',
    icon: HomeIcon,
  },
  {
    name: '团队管理',
    href: '/teams',
    icon: UserGroupIcon,
  },
  {
    name: '项目管理',
    href: '/projects',
    icon: FolderIcon,
  },
  {
    name: '设计工具',
    href: '/design-tools',
    icon: PresentationChartBarIcon,
    children: [
      {
        name: '架构设计',
        href: '/design-tools/architecture',
        icon: Squares2X2Icon,
      },
      {
        name: '流程图设计',
        href: '/design-tools/flow-diagram',
        icon: DocumentIcon,
      },
      {
        name: 'API 设计',
        href: '/design-tools/api-design',
        icon: DocumentIcon,
      },
      {
        name: '数据库设计',
        href: '/design-tools/database-design',
        icon: CircleStackIcon,
      },
      {
        name: '功能导图',
        href: '/design-tools/feature-map',
        icon: MapIcon,
      },
    ],
  },
];

const secondaryNavigation: NavigationItem[] = [
  {
    name: '系统设置',
    href: '/settings',
    icon: CogIcon,
  },
  {
    name: '帮助支持',
    href: '/help',
    icon: QuestionMarkCircleIcon,
  },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, isMobileOpen, onClose }) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isActiveLink = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const SidebarContent = ({ compact = false }: { compact?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo 区域 */}
      <div className={cn(
        'flex items-center flex-shrink-0 border-b border-gray-200',
        compact ? 'px-4 py-4 justify-center' : 'px-6 py-4'
      )}>
        <div className="flex items-center">
          <div className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center">
            <div className="w-4 h-4 rounded bg-white"></div>
          </div>
          {!compact && (
            <div className="ml-3">
              <span className="text-lg font-semibold text-gray-900">Service Ops</span>
              <div className="text-xs text-gray-500">Platform</div>
            </div>
          )}
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1">
          {navigation.map((item) => (
            <div key={item.name}>
              {item.children ? (
                // 有子菜单的项目
                <div>
                  <button
                    onClick={() => toggleExpanded(item.name)}
                    className={cn(
                      'w-full flex items-center text-left transition-colors',
                      compact ? 'px-4 py-2' : 'px-6 py-2',
                      isActiveLink(item.href)
                        ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <item.icon className={cn(
                      'flex-shrink-0',
                      compact ? 'h-5 w-5' : 'h-5 w-5 mr-3'
                    )} />
                    {!compact && (
                      <>
                        <span className="text-sm font-medium flex-1">{item.name}</span>
                        <ChevronRightIcon className={cn(
                          'h-4 w-4 transition-transform',
                          expandedItems.includes(item.name) && 'rotate-90'
                        )} />
                      </>
                    )}
                  </button>
                  
                  {(!compact && expandedItems.includes(item.name)) && (
                    <div className="space-y-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.name}
                          to={child.href}
                          className={({ isActive }) => cn(
                            'flex items-center pl-12 pr-6 py-2 text-sm transition-colors',
                            isActive
                              ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          )}
                        >
                          <child.icon className="h-4 w-4 mr-3" />
                          {child.name}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // 普通导航项目
                <NavLink
                  to={item.href}
                  className={({ isActive }) => cn(
                    'flex items-center transition-colors',
                    compact ? 'px-4 py-2' : 'px-6 py-2',
                    isActive
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <item.icon className={cn(
                    'flex-shrink-0',
                    compact ? 'h-5 w-5' : 'h-5 w-5 mr-3'
                  )} />
                  {!compact && (
                    <span className="text-sm font-medium">{item.name}</span>
                  )}
                  {!compact && item.badge && (
                    <span className="ml-auto bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              )}
            </div>
          ))}
        </div>

        {/* 分隔线 */}
        <div className={cn('my-4 border-t border-gray-200', compact ? 'mx-4' : 'mx-6')} />

        {/* 二级导航 */}
        <div className="space-y-1">
          {secondaryNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => cn(
                'flex items-center transition-colors',
                compact ? 'px-4 py-2' : 'px-6 py-2',
                isActive
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <item.icon className={cn(
                'flex-shrink-0',
                compact ? 'h-5 w-5' : 'h-5 w-5 mr-3'
              )} />
              {!compact && (
                <span className="text-sm font-medium">{item.name}</span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* 用户信息区域 */}
      <div className={cn(
        'flex-shrink-0 border-t border-gray-200',
        compact ? 'px-4 py-4' : 'px-6 py-4'
      )}>
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">U</span>
          </div>
          {!compact && (
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-700">用户名</p>
              <p className="text-xs text-gray-500">user@example.com</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 桌面端侧边栏 */}
      <div className={cn(
        'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:bg-white lg:border-r lg:border-gray-200 transition-all duration-300',
        isOpen ? 'lg:w-64' : 'lg:w-16'
      )}>
        <SidebarContent compact={!isOpen} />
      </div>

      {/* 移动端侧边栏 */}
      <Transition show={isMobileOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="-m-2.5 p-2.5"
                      onClick={onClose}
                    >
                      <XMarkIcon className="h-6 w-6 text-white" />
                    </button>
                  </div>
                </Transition.Child>
                
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white">
                  <SidebarContent />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default Sidebar;