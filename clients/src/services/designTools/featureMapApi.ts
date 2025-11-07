import { apiClient } from '../api';

export interface Feature {
  id: string;
  name: string;
  description?: string;
  type: 'epic' | 'feature' | 'story' | 'task' | 'bug';
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled' | 'on-hold';
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: number; // 工作量估计（人天）
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;
  parent?: string;
  children: string[];
  dependencies: string[];
  tags: string[];
  assignee?: string;
  reporter?: string;
  startDate?: Date;
  endDate?: Date;
  dueDate?: Date;
  progress: number; // 0-100
  businessValue?: number; // 1-10
  technicalRisk?: number; // 1-10
  userStoryPoints?: number;
  acceptanceCriteria: string[];
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: 'file' | 'link' | 'image';
    size?: number;
    uploadedAt: Date;
    uploadedBy: string;
  }>;
  comments: Array<{
    id: string;
    author: string;
    content: string;
    timestamp: Date;
    edited?: boolean;
    replies?: Array<{
      id: string;
      author: string;
      content: string;
      timestamp: Date;
    }>;
  }>;
  customFields: Record<string, any>;
}

export interface Connection {
  id: string;
  fromFeature: string;
  toFeature: string;
  type: 'dependency' | 'parent-child' | 'related' | 'blocks' | 'duplicates' | 'subtask';
  label?: string;
  weight?: number; // 关系强度 1-10
  bidirectional?: boolean;
  metadata?: Record<string, any>;
}

export interface Milestone {
  id: string;
  name: string;
  description?: string;
  date: Date;
  type: 'release' | 'sprint' | 'deadline' | 'checkpoint';
  status: 'upcoming' | 'active' | 'completed' | 'overdue';
  features: string[];
  dependencies: string[];
  deliverables: Array<{
    name: string;
    description?: string;
    status: 'pending' | 'in-progress' | 'completed';
    assignee?: string;
  }>;
  criteria: Array<{
    description: string;
    status: 'pending' | 'met' | 'not-met';
    verifiedBy?: string;
    verifiedAt?: Date;
  }>;
}

export interface FeatureMap {
  id: string;
  name: string;
  description?: string;
  version: string;
  projectId?: string;
  features: Feature[];
  connections: Connection[];
  milestones: Milestone[];
  layout: 'mindmap' | 'hierarchy' | 'timeline' | 'kanban' | 'matrix';
  settings: {
    showProgress: boolean;
    showDependencies: boolean;
    showAssignees: boolean;
    showPriorities: boolean;
    showBusinessValue: boolean;
    showTechnicalRisk: boolean;
    showEstimates: boolean;
    autoLayout: boolean;
    theme: 'light' | 'dark';
    gridEnabled: boolean;
    snapToGrid: boolean;
    minimap: boolean;
    zoom: number;
    pan: { x: number; y: number };
  };
  filters: {
    status: string[];
    priority: string[];
    assignee: string[];
    tags: string[];
    type: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    lastModifiedBy: string;
    tags: string[];
    isPublic: boolean;
    isTemplate: boolean;
  };
}

export interface CreateFeatureMapRequest {
  name: string;
  description?: string;
  projectId?: string;
  template?: string;
  layout?: FeatureMap['layout'];
}

export interface UpdateFeatureMapRequest {
  name?: string;
  description?: string;
  features?: Feature[];
  connections?: Connection[];
  milestones?: Milestone[];
  layout?: FeatureMap['layout'];
  settings?: Partial<FeatureMap['settings']>;
  filters?: Partial<FeatureMap['filters']>;
  tags?: string[];
  isPublic?: boolean;
}

export interface FeatureAnalytics {
  overview: {
    totalFeatures: number;
    completedFeatures: number;
    inProgressFeatures: number;
    plannedFeatures: number;
    blockedFeatures: number;
    overallProgress: number;
    averageEffort: number;
    totalEffort: number;
    estimatedCompletion: Date;
  };
  breakdown: {
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byAssignee: Record<string, number>;
    byTag: Record<string, number>;
  };
  trends: Array<{
    date: string;
    completed: number;
    started: number;
    blocked: number;
    velocity: number;
  }>;
  dependencies: {
    criticalPath: string[];
    circularDependencies: string[][];
    bottlenecks: Array<{
      featureId: string;
      blockingCount: number;
      blockedCount: number;
    }>;
  };
  risks: Array<{
    type: 'schedule' | 'dependency' | 'resource' | 'technical';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    features: string[];
    mitigation?: string;
  }>;
}

