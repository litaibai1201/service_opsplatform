import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout, AuthLayout, ProtectedRoute, PublicRoute } from '@/components/layout';
import { ErrorBoundary, LoadingScreen } from '@/components/ui';

// Lazy loading wrapper component
const LazyLoadWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingScreen />}>
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  </Suspense>
);

// 认证页面 - Lazy loaded
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/pages/auth/VerifyEmailPage'));

// 仪表板页面 - Lazy loaded
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));

// 团队管理页面 - Lazy loaded
const TeamsPage = lazy(() => import('@/pages/teams/TeamsPage'));
const TeamDetailPage = lazy(() => import('@/pages/teams/TeamDetailPage'));
const TeamSettingsPage = lazy(() => import('@/pages/teams/TeamSettingsPage'));

// 项目管理页面 - Lazy loaded
const ProjectsPage = lazy(() => import('@/pages/projects/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@/pages/projects/ProjectDetailPage'));
const ProjectSettingsPage = lazy(() => import('@/pages/projects/ProjectSettingsPage'));
const ProjectMembersPage = lazy(() => import('@/pages/projects/ProjectMembersPage'));

// 设计工具页面 - Lazy loaded
const ArchitecturePage = lazy(() => import('@/pages/design-tools/architecture/ArchitecturePage'));
const FlowDiagramPage = lazy(() => import('@/pages/design-tools/flow-diagram/FlowDiagramPage'));
const ApiDesignPage = lazy(() => import('@/pages/design-tools/api-design/ApiDesignPage'));
const DatabaseDesignPage = lazy(() => import('@/pages/design-tools/database-design/DatabaseDesignPage'));
const FeatureMapPage = lazy(() => import('@/pages/design-tools/feature-map/FeatureMapPage'));

// 管理员页面 - Lazy loaded
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('@/pages/admin/UserManagement'));
const SystemSettings = lazy(() => import('@/pages/admin/SystemSettings'));
const AuditLogs = lazy(() => import('@/pages/admin/AuditLogs'));

// 错误页面
const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">页面未找到</p>
      <a href="/dashboard" className="text-blue-600 hover:text-blue-800">
        返回首页
      </a>
    </div>
  </div>
);

const router = createBrowserRouter([
  // 根路径重定向
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  
  // 认证路由（公开访问）
  {
    path: '/auth',
    element: (
      <ErrorBoundary>
        <PublicRoute />
      </ErrorBoundary>
    ),
    children: [
      {
        path: 'login',
        element: <LazyLoadWrapper><LoginPage /></LazyLoadWrapper>,
      },
      {
        path: 'register',
        element: <LazyLoadWrapper><RegisterPage /></LazyLoadWrapper>,
      },
      {
        path: 'forgot-password',
        element: <LazyLoadWrapper><ForgotPasswordPage /></LazyLoadWrapper>,
      },
      {
        path: 'reset-password',
        element: <LazyLoadWrapper><ResetPasswordPage /></LazyLoadWrapper>,
      },
      {
        path: 'verify-email',
        element: <LazyLoadWrapper><VerifyEmailPage /></LazyLoadWrapper>,
      },
    ],
  },
  
  // 主应用路由（需要认证）
  {
    path: '/',
    element: (
      <ErrorBoundary>
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      </ErrorBoundary>
    ),
    children: [
      // 仪表板
      {
        path: 'dashboard',
        element: <LazyLoadWrapper><DashboardPage /></LazyLoadWrapper>,
      },
      
      // 团队管理
      {
        path: 'teams',
        children: [
          {
            index: true,
            element: <LazyLoadWrapper><TeamsPage /></LazyLoadWrapper>,
          },
          {
            path: ':teamId',
            children: [
              {
                index: true,
                element: <LazyLoadWrapper><TeamDetailPage /></LazyLoadWrapper>,
              },
              {
                path: 'settings',
                element: <LazyLoadWrapper><TeamSettingsPage /></LazyLoadWrapper>,
              },
            ],
          },
        ],
      },
      
      // 项目管理
      {
        path: 'projects',
        children: [
          {
            index: true,
            element: <LazyLoadWrapper><ProjectsPage /></LazyLoadWrapper>,
          },
          {
            path: ':projectId',
            children: [
              {
                index: true,
                element: <LazyLoadWrapper><ProjectDetailPage /></LazyLoadWrapper>,
              },
              {
                path: 'settings',
                element: <LazyLoadWrapper><ProjectSettingsPage /></LazyLoadWrapper>,
              },
              {
                path: 'members',
                element: <LazyLoadWrapper><ProjectMembersPage /></LazyLoadWrapper>,
              },
            ],
          },
        ],
      },
      
      // 设计工具
      {
        path: 'design-tools',
        children: [
          {
            path: 'architecture',
            children: [
              {
                index: true,
                element: <LazyLoadWrapper><ArchitecturePage /></LazyLoadWrapper>,
              },
              {
                path: ':diagramId',
                element: <LazyLoadWrapper><ArchitecturePage /></LazyLoadWrapper>,
              },
            ],
          },
          {
            path: 'flow-diagram',
            children: [
              {
                index: true,
                element: <LazyLoadWrapper><FlowDiagramPage /></LazyLoadWrapper>,
              },
              {
                path: ':diagramId',
                element: <LazyLoadWrapper><FlowDiagramPage /></LazyLoadWrapper>,
              },
            ],
          },
          {
            path: 'api-design',
            children: [
              {
                index: true,
                element: <LazyLoadWrapper><ApiDesignPage /></LazyLoadWrapper>,
              },
              {
                path: ':designId',
                element: <LazyLoadWrapper><ApiDesignPage /></LazyLoadWrapper>,
              },
            ],
          },
          {
            path: 'database-design',
            children: [
              {
                index: true,
                element: <LazyLoadWrapper><DatabaseDesignPage /></LazyLoadWrapper>,
              },
              {
                path: ':designId',
                element: <LazyLoadWrapper><DatabaseDesignPage /></LazyLoadWrapper>,
              },
            ],
          },
          {
            path: 'feature-map',
            children: [
              {
                index: true,
                element: <LazyLoadWrapper><FeatureMapPage /></LazyLoadWrapper>,
              },
              {
                path: ':mapId',
                element: <LazyLoadWrapper><FeatureMapPage /></LazyLoadWrapper>,
              },
            ],
          },
        ],
      },

      // 管理员功能 (需要管理员权限)
      {
        path: 'admin',
        children: [
          {
            index: true,
            element: <LazyLoadWrapper><AdminDashboard /></LazyLoadWrapper>,
          },
          {
            path: 'users',
            element: <LazyLoadWrapper><UserManagement /></LazyLoadWrapper>,
          },
          {
            path: 'settings',
            element: <LazyLoadWrapper><SystemSettings /></LazyLoadWrapper>,
          },
          {
            path: 'audit-logs',
            element: <LazyLoadWrapper><AuditLogs /></LazyLoadWrapper>,
          },
        ],
      },
    ],
  },
  
  // 404 页面
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default router;