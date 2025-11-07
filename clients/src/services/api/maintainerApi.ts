import httpClient from './httpClient';
import { ProjectMaintainer } from '@/types/entities';

// 添加维护员请求数据
export interface AddMaintainerRequest {
  userId: string;
  message?: string;
}

// 批量添加维护员请求数据
export interface BatchAddMaintainersRequest {
  maintainers: Array<{
    userId: string;
  }>;
  message?: string;
}

// 维护员查询参数
export interface MaintainerQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'assignedAt' | 'lastActivity';
  sortOrder?: 'asc' | 'desc';
}

// 维护员列表响应数据
export interface MaintainerListResponse {
  items: ProjectMaintainer[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// 维护员详情响应数据
export interface MaintainerDetailResponse extends ProjectMaintainer {
  permissions: {
    canEdit: boolean;
    canRemove: boolean;
  };
  stats: {
    documentCount: number;
    commentCount: number;
    contributionScore: number;
    lastActivity: string;
  };
  activities: Array<{
    id: string;
    type: string;
    action: string;
    target?: {
      type: string;
      id: string;
      name: string;
    };
    createdAt: string;
  }>;
}

// 维护员统计数据
export interface MaintainerStatsResponse {
  totalMaintainers: number;
  activeMaintainers: number;
  recentJoins: number;
  averageContribution: number;
  topContributors: Array<{
    user: {
      id: string;
      name: string;
      avatar?: string;
    };
    score: number;
    documentCount: number;
    commentCount: number;
  }>;
}

// 项目维护员API服务类
class MaintainerApiService {
  /**
   * 获取项目维护员列表
   */
  async getProjectMaintainers(
    projectId: string,
    params?: MaintainerQueryParams
  ): Promise<MaintainerListResponse> {
    const response = await httpClient.get<MaintainerListResponse>(
      `/projects/${projectId}/maintainers`,
      { params }
    );
    return response.data;
  }

  /**
   * 获取维护员详情
   */
  async getMaintainerDetail(
    projectId: string,
    maintainerId: string
  ): Promise<MaintainerDetailResponse> {
    const response = await httpClient.get<MaintainerDetailResponse>(
      `/projects/${projectId}/maintainers/${maintainerId}`
    );
    return response.data;
  }

  /**
   * 添加维护员到项目
   */
  async addMaintainer(
    projectId: string,
    data: AddMaintainerRequest
  ): Promise<ProjectMaintainer> {
    const response = await httpClient.post<ProjectMaintainer>(
      `/projects/${projectId}/maintainers`,
      data
    );
    return response.data;
  }

  /**
   * 批量添加维护员
   */
  async addMaintainers(
    projectId: string,
    data: BatchAddMaintainersRequest
  ): Promise<{
    added: ProjectMaintainer[];
    failed: Array<{
      userId: string;
      error: string;
    }>;
    message: string;
  }> {
    const response = await httpClient.post(
      `/projects/${projectId}/maintainers/batch`,
      data
    );
    return response.data;
  }

  /**
   * 移除项目维护员
   */
  async removeMaintainer(
    projectId: string,
    maintainerId: string,
    reason?: string
  ): Promise<{ message: string }> {
    const response = await httpClient.delete(
      `/projects/${projectId}/maintainers/${maintainerId}`,
      {
        data: { reason },
      }
    );
    return response.data;
  }

  /**
   * 批量移除维护员
   */
  async removeMaintainers(
    projectId: string,
    maintainerIds: string[],
    reason?: string
  ): Promise<{
    removed: string[];
    failed: Array<{
      maintainerId: string;
      error: string;
    }>;
    message: string;
  }> {
    const response = await httpClient.post(
      `/projects/${projectId}/maintainers/batch-remove`,
      {
        maintainerIds,
        reason,
      }
    );
    return response.data;
  }

  /**
   * 获取维护员统计数据
   */
  async getMaintainerStats(projectId: string): Promise<MaintainerStatsResponse> {
    const response = await httpClient.get<MaintainerStatsResponse>(
      `/projects/${projectId}/maintainers/stats`
    );
    return response.data;
  }

  /**
   * 搜索可添加的用户
   */
  async searchUsers(params: {
    query: string;
    excludeProjectId?: string;
    teamId?: string;
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
      isMaintainer?: boolean;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await httpClient.get('/users/search', { params });
    return response.data;
  }

  /**
   * 获取维护员权限列表
   */
  async getMaintainerPermissions(
    projectId: string,
    maintainerId: string
  ): Promise<{
    permissions: string[];
    inheritedPermissions: string[];
    customPermissions: string[];
  }> {
    const response = await httpClient.get(
      `/projects/${projectId}/maintainers/${maintainerId}/permissions`
    );
    return response.data;
  }

  /**
   * 更新维护员权限
   */
  async updateMaintainerPermissions(
    projectId: string,
    maintainerId: string,
    permissions: {
      add?: string[];
      remove?: string[];
    }
  ): Promise<{
    permissions: string[];
    message: string;
  }> {
    const response = await httpClient.put(
      `/projects/${projectId}/maintainers/${maintainerId}/permissions`,
      permissions
    );
    return response.data;
  }

  /**
   * 获取维护员活动历史
   */
  async getMaintainerActivity(
    projectId: string,
    maintainerId: string,
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
      `/projects/${projectId}/maintainers/${maintainerId}/activity`,
      { params }
    );
    return response.data;
  }

  /**
   * 导出维护员列表
   */
  async exportMaintainers(
    projectId: string,
    format: 'csv' | 'xlsx',
    options?: {
      includeStats?: boolean;
      includePermissions?: boolean;
    }
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    expiresAt: string;
  }> {
    const response = await httpClient.post(
      `/projects/${projectId}/maintainers/export`,
      {
        format,
        ...options,
      }
    );
    return response.data;
  }

  /**
   * 获取维护员的项目贡献统计
   */
  async getMaintainerContribution(
    projectId: string,
    maintainerId: string,
    params?: {
      period?: 'week' | 'month' | 'quarter' | 'year';
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    contribution: {
      documentCount: number;
      editCount: number;
      commentCount: number;
      reviewCount: number;
      score: number;
    };
    timeline: Array<{
      date: string;
      documents: number;
      edits: number;
      comments: number;
      reviews: number;
    }>;
    ranking: {
      position: number;
      total: number;
      percentile: number;
    };
  }> {
    const response = await httpClient.get(
      `/projects/${projectId}/maintainers/${maintainerId}/contribution`,
      { params }
    );
    return response.data;
  }

  /**
   * 转移维护员到其他项目
   */
  async transferMaintainer(
    projectId: string,
    maintainerId: string,
    targetProjectId: string
  ): Promise<{ message: string }> {
    const response = await httpClient.post(
      `/projects/${projectId}/maintainers/${maintainerId}/transfer`,
      {
        targetProjectId,
      }
    );
    return response.data;
  }

  /**
   * 暂停维护员（保留身份但限制访问）
   */
  async suspendMaintainer(
    projectId: string,
    maintainerId: string,
    data: {
      reason: string;
      duration?: number; // 暂停天数，不提供则永久暂停
    }
  ): Promise<ProjectMaintainer> {
    const response = await httpClient.post<ProjectMaintainer>(
      `/projects/${projectId}/maintainers/${maintainerId}/suspend`,
      data
    );
    return response.data;
  }

  /**
   * 恢复被暂停的维护员
   */
  async unsuspendMaintainer(
    projectId: string,
    maintainerId: string
  ): Promise<ProjectMaintainer> {
    const response = await httpClient.post<ProjectMaintainer>(
      `/projects/${projectId}/maintainers/${maintainerId}/unsuspend`
    );
    return response.data;
  }
}

// 创建并导出服务实例
export const maintainerApi = new MaintainerApiService();
export default maintainerApi;