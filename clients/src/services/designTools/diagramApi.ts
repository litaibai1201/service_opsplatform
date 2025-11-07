import { apiClient } from '../api';

export interface DiagramNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  properties: Record<string, any>;
  style: {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    borderWidth: number;
    borderStyle: string;
  };
}

export interface DiagramConnection {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  label?: string;
  style: {
    strokeColor: string;
    strokeWidth: number;
    strokeStyle: string;
    arrowType: string;
  };
}

export interface Diagram {
  id: string;
  name: string;
  description?: string;
  type: 'architecture' | 'system' | 'component' | 'deployment' | 'network';
  projectId?: string;
  version: string;
  nodes: DiagramNode[];
  connections: DiagramConnection[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    tags: string[];
    isPublic: boolean;
  };
  settings: {
    gridEnabled: boolean;
    snapToGrid: boolean;
    showMinimap: boolean;
    zoom: number;
    pan: { x: number; y: number };
  };
}

export interface CreateDiagramRequest {
  name: string;
  description?: string;
  type: Diagram['type'];
  projectId?: string;
  template?: string;
}

export interface UpdateDiagramRequest {
  name?: string;
  description?: string;
  nodes?: DiagramNode[];
  connections?: DiagramConnection[];
  settings?: Partial<Diagram['settings']>;
  tags?: string[];
  isPublic?: boolean;
}

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  type: Diagram['type'];
  thumbnail: string;
  nodes: Omit<DiagramNode, 'id'>[];
  connections: Omit<DiagramConnection, 'id' | 'sourceId' | 'targetId'>[];
  category: string;
  tags: string[];
}

class DiagramApiService {
  private baseUrl = '/api/v1/design-tools/diagrams';

  // 获取用户的架构图列表
  async getDiagrams(params?: {
    projectId?: string;
    type?: string;
    search?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }) {
    const response = await apiClient.get<{
      diagrams: Diagram[];
      total: number;
      page: number;
      limit: number;
    }>(this.baseUrl, { params });
    return response.data;
  }

  // 获取单个架构图详情
  async getDiagram(id: string) {
    const response = await apiClient.get<Diagram>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  // 创建新的架构图
  async createDiagram(data: CreateDiagramRequest) {
    const response = await apiClient.post<Diagram>(this.baseUrl, data);
    return response.data;
  }

  // 更新架构图
  async updateDiagram(id: string, data: UpdateDiagramRequest) {
    const response = await apiClient.put<Diagram>(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  // 删除架构图
  async deleteDiagram(id: string) {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  // 复制架构图
  async duplicateDiagram(id: string, name?: string) {
    const response = await apiClient.post<Diagram>(`${this.baseUrl}/${id}/duplicate`, {
      name: name || `${await this.getDiagram(id).then(d => d.name)} (副本)`
    });
    return response.data;
  }

  // 获取架构图版本历史
  async getDiagramVersions(id: string) {
    const response = await apiClient.get<{
      versions: Array<{
        id: string;
        version: string;
        createdAt: Date;
        createdBy: string;
        comment?: string;
        changes: string[];
      }>;
    }>(`${this.baseUrl}/${id}/versions`);
    return response.data.versions;
  }

  // 恢复到指定版本
  async restoreDiagramVersion(id: string, versionId: string) {
    const response = await apiClient.post<Diagram>(`${this.baseUrl}/${id}/versions/${versionId}/restore`);
    return response.data;
  }

  // 导出架构图
  async exportDiagram(id: string, format: 'png' | 'svg' | 'pdf' | 'json') {
    const response = await apiClient.get(`${this.baseUrl}/${id}/export`, {
      params: { format },
      responseType: format === 'json' ? 'json' : 'blob'
    });
    return response.data;
  }

  // 导入架构图
  async importDiagram(file: File, projectId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) {
      formData.append('projectId', projectId);
    }

    const response = await apiClient.post<Diagram>(`${this.baseUrl}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // 获取架构图模板
  async getTemplates(type?: string, category?: string) {
    const response = await apiClient.get<{
      templates: DiagramTemplate[];
      categories: string[];
    }>(`${this.baseUrl}/templates`, {
      params: { type, category }
    });
    return response.data;
  }

  // 从模板创建架构图
  async createFromTemplate(templateId: string, data: CreateDiagramRequest) {
    const response = await apiClient.post<Diagram>(`${this.baseUrl}/templates/${templateId}/create`, data);
    return response.data;
  }

  // 共享架构图
  async shareDiagram(id: string, settings: {
    isPublic: boolean;
    permissions: 'view' | 'edit';
    expiresAt?: Date;
    password?: string;
  }) {
    const response = await apiClient.post<{
      shareId: string;
      shareUrl: string;
    }>(`${this.baseUrl}/${id}/share`, settings);
    return response.data;
  }

  // 获取共享的架构图
  async getSharedDiagram(shareId: string, password?: string) {
    const response = await apiClient.get<Diagram>(`${this.baseUrl}/shared/${shareId}`, {
      params: { password }
    });
    return response.data;
  }

  // 协作相关接口

  // 获取在线协作用户
  async getCollaborators(id: string) {
    const response = await apiClient.get<{
      collaborators: Array<{
        userId: string;
        userName: string;
        avatar?: string;
        cursor?: { x: number; y: number };
        lastSeen: Date;
      }>;
    }>(`${this.baseUrl}/${id}/collaborators`);
    return response.data.collaborators;
  }

  // 发送协作操作
  async sendCollaborationOperation(id: string, operation: {
    type: 'node_add' | 'node_update' | 'node_delete' | 'connection_add' | 'connection_update' | 'connection_delete';
    data: any;
    timestamp: number;
  }) {
    await apiClient.post(`${this.baseUrl}/${id}/operations`, operation);
  }

  // 获取架构图操作历史
  async getOperationHistory(id: string, since?: number) {
    const response = await apiClient.get<{
      operations: Array<{
        id: string;
        type: string;
        data: any;
        userId: string;
        userName: string;
        timestamp: number;
      }>;
    }>(`${this.baseUrl}/${id}/operations`, {
      params: { since }
    });
    return response.data.operations;
  }

  // 评论相关接口

  // 获取架构图评论
  async getComments(id: string) {
    const response = await apiClient.get<{
      comments: Array<{
        id: string;
        content: string;
        author: {
          id: string;
          name: string;
          avatar?: string;
        };
        position?: { x: number; y: number };
        nodeId?: string;
        createdAt: Date;
        updatedAt: Date;
        replies: Array<{
          id: string;
          content: string;
          author: {
            id: string;
            name: string;
            avatar?: string;
          };
          createdAt: Date;
        }>;
      }>;
    }>(`${this.baseUrl}/${id}/comments`);
    return response.data.comments;
  }

  // 添加评论
  async addComment(id: string, data: {
    content: string;
    position?: { x: number; y: number };
    nodeId?: string;
  }) {
    const response = await apiClient.post(`${this.baseUrl}/${id}/comments`, data);
    return response.data;
  }

  // 回复评论
  async replyComment(id: string, commentId: string, content: string) {
    const response = await apiClient.post(`${this.baseUrl}/${id}/comments/${commentId}/replies`, {
      content
    });
    return response.data;
  }

  // 删除评论
  async deleteComment(id: string, commentId: string) {
    await apiClient.delete(`${this.baseUrl}/${id}/comments/${commentId}`);
  }
}

export const diagramApi = new DiagramApiService();