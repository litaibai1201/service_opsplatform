import React from 'react';
import { UserRole } from '@/types/entities';
import { usePermissions } from './ProtectedRoute';
import { NoAccessState } from '../ui/EmptyState';

// 重新导出 usePermissions，以便其他组件可以从这里导入
export { usePermissions };

interface PermissionGuardProps {
  children: React.ReactNode;
  
  // 角色权限
  requiredRole?: UserRole;
  minRole?: UserRole;
  
  // 特定权限
  requiredPermissions?: string[];
  anyPermissions?: string[]; // 满足其中任一权限即可
  
  // 团队/项目权限
  teamId?: string;
  projectId?: string;
  requireTeamAccess?: boolean;
  requireProjectAccess?: boolean;
  requireTeamManage?: boolean;
  requireProjectManage?: boolean;
  
  // 自定义权限检查函数
  customCheck?: () => boolean;
  
  // 无权限时的显示内容
  fallback?: React.ReactNode;
  showFallback?: boolean;
  
  // 权限不足时的回调
  onAccessDenied?: () => void;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  requiredRole,
  minRole,
  requiredPermissions = [],
  anyPermissions = [],
  teamId,
  projectId,
  requireTeamAccess = false,
  requireProjectAccess = false,
  requireTeamManage = false,
  requireProjectManage = false,
  customCheck,
  fallback,
  showFallback = true,
  onAccessDenied,
}) => {
  const {
    user,
    hasRole,
    hasAllPermissions,
    hasAnyPermission,
    canAccessTeam,
    canAccessProject,
    canManageTeam,
    canManageProject,
  } = usePermissions();

  // 检查所有权限条件
  const hasAccess = React.useMemo(() => {
    if (!user) return false;

    // 检查指定角色
    if (requiredRole && !hasRole(requiredRole)) {
      return false;
    }

    // 检查最小角色要求
    if (minRole && !hasRole(minRole)) {
      return false;
    }

    // 检查必需权限（需要全部满足）
    if (requiredPermissions.length > 0 && !hasAllPermissions(requiredPermissions)) {
      return false;
    }

    // 检查任意权限（满足其中一个即可）
    if (anyPermissions.length > 0 && !hasAnyPermission(anyPermissions)) {
      return false;
    }

    // 检查团队访问权限
    if (requireTeamAccess && teamId && !canAccessTeam(teamId)) {
      return false;
    }

    // 检查项目访问权限
    if (requireProjectAccess && projectId && !canAccessProject(projectId)) {
      return false;
    }

    // 检查团队管理权限
    if (requireTeamManage && teamId && !canManageTeam(teamId)) {
      return false;
    }

    // 检查项目管理权限
    if (requireProjectManage && projectId && !canManageProject(projectId)) {
      return false;
    }

    // 自定义权限检查
    if (customCheck && !customCheck()) {
      return false;
    }

    return true;
  }, [
    user,
    requiredRole,
    minRole,
    requiredPermissions,
    anyPermissions,
    teamId,
    projectId,
    requireTeamAccess,
    requireProjectAccess,
    requireTeamManage,
    requireProjectManage,
    customCheck,
    hasRole,
    hasAllPermissions,
    hasAnyPermission,
    canAccessTeam,
    canAccessProject,
    canManageTeam,
    canManageProject,
  ]);

  // 权限检查失败
  if (!hasAccess) {
    // 触发回调
    React.useEffect(() => {
      if (onAccessDenied) {
        onAccessDenied();
      }
    }, [onAccessDenied]);

    // 显示备用内容
    if (showFallback) {
      return (
        <>
          {fallback || (
            <NoAccessState 
              onRequestAccess={() => {
                console.log('申请权限', {
                  requiredRole,
                  minRole,
                  requiredPermissions,
                  anyPermissions,
                  teamId,
                  projectId,
                });
              }}
            />
          )}
        </>
      );
    }

    // 不显示任何内容
    return null;
  }

  // 权限检查通过，渲染子组件
  return <>{children}</>;
};

// 权限检查的便捷组件
export const RequireRole: React.FC<{
  role: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ role, children, fallback }) => (
  <PermissionGuard requiredRole={role} fallback={fallback}>
    {children}
  </PermissionGuard>
);

export const RequirePermission: React.FC<{
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ permission, children, fallback }) => (
  <PermissionGuard requiredPermissions={[permission]} fallback={fallback}>
    {children}
  </PermissionGuard>
);

export const RequireAnyPermission: React.FC<{
  permissions: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ permissions, children, fallback }) => (
  <PermissionGuard anyPermissions={permissions} fallback={fallback}>
    {children}
  </PermissionGuard>
);

export const RequireTeamAccess: React.FC<{
  teamId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ teamId, children, fallback }) => (
  <PermissionGuard teamId={teamId} requireTeamAccess fallback={fallback}>
    {children}
  </PermissionGuard>
);

export const RequireProjectAccess: React.FC<{
  projectId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ projectId, children, fallback }) => (
  <PermissionGuard projectId={projectId} requireProjectAccess fallback={fallback}>
    {children}
  </PermissionGuard>
);

export const RequireTeamManage: React.FC<{
  teamId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ teamId, children, fallback }) => (
  <PermissionGuard teamId={teamId} requireTeamManage fallback={fallback}>
    {children}
  </PermissionGuard>
);

export const RequireProjectManage: React.FC<{
  projectId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ projectId, children, fallback }) => (
  <PermissionGuard projectId={projectId} requireProjectManage fallback={fallback}>
    {children}
  </PermissionGuard>
);

// 管理员权限组件
export const AdminOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequireRole role={UserRole.PLATFORM_ADMIN} fallback={fallback}>
    {children}
  </RequireRole>
);

// 团队所有者或管理员权限组件
export const TeamManagerOnly: React.FC<{
  teamId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ teamId, children, fallback }) => (
  <RequireTeamManage teamId={teamId} fallback={fallback}>
    {children}
  </RequireTeamManage>
);

// 项目维护者权限组件
export const ProjectMaintainerOnly: React.FC<{
  projectId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ projectId, children, fallback }) => (
  <RequireProjectManage projectId={projectId} fallback={fallback}>
    {children}
  </RequireProjectManage>
);

export default PermissionGuard;