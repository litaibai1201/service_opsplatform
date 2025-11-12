import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store';
import LoadingScreen from '../ui/LoadingScreen';

interface PublicRouteProps {
  children: React.ReactNode;
  redirectIfAuthenticated?: boolean;
  redirectTo?: string;
}

const PublicRoute: React.FC<PublicRouteProps> = ({
  children,
  redirectIfAuthenticated = true,
  redirectTo = '/dashboard',
}) => {
  const location = useLocation();
  const { 
    isAuthenticated, 
    isLoading: authLoading 
  } = useAppSelector(state => state.auth);

  // 如果正在加载认证状态，显示加载屏幕
  if (authLoading) {
    return <LoadingScreen message="检查登录状态..." />;
  }

  // 如果用户已登录且需要重定向已认证用户
  if (isAuthenticated && redirectIfAuthenticated) {
    // 获取用户想要访问的原始页面（如果有的话）
    const from = (location.state as any)?.from || redirectTo;
    return <Navigate to={from} replace />;
  }

  // 渲染公开页面内容
  return <>{children}</>;
};

export default PublicRoute;