export interface RoadmapView {
  id: string;
  name: string;
  type: 'timeline' | 'gantt' | 'milestone' | 'release';
  timeRange: {
    start: Date;
    end: Date;
    granularity: 'day' | 'week' | 'month' | 'quarter';
  };
  filters: FeatureMap['filters'];
  groupBy: 'assignee' | 'priority' | 'type' | 'parent' | 'milestone' | 'none';
  settings: {
    showDependencies: boolean;
    showProgress: boolean;
    showCriticalPath: boolean;
    highlightOverdue: boolean;
    compactView: boolean;
  };
}

export interface FeatureTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  features: Omit<Feature, 'id'>[];
  connections: Omit<Connection, 'id' | 'fromFeature' | 'toFeature'>[];
  milestones: Omit<Milestone, 'id' | 'features'>[];
  layout: FeatureMap['layout'];
  thumbnail: string;
  usageCount: number;
  rating: number;
  createdBy: string;
  isPublic: boolean;
}

class FeatureMapApiService {
  private baseUrl = '/api/v1/design-tools/feature-maps';

  // 功能地图管理

  // 获取功能地图列表
  async getFeatureMaps(params?: {
    projectId?: string;
    search?: string;
    tags?: string[];
    isTemplate?: boolean;
    createdBy?: string;
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'features';
    sortOrder?: 'asc' | 'desc';
  }) {
    const response = await apiClient.get<{
      featureMaps: FeatureMap[];
      total: number;
      page: number;
      limit: number;
    }>(this.baseUrl, { params });
    return response.data;
  }

