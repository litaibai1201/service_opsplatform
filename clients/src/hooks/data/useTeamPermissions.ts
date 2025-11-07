import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAppSelector } from '@/store';
import { teamApi } from '@/services/api/teamApi';
import { TeamRole } from '@/types/entities';

// 权限类型定义
export type TeamPermission = 
  | 'team:read'
  | 'team:edit'
  | 'team:delete'
  | 'team:archive'
  | 'team:manage_settings'
  | 'member:read'
  | 'member:invite'
  | 'member:remove'
  | 'member:edit_role'
  | 'member:manage'
  | 'project:read'
  | 'project:create'
  | 'project:edit'
  | 'project:delete'
  | 'project:manage'
  | 'invitation:create'
  | 'invitation:manage'
  | 'activity:read';

// 角色权限映射
const ROLE_PERMISSIONS: Record<TeamRole, TeamPermission[]> = {
  owner: [
    'team:read', 'team:edit', 'team:delete', 'team:archive', 'team:manage_settings',
    'member:read', 'member:invite', 'member:remove', 'member:edit_role', 'member:manage',
    'project:read', 'project:create', 'project:edit', 'project:delete', 'project:manage',
    'invitation:create', 'invitation:manage',
    'activity:read'
  ],
  admin: [
    'team:read', 'team:edit', 'team:manage_settings',
    'member:read', 'member:invite', 'member:remove', 'member:edit_role', 'member:manage',
    'project:read', 'project:create', 'project:edit', 'project:delete', 'project:manage',
    'invitation:create', 'invitation:manage',
    'activity:read'
  ],
  member: [
    'team:read',
    'member:read',
    'project:read', 'project:create', 'project:edit',
    'activity:read'
  ]
};

// 团队权限上下文
export interface TeamPermissionContext {
  teamId: string;
  userRole: TeamRole | null;
  teamSettings?: {
    allowMemberInvite?: boolean;
    allowMemberProjectCreate?: boolean;
    requireApprovalForJoin?: boolean;
  };
}

// Hook 返回类型
export interface UseTeamPermissionsReturn {
  // 权限检查方法
  hasPermission: (permission: TeamPermission) => boolean;
  hasAnyPermission: (permissions: TeamPermission[]) => boolean;
  hasAllPermissions: (permissions: TeamPermission[]) => boolean;
  
  // 快捷权限检查
  canViewTeam: boolean;
  canEditTeam: boolean;
  canDeleteTeam: boolean;
  canManageTeam: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canEditMemberRoles: boolean;
  canCreateProjects: boolean;
  canManageProjects: boolean;
  
  // 当前用户信息
  currentUserRole: TeamRole | null;
  isTeamOwner: boolean;
  isTeamAdmin: boolean;
  isTeamMember: boolean;
  
  // 状态
  isLoading: boolean;
  error: string | null;
  
  // 操作
  refreshPermissions: () => Promise<void>;
  checkSpecificPermission: (permission: TeamPermission, targetUserId?: string) => Promise<boolean>;
}

