import httpClient from './httpClient';
import { TeamMember, TeamRole } from '@/types/entities';

// 添加成员请求数据
export interface AddMemberRequest {
  userId: string;
  role: TeamRole;
  message?: string;
}

// 批量添加成员请求数据
export interface BatchAddMembersRequest {
  members: Array<{
    userId: string;
    role: TeamRole;
  }>;
  message?: string;
}

// 更新成员角色请求数据
export interface UpdateMemberRoleRequest {
  role: TeamRole;
  reason?: string;
}

// 成员查询参数
export interface MemberQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: TeamRole;
  status?: 'active' | 'pending' | 'inactive';
  sortBy?: 'name' | 'joinedAt' | 'lastActivity' | 'role';
  sortOrder?: 'asc' | 'desc';
}

// 成员列表响应数据
export interface MemberListResponse {
  items: TeamMember[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// 成员详情响应数据
export interface MemberDetailResponse extends TeamMember {
  permissions: {
    canEdit: boolean;
    canRemove: boolean;
    canChangeRole: boolean;
  };
  stats: {
    projectCount: number;
    taskCount: number;
    contributionScore: number;
    lastActivity: string;
  };
}

// 成员统计数据
export interface MemberStatsResponse {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  membersByRole: {
    owner: number;
    admin: number;
    member: number;
  };
  recentJoins: number;
  growthRate: number;
}

// 团队成员API服务类
class MemberApiService {
  /**
   * 获取团队成员列表
   */
  async getTeamMembers(
    teamId: string,
    params?: MemberQueryParams
  ): Promise<MemberListResponse> {
    const response = await httpClient.get<MemberListResponse>(
      `/teams/${teamId}/members`,
      { params }
    );
    return response.data;
  }

  /**
   * 获取成员详情
   */
  async getMemberDetail(
    teamId: string,
    memberId: string
  ): Promise<MemberDetailResponse> {
    const response = await httpClient.get<MemberDetailResponse>(
      `/teams/${teamId}/members/${memberId}`
    );
    return response.data;
  }

  /**
   * 添加成员到团队
   */
  async addMember(
    teamId: string,
    data: AddMemberRequest
  ): Promise<TeamMember> {
    const response = await httpClient.post<TeamMember>(
      `/teams/${teamId}/members`,
      data
    );
    return response.data;
  }

  /**
   * 批量添加成员
   */
  async addMembers(
    teamId: string,
    data: BatchAddMembersRequest
  ): Promise<{
    added: TeamMember[];
    failed: Array<{
      userId: string;
      error: string;
    }>;
    message: string;
  }> {
    const response = await httpClient.post(
      `/teams/${teamId}/members/batch`,
      data
    );
    return response.data;
  }

  /**
   * 更新成员角色
   */
  async updateMemberRole(
    teamId: string,
    memberId: string,
    data: UpdateMemberRoleRequest
  ): Promise<TeamMember> {
    const response = await httpClient.put<TeamMember>(
      `/teams/${teamId}/members/${memberId}/role`,
      data
    );
    return response.data;
  }

  /**
   * 移除团队成员
   */
  async removeMember(
    teamId: string,
    memberId: string,
    reason?: string
  ): Promise<{ message: string }> {
    const response = await httpClient.delete(
      `/teams/${teamId}/members/${memberId}`,
      {
        data: { reason },
      }
    );
    return response.data;
  }

  /**
   * 批量移除成员
   */
  async removeMembers(
    teamId: string,
    memberIds: string[],
    reason?: string
  ): Promise<{
    removed: string[];
    failed: Array<{
      memberId: string;
      error: string;
    }>;
    message: string;
  }> {
    const response = await httpClient.post(
      `/teams/${teamId}/members/batch-remove`,
      {
        memberIds,
        reason,
      }
    );
    return response.data;
  }

  /**
   * 获取成员统计数据
   */
  async getMemberStats(teamId: string): Promise<MemberStatsResponse> {
    const response = await httpClient.get<MemberStatsResponse>(
      `/teams/${teamId}/members/stats`
    );
    return response.data;
  }

  /**
   * 搜索可添加的用户
   */
  async searchUsers(params: {
    query: string;
    excludeTeamId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: Array<{
      id: string;
      name: string;
      email: string;
      avatar?: string;
      role?: string;
      department?: string;
      isTeamMember?: boolean;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await httpClient.get('/users/search', { params });
    return response.data;
  }

  /**
   * 暂停成员（保留成员身份但限制访问）
   */
  async suspendMember(
    teamId: string,
    memberId: string,
    data: {
      reason: string;
      duration?: number; // 暂停天数，不提供则永久暂停
    }
  ): Promise<TeamMember> {
    const response = await httpClient.post<TeamMember>(
      `/teams/${teamId}/members/${memberId}/suspend`,
      data
    );
    return response.data;
  }

  /**
   * 恢复被暂停的成员
   */
  async unsuspendMember(
    teamId: string,
    memberId: string
  ): Promise<TeamMember> {
    const response = await httpClient.post<TeamMember>(
      `/teams/${teamId}/members/${memberId}/unsuspend`
    );
    return response.data;
  }

  /**
   * 重新邀请成员（重发邀请）
   */
  async reinviteMember(
    teamId: string,
    memberId: string
  ): Promise<{ message: string }> {
    const response = await httpClient.post(
      `/teams/${teamId}/members/${memberId}/reinvite`
    );
    return response.data;
  }

  /**
   * 获取成员权限列表
   */
  async getMemberPermissions(
    teamId: string,
    memberId: string
  ): Promise<{
    permissions: string[];
    inheritedPermissions: string[];
    customPermissions: string[];
  }> {
    const response = await httpClient.get(
      `/teams/${teamId}/members/${memberId}/permissions`
    );
    return response.data;
  }

  /**
   * 更新成员权限
   */
  async updateMemberPermissions(
    teamId: string,
    memberId: string,
    permissions: {
      add?: string[];
      remove?: string[];
    }
  ): Promise<{
    permissions: string[];
    message: string;
  }> {
    const response = await httpClient.put(
      `/teams/${teamId}/members/${memberId}/permissions`,
      permissions
    );
    return response.data;
  }

  /**
   * 获取成员活动历史
   */
  async getMemberActivity(
    teamId: string,
    memberId: string,
    params?: {
      page?: number;
      limit?: number;
      type?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    items: Array<{
      id: string;
      type: string;
      action: string;
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
    const response = await httpClient.get(
      `/teams/${teamId}/members/${memberId}/activity`,
      { params }
    );
    return response.data;
  }

  /**
   * 导出成员列表
   */
  async exportMembers(
    teamId: string,
    format: 'csv' | 'xlsx',
    options?: {
      includeStats?: boolean;
      includePermissions?: boolean;
      roleFilter?: TeamRole;
    }
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    expiresAt: string;
  }> {
    const response = await httpClient.post(
      `/teams/${teamId}/members/export`,
      {
        format,
        ...options,
      }
    );
    return response.data;
  }

  /**
   * 获取成员的团队贡献统计
   */
  async getMemberContribution(
    teamId: string,
    memberId: string,
    params?: {
      period?: 'week' | 'month' | 'quarter' | 'year';
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    contribution: {
      totalTasks: number;
      completedTasks: number;
      projectCount: number;
      commitsCount: number;
      reviewsCount: number;
      score: number;
    };
    timeline: Array<{
      date: string;
      tasks: number;
      commits: number;
      reviews: number;
    }>;
    ranking: {
      position: number;
      total: number;
      percentile: number;
    };
  }> {
    const response = await httpClient.get(
      `/teams/${teamId}/members/${memberId}/contribution`,
      { params }
    );
    return response.data;
  }

  /**
   * 设置成员为导师/被指导者关系
   */
  async setMentorship(
    teamId: string,
    mentorId: string,
    menteeId: string
  ): Promise<{ message: string }> {
    const response = await httpClient.post(
      `/teams/${teamId}/members/mentorship`,
      {
        mentorId,
        menteeId,
      }
    );
    return response.data;
  }

  /**
   * 移除导师关系
   */
  async removeMentorship(
    teamId: string,
    mentorId: string,
    menteeId: string
  ): Promise<{ message: string }> {
    const response = await httpClient.delete(
      `/teams/${teamId}/members/mentorship`,
      {
        data: {
          mentorId,
          menteeId,
        },
      }
    );
    return response.data;
  }
}

// 创建并导出服务实例
export const memberApi = new MemberApiService();
export default memberApi;