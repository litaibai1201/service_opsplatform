import httpClient from './httpClient';
import { API_CONFIG } from './apiConfig';
import { Project, ProjectMaintainer } from '@/types/entities';

// 创建项目请求数据
export interface CreateProjectRequest {
  name: string;
  description?: string;
  type: 'web' | 'mobile' | 'api' | 'desktop' | 'library';
  teamId: string;
  visibility: 'public' | 'private';
  priority?: 'high' | 'medium' | 'low';
  allowMemberEdit?: boolean;
  allowExternalView?: boolean;
  allowExternalComment?: boolean;
  templateId?: string;
}

// 更新项目请求数据
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  type?: 'web' | 'mobile' | 'api' | 'desktop' | 'library';
  visibility?: 'public' | 'private';
  priority?: 'high' | 'medium' | 'low';
  status?: 'active' | 'completed' | 'paused' | 'archived' | 'planning';
  allowMemberEdit?: boolean;
  allowExternalView?: boolean;
  allowExternalComment?: boolean;
  progress?: number;
  dueDate?: string;
  settings?: {
    requireApprovalForChanges?: boolean;
    notifications?: {
      documentUpdates?: boolean;
      memberActivity?: boolean;
      statusChanges?: boolean;
    };
  };
}

// 项目查询参数
export interface ProjectQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  teamId?: string;
  type?: 'web' | 'mobile' | 'api' | 'desktop' | 'library';
  status?: 'active' | 'completed' | 'paused' | 'archived' | 'planning';
  priority?: 'high' | 'medium' | 'low';
  visibility?: 'public' | 'private';
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'progress' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

// 项目列表响应数据
export interface ProjectListResponse {
  items: Project[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// 项目详情响应数据
export interface ProjectDetailResponse extends Project {
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canManageMembers: boolean;
    canDeploy: boolean;
    canArchive: boolean;
  };
  team?: {
    id: string;
    name: string;
  };
  maintainers?: ProjectMaintainer[];
  documentCount?: number;
  activityCount?: number;
}

// 项目统计数据
export interface ProjectStatsResponse {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  archivedProjects: number;
  projectsByType: {
    web: number;
    mobile: number;
    api: number;
    desktop: number;
    library: number;
  };
  projectsByPriority: {
    high: number;
    medium: number;
    low: number;
  };
  recentActivity: Array<{
    type: string;
    count: number;
    date: string;
  }>;
}

// 项目API服务类
class ProjectApiService {
  /**
   * 获取项目列表
   */
  async getProjects(params?: ProjectQueryParams): Promise<ProjectListResponse> {
    const response = await httpClient.get<ProjectListResponse>(
      '/projects',
      { params }
    );
    return response.data;
  }

  /**
   * 创建新项目
   */
  async createProject(data: CreateProjectRequest): Promise<Project> {
    const response = await httpClient.post<Project>('/projects', data);
    return response.data;
  }

  /**
   * 获取项目详情
   */
  async getProjectDetail(projectId: string): Promise<ProjectDetailResponse> {
    const response = await httpClient.get<ProjectDetailResponse>(
      `/projects/${projectId}`
    );
    return response.data;
  }

  /**
   * 更新项目信息
   */
  async updateProject(projectId: string, data: UpdateProjectRequest): Promise<Project> {
    const response = await httpClient.put<Project>(`/projects/${projectId}`, data);
    return response.data;
  }

  /**
   * 删除项目
   */
  async deleteProject(projectId: string): Promise<{ message: string }> {
    const response = await httpClient.delete(`/projects/${projectId}`);
    return response.data;
  }

  /**
   * 归档项目
   */
  async archiveProject(projectId: string): Promise<Project> {
    const response = await httpClient.post<Project>(`/projects/${projectId}/archive`);
    return response.data;
  }

  /**
   * 恢复归档的项目
   */
  async unarchiveProject(projectId: string): Promise<Project> {
    const response = await httpClient.post<Project>(`/projects/${projectId}/unarchive`);
    return response.data;
  }

