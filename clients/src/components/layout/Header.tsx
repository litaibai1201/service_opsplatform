import React, { useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  Bars3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/helpers';
import { useAppSelector, useAppDispatch } from '@/store';
import { setTheme } from '@/store/slices/uiSlice';

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleMobileMenu: () => void;
  isSidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  onToggleSidebar, 
  onToggleMobileMenu, 
  isSidebarOpen 
}) => {
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector(state => state.ui);
  const { user } = useAppSelector(state => state.auth);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications] = useState([
    { id: 1, title: '新项目邀请', message: '您被邀请加入项目 "API Gateway 设计"', time: '5分钟前', unread: true },
    { id: 2, title: '设计评审', message: '数据库设计评审已完成', time: '1小时前', unread: true },
    { id: 3, title: '系统通知', message: '系统将在今晚23:00进行维护', time: '2小时前', unread: false },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('搜索:', searchQuery);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    dispatch(setTheme({ mode: newTheme }));
  };

  const handleLogout = () => {
    console.log('退出登录');
  };

  const themeIcons = {
    light: SunIcon,
    dark: MoonIcon,
    system: ComputerDesktopIcon,
  };

  const ThemeIcon = themeIcons[theme.mode];

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* 左侧：菜单控制和搜索 */}
        <div className="flex items-center space-x-4">
          {/* 移动端菜单按钮 */}
          <button
            type="button"
            className="lg:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={onToggleMobileMenu}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* 桌面端侧边栏折叠按钮 */}
          <button
            type="button"
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            onClick={onToggleSidebar}
          >
            {isSidebarOpen ? (
              <ChevronLeftIcon className="h-5 w-5" />
            ) : (
              <ChevronRightIcon className="h-5 w-5" />
            )}
          </button>

          {/* 搜索框 */}
          <form onSubmit={handleSearch} className="hidden sm:block">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="search"
                placeholder="搜索项目、团队、设计图..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                style={{ width: '300px' }}
              />
            </div>
          </form>
        </div>

        {/* 右侧：通知、主题切换、用户菜单 */}
        <div className="flex items-center space-x-4">
          {/* 移动端搜索按钮 */}
          <button
            type="button"
            className="sm:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          >
            <MagnifyingGlassIcon className="h-5 w-5" />
          </button>

          {/* 主题切换 */}
          <Menu as="div" className="relative">
            <Menu.Button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
              <ThemeIcon className="h-5 w-5" />
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
              <Menu.Items className="absolute right-0 z-10 mt-2 w-36 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => handleThemeChange('light')}
                      className={cn(
                        active ? 'bg-gray-100' : '',
                        'flex w-full items-center px-4 py-2 text-sm text-gray-700'
                      )}
                    >
                      <SunIcon className="h-4 w-4 mr-3" />
                      浅色模式
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => handleThemeChange('dark')}
                      className={cn(
                        active ? 'bg-gray-100' : '',
                        'flex w-full items-center px-4 py-2 text-sm text-gray-700'
                      )}
                    >
                      <MoonIcon className="h-4 w-4 mr-3" />
                      深色模式
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => handleThemeChange('system')}
                      className={cn(
                        active ? 'bg-gray-100' : '',
                        'flex w-full items-center px-4 py-2 text-sm text-gray-700'
                      )}
                    >
                      <ComputerDesktopIcon className="h-4 w-4 mr-3" />
                      跟随系统
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>

          {/* 通知 */}
          <Menu as="div" className="relative">
            <Menu.Button className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
              <BellIcon className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
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
              <Menu.Items className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">通知</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((notification) => (
                    <Menu.Item key={notification.id}>
                      {({ active }) => (
                        <div
                          className={cn(
                            active ? 'bg-gray-50' : '',
                            'px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0'
                          )}
                        >
                          <div className="flex items-start">
                            {notification.unread && (
                              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-3 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {notification.time}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </Menu.Item>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-gray-200">
                  <button className="text-sm text-primary-600 hover:text-primary-700">
                    查看所有通知
                  </button>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>

          {/* 用户菜单 */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center space-x-2 p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-700">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-900">
                {user?.username || '用户'}
              </span>
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
              <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{user?.username || '用户'}</p>
                  <p className="text-xs text-gray-500">{user?.email || 'user@example.com'}</p>
                </div>
                <Menu.Item>
                  {({ active }) => (
                    <a
                      href="/profile"
                      className={cn(
                        active ? 'bg-gray-100' : '',
                        'flex items-center px-4 py-2 text-sm text-gray-700'
                      )}
                    >
                      <UserCircleIcon className="h-4 w-4 mr-3" />
                      个人资料
                    </a>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <a
                      href="/settings"
                      className={cn(
                        active ? 'bg-gray-100' : '',
                        'flex items-center px-4 py-2 text-sm text-gray-700'
                      )}
                    >
                      <Cog6ToothIcon className="h-4 w-4 mr-3" />
                      账户设置
                    </a>
                  )}
                </Menu.Item>
                <div className="border-t border-gray-200 my-1" />
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleLogout}
                      className={cn(
                        active ? 'bg-gray-100' : '',
                        'flex w-full items-center px-4 py-2 text-sm text-gray-700'
                      )}
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                      退出登录
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  );
};

export default Header;