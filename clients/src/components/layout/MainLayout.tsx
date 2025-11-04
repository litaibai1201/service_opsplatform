import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/utils/helpers';
import Sidebar from './Sidebar';
import Header from './Header';
import Breadcrumb from './Breadcrumb';

interface MainLayoutProps {
  children?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* 侧边栏 */}
      <Sidebar
        isOpen={isSidebarOpen}
        isMobileOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
      />

      {/* 主内容区域 */}
      <div className={cn(
        'flex-1 flex flex-col overflow-hidden transition-all duration-300',
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
      )}>
        {/* 顶部导航栏 */}
        <Header
          onToggleSidebar={toggleSidebar}
          onToggleMobileMenu={toggleMobileMenu}
          isSidebarOpen={isSidebarOpen}
        />

        {/* 面包屑导航 */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
          <Breadcrumb />
        </div>

        {/* 页面内容 */}
        <main className="flex-1 overflow-y-auto">
          <div className="h-full">
            {children || <Outlet />}
          </div>
        </main>
      </div>

      {/* 移动端遮罩层 */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}
    </div>
  );
};

export default MainLayout;