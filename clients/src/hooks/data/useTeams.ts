import { useState, useCallback, useEffect } from 'react';
import { teamApi, TeamQueryParams, CreateTeamRequest, UpdateTeamRequest } from '@/services/api/teamApi';
import { memberApi, MemberQueryParams } from '@/services/api/memberApi';
import { invitationApi, EmailInviteRequest, GenerateInviteLinkRequest } from '@/services/api/invitationApi';
import { showToast } from '@/components/ui/ToastContainer';
import { Team, TeamMember, TeamActivity, Project } from '@/types/entities';

// useTeams Hook
export interface UseTeamsReturn {
  teams: Team[];
  isLoading: boolean;
  error: string | null;
  refreshTeams: () => Promise<void>;
  createTeam: (data: CreateTeamRequest) => Promise<Team>;
  clearError: () => void;
}

export const useTeams = (params?: TeamQueryParams): UseTeamsReturn => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await teamApi.getTeams(params);
      setTeams(response.items);
    } catch (err: any) {
      const errorMessage = err.message || '获取团队列表失败';
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  const createTeam = useCallback(async (data: CreateTeamRequest): Promise<Team> => {
    try {
      setError(null);
      const team = await teamApi.createTeam(data);
      setTeams(prev => [team, ...prev]);
      showToast.success('团队创建成功');
      return team;
    } catch (err: any) {
      const errorMessage = err.message || '创建团队失败';
      setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    refreshTeams();
  }, [refreshTeams]);

  return {
    teams,
    isLoading,
    error,
    refreshTeams,
    createTeam,
    clearError,
  };
};

// useTeamDetail Hook
export interface UseTeamDetailReturn {
  team: Team | null;
  isLoading: boolean;
  error: string | null;
  refreshTeam: () => Promise<void>;
  updateTeam: (data: UpdateTeamRequest) => Promise<Team>;
  deleteTeam: () => Promise<void>;
  archiveTeam: () => Promise<Team>;
  clearError: () => void;
}

export const useTeamDetail = (teamId: string): UseTeamDetailReturn => {
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshTeam = useCallback(async () => {
    if (!teamId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const teamDetail = await teamApi.getTeamDetail(teamId);
      setTeam(teamDetail);
    } catch (err: any) {
      const errorMessage = err.message || '获取团队详情失败';
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  const updateTeam = useCallback(async (data: UpdateTeamRequest): Promise<Team> => {
    try {
      setError(null);
      const updatedTeam = await teamApi.updateTeam(teamId, data);
      setTeam(updatedTeam);
      showToast.success('团队信息更新成功');
      return updatedTeam;
    } catch (err: any) {
      const errorMessage = err.message || '更新团队信息失败';
      setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    }
  }, [teamId]);

  const deleteTeam = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await teamApi.deleteTeam(teamId);
      showToast.success('团队删除成功');
    } catch (err: any) {
      const errorMessage = err.message || '删除团队失败';
      setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    }
  }, [teamId]);

  const archiveTeam = useCallback(async (): Promise<Team> => {
    try {
      setError(null);
      const archivedTeam = await teamApi.archiveTeam(teamId);
      setTeam(archivedTeam);
      showToast.success('团队归档成功');
      return archivedTeam;
    } catch (err: any) {
      const errorMessage = err.message || '归档团队失败';
      setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    }
  }, [teamId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    refreshTeam();
  }, [refreshTeam]);

  return {
    team,
    isLoading,
    error,
    refreshTeam,
    updateTeam,
    deleteTeam,
    archiveTeam,
    clearError,
  };
};

// useTeamSettings Hook
export interface UseTeamSettingsReturn {
  isLoading: boolean;
  error: string | null;
  updateTeamSettings: (data: UpdateTeamRequest) => Promise<void>;
  archiveTeam: () => Promise<void>;
  deleteTeam: () => Promise<void>;
  clearError: () => void;
}

export const useTeamSettings = (teamId: string): UseTeamSettingsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTeamSettings = useCallback(async (data: UpdateTeamRequest): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await teamApi.updateTeam(teamId, data);
      showToast.success('团队设置更新成功');
    } catch (err: any) {
      const errorMessage = err.message || '更新团队设置失败';
      setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  const archiveTeam = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await teamApi.archiveTeam(teamId);
      showToast.success('团队归档成功');
    } catch (err: any) {
      const errorMessage = err.message || '归档团队失败';
      setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  const deleteTeam = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await teamApi.deleteTeam(teamId);
      showToast.success('团队删除成功');
    } catch (err: any) {
      const errorMessage = err.message || '删除团队失败';
      setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    updateTeamSettings,
    archiveTeam,
    deleteTeam,
    clearError,
  };
};