export const useTeamPermissions = (teamId: string): UseTeamPermissionsReturn => {
  const { user } = useAppSelector(state => state.auth);
  const [context, setContext] = useState<TeamPermissionContext>({
    teamId,
    userRole: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取用户在团队中的角色和权限上下文
  const refreshPermissions = useCallback(async () => {
    if (!teamId || !user) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const teamDetail = await teamApi.getTeamDetail(teamId);
      
      // 查找当前用户在团队中的角色
      const currentUserMember = teamDetail.members?.find(
        member => member.userId === user.id
      );
      
      setContext({
        teamId,
        userRole: currentUserMember?.role || null,
        teamSettings: teamDetail.settings,
      });
    } catch (err: any) {
      setError(err.message || '获取权限信息失败');
    } finally {
      setIsLoading(false);
    }
  }, [teamId, user]);

  // 检查是否有特定权限
  const hasPermission = useCallback((permission: TeamPermission): boolean => {
    if (!context.userRole) return false;
    
    const rolePermissions = ROLE_PERMISSIONS[context.userRole] || [];
    let hasBasePermission = rolePermissions.includes(permission);
    
    // 基于团队设置的动态权限检查
    if (context.teamSettings) {
      const { allowMemberInvite, allowMemberProjectCreate } = context.teamSettings;
      
      // 如果是普通成员，检查团队设置
      if (context.userRole === 'member') {
        if (permission === 'member:invite' && !allowMemberInvite) {
          hasBasePermission = false;
        }
        if (permission === 'project:create' && !allowMemberProjectCreate) {
          hasBasePermission = false;
        }
      }
    }
    
    return hasBasePermission;
  }, [context]);

  // 检查是否有任一权限
  const hasAnyPermission = useCallback((permissions: TeamPermission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  }, [hasPermission]);

  // 检查是否有所有权限
  const hasAllPermissions = useCallback((permissions: TeamPermission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  }, [hasPermission]);

  // 检查特定权限（支持跨用户检查）
  const checkSpecificPermission = useCallback(async (
    permission: TeamPermission,
    targetUserId?: string
  ): Promise<boolean> => {
    if (!targetUserId) {
      return hasPermission(permission);
    }
    
    // 如果指定了目标用户，需要进行额外的权限检查
    // 例如：不能对比自己权限更高的用户执行操作
    if (context.userRole === 'admin' && targetUserId) {
      try {
        const teamDetail = await teamApi.getTeamDetail(teamId);
        const targetMember = teamDetail.members?.find(
          member => member.userId === targetUserId
        );
        
        if (targetMember?.role === 'owner') {
          return false; // 管理员不能对所有者执行操作
        }
      } catch (err) {
        return false;
      }
    }
    
    return hasPermission(permission);
  }, [hasPermission, context.userRole, teamId]);

  // 计算快捷权限
  const permissions = useMemo(() => ({
    canViewTeam: hasPermission('team:read'),
    canEditTeam: hasPermission('team:edit'),
    canDeleteTeam: hasPermission('team:delete'),
    canManageTeam: hasAnyPermission(['team:edit', 'team:manage_settings', 'member:manage']),
    canInviteMembers: hasPermission('member:invite'),
    canRemoveMembers: hasPermission('member:remove'),
    canEditMemberRoles: hasPermission('member:edit_role'),
    canCreateProjects: hasPermission('project:create'),
    canManageProjects: hasPermission('project:manage'),
  }), [hasPermission, hasAnyPermission]);

  // 计算用户角色信息
  const roleInfo = useMemo(() => ({
    currentUserRole: context.userRole,
    isTeamOwner: context.userRole === 'owner',
    isTeamAdmin: context.userRole === 'admin',
    isTeamMember: context.userRole === 'member',
  }), [context.userRole]);

  // 初始化时获取权限信息
  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  return {
    // 权限检查方法
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // 快捷权限检查
    ...permissions,
    
    // 当前用户信息
    ...roleInfo,
    
    // 状态
    isLoading,
    error,
    
    // 操作
    refreshPermissions,
    checkSpecificPermission,
  };
};

// 权限守卫 Hook - 用于组件级别的权限控制
export interface UsePermissionGuardReturn {
  hasAccess: boolean;
  isLoading: boolean;
  error: string | null;
}

export const usePermissionGuard = (
  teamId: string,
  requiredPermissions: TeamPermission | TeamPermission[],
  requireAll = false
): UsePermissionGuardReturn => {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
    error
  } = useTeamPermissions(teamId);

  const hasAccess = useMemo(() => {
    if (Array.isArray(requiredPermissions)) {
      return requireAll 
        ? hasAllPermissions(requiredPermissions)
        : hasAnyPermission(requiredPermissions);
    } else {
      return hasPermission(requiredPermissions);
    }
  }, [requiredPermissions, requireAll, hasPermission, hasAnyPermission, hasAllPermissions]);

  return {
    hasAccess,
    isLoading,
    error,
  };
};

// 简化的权限检查 Hooks
export const useCanManageTeam = (teamId: string) => {
  const { canManageTeam, isLoading } = useTeamPermissions(teamId);
  return { canManageTeam, isLoading };
};

export const useCanInviteMembers = (teamId: string) => {
  const { canInviteMembers, isLoading } = useTeamPermissions(teamId);
  return { canInviteMembers, isLoading };
};

export const useCanManageMembers = (teamId: string) => {
  const { canRemoveMembers, canEditMemberRoles, isLoading } = useTeamPermissions(teamId);
  return { 
    canManageMembers: canRemoveMembers || canEditMemberRoles, 
    canRemoveMembers,
    canEditMemberRoles,
    isLoading 
  };
};

export const useIsTeamAdmin = (teamId: string) => {
  const { isTeamOwner, isTeamAdmin, isLoading } = useTeamPermissions(teamId);
  return { isAdmin: isTeamOwner || isTeamAdmin, isLoading };
};

export default useTeamPermissions;