  /**
   * 部署项目
   */
  async deployProject(
    projectId: string,
    deployConfig?: {
      environment: string;
      branch?: string;
      variables?: Record<string, string>;
    }
  ): Promise<{
    deploymentId: string;
    status: string;
    url?: string;
    message: string;
  }> {
    const response = await httpClient.post(
      `/projects/${projectId}/deploy`,
      deployConfig
    );
    return response.data;
  }

  /**
   * 获取项目统计数据
   */
  async getProjectStats(projectId?: string): Promise<ProjectStatsResponse> {
    const url = projectId ? `/projects/${projectId}/stats` : '/projects/stats';
    const response = await httpClient.get<ProjectStatsResponse>(url);
    return response.data;
  }

  /**
   * 复制项目
   */
  async cloneProject(
    projectId: string,
    data: {
      name: string;
      description?: string;
      teamId?: string;
      includeContent?: boolean;
    }
  ): Promise<Project> {
    const response = await httpClient.post<Project>(
      `/projects/${projectId}/clone`,
      data
    );
    return response.data;
  }

  /**
   * 获取项目活动日志
   */
  async getProjectActivity(projectId: string, params?: {
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
    const response = await httpClient.get(`/projects/${projectId}/activity`, {
      params,
    });
    return response.data;
  }

  /**
   * 搜索公开项目
   */
  async searchPublicProjects(params: {
    query: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<ProjectListResponse> {
    const response = await httpClient.get<ProjectListResponse>(
      '/projects/public/search',
      { params }
    );
    return response.data;
  }

  /**
   * 获取项目文档列表
   */
  async getProjectDocuments(projectId: string, params?: {
    page?: number;
    limit?: number;
    type?: string;
    search?: string;
  }): Promise<{
    items: Array<{
      id: string;
      name: string;
      type: string;
      size: number;
      createdAt: string;
      updatedAt: string;
      createdBy: {
        id: string;
        name: string;
      };
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await httpClient.get(`/projects/${projectId}/documents`, {
      params,
    });
    return response.data;
  }

  /**
   * 上传项目文档
   */
  async uploadDocument(
    projectId: string,
    file: File,
    metadata?: {
      type?: string;
      description?: string;
    },
    onProgress?: (progress: number) => void
  ): Promise<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const response = await httpClient.upload(
      `/projects/${projectId}/documents`,
      file,
      onProgress,
      metadata
    );
    return response.data;
  }

  /**
   * 导出项目数据
   */
  async exportProject(
    projectId: string,
    format: 'json' | 'pdf' | 'markdown',
    options?: {
      includeDocuments?: boolean;
      includeActivity?: boolean;
      includeMembers?: boolean;
    }
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    expiresAt: string;
  }> {
    const response = await httpClient.post(`/projects/${projectId}/export`, {
      format,
      ...options,
    });
    return response.data;
  }

  /**
   * 获取项目部署历史
   */
  async getDeploymentHistory(projectId: string): Promise<Array<{
    id: string;
    environment: string;
    status: 'pending' | 'success' | 'failed' | 'cancelled';
    branch?: string;
    commit?: string;
    deployedBy: {
      id: string;
      name: string;
    };
    deployedAt: string;
    url?: string;
    logs?: string;
  }>> {
    const response = await httpClient.get(`/projects/${projectId}/deployments`);
    return response.data;
  }

  /**
   * 获取项目模板列表
   */
  async getProjectTemplates(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    category: string;
    settings: Partial<CreateProjectRequest>;
    previewImage?: string;
    usageCount: number;
  }>> {
    const response = await httpClient.get('/projects/templates');
    return response.data;
  }

  /**
   * 从模板创建项目
   */
  async createProjectFromTemplate(
    templateId: string,
    data: {
      name: string;
      description?: string;
      teamId: string;
    }
  ): Promise<Project> {
    const response = await httpClient.post<Project>(
      `/projects/templates/${templateId}/create`,
      data
    );
    return response.data;
  }
}

// 创建并导出服务实例
export const projectApi = new ProjectApiService();
export default projectApi;