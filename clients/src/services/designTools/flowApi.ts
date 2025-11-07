import { apiClient } from '../api';

export interface FlowNode {
  id: string;
  type: 'start' | 'end' | 'process' | 'decision' | 'input' | 'output' | 'connector' | 'subprocess';
  label: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  properties: {
    description?: string;
    condition?: string;
    script?: string;
    timeout?: number;
    retryCount?: number;
    variables?: Record<string, any>;
  };
  style: {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    shape: 'rectangle' | 'ellipse' | 'diamond' | 'parallelogram' | 'circle';
  };
}

export interface FlowConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  condition?: string;
  style: {
    strokeColor: string;
    strokeWidth: number;
    strokeStyle: 'solid' | 'dashed' | 'dotted';
  };
}

export interface FlowDiagram {
  id: string;
  name: string;
  description?: string;
  type: 'business' | 'technical' | 'user' | 'data' | 'system';
  projectId?: string;
  version: string;
  nodes: FlowNode[];
  connections: FlowConnection[];
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    defaultValue?: any;
    description?: string;
  }>;
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
    showLabels: boolean;
    autoLayout: boolean;
    zoom: number;
    pan: { x: number; y: number };
  };
}

export interface CreateFlowRequest {
  name: string;
  description?: string;
  type: FlowDiagram['type'];
  projectId?: string;
  template?: string;
}

export interface UpdateFlowRequest {
  name?: string;
  description?: string;
  nodes?: FlowNode[];
  connections?: FlowConnection[];
  variables?: FlowDiagram['variables'];
  settings?: Partial<FlowDiagram['settings']>;
  tags?: string[];
  isPublic?: boolean;
}

export interface FlowExecution {
  id: string;
  flowId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  startTime: Date;
  endTime?: Date;
  currentNodeId?: string;
  variables: Record<string, any>;
  steps: Array<{
    nodeId: string;
    startTime: Date;
    endTime?: Date;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    input?: any;
    output?: any;
    error?: string;
    logs: string[];
  }>;
  logs: string[];
}

export interface FlowValidationResult {
  isValid: boolean;
  errors: Array<{
    type: 'error' | 'warning' | 'info';
    nodeId?: string;
    connectionId?: string;
    message: string;
    suggestion?: string;
  }>;
  statistics: {
    nodeCount: number;
    connectionCount: number;
    branchCount: number;
    cycleCount: number;
    deadEndCount: number;
  };
}

class FlowApiService {
  private baseUrl = '/api/v1/design-tools/flows';

  // 获取流程图列表
  async getFlows(params?: {
    projectId?: string;
    type?: string;
    search?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }) {
    const response = await apiClient.get<{
      flows: FlowDiagram[];
      total: number;
      page: number;
      limit: number;
    }>(this.baseUrl, { params });
    return response.data;
  }

