import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectIsAuthenticated, selectAuthLoading, fetchUserProfile } from '@/store/slices/authSlice';
import { setPageTitle } from '@/store/slices/uiSlice';

// 布局组件
import MainLayout from '@/components/layout/MainLayout';
import AuthLayout from '@/components/layout/AuthLayout';

// 页面组件
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import TeamsPage from '@/pages/teams/TeamsPage';
import TeamDetailPage from '@/pages/teams/TeamDetailPage';
import ProjectsPage from '@/pages/projects/ProjectsPage';
import ProjectDetailPage from '@/pages/projects/ProjectDetailPage';

// 设计工具页面
import ArchitecturePage from '@/pages/design-tools/architecture/ArchitecturePage';
import FlowDiagramPage from '@/pages/design-tools/flow-diagram/FlowDiagramPage';
import ApiDesignPage from '@/pages/design-tools/api-design/ApiDesignPage';
import DatabaseDesignPage from '@/pages/design-tools/database-design/DatabaseDesignPage';
import FeatureMapPage from '@/pages/design-tools/feature-map/FeatureMapPage';

// 路由守卫组件
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import PublicRoute from '@/components/layout/PublicRoute';

// 工具组件
import LoadingScreen from '@/components/ui/LoadingScreen';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import ToastContainer from '@/components/ui/ToastContainer';

function App() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const authLoading = useAppSelector(selectAuthLoading);

  useEffect(() => {
    // 设置应用标题
    dispatch(setPageTitle({ title: 'Service Ops Platform' }));

    // 如果有令牌但没有用户信息，获取用户信息
    if (isAuthenticated) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch, isAuthenticated]);

  // 如果正在验证认证状态，显示加载屏幕
  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <div className="App">
        <Routes>
          {/* 公开路由 - 仅在未登录时可访问 */}
          <Route path="/login" element={
            <PublicRoute>
              <AuthLayout>
                <LoginPage />
              </AuthLayout>
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <AuthLayout>
                <RegisterPage />
              </AuthLayout>
            </PublicRoute>
          } />
          <Route path="/forgot-password" element={
            <PublicRoute>
              <AuthLayout>
                <ForgotPasswordPage />
              </AuthLayout>
            </PublicRoute>
          } />

          {/* 受保护的路由 - 需要登录 */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          {/* 团队管理 */}
          <Route path="/teams" element={
            <ProtectedRoute>
              <MainLayout>
                <TeamsPage />
              </MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/teams/:teamId" element={
            <ProtectedRoute>
              <MainLayout>
                <TeamDetailPage />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          {/* 项目管理 */}
          <Route path="/projects" element={
            <ProtectedRoute>
              <MainLayout>
                <ProjectsPage />
              </MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/projects/:projectId" element={
            <ProtectedRoute>
              <MainLayout>
                <ProjectDetailPage />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          {/* 设计工具 */}
          <Route path="/projects/:projectId/architecture" element={
            <ProtectedRoute>
              <MainLayout>
                <ArchitecturePage />
              </MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/projects/:projectId/flow-diagram" element={
            <ProtectedRoute>
              <MainLayout>
                <FlowDiagramPage />
              </MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/projects/:projectId/api-design" element={
            <ProtectedRoute>
              <MainLayout>
                <ApiDesignPage />
              </MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/projects/:projectId/database-design" element={
            <ProtectedRoute>
              <MainLayout>
                <DatabaseDesignPage />
              </MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/projects/:projectId/feature-map" element={
            <ProtectedRoute>
              <MainLayout>
                <FeatureMapPage />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          {/* 默认重定向 */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 404 页面 */}
          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        </Routes>

        {/* 全局组件 */}
        <ToastContainer />
      </div>
    </ErrorBoundary>
  );
}

export default App;