  // 获取单个功能地图详情
  async getFeatureMap(id: string) {
    const response = await apiClient.get<FeatureMap>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  // 创建新的功能地图
  async createFeatureMap(data: CreateFeatureMapRequest) {
    const response = await apiClient.post<FeatureMap>(this.baseUrl, data);
    return response.data;
  }

  // 更新功能地图
  async updateFeatureMap(id: string, data: UpdateFeatureMapRequest) {
    const response = await apiClient.put<FeatureMap>(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  // 删除功能地图
  async deleteFeatureMap(id: string) {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  // 复制功能地图
  async duplicateFeatureMap(id: string, name?: string) {
    const response = await apiClient.post<FeatureMap>(`${this.baseUrl}/${id}/duplicate`, {
      name: name || `${await this.getFeatureMap(id).then(f => f.name)} (副本)`
    });
    return response.data;
  }

  // 功能管理

  // 添加功能
  async addFeature(id: string, feature: Omit<Feature, 'id'>) {
    const response = await apiClient.post<Feature>(`${this.baseUrl}/${id}/features`, feature);
    return response.data;
  }

  // 批量添加功能
  async addFeatures(id: string, features: Omit<Feature, 'id'>[]) {
    const response = await apiClient.post<Feature[]>(`${this.baseUrl}/${id}/features/batch`, {
      features
    });
    return response.data;
  }

  // 更新功能
  async updateFeature(id: string, featureId: string, updates: Partial<Feature>) {
    const response = await apiClient.put<Feature>(`${this.baseUrl}/${id}/features/${featureId}`, updates);
    return response.data;
  }

  // 批量更新功能
  async updateFeatures(id: string, updates: Array<{ id: string; data: Partial<Feature> }>) {
    const response = await apiClient.put<Feature[]>(`${this.baseUrl}/${id}/features/batch`, {
      updates
    });
    return response.data;
  }

  // 删除功能
  async deleteFeature(id: string, featureId: string, deleteChildren?: boolean) {
    await apiClient.delete(`${this.baseUrl}/${id}/features/${featureId}`, {
      params: { deleteChildren }
    });
  }

  // 移动功能
  async moveFeature(id: string, featureId: string, newParentId?: string, index?: number) {
    await apiClient.post(`${this.baseUrl}/${id}/features/${featureId}/move`, {
      newParentId,
      index
    });
  }

  // 连接管理

  // 添加连接
  async addConnection(id: string, connection: Omit<Connection, 'id'>) {
    const response = await apiClient.post<Connection>(`${this.baseUrl}/${id}/connections`, connection);
    return response.data;
  }

  // 更新连接
  async updateConnection(id: string, connectionId: string, updates: Partial<Connection>) {
    const response = await apiClient.put<Connection>(`${this.baseUrl}/${id}/connections/${connectionId}`, updates);
    return response.data;
  }

  // 删除连接
  async deleteConnection(id: string, connectionId: string) {
    await apiClient.delete(`${this.baseUrl}/${id}/connections/${connectionId}`);
  }

  // 里程碑管理

  // 添加里程碑
  async addMilestone(id: string, milestone: Omit<Milestone, 'id'>) {
    const response = await apiClient.post<Milestone>(`${this.baseUrl}/${id}/milestones`, milestone);
    return response.data;
  }

  // 更新里程碑
  async updateMilestone(id: string, milestoneId: string, updates: Partial<Milestone>) {
    const response = await apiClient.put<Milestone>(`${this.baseUrl}/${id}/milestones/${milestoneId}`, updates);
    return response.data;
  }

  // 删除里程碑
  async deleteMilestone(id: string, milestoneId: string) {
    await apiClient.delete(`${this.baseUrl}/${id}/milestones/${milestoneId}`);
  }

  // 分析和报告

  // 获取功能地图分析
  async getAnalytics(id: string, timeRange?: string) {
    const response = await apiClient.get<FeatureAnalytics>(`${this.baseUrl}/${id}/analytics`, {
      params: { timeRange }
    });
    return response.data;
  }

  // 获取依赖分析
  async getDependencyAnalysis(id: string) {
    const response = await apiClient.get<{
      criticalPath: Array<{
        featureId: string;
        featureName: string;
        duration: number;
        startDate: Date;
        endDate: Date;
      }>;
      circularDependencies: Array<{
        cycle: string[];
        impact: 'low' | 'medium' | 'high';
        suggestion: string;
      }>;
      orphanedFeatures: string[];
      bottlenecks: Array<{
        featureId: string;
        featureName: string;
        blockingCount: number;
        blockedFeatures: string[];
        impact: number;
      }>;
      parallelTracks: Array<{
        name: string;
        features: string[];
        duration: number;
        resources: string[];
      }>;
    }>(`${this.baseUrl}/${id}/dependency-analysis`);
    return response.data;
  }

  // 获取进度报告
  async getProgressReport(id: string, groupBy?: string) {
    const response = await apiClient.get<{
      overall: {
        totalFeatures: number;
        completedFeatures: number;
        progressPercentage: number;
        estimatedCompletion: Date;
        onTrack: boolean;
        velocity: number;
      };
      groups: Array<{
        name: string;
        features: number;
        completed: number;
        inProgress: number;
        planned: number;
        blocked: number;
        progressPercentage: number;
        estimatedCompletion?: Date;
      }>;
      timeline: Array<{
        date: string;
        completed: number;
        started: number;
        velocity: number;
        burndown: number;
      }>;
    }>(`${this.baseUrl}/${id}/progress-report`, {
      params: { groupBy }
    });
    return response.data;
  }

  // 获取资源分配报告
  async getResourceAllocation(id: string) {
    const response = await apiClient.get<{
      assignees: Array<{
        name: string;
        totalFeatures: number;
        completedFeatures: number;
        totalEffort: number;
        completedEffort: number;
        utilization: number;
        overallocation: boolean;
        workload: Array<{
          date: string;
          effort: number;
          features: string[];
        }>;
      }>;
      unassigned: {
        features: number;
        effort: number;
      };
      recommendations: Array<{
        type: 'rebalance' | 'reassign' | 'split';
        priority: 'high' | 'medium' | 'low';
        description: string;
        affectedFeatures: string[];
        affectedAssignees: string[];
      }>;
    }>(`${this.baseUrl}/${id}/resource-allocation`);
    return response.data;
  }

  // 路线图视图

  // 获取路线图视图
  async getRoadmapViews(id: string) {
    const response = await apiClient.get<RoadmapView[]>(`${this.baseUrl}/${id}/roadmap-views`);
    return response.data;
  }

  // 创建路线图视图
  async createRoadmapView(id: string, view: Omit<RoadmapView, 'id'>) {
    const response = await apiClient.post<RoadmapView>(`${this.baseUrl}/${id}/roadmap-views`, view);
    return response.data;
  }

  // 更新路线图视图
  async updateRoadmapView(id: string, viewId: string, updates: Partial<RoadmapView>) {
    const response = await apiClient.put<RoadmapView>(`${this.baseUrl}/${id}/roadmap-views/${viewId}`, updates);
    return response.data;
  }

  // 删除路线图视图
  async deleteRoadmapView(id: string, viewId: string) {
    await apiClient.delete(`${this.baseUrl}/${id}/roadmap-views/${viewId}`);
  }

  // 导入导出

  // 导出功能地图
  async exportFeatureMap(id: string, format: 'json' | 'csv' | 'xlsx' | 'png' | 'pdf' | 'miro' | 'jira', options?: {
    includeComments?: boolean;
    includeAttachments?: boolean;
    dateRange?: { start: Date; end: Date };
    filters?: Partial<FeatureMap['filters']>;
  }) {
    const response = await apiClient.get(`${this.baseUrl}/${id}/export`, {
      params: { format, ...options },
      responseType: format === 'json' ? 'json' : 'blob'
    });
    return response.data;
  }

  // 导入功能地图
  async importFeatureMap(file: File, options: {
    projectId?: string;
    merge?: boolean;
    preserveIds?: boolean;
    mapUsers?: Record<string, string>;
  }) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify(options));

    const response = await apiClient.post<FeatureMap>(`${this.baseUrl}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // 从外部工具导入
  async importFromTool(source: 'jira' | 'trello' | 'asana' | 'linear' | 'github', config: {
    apiKey?: string;
    projectKey?: string;
    boardId?: string;
    filters?: Record<string, any>;
    mapping?: Record<string, string>;
  }, projectId?: string) {
    const response = await apiClient.post<FeatureMap>(`${this.baseUrl}/import-${source}`, {
      config,
      projectId
    });
    return response.data;
  }

  // 模板管理

  // 获取功能地图模板
  async getTemplates(params?: {
    category?: string;
    tags?: string[];
    search?: string;
    sortBy?: 'name' | 'rating' | 'usageCount' | 'createdAt';
    page?: number;
    limit?: number;
  }) {
    const response = await apiClient.get<{
      templates: FeatureTemplate[];
      categories: string[];
      total: number;
      page: number;
      limit: number;
    }>(`${this.baseUrl}/templates`, { params });
    return response.data;
  }

  // 从模板创建功能地图
  async createFromTemplate(templateId: string, data: CreateFeatureMapRequest) {
    const response = await apiClient.post<FeatureMap>(`${this.baseUrl}/templates/${templateId}/create`, data);
    return response.data;
  }

  // 保存为模板
  async saveAsTemplate(id: string, template: {
    name: string;
    description: string;
    category: string;
    tags: string[];
    isPublic: boolean;
  }) {
    const response = await apiClient.post<FeatureTemplate>(`${this.baseUrl}/${id}/save-as-template`, template);
    return response.data;
  }

  // 协作功能

  // 获取协作者
  async getCollaborators(id: string) {
    const response = await apiClient.get<{
      collaborators: Array<{
        userId: string;
        userName: string;
        email: string;
        avatar?: string;
        role: 'owner' | 'editor' | 'viewer';
        permissions: string[];
        lastSeen: Date;
        isOnline: boolean;
        cursor?: { x: number; y: number };
        selection?: string[];
      }>;
    }>(`${this.baseUrl}/${id}/collaborators`);
    return response.data.collaborators;
  }

  // 邀请协作者
  async inviteCollaborator(id: string, data: {
    email: string;
    role: 'editor' | 'viewer';
    message?: string;
  }) {
    await apiClient.post(`${this.baseUrl}/${id}/collaborators/invite`, data);
  }

  // 更新协作者权限
  async updateCollaboratorRole(id: string, userId: string, role: 'editor' | 'viewer') {
    await apiClient.put(`${this.baseUrl}/${id}/collaborators/${userId}`, { role });
  }

  // 移除协作者
  async removeCollaborator(id: string, userId: string) {
    await apiClient.delete(`${this.baseUrl}/${id}/collaborators/${userId}`);
  }

  // 实时协作操作
  async sendCollaborationEvent(id: string, event: {
    type: 'cursor_move' | 'selection_change' | 'feature_edit' | 'comment_add';
    data: any;
    timestamp: number;
  }) {
    await apiClient.post(`${this.baseUrl}/${id}/collaboration/events`, event);
  }

  // 评论功能

  // 获取评论
  async getComments(id: string, featureId?: string) {
    const response = await apiClient.get<Feature['comments']>(`${this.baseUrl}/${id}/comments`, {
      params: { featureId }
    });
    return response.data;
  }

  // 添加评论
  async addComment(id: string, featureId: string, content: string) {
    const response = await apiClient.post(`${this.baseUrl}/${id}/features/${featureId}/comments`, {
      content
    });
    return response.data;
  }

  // 回复评论
  async replyComment(id: string, featureId: string, commentId: string, content: string) {
    const response = await apiClient.post(`${this.baseUrl}/${id}/features/${featureId}/comments/${commentId}/replies`, {
      content
    });
    return response.data;
  }

  // 删除评论
  async deleteComment(id: string, featureId: string, commentId: string) {
    await apiClient.delete(`${this.baseUrl}/${id}/features/${featureId}/comments/${commentId}`);
  }

  // 版本控制

  // 获取版本历史
  async getVersions(id: string) {
    const response = await apiClient.get<{
      versions: Array<{
        id: string;
        version: string;
        createdAt: Date;
        createdBy: string;
        comment?: string;
        changes: Array<{
          type: 'create' | 'update' | 'delete' | 'move';
          target: 'feature' | 'connection' | 'milestone';
          targetId: string;
          targetName: string;
          description: string;
        }>;
        statistics: {
          featuresAdded: number;
          featuresModified: number;
          featuresDeleted: number;
          connectionsChanged: number;
        };
      }>;
    }>(`${this.baseUrl}/${id}/versions`);
    return response.data.versions;
  }

  // 创建版本
  async createVersion(id: string, comment?: string) {
    const response = await apiClient.post(`${this.baseUrl}/${id}/versions`, {
      comment
    });
    return response.data;
  }

  // 恢复到指定版本
  async restoreVersion(id: string, versionId: string) {
    const response = await apiClient.post<FeatureMap>(`${this.baseUrl}/${id}/versions/${versionId}/restore`);
    return response.data;
  }

  // 比较版本
  async compareVersions(id: string, fromVersionId: string, toVersionId: string) {
    const response = await apiClient.get<{
      differences: Array<{
        type: 'create' | 'update' | 'delete' | 'move';
        target: 'feature' | 'connection' | 'milestone';
        targetId: string;
        targetName: string;
        before?: any;
        after?: any;
        impact: 'low' | 'medium' | 'high';
        description: string;
      }>;
      summary: {
        totalChanges: number;
        featuresChanged: number;
        connectionsChanged: number;
        milestonesChanged: number;
        impactLevel: 'low' | 'medium' | 'high';
      };
    }>(`${this.baseUrl}/${id}/versions/compare`, {
      params: { from: fromVersionId, to: toVersionId }
    });
    return response.data;
  }

  // 共享和发布

  // 共享功能地图
  async shareFeatureMap(id: string, settings: {
    isPublic: boolean;
    permissions: 'view' | 'comment' | 'edit';
    expiresAt?: Date;
    password?: string;
    allowExport?: boolean;
    showComments?: boolean;
    showProgress?: boolean;
  }) {
    const response = await apiClient.post<{
      shareId: string;
      shareUrl: string;
    }>(`${this.baseUrl}/${id}/share`, settings);
    return response.data;
  }

  // 获取共享的功能地图
  async getSharedFeatureMap(shareId: string, password?: string) {
    const response = await apiClient.get<FeatureMap>(`${this.baseUrl}/shared/${shareId}`, {
      params: { password }
    });
    return response.data;
  }

  // 发布到路线图
  async publishRoadmap(id: string, settings: {
    title: string;
    description?: string;
    timeRange: { start: Date; end: Date };
    visibility: 'public' | 'internal' | 'private';
    includeMilestones: boolean;
    includeProgress: boolean;
    autoUpdate: boolean;
    theme: 'light' | 'dark' | 'brand';
  }) {
    const response = await apiClient.post<{
      roadmapId: string;
      roadmapUrl: string;
    }>(`${this.baseUrl}/${id}/publish-roadmap`, settings);
    return response.data;
  }

  // 集成和同步

  // 连接外部工具
  async connectExternalTool(id: string, tool: 'jira' | 'github' | 'slack' | 'teams', config: {
    apiKey?: string;
    webhookUrl?: string;
    projectKey?: string;
    repoUrl?: string;
    channelId?: string;
    syncSettings: {
      bidirectional: boolean;
      syncFields: string[];
      syncInterval: number;
      conflictResolution: 'manual' | 'external_wins' | 'internal_wins';
    };
  }) {
    const response = await apiClient.post(`${this.baseUrl}/${id}/integrations/${tool}`, config);
    return response.data;
  }

  // 同步外部数据
  async syncExternalData(id: string, tool: string, options?: {
    dryRun?: boolean;
    fields?: string[];
    dateRange?: { start: Date; end: Date };
  }) {
    const response = await apiClient.post<{
      changes: Array<{
        type: 'create' | 'update' | 'delete';
        target: string;
        description: string;
        conflicts?: Array<{
          field: string;
          localValue: any;
          externalValue: any;
        }>;
      }>;
      conflicts: number;
      applied: number;
    }>(`${this.baseUrl}/${id}/sync/${tool}`, options);
    return response.data;
  }

  // 断开外部工具连接
  async disconnectExternalTool(id: string, tool: string) {
    await apiClient.delete(`${this.baseUrl}/${id}/integrations/${tool}`);
  }
}

export const featureMapApi = new FeatureMapApiService();