import httpClient from './httpClient';
import { API_CONFIG } from './apiConfig';
import { Team, TeamMember, TeamRole, TeamSettings } from '@/types/entities';

// 创建团队请求数据
export interface CreateTeamRequest {
  name: string;
  description?: string;
  visibility: 'public' | 'private' | 'internal';
  joinPolicy: 'open' | 'invite_only' | 'request';
  allowMemberInvite?: boolean;
  allowMemberProjectCreate?: boolean;
}

// 更新团队请求数据
export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'internal';
  joinPolicy?: 'open' | 'invite_only' | 'request';
  allowMemberInvite?: boolean;
  allowMemberProjectCreate?: boolean;
  requireApprovalForJoin?: boolean;
  defaultMemberRole?: 'member' | 'viewer';
  notifications?: {
    newMember?: boolean;
    projectUpdates?: boolean;
    memberActivity?: boolean;
  };
}

// 团队查询参数
export interface TeamQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'archived' | 'pending';
  role?: 'owner' | 'admin' | 'member';
  visibility?: 'public' | 'private' | 'internal';
  sortBy?: 'name' | 'createdAt' | 'memberCount' | 'lastActivity';
  sortOrder?: 'asc' | 'desc';
}

// 团队列表响应数据
export interface TeamListResponse {
  items: Team[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// 团队详情响应数据
export interface TeamDetailResponse extends Team {
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canManageMembers: boolean;
    canInviteMembers: boolean;
    canCreateProjects: boolean;
  };
}

// 团队统计数据
export interface TeamStatsResponse {
  memberCount: number;
  projectCount: number;
  activityScore: number;
  membersByRole: {
    owner: number;
    admin: number;
    member: number;
  };
  projectsByStatus: {
    active: number;
    completed: number;
    paused: number;
    archived: number;
  };
  recentActivity: Array<{
    type: string;
    count: number;
    date: string;
  }>;
}

// 团队API服务类
class TeamApiService {
  /**
   * 获取用户的团队列表
   */
  async getTeams(params?: TeamQueryParams): Promise<TeamListResponse> {
    const response = await httpClient.get<TeamListResponse>(
      '/teams',
      { params }
    );
    return response.data;
  }

  /**
   * 创建新团队
   */
  async createTeam(data: CreateTeamRequest): Promise<Team> {
    const response = await httpClient.post<Team>('/teams', data);
    return response.data;
  }

  /**
   * 获取团队详情
   */
  async getTeamDetail(teamId: string): Promise<TeamDetailResponse> {
    const response = await httpClient.get<TeamDetailResponse>(
      `/teams/${teamId}`
    );
    return response.data;
  }

  /**
   * 更新团队信息
   */
  async updateTeam(teamId: string, data: UpdateTeamRequest): Promise<Team> {
    const response = await httpClient.put<Team>(`/teams/${teamId}`, data);
    return response.data;
  }

  /**
   * 删除团队
   */
  async deleteTeam(teamId: string): Promise<{ message: string }> {
    const response = await httpClient.delete(`/teams/${teamId}`);
    return response.data;
  }

  /**
   * 归档团队
   */
  async archiveTeam(teamId: string): Promise<Team> {
    const response = await httpClient.post<Team>(`/teams/${teamId}/archive`);
    return response.data;
  }

  /**
   * 恢复归档的团队
   */
  async unarchiveTeam(teamId: string): Promise<Team> {
    const response = await httpClient.post<Team>(`/teams/${teamId}/unarchive`);
    return response.data;
  }

  /**
   * 获取团队统计数据
   */
  async getTeamStats(teamId: string): Promise<TeamStatsResponse> {
    const response = await httpClient.get<TeamStatsResponse>(
      `/teams/${teamId}/stats`
    );
    return response.data;
  }

  /**
   * 转移团队所有权
   */
  async transferOwnership(
    teamId: string,
    newOwnerId: string
  ): Promise<{ message: string }> {
    const response = await httpClient.post(
      `/teams/${teamId}/transfer-ownership`,
      { newOwnerId }
    );
    return response.data;
  }

  /**
   * 离开团队
   */
  async leaveTeam(teamId: string): Promise<{ message: string }> {
    const response = await httpClient.post(`/teams/${teamId}/leave`);
    return response.data;
  }