  // 获取单个流程图详情
  async getFlow(id: string) {
    const response = await apiClient.get<FlowDiagram>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  // 创建新的流程图
  async createFlow(data: CreateFlowRequest) {
    const response = await apiClient.post<FlowDiagram>(this.baseUrl, data);
    return response.data;
  }

  // 更新流程图
  async updateFlow(id: string, data: UpdateFlowRequest) {
    const response = await apiClient.put<FlowDiagram>(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  // 删除流程图
  async deleteFlow(id: string) {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  // 复制流程图
  async duplicateFlow(id: string, name?: string) {
    const response = await apiClient.post<FlowDiagram>(`${this.baseUrl}/${id}/duplicate`, {
      name: name || `${await this.getFlow(id).then(f => f.name)} (副本)`
    });
    return response.data;
  }

  // 验证流程图
  async validateFlow(id: string) {
    const response = await apiClient.post<FlowValidationResult>(`${this.baseUrl}/${id}/validate`);
    return response.data;
  }

  // 获取流程图模板
  async getTemplates(type?: string, category?: string) {
    const response = await apiClient.get<{
      templates: Array<{
        id: string;
        name: string;
        description: string;
        type: FlowDiagram['type'];
        thumbnail: string;
        category: string;
        tags: string[];
        nodes: Omit<FlowNode, 'id'>[];
        connections: Omit<FlowConnection, 'id' | 'sourceId' | 'targetId'>[];
      }>;
      categories: string[];
    }>(`${this.baseUrl}/templates`, {
      params: { type, category }
    });
    return response.data;
  }

  // 从模板创建流程图
  async createFromTemplate(templateId: string, data: CreateFlowRequest) {
    const response = await apiClient.post<FlowDiagram>(`${this.baseUrl}/templates/${templateId}/create`, data);
    return response.data;
  }

  // 导出流程图
  async exportFlow(id: string, format: 'png' | 'svg' | 'pdf' | 'json' | 'bpmn') {
    const response = await apiClient.get(`${this.baseUrl}/${id}/export`, {
      params: { format },
      responseType: format === 'json' ? 'json' : 'blob'
    });
    return response.data;
  }

  // 导入流程图
  async importFlow(file: File, projectId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) {
      formData.append('projectId', projectId);
    }

    const response = await apiClient.post<FlowDiagram>(`${this.baseUrl}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // 流程执行相关接口

  // 执行流程
  async executeFlow(id: string, input?: Record<string, any>) {
    const response = await apiClient.post<FlowExecution>(`${this.baseUrl}/${id}/execute`, {
      input
    });
    return response.data;
  }

  // 获取执行历史
  async getExecutions(flowId: string, params?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const response = await apiClient.get<{
      executions: FlowExecution[];
      total: number;
      page: number;
      limit: number;
    }>(`${this.baseUrl}/${flowId}/executions`, { params });
    return response.data;
  }

  // 获取执行详情
  async getExecution(flowId: string, executionId: string) {
    const response = await apiClient.get<FlowExecution>(`${this.baseUrl}/${flowId}/executions/${executionId}`);
    return response.data;
  }

  // 暂停执行
  async pauseExecution(flowId: string, executionId: string) {
    await apiClient.post(`${this.baseUrl}/${flowId}/executions/${executionId}/pause`);
  }

  // 恢复执行
  async resumeExecution(flowId: string, executionId: string) {
    await apiClient.post(`${this.baseUrl}/${flowId}/executions/${executionId}/resume`);
  }

  // 停止执行
  async stopExecution(flowId: string, executionId: string) {
    await apiClient.post(`${this.baseUrl}/${flowId}/executions/${executionId}/stop`);
  }

  // 调试相关接口

  // 设置断点
  async setBreakpoint(id: string, nodeId: string, enabled: boolean) {
    await apiClient.post(`${this.baseUrl}/${id}/breakpoints`, {
      nodeId,
      enabled
    });
  }

  // 获取断点列表
  async getBreakpoints(id: string) {
    const response = await apiClient.get<{
      breakpoints: Array<{
        nodeId: string;
        enabled: boolean;
        hitCount: number;
        condition?: string;
      }>;
    }>(`${this.baseUrl}/${id}/breakpoints`);
    return response.data.breakpoints;
  }

  // 单步执行
  async stepExecution(flowId: string, executionId: string) {
    const response = await apiClient.post<{
      currentNodeId: string;
      variables: Record<string, any>;
      logs: string[];
    }>(`${this.baseUrl}/${flowId}/executions/${executionId}/step`);
    return response.data;
  }

  // 获取变量值
  async getVariables(flowId: string, executionId: string) {
    const response = await apiClient.get<Record<string, any>>(`${this.baseUrl}/${flowId}/executions/${executionId}/variables`);
    return response.data;
  }

  // 设置变量值
  async setVariable(flowId: string, executionId: string, name: string, value: any) {
    await apiClient.put(`${this.baseUrl}/${flowId}/executions/${executionId}/variables/${name}`, {
      value
    });
  }

  // 分析和优化相关接口

  // 获取流程分析报告
  async getAnalysis(id: string) {
    const response = await apiClient.get<{
      performance: {
        averageExecutionTime: number;
        successRate: number;
        failureRate: number;
        mostUsedPaths: Array<{
          path: string[];
          usage: number;
        }>;
      };
      bottlenecks: Array<{
        nodeId: string;
        nodeName: string;
        averageTime: number;
        maxTime: number;
        suggestion: string;
      }>;
      suggestions: Array<{
        type: 'optimization' | 'refactor' | 'cleanup';
        priority: 'high' | 'medium' | 'low';
        message: string;
        nodeIds?: string[];
      }>;
    }>(`${this.baseUrl}/${id}/analysis`);
    return response.data;
  }

  // 获取流程指标
  async getMetrics(id: string, timeRange?: string) {
    const response = await apiClient.get<{
      executions: {
        total: number;
        successful: number;
        failed: number;
        averageDuration: number;
      };
      nodes: Array<{
        nodeId: string;
        executionCount: number;
        averageDuration: number;
        failureRate: number;
      }>;
      trends: Array<{
        date: string;
        executions: number;
        successRate: number;
        averageDuration: number;
      }>;
    }>(`${this.baseUrl}/${id}/metrics`, {
      params: { timeRange }
    });
    return response.data;
  }

  // 共享相关接口

  // 共享流程图
  async shareFlow(id: string, settings: {
    isPublic: boolean;
    permissions: 'view' | 'edit' | 'execute';
    expiresAt?: Date;
    password?: string;
  }) {
    const response = await apiClient.post<{
      shareId: string;
      shareUrl: string;
    }>(`${this.baseUrl}/${id}/share`, settings);
    return response.data;
  }

  // 获取共享的流程图
  async getSharedFlow(shareId: string, password?: string) {
    const response = await apiClient.get<FlowDiagram>(`${this.baseUrl}/shared/${shareId}`, {
      params: { password }
    });
    return response.data;
  }

  // 版本控制相关接口

  // 获取版本历史
  async getVersions(id: string) {
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

  // 创建版本
  async createVersion(id: string, comment?: string) {
    const response = await apiClient.post(`${this.baseUrl}/${id}/versions`, {
      comment
    });
    return response.data;
  }

  // 恢复到指定版本
  async restoreVersion(id: string, versionId: string) {
    const response = await apiClient.post<FlowDiagram>(`${this.baseUrl}/${id}/versions/${versionId}/restore`);
    return response.data;
  }

  // 比较版本
  async compareVersions(id: string, fromVersionId: string, toVersionId: string) {
    const response = await apiClient.get<{
      changes: Array<{
        type: 'add' | 'remove' | 'modify';
        target: 'node' | 'connection' | 'variable';
        targetId: string;
        before?: any;
        after?: any;
      }>;
    }>(`${this.baseUrl}/${id}/versions/compare`, {
      params: { from: fromVersionId, to: toVersionId }
    });
    return response.data;
  }
}

export const flowApi = new FlowApiService();