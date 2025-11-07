import httpClient from './httpClient';

// 项目模板基础信息
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  type: 'web' | 'mobile' | 'api' | 'desktop' | 'library';
  category: string;
  tags: string[];
  settings: {
    visibility: 'public' | 'private';
    allowMemberEdit: boolean;
    allowExternalView: boolean;
    allowExternalComment: boolean;
    requireApprovalForChanges: boolean;
    notifications: {
      documentUpdates: boolean;
      memberActivity: boolean;
      statusChanges: boolean;
    };
  };
  structure: Array<{
    type: 'folder' | 'file';
    name: string;
    path: string;
    content?: string;
    template?: string;
  }>;
  previewImage?: string;
  usageCount: number;
  rating: number;
  reviewCount: number;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  isBuiltIn: boolean;
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 创建模板请求数据
export interface CreateTemplateRequest {
  name: string;
  description: string;
  type: 'web' | 'mobile' | 'api' | 'desktop' | 'library';
  category: string;
  tags: string[];
  settings: {
    visibility: 'public' | 'private';
    allowMemberEdit?: boolean;
    allowExternalView?: boolean;
    allowExternalComment?: boolean;
    requireApprovalForChanges?: boolean;
    notifications?: {
      documentUpdates?: boolean;
      memberActivity?: boolean;
      statusChanges?: boolean;
    };
  };
  structure: Array<{
    type: 'folder' | 'file';
    name: string;
    path: string;
    content?: string;
    template?: string;
  }>;
  previewImage?: string;
  isPublic?: boolean;
  sourceProjectId?: string;
}

// 更新模板请求数据
export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  type?: 'web' | 'mobile' | 'api' | 'desktop' | 'library';
  category?: string;
  tags?: string[];
  settings?: {
    visibility?: 'public' | 'private';
    allowMemberEdit?: boolean;
    allowExternalView?: boolean;
    allowExternalComment?: boolean;
    requireApprovalForChanges?: boolean;
    notifications?: {
      documentUpdates?: boolean;
      memberActivity?: boolean;
      statusChanges?: boolean;
    };
  };
  structure?: Array<{
    type: 'folder' | 'file';
    name: string;
    path: string;
    content?: string;
    template?: string;
  }>;
  previewImage?: string;
  isPublic?: boolean;
  isActive?: boolean;
}

// 模板查询参数
export interface TemplateQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: 'web' | 'mobile' | 'api' | 'desktop' | 'library';
  category?: string;
  tags?: string[];
  author?: string;
  isPublic?: boolean;
  isBuiltIn?: boolean;
  sortBy?: 'name' | 'usageCount' | 'rating' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// 模板列表响应数据
export interface TemplateListResponse {
  items: ProjectTemplate[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  categories: string[];
  popularTags: Array<{
    name: string;
    count: number;
  }>;
}

// 模板详情响应数据
export interface TemplateDetailResponse extends ProjectTemplate {
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canPublish: boolean;
    canClone: boolean;
  };
  usage: {
    totalProjects: number;
    recentUsage: Array<{
      projectId: string;
      projectName: string;
      createdBy: {
        id: string;
        name: string;
      };
      createdAt: string;
    }>;
  };
  reviews: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      avatar?: string;
    };
    rating: number;
    comment: string;
    createdAt: string;
  }>;
  versions: Array<{
    id: string;
    version: string;
    description: string;
    isActive: boolean;
    createdAt: string;
  }>;
}

// 模板统计数据
export interface TemplateStatsResponse {
  totalTemplates: number;
  publicTemplates: number;
  builtInTemplates: number;
  userTemplates: number;
  templatesByType: {
    web: number;
    mobile: number;
    api: number;
    desktop: number;
    library: number;
  };
  templatesByCategory: Array<{
    category: string;
    count: number;
  }>;
  popularTemplates: Array<{
    template: ProjectTemplate;
    usageCount: number;
    rating: number;
  }>;
  recentActivity: Array<{
    type: string;
    count: number;
    date: string;
  }>;
}

// 项目模板API服务类
class TemplateApiService {
  /**
   * 获取模板列表
   */
  async getTemplates(params?: TemplateQueryParams): Promise<TemplateListResponse> {
    const response = await httpClient.get<TemplateListResponse>(
      '/templates',
      { params }
    );
    return response.data;
  }

  /**
   * 获取模板详情
   */
  async getTemplateDetail(templateId: string): Promise<TemplateDetailResponse> {
    const response = await httpClient.get<TemplateDetailResponse>(
      `/templates/${templateId}`
    );
    return response.data;
  }

  /**
   * 创建新模板
   */
  async createTemplate(data: CreateTemplateRequest): Promise<ProjectTemplate> {
    const response = await httpClient.post<ProjectTemplate>('/templates', data);
    return response.data;
  }

  /**
   * 更新模板信息
   */
  async updateTemplate(
    templateId: string,
    data: UpdateTemplateRequest
  ): Promise<ProjectTemplate> {
    const response = await httpClient.put<ProjectTemplate>(
      `/templates/${templateId}`,
      data
    );
    return response.data;
  }

  /**
   * 删除模板
   */
  async deleteTemplate(templateId: string): Promise<{ message: string }> {
    const response = await httpClient.delete(`/templates/${templateId}`);
    return response.data;
  }