  /**
   * 获取团队设置
   */
  async getTeamSettings(teamId: string): Promise<TeamSettings> {
    const response = await httpClient.get<TeamSettings>(
      `/teams/${teamId}/settings`
    );
    return response.data;
  }

  /**
   * 更新团队设置
   */
  async updateTeamSettings(
    teamId: string,
    settings: Partial<TeamSettings>
  ): Promise<TeamSettings> {
    const response = await httpClient.put<TeamSettings>(
      `/teams/${teamId}/settings`,
      settings
    );
    return response.data;
  }

  /**
   * 搜索公开团队
   */
  async searchPublicTeams(params: {
    query: string;
    page?: number;
    limit?: number;
  }): Promise<TeamListResponse> {
    const response = await httpClient.get<TeamListResponse>(
      '/teams/public/search',
      { params }
    );
    return response.data;
  }

  /**
   * 申请加入团队
   */
  async requestToJoinTeam(
    teamId: string,
    message?: string
  ): Promise<{ message: string }> {
    const response = await httpClient.post(`/teams/${teamId}/join-request`, {
      message,
    });
    return response.data;
  }

  /**
   * 通过邀请链接加入团队
   */
  async joinTeamByInvite(
    inviteToken: string
  ): Promise<{ team: Team; message: string }> {
    const response = await httpClient.post('/teams/join-by-invite', {
      inviteToken,
    });
    return response.data;
  }

  /**
   * 获取团队加入请求列表
   */
  async getJoinRequests(teamId: string, params?: {
    page?: number;
    limit?: number;
    status?: 'pending' | 'approved' | 'rejected';
  }): Promise<{
    items: Array<{
      id: string;
      user: {
        id: string;
        name: string;
        email: string;
        avatar?: string;
      };
      message?: string;
      status: 'pending' | 'approved' | 'rejected';
      createdAt: string;
      reviewedAt?: string;
      reviewedBy?: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await httpClient.get(`/teams/${teamId}/join-requests`, {
      params,
    });
    return response.data;
  }

  /**
   * 处理团队加入请求
   */
  async handleJoinRequest(
    teamId: string,
    requestId: string,
    action: 'approve' | 'reject',
    message?: string
  ): Promise<{ message: string }> {
    const response = await httpClient.post(
      `/teams/${teamId}/join-requests/${requestId}/${action}`,
      { message }
    );
    return response.data;
  }

  /**
   * 获取团队模板列表
   */
  async getTeamTemplates(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    settings: Partial<CreateTeamRequest>;
    previewImage?: string;
  }>> {
    const response = await httpClient.get('/teams/templates');
    return response.data;
  }

  /**
   * 从模板创建团队
   */
  async createTeamFromTemplate(
    templateId: string,
    data: {
      name: string;
      description?: string;
    }
  ): Promise<Team> {
    const response = await httpClient.post<Team>(
      `/teams/templates/${templateId}/create`,
      data
    );
    return response.data;
  }

  /**
   * 克隆团队
   */
  async cloneTeam(
    teamId: string,
    data: {
      name: string;
      description?: string;
      includeMembers?: boolean;
      includeProjects?: boolean;
    }
  ): Promise<Team> {
    const response = await httpClient.post<Team>(
      `/teams/${teamId}/clone`,
      data
    );
    return response.data;
  }

  /**
   * 导出团队数据
   */
  async exportTeamData(
    teamId: string,
    format: 'json' | 'csv' | 'xlsx'
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    expiresAt: string;
  }> {
    const response = await httpClient.post(`/teams/${teamId}/export`, {
      format,
    });
    return response.data;
  }

  /**
   * 获取团队活动日志
   */
  async getTeamActivityLog(teamId: string, params?: {
    page?: number;
    limit?: number;
    type?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    items: Array<{
      id: string;
      type: string;
      action: string;
      actor: {
        id: string;
        name: string;
        avatar?: string;
      };
      target?: {
        type: string;
        id: string;
        name: string;
      };
      metadata?: Record<string, any>;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await httpClient.get(`/teams/${teamId}/activity`, {
      params,
    });
    return response.data;
  }
}

// 创建并导出服务实例
export const teamApi = new TeamApiService();
export default teamApi;