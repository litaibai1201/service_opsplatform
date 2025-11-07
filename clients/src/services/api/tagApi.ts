import httpClient from './httpClient';

// 标签基础信息
export interface Tag {
  id: string;
  name: string;
  description?: string;
  color: string;
  category: 'technology' | 'framework' | 'language' | 'purpose' | 'status' | 'custom';
  icon?: string;
  isBuiltIn: boolean;
  isActive: boolean;
  usageCount: number;
  projectCount: number;
  templateCount: number;
  createdBy?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

// 创建标签请求数据
export interface CreateTagRequest {
  name: string;
  description?: string;
  color: string;
  category: 'technology' | 'framework' | 'language' | 'purpose' | 'status' | 'custom';
  icon?: string;
  isActive?: boolean;
}

// 更新标签请求数据
export interface UpdateTagRequest {
  name?: string;
  description?: string;
  color?: string;
  category?: 'technology' | 'framework' | 'language' | 'purpose' | 'status' | 'custom';
  icon?: string;
  isActive?: boolean;
}

// 标签查询参数
export interface TagQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: 'technology' | 'framework' | 'language' | 'purpose' | 'status' | 'custom';
  isBuiltIn?: boolean;
  isActive?: boolean;
  sortBy?: 'name' | 'usageCount' | 'projectCount' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// 标签列表响应数据
export interface TagListResponse {
  items: Tag[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  categories: Array<{
    category: string;
    count: number;
    description: string;
  }>;
}

// 标签详情响应数据
export interface TagDetailResponse extends Tag {
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
  };
  usage: {
    projects: Array<{
      id: string;
      name: string;
      type: string;
      team: {
        id: string;
        name: string;
      };
      createdAt: string;
    }>;
    templates: Array<{
      id: string;
      name: string;
      type: string;
      usageCount: number;
      createdAt: string;
    }>;
    trends: Array<{
      date: string;
      projectCount: number;
      templateCount: number;
    }>;
  };
  relatedTags: Tag[];
}

// 标签统计数据
export interface TagStatsResponse {
  totalTags: number;
  activeTags: number;
  builtInTags: number;
  customTags: number;
  tagsByCategory: {
    technology: number;
    framework: number;
    language: number;
    purpose: number;
    status: number;
    custom: number;
  };
  popularTags: Array<{
    tag: Tag;
    usageCount: number;
    growth: number;
  }>;
  recentTags: Tag[];
  usageTrends: Array<{
    date: string;
    totalUsage: number;
    newTags: number;
  }>;
}

// 批量标签操作
export interface BatchTagOperation {
  action: 'create' | 'update' | 'delete' | 'activate' | 'deactivate';
  tags: Array<{
    id?: string;
    name?: string;
    description?: string;
    color?: string;
    category?: string;
    icon?: string;
  }>;
}

// 标签建议响应
export interface TagSuggestionsResponse {
  suggestions: Array<{
    tag: Tag;
    score: number;
    reason: string;
    context: string;
  }>;
  recommendations: Array<{
    tag: Tag;
    popularity: number;
    relevance: number;
  }>;
}

// 标签API服务类
class TagApiService {
  /**
   * 获取标签列表
   */
  async getTags(params?: TagQueryParams): Promise<TagListResponse> {
    const response = await httpClient.get<TagListResponse>('/tags', { params });
    return response.data;
  }

  /**
   * 获取标签详情
   */
  async getTagDetail(tagId: string): Promise<TagDetailResponse> {
    const response = await httpClient.get<TagDetailResponse>(`/tags/${tagId}`);
    return response.data;
  }

  /**
   * 创建新标签
   */
  async createTag(data: CreateTagRequest): Promise<Tag> {
    const response = await httpClient.post<Tag>('/tags', data);
    return response.data;
  }

  /**
   * 更新标签信息
   */
  async updateTag(tagId: string, data: UpdateTagRequest): Promise<Tag> {
    const response = await httpClient.put<Tag>(`/tags/${tagId}`, data);
    return response.data;
  }

  /**
   * 删除标签
   */
  async deleteTag(tagId: string, force?: boolean): Promise<{ message: string }> {
    const response = await httpClient.delete(`/tags/${tagId}`, {
      params: { force },
    });
    return response.data;
  }

  /**
   * 激活/停用标签
   */
  async toggleTagStatus(tagId: string, isActive: boolean): Promise<Tag> {
    const response = await httpClient.patch<Tag>(`/tags/${tagId}/status`, {
      isActive,
    });
    return response.data;
  }

  /**
   * 批量操作标签
   */
  async batchOperateTags(operation: BatchTagOperation): Promise<{
    success: Tag[];
    failed: Array<{
      tag: any;
      error: string;
    }>;
    message: string;
  }> {
    const response = await httpClient.post('/tags/batch', operation);
    return response.data;
  }

  /**
   * 搜索标签
   */
  async searchTags(params: {
    query: string;
    category?: string;
    includeInactive?: boolean;
    limit?: number;
  }): Promise<{
    items: Tag[];
    total: number;
    suggestions: string[];
  }> {
    const response = await httpClient.get('/tags/search', { params });
    return response.data;
  }