// useTeamMembers Hook
export interface UseTeamMembersReturn {
  members: TeamMember[];
  isLoading: boolean;
  error: string | null;
  refreshMembers: () => Promise<void>;
  updateMemberRole: (memberId: string, role: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  clearError: () => void;
}

export const useTeamMembers = (teamId: string, params?: MemberQueryParams): UseTeamMembersReturn => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshMembers = useCallback(async () => {
    if (!teamId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await memberApi.getTeamMembers(teamId, params);
      setMembers(response.items);
    } catch (err: any) {
      const errorMessage = err.message || '获取成员列表失败';
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, params]);

  const updateMemberRole = useCallback(async (memberId: string, role: string): Promise<void> => {
    try {
      setError(null);
      await memberApi.updateMemberRole(teamId, memberId, { role: role as any });
      showToast.success('成员角色更新成功');
      await refreshMembers();
    } catch (err: any) {
      const errorMessage = err.message || '更新成员角色失败';
      setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    }
  }, [teamId, refreshMembers]);

  const removeMember = useCallback(async (memberId: string): Promise<void> => {
    try {
      setError(null);
      await memberApi.removeMember(teamId, memberId);
      showToast.success('成员移除成功');
      await refreshMembers();
    } catch (err: any) {
      const errorMessage = err.message || '移除成员失败';
      setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    }
  }, [teamId, refreshMembers]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  return {
    members,
    isLoading,
    error,
    refreshMembers,
    updateMemberRole,
    removeMember,
    clearError,
  };
};

// useTeamInvitations Hook
export interface UseTeamInvitationsReturn {
  isLoading: boolean;
  error: string | null;
  sendInvitations: (data: EmailInviteRequest) => Promise<void>;
  generateInviteLink: (data: GenerateInviteLinkRequest) => Promise<string>;
  clearError: () => void;
}

export const useTeamInvitations = (teamId: string): UseTeamInvitationsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendInvitations = useCallback(async (data: EmailInviteRequest): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await invitationApi.sendEmailInvites(teamId, data);
      
      if (result.sent.length > 0) {
        showToast.success(`成功发送 ${result.sent.length} 份邀请`);
      }
      
      if (result.failed.length > 0) {
        showToast.warning(`${result.failed.length} 份邀请发送失败`);
      }
    } catch (err: any) {
      const errorMessage = err.message || '发送邀请失败';
      setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  const generateInviteLink = useCallback(async (data: GenerateInviteLinkRequest): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await invitationApi.generateInviteLink(teamId, data);
      showToast.success('邀请链接生成成功');
      return result.inviteUrl;
    } catch (err: any) {
      const errorMessage = err.message || '生成邀请链接失败';
      setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    sendInvitations,
    generateInviteLink,
    clearError,
  };
};

// useTeamActivity Hook
export interface UseTeamActivityReturn {
  activities: TeamActivity[];
  isLoading: boolean;
  error: string | null;
  refreshActivities: () => Promise<void>;
  clearError: () => void;
}

export const useTeamActivity = (teamId: string): UseTeamActivityReturn => {
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshActivities = useCallback(async () => {
    if (!teamId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await teamApi.getTeamActivityLog(teamId);
      setActivities(response.items);
    } catch (err: any) {
      const errorMessage = err.message || '获取活动记录失败';
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    refreshActivities();
  }, [refreshActivities]);

  return {
    activities,
    isLoading,
    error,
    refreshActivities,
    clearError,
  };
};

// useTeamProjects Hook (placeholder - 实际项目API需要单独实现)
export interface UseTeamProjectsReturn {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  refreshProjects: () => Promise<void>;
  clearError: () => void;
}

export const useTeamProjects = (teamId: string): UseTeamProjectsReturn => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProjects = useCallback(async () => {
    if (!teamId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      // TODO: 实现项目API调用
      // const response = await projectApi.getTeamProjects(teamId);
      // setProjects(response.items);
      setProjects([]); // 临时返回空数组
    } catch (err: any) {
      const errorMessage = err.message || '获取项目列表失败';
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  return {
    projects,
    isLoading,
    error,
    refreshProjects,
    clearError,
  };
};

export default useTeams;