  /**
   * 复制模板
   */
  async cloneTemplate(
    templateId: string,
    data: {
      name: string;
      description?: string;
      isPublic?: boolean;
    }
  ): Promise<ProjectTemplate> {
    const response = await httpClient.post<ProjectTemplate>(
      `/templates/${templateId}/clone`,
      data
    );
    return response.data;
  }

  /**
   * 从项目创建模板
   */
  async createTemplateFromProject(
    projectId: string,
    data: {
      name: string;
      description: string;
      category: string;
      tags?: string[];
      isPublic?: boolean;
      includeContent?: boolean;
    }
  ): Promise<ProjectTemplate> {
    const response = await httpClient.post<ProjectTemplate>(
      `/projects/${projectId}/create-template`,
      data
    );
    return response.data;
  }

  /**
   * 发布模板到公共库
   */
  async publishTemplate(templateId: string): Promise<ProjectTemplate> {
    const response = await httpClient.post<ProjectTemplate>(
      `/templates/${templateId}/publish`
    );
    return response.data;
  }

  /**
   * 取消发布模板
   */
  async unpublishTemplate(templateId: string): Promise<ProjectTemplate> {
    const response = await httpClient.post<ProjectTemplate>(
      `/templates/${templateId}/unpublish`
    );
    return response.data;
  }

  /**
   * 获取模板统计数据
   */
  async getTemplateStats(): Promise<TemplateStatsResponse> {
    const response = await httpClient.get<TemplateStatsResponse>('/templates/stats');
    return response.data;
  }

  /**
   * 搜索公共模板
   */
  async searchPublicTemplates(params: {
    query: string;
    type?: string;
    category?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }): Promise<TemplateListResponse> {
    const response = await httpClient.get<TemplateListResponse>(
      '/templates/public/search',
      { params }
    );
    return response.data;
  }

  /**
   * 获取模板分类列表
   */
  async getTemplateCategories(): Promise<Array<{
    name: string;
    description: string;
    templateCount: number;
    icon?: string;
  }>> {
    const response = await httpClient.get('/templates/categories');
    return response.data;
  }

  /**
   * 获取模板标签列表
   */
  async getTemplateTags(): Promise<Array<{
    name: string;
    count: number;
    category?: string;
  }>> {
    const response = await httpClient.get('/templates/tags');
    return response.data;
  }

  /**
   * 预览模板结构
   */
  async previewTemplate(templateId: string): Promise<{
    structure: Array<{
      type: 'folder' | 'file';
      name: string;
      path: string;
      size?: number;
      children?: any[];
    }>;
    fileCount: number;
    folderCount: number;
    totalSize: number;
  }> {
    const response = await httpClient.get(`/templates/${templateId}/preview`);
    return response.data;
  }

  /**
   * 评价模板
   */
  async rateTemplate(
    templateId: string,
    data: {
      rating: number;
      comment?: string;
    }
  ): Promise<{
    id: string;
    rating: number;
    comment: string;
    user: {
      id: string;
      name: string;
    };
    createdAt: string;
  }> {
    const response = await httpClient.post(`/templates/${templateId}/rate`, data);
    return response.data;
  }

  /**
   * 获取模板评价列表
   */
  async getTemplateReviews(
    templateId: string,
    params?: {
      page?: number;
      limit?: number;
      rating?: number;
    }
  ): Promise<{
    items: Array<{
      id: string;
      user: {
        id: string;
        name: string;
        avatar?: string;
      };
      rating: number;
      comment: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
    averageRating: number;
    ratingDistribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  }> {
    const response = await httpClient.get(`/templates/${templateId}/reviews`, {
      params,
    });
    return response.data;
  }

  /**
   * 导出模板
   */
  async exportTemplate(
    templateId: string,
    format: 'zip' | 'json'
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    expiresAt: string;
  }> {
    const response = await httpClient.post(`/templates/${templateId}/export`, {
      format,
    });
    return response.data;
  }

  /**
   * 导入模板
   */
  async importTemplate(
    file: File,
    metadata?: {
      name?: string;
      description?: string;
      category?: string;
      isPublic?: boolean;
    }
  ): Promise<ProjectTemplate> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const response = await httpClient.post<ProjectTemplate>(
      '/templates/import',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  /**
   * 获取模板使用历史
   */
  async getTemplateUsage(
    templateId: string,
    params?: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    items: Array<{
      projectId: string;
      projectName: string;
      createdBy: {
        id: string;
        name: string;
        avatar?: string;
      };
      team: {
        id: string;
        name: string;
      };
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
    usageStats: {
      totalUsage: number;
      thisMonth: number;
      lastMonth: number;
      growth: number;
    };
  }> {
    const response = await httpClient.get(`/templates/${templateId}/usage`, {
      params,
    });
    return response.data;
  }

  /**
   * 创建模板版本
   */
  async createTemplateVersion(
    templateId: string,
    data: {
      version: string;
      description: string;
      changes: UpdateTemplateRequest;
    }
  ): Promise<{
    id: string;
    version: string;
    description: string;
    isActive: boolean;
    createdAt: string;
  }> {
    const response = await httpClient.post(
      `/templates/${templateId}/versions`,
      data
    );
    return response.data;
  }

  /**
   * 切换模板版本
   */
  async switchTemplateVersion(
    templateId: string,
    versionId: string
  ): Promise<ProjectTemplate> {
    const response = await httpClient.post<ProjectTemplate>(
      `/templates/${templateId}/versions/${versionId}/activate`
    );
    return response.data;
  }
}

// 创建并导出服务实例
export const templateApi = new TemplateApiService();
export default templateApi;