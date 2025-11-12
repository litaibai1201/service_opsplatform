import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { UserRole } from '@/types/entities';
import LoadingScreen from '../ui/LoadingScreen';
import { NoAccessState } from '../ui/EmptyState';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermissions?: string[];
  requireAuth?: boolean;
  fallback?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermissions = [],
  requireAuth = true,
  fallback,
}) => {
  const location = useLocation();
  const { 
    isAuthenticated, 
    user, 
    isLoading: authLoading 
  } = useAppSelector(state => state.auth);

  // 如果正在加载认证状态，显示加载屏幕
  if (authLoading) {
    return <LoadingScreen message="验证用户身份..." />;
  }

  // 如果需要认证但用户未登录，重定向到登录页
  if (requireAuth && !isAuthenticated) {
    return (
      <Navigate 
        to="/auth/login" 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // 如果用户已登录但需要验证角色或权限
  if (isAuthenticated && user) {
    // 检查角色权限
    if (requiredRole && !hasRequiredRole(user.role, requiredRole)) {
      return fallback || (
        <NoAccessState 
          onRequestAccess={() => {
            console.log('申请权限:', requiredRole);
          }}
        />
      );
    }

    // 检查特定权限
    if (requiredPermissions.length > 0 && !hasRequiredPermissions(user.permissions || [], requiredPermissions)) {
      return fallback || (
        <NoAccessState 
          onRequestAccess={() => {
            console.log('申请权限:', requiredPermissions);
          }}
        />
      );
    }
  }

  // 通过所有验证，渲染子组件
  return <>{children}</>;
};

// 检查用户是否具有所需角色
function hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    [UserRole.EXTERNAL_USER]: 0,
    [UserRole.TEAM_MEMBER]: 1,
    [UserRole.PROJECT_MAINTAINER]: 2,
    [UserRole.TEAM_ADMIN]: 3,
    [UserRole.TEAM_OWNER]: 4,
    [UserRole.PLATFORM_ADMIN]: 5,
  };

  const userLevel = roleHierarchy[userRole] ?? 0;
  const requiredLevel = roleHierarchy[requiredRole] ?? 0;

  return userLevel >= requiredLevel;
}

// 检查用户是否具有所需权限
function hasRequiredPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.every(permission => 
    userPermissions.includes(permission)
  );
}

// 权限检查的 Hook
export const usePermissions = () => {
  const { user } = useAppSelector(state => state.auth);

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    return hasRequiredRole(user.role, requiredRole);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user || !user.permissions) return false;
    return hasRequiredPermissions(user.permissions, permissions);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user || !user.permissions) return false;
    return permissions.some(permission => user.permissions!.includes(permission));
  };

  const canAccessTeam = (teamId: string): boolean => {
    if (!user) return false;
    
    // 平台管理员可以访问所有团队
    if (user.role === UserRole.PLATFORM_ADMIN) return true;
    
    // 检查用户是否是团队成员
    return user.teamMemberships?.some(membership => 
      membership.teamId === teamId
    ) ?? false;
  };

  const canAccessProject = (projectId: string): boolean => {
    if (!user) return false;
    
    // 平台管理员可以访问所有项目
    if (user.role === UserRole.PLATFORM_ADMIN) return true;
    
    // 检查用户是否是项目维护者
    return user.projectMaintainerships?.some(maintainership => 
      maintainership.projectId === projectId
    ) ?? false;
  };

  const canManageTeam = (teamId: string): boolean => {
    if (!user) return false;
    
    // 平台管理员可以管理所有团队
    if (user.role === UserRole.PLATFORM_ADMIN) return true;
    
    // 检查用户是否是团队所有者或管理员
    const membership = user.teamMemberships?.find(m => m.teamId === teamId);
    return membership && (
      membership.role === UserRole.TEAM_OWNER || 
      membership.role === UserRole.TEAM_ADMIN
    ) || false;
  };

  const canManageProject = (projectId: string): boolean => {
    if (!user) return false;
    
    // 平台管理员可以管理所有项目
    if (user.role === UserRole.PLATFORM_ADMIN) return true;
    
    // 检查用户是否是项目维护者
    const maintainership = user.projectMaintainerships?.find(m => m.projectId === projectId);
    return maintainership?.canManage ?? false;
  };

  return {
    user,
    hasRole,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    canAccessTeam,
    canAccessProject,
    canManageTeam,
    canManageProject,
  };
};

export default ProtectedRoute;