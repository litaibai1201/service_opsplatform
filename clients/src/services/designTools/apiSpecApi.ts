import { apiClient } from '../api';

export interface ApiParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required: boolean;
  schema: {
    type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
    format?: string;
    enum?: any[];
    example?: any;
    default?: any;
    minimum?: number;
    maximum?: number;
    pattern?: string;
    items?: any;
    properties?: Record<string, any>;
  };
}

export interface ApiRequestBody {
  description?: string;
  required: boolean;
  content: Record<string, {
    schema: any;
    example?: any;
    examples?: Record<string, any>;
  }>;
}

export interface ApiResponse {
  description: string;
  headers?: Record<string, {
    description?: string;
    schema: any;
  }>;
  content?: Record<string, {
    schema: any;
    example?: any;
    examples?: Record<string, any>;
  }>;
}

export interface ApiEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  summary: string;
  description?: string;
  operationId?: string;
  tags: string[];
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: Record<string, ApiResponse>;
  security?: string[];
  deprecated?: boolean;
  servers?: Array<{
    url: string;
    description?: string;
  }>;
}

export interface ApiSpec {
  id: string;
  name: string;
  description?: string;
  version: string;
  projectId?: string;
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    termsOfService?: string;
    contact?: {
      name?: string;
      url?: string;
      email?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers: Array<{
    url: string;
    description?: string;
    variables?: Record<string, {
      default: string;
      enum?: string[];
      description?: string;
    }>;
  }>;
  paths: Record<string, Record<string, ApiEndpoint>>;
  components: {
    schemas: Record<string, any>;
    responses: Record<string, ApiResponse>;
    parameters: Record<string, ApiParameter>;
    examples: Record<string, any>;
    requestBodies: Record<string, ApiRequestBody>;
    headers: Record<string, any>;
    securitySchemes: Record<string, {
      type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
      description?: string;
      name?: string;
      in?: 'query' | 'header' | 'cookie';
      scheme?: string;
      bearerFormat?: string;
      flows?: any;
      openIdConnectUrl?: string;
    }>;
  };
  security?: Array<Record<string, string[]>>;
  tags: Array<{
    name: string;
    description?: string;
    externalDocs?: {
      description?: string;
      url: string;
    };
  }>;
  externalDocs?: {
    description?: string;
    url: string;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    tags: string[];
    isPublic: boolean;
  };
}

export interface CreateApiSpecRequest {
  name: string;
  description?: string;
  projectId?: string;
  template?: string;
  version?: string;
}

export interface UpdateApiSpecRequest {
  name?: string;
  description?: string;
  info?: Partial<ApiSpec['info']>;
  servers?: ApiSpec['servers'];
  paths?: ApiSpec['paths'];
  components?: Partial<ApiSpec['components']>;
  security?: ApiSpec['security'];
  tags?: ApiSpec['tags'];
  isPublic?: boolean;
}

export interface MockServer {
  id: string;
  apiSpecId: string;
  name: string;
  url: string;
  status: 'running' | 'stopped' | 'error';
  settings: {
    port?: number;
    delay?: number;
    errorRate?: number;
    cors: boolean;
    logging: boolean;
    authentication: boolean;
  };
  statistics: {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
    uptime: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiTest {
  id: string;
  name: string;
  description?: string;
  apiSpecId: string;
  endpointId: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body?: any;
  assertions: Array<{
    type: 'status' | 'header' | 'body' | 'responseTime';
    field?: string;
    operator: 'equals' | 'contains' | 'matches' | 'lessThan' | 'greaterThan';
    value: any;
  }>;
  environment?: string;
}

export interface TestResult {
  id: string;
  testId: string;
  status: 'passed' | 'failed' | 'error';
  executionTime: number;
  response: {
    status: number;
    headers: Record<string, string>;
    body: any;
    time: number;
  };
  assertions: Array<{
    type: string;
    field?: string;
    expected: any;
    actual: any;
    passed: boolean;
    message?: string;
  }>;
  error?: string;
  createdAt: Date;
}

class ApiSpecApiService {
  private baseUrl = '/api/v1/design-tools/api-specs';

  // 获取API规范列表
  async getApiSpecs(params?: {
    projectId?: string;
    search?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }) {
    const response = await apiClient.get<{
      apiSpecs: ApiSpec[];
      total: number;
      page: number;
      limit: number;
    }>(this.baseUrl, { params });
    return response.data;
  }

  // 获取单个API规范详情
  async getApiSpec(id: string) {
    const response = await apiClient.get<ApiSpec>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  // 创建新的API规范
  async createApiSpec(data: CreateApiSpecRequest) {
    const response = await apiClient.post<ApiSpec>(this.baseUrl, data);
    return response.data;
  }

  // 更新API规范
  async updateApiSpec(id: string, data: UpdateApiSpecRequest) {
    const response = await apiClient.put<ApiSpec>(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  // 删除API规范
  async deleteApiSpec(id: string) {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  // 复制API规范
  async duplicateApiSpec(id: string, name?: string) {
    const response = await apiClient.post<ApiSpec>(`${this.baseUrl}/${id}/duplicate`, {
      name: name || `${await this.getApiSpec(id).then(s => s.name)} (副本)`
    });
    return response.data;
  }

  // 端点管理

  // 添加端点
  async addEndpoint(id: string, endpoint: Omit<ApiEndpoint, 'id'>) {
    const response = await apiClient.post<ApiEndpoint>(`${this.baseUrl}/${id}/endpoints`, endpoint);
    return response.data;
  }

  // 更新端点
  async updateEndpoint(id: string, endpointId: string, updates: Partial<ApiEndpoint>) {
    const response = await apiClient.put<ApiEndpoint>(`${this.baseUrl}/${id}/endpoints/${endpointId}`, updates);
    return response.data;
  }

  // 删除端点
  async deleteEndpoint(id: string, endpointId: string) {
    await apiClient.delete(`${this.baseUrl}/${id}/endpoints/${endpointId}`);
  }

  // 验证API规范
  async validateApiSpec(id: string) {
    const response = await apiClient.post<{
      isValid: boolean;
      errors: Array<{
        type: 'error' | 'warning' | 'info';
        path: string;
        message: string;
        line?: number;
        column?: number;
      }>;
      suggestions: Array<{
        type: 'optimization' | 'bestPractice' | 'security';
        message: string;
        path?: string;
      }>;
    }>(`${this.baseUrl}/${id}/validate`);
    return response.data;
  }

  // 导出API规范
  async exportApiSpec(id: string, format: 'json' | 'yaml' | 'html' | 'pdf') {
    const response = await apiClient.get(`${this.baseUrl}/${id}/export`, {
      params: { format },
      responseType: format === 'json' ? 'json' : 'blob'
    });
    return response.data;
  }

  // 导入API规范
  async importApiSpec(file: File, projectId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) {
      formData.append('projectId', projectId);
    }

    const response = await apiClient.post<ApiSpec>(`${this.baseUrl}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // 从URL导入
  async importFromUrl(url: string, projectId?: string) {
    const response = await apiClient.post<ApiSpec>(`${this.baseUrl}/import-url`, {
      url,
      projectId
    });
    return response.data;
  }

  // Mock服务器管理

  // 获取Mock服务器列表
  async getMockServers(apiSpecId: string) {
    const response = await apiClient.get<MockServer[]>(`${this.baseUrl}/${apiSpecId}/mock-servers`);
    return response.data;
  }

  // 创建Mock服务器
  async createMockServer(apiSpecId: string, data: {
    name: string;
    settings?: Partial<MockServer['settings']>;
  }) {
    const response = await apiClient.post<MockServer>(`${this.baseUrl}/${apiSpecId}/mock-servers`, data);
    return response.data;
  }

  // 启动Mock服务器
  async startMockServer(apiSpecId: string, mockId: string) {
    await apiClient.post(`${this.baseUrl}/${apiSpecId}/mock-servers/${mockId}/start`);
  }

  // 停止Mock服务器
  async stopMockServer(apiSpecId: string, mockId: string) {
    await apiClient.post(`${this.baseUrl}/${apiSpecId}/mock-servers/${mockId}/stop`);
  }

  // 删除Mock服务器
  async deleteMockServer(apiSpecId: string, mockId: string) {
    await apiClient.delete(`${this.baseUrl}/${apiSpecId}/mock-servers/${mockId}`);
  }

  // 获取Mock服务器日志
  async getMockServerLogs(apiSpecId: string, mockId: string, params?: {
    limit?: number;
    offset?: number;
    level?: string;
  }) {
    const response = await apiClient.get<{
      logs: Array<{
        timestamp: Date;
        level: 'info' | 'warn' | 'error';
        method: string;
        path: string;
        status: number;
        responseTime: number;
        message: string;
      }>;
      total: number;
    }>(`${this.baseUrl}/${apiSpecId}/mock-servers/${mockId}/logs`, { params });
    return response.data;
  }

  // API测试管理

  // 获取测试列表
  async getTests(apiSpecId: string) {
    const response = await apiClient.get<ApiTest[]>(`${this.baseUrl}/${apiSpecId}/tests`);
    return response.data;
  }

  // 创建测试
  async createTest(apiSpecId: string, test: Omit<ApiTest, 'id' | 'apiSpecId'>) {
    const response = await apiClient.post<ApiTest>(`${this.baseUrl}/${apiSpecId}/tests`, test);
    return response.data;
  }

  // 更新测试
  async updateTest(apiSpecId: string, testId: string, updates: Partial<ApiTest>) {
    const response = await apiClient.put<ApiTest>(`${this.baseUrl}/${apiSpecId}/tests/${testId}`, updates);
    return response.data;
  }

  // 删除测试
  async deleteTest(apiSpecId: string, testId: string) {
    await apiClient.delete(`${this.baseUrl}/${apiSpecId}/tests/${testId}`);
  }

  // 执行测试
  async executeTest(apiSpecId: string, testId: string, environment?: string) {
    const response = await apiClient.post<TestResult>(`${this.baseUrl}/${apiSpecId}/tests/${testId}/execute`, {
      environment
    });
    return response.data;
  }

  // 批量执行测试
  async executeTests(apiSpecId: string, testIds: string[], environment?: string) {
    const response = await apiClient.post<TestResult[]>(`${this.baseUrl}/${apiSpecId}/tests/execute-batch`, {
      testIds,
      environment
    });
    return response.data;
  }

  // 获取测试结果
  async getTestResults(apiSpecId: string, testId: string, params?: {
    limit?: number;
    offset?: number;
  }) {
    const response = await apiClient.get<{
      results: TestResult[];
      total: number;
    }>(`${this.baseUrl}/${apiSpecId}/tests/${testId}/results`, { params });
    return response.data;
  }

  // 文档生成

  // 生成文档
  async generateDocumentation(id: string, options: {
    format: 'html' | 'markdown' | 'pdf';
    theme?: string;
    includeExamples?: boolean;
    includeTryIt?: boolean;
    customCss?: string;
    logo?: string;
  }) {
    const response = await apiClient.post(`${this.baseUrl}/${id}/generate-docs`, options, {
      responseType: options.format === 'html' || options.format === 'markdown' ? 'text' : 'blob'
    });
    return response.data;
  }

  // 预览文档
  async previewDocumentation(id: string, options: {
    theme?: string;
    includeExamples?: boolean;
    includeTryIt?: boolean;
  }) {
    const response = await apiClient.post<{
      html: string;
      css: string;
    }>(`${this.baseUrl}/${id}/preview-docs`, options);
    return response.data;
  }

  // 共享和协作

  // 共享API规范
  async shareApiSpec(id: string, settings: {
    isPublic: boolean;
    permissions: 'view' | 'edit' | 'comment';
    expiresAt?: Date;
    password?: string;
    allowDownload?: boolean;
  }) {
    const response = await apiClient.post<{
      shareId: string;
      shareUrl: string;
    }>(`${this.baseUrl}/${id}/share`, settings);
    return response.data;
  }

  // 获取共享的API规范
  async getSharedApiSpec(shareId: string, password?: string) {
    const response = await apiClient.get<ApiSpec>(`${this.baseUrl}/shared/${shareId}`, {
      params: { password }
    });
    return response.data;
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
        changes: string[];
        changelog: Array<{
          type: 'add' | 'remove' | 'modify';
          target: 'endpoint' | 'schema' | 'parameter';
          path: string;
          description: string;
        }>;
      }>;
    }>(`${this.baseUrl}/${id}/versions`);
    return response.data.versions;
  }

  // 创建版本
  async createVersion(id: string, data: {
    version?: string;
    comment?: string;
    changelog?: Array<{
      type: 'add' | 'remove' | 'modify';
      target: 'endpoint' | 'schema' | 'parameter';
      path: string;
      description: string;
    }>;
  }) {
    const response = await apiClient.post(`${this.baseUrl}/${id}/versions`, data);
    return response.data;
  }

  // 恢复到指定版本
  async restoreVersion(id: string, versionId: string) {
    const response = await apiClient.post<ApiSpec>(`${this.baseUrl}/${id}/versions/${versionId}/restore`);
    return response.data;
  }

  // 比较版本
  async compareVersions(id: string, fromVersionId: string, toVersionId: string) {
    const response = await apiClient.get<{
      differences: Array<{
        type: 'add' | 'remove' | 'modify';
        path: string;
        before?: any;
        after?: any;
        description: string;
      }>;
    }>(`${this.baseUrl}/${id}/versions/compare`, {
      params: { from: fromVersionId, to: toVersionId }
    });
    return response.data;
  }

  // 模板和代码生成

  // 获取代码模板
  async getCodeTemplates(language?: string) {
    const response = await apiClient.get<{
      templates: Array<{
        id: string;
        name: string;
        language: string;
        framework?: string;
        description: string;
        category: 'client' | 'server' | 'documentation';
      }>;
    }>(`${this.baseUrl}/code-templates`, {
      params: { language }
    });
    return response.data.templates;
  }

  // 生成代码
  async generateCode(id: string, templateId: string, options: {
    packageName?: string;
    className?: string;
    namespace?: string;
    outputPath?: string;
    additionalProperties?: Record<string, any>;
  }) {
    const response = await apiClient.post(`${this.baseUrl}/${id}/generate-code`, {
      templateId,
      options
    }, {
      responseType: 'blob'
    });
    return response.data;
  }
}

export const apiSpecApi = new ApiSpecApiService();