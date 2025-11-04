import React from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/utils/helpers';

interface AuthLayoutProps {
  children?: React.ReactNode;
  backgroundImage?: string;
  showBranding?: boolean;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  backgroundImage,
  showBranding = true 
}) => {
  return (
    <div className="min-h-screen flex">
      {/* 左侧品牌展示区域 */}
      {showBranding && (
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative">
          {/* 背景图片或渐变 */}
          <div 
            className={cn(
              "absolute inset-0",
              backgroundImage 
                ? "bg-cover bg-center bg-no-repeat" 
                : "bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800"
            )}
            style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : {}}
          >
            {/* 遮罩层 */}
            <div className="absolute inset-0 bg-primary-800/20" />
          </div>

          {/* 品牌内容 */}
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <div className="max-w-md">
              {/* Logo 和标题 */}
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mr-4">
                  <div className="w-6 h-6 rounded bg-white"></div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Service Ops Platform</h1>
                  <p className="text-primary-100">企业级服务管理与协作平台</p>
                </div>
              </div>

              {/* 特性介绍 */}
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">实时协作设计</h3>
                    <p className="text-primary-100 text-sm">多人同步编辑，实时查看修改，让团队协作更高效</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">企业级权限管理</h3>
                    <p className="text-primary-100 text-sm">细粒度权限控制，确保数据安全和访问合规</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">多样化设计工具</h3>
                    <p className="text-primary-100 text-sm">架构图、流程图、API设计、数据库设计一站式解决</p>
                  </div>
                </div>
              </div>

              {/* 统计数据 */}
              <div className="mt-12 pt-8 border-t border-white/20">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">1000+</div>
                    <div className="text-primary-100 text-xs">活跃企业</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">50K+</div>
                    <div className="text-primary-100 text-xs">设计项目</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">99.9%</div>
                    <div className="text-primary-100 text-xs">可用性</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 右侧表单区域 */}
      <div className={cn(
        "flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24",
        showBranding ? "lg:w-1/2 xl:w-2/5" : "w-full"
      )}>
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* 移动端 Logo */}
          {showBranding && (
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center">
                <div className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center mr-3">
                  <div className="w-4 h-4 rounded bg-white"></div>
                </div>
                <span className="text-xl font-bold text-gray-900">Service Ops Platform</span>
              </div>
            </div>
          )}

          {/* 表单内容 */}
          <div>
            {children || <Outlet />}
          </div>

          {/* 页脚信息 */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              © 2024 Service Ops Platform. All rights reserved.
            </p>
            <div className="mt-2 space-x-4 text-xs">
              <a href="/privacy" className="text-gray-500 hover:text-gray-700">
                隐私政策
              </a>
              <span className="text-gray-300">|</span>
              <a href="/terms" className="text-gray-500 hover:text-gray-700">
                服务条款
              </a>
              <span className="text-gray-300">|</span>
              <a href="/support" className="text-gray-500 hover:text-gray-700">
                技术支持
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;