  /**
   * 获取热门标签
   */
  async getPopularTags(params?: {
    category?: string;
    period?: 'week' | 'month' | 'quarter' | 'year';
    limit?: number;
  }): Promise<Array<{
    tag: Tag;
    usageCount: number;
    growth: number;
    rank: number;
  }>> {
    const response = await httpClient.get('/tags/popular', { params });
    return response.data;
  }

  /**
   * 获取标签统计数据
   */
  async getTagStats(): Promise<TagStatsResponse> {
    const response = await httpClient.get<TagStatsResponse>('/tags/stats');
    return response.data;
  }

  /**
   * 获取标签分类列表
   */
  async getTagCategories(): Promise<Array<{
    category: string;
    name: string;
    description: string;
    count: number;
    color: string;
    icon?: string;
  }>> {
    const response = await httpClient.get('/tags/categories');
    return response.data;
  }

  /**
   * 获取标签建议
   */
  async getTagSuggestions(params: {
    context: 'project' | 'template';
    projectType?: string;
    description?: string;
    existingTags?: string[];
    limit?: number;
  }): Promise<TagSuggestionsResponse> {
    const response = await httpClient.post<TagSuggestionsResponse>(
      '/tags/suggestions',
      params
    );
    return response.data;
  }

  /**
   * 合并标签
   */
  async mergeTags(
    sourceTagId: string,
    targetTagId: string,
    options?: {
      deleteSource?: boolean;
      transferUsage?: boolean;
    }
  ): Promise<{
    mergedTag: Tag;
    transferredCount: number;
    message: string;
  }> {
    const response = await httpClient.post(`/tags/${sourceTagId}/merge`, {
      targetTagId,
      ...options,
    });
    return response.data;
  }

  /**
   * 获取标签使用历史
   */
  async getTagUsageHistory(
    tagId: string,
    params?: {
      page?: number;
      limit?: number;
      type?: 'project' | 'template';
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    items: Array<{
      id: string;
      type: 'project' | 'template';
      target: {
        id: string;
        name: string;
      };
      action: 'added' | 'removed';
      actor: {
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
      projectUsage: number;
      templateUsage: number;
      recentGrowth: number;
    };
  }> {
    const response = await httpClient.get(`/tags/${tagId}/usage`, { params });
    return response.data;
  }

  /**
   * 获取相关标签
   */
  async getRelatedTags(
    tagId: string,
    params?: {
      limit?: number;
      threshold?: number;
    }
  ): Promise<Array<{
    tag: Tag;
    correlation: number;
    coOccurrence: number;
    relevanceScore: number;
  }>> {
    const response = await httpClient.get(`/tags/${tagId}/related`, { params });
    return response.data;
  }

  /**
   * 导出标签数据
   */
  async exportTags(
    format: 'csv' | 'json' | 'xlsx',
    options?: {
      includeUsage?: boolean;
      includeStats?: boolean;
      category?: string;
    }
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    expiresAt: string;
  }> {
    const response = await httpClient.post('/tags/export', {
      format,
      ...options,
    });
    return response.data;
  }

  /**
   * 导入标签数据
   */
  async importTags(
    file: File,
    options?: {
      skipDuplicates?: boolean;
      updateExisting?: boolean;
      defaultCategory?: string;
    }
  ): Promise<{
    imported: Tag[];
    skipped: Array<{
      name: string;
      reason: string;
    }>;
    failed: Array<{
      name: string;
      error: string;
    }>;
    summary: {
      total: number;
      imported: number;
      skipped: number;
      failed: number;
    };
  }> {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const response = await httpClient.post('/tags/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * 获取标签使用趋势
   */
  async getTagTrends(params?: {
    tagIds?: string[];
    period?: 'week' | 'month' | 'quarter' | 'year';
    startDate?: string;
    endDate?: string;
    granularity?: 'day' | 'week' | 'month';
  }): Promise<{
    trends: Array<{
      tagId: string;
      tagName: string;
      data: Array<{
        date: string;
        usage: number;
        projects: number;
        templates: number;
      }>;
    }>;
    summary: {
      totalUsage: number;
      growth: number;
      topTags: Array<{
        tagId: string;
        tagName: string;
        usage: number;
        growth: number;
      }>;
    };
  }> {
    const response = await httpClient.get('/tags/trends', { params });
    return response.data;
  }

  /**
   * 清理未使用的标签
   */
  async cleanupUnusedTags(
    criteria?: {
      minUsage?: number;
      daysSinceLastUse?: number;
      excludeBuiltIn?: boolean;
      dryRun?: boolean;
    }
  ): Promise<{
    candidates: Tag[];
    removed: Tag[];
    summary: {
      total: number;
      removed: number;
      spaceSaved: number;
    };
  }> {
    const response = await httpClient.post('/tags/cleanup', criteria);
    return response.data;
  }

  /**
   * 验证标签名称
   */
  async validateTagName(name: string): Promise<{
    isValid: boolean;
    isAvailable: boolean;
    suggestions: string[];
    conflicts: Array<{
      id: string;
      name: string;
      similarity: number;
    }>;
  }> {
    const response = await httpClient.post('/tags/validate', { name });
    return response.data;
  }
}

// 创建并导出服务实例
export const tagApi = new TagApiService();
export default tagApi;