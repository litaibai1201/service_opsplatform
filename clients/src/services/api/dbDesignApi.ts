import { httpClient } from './httpClient';

/**
 * 数据库设计相关的 API 服务
 */

// ==================== 类型定义 ====================

export interface DbDesign {
  id: string;
  project_id: string;
  name: string;
  db_type: 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'oracle';
  version: string;
  description?: string;
  tables: DbTable[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface DbTable {
  id: string;
  name: string;
  comment?: string;
  columns: DbColumn[];
  indexes: DbIndex[];
  constraints: DbConstraint[];
  position?: { x: number; y: number };
}

export interface DbColumn {
  id: string;
  name: string;
  type: string;
  length?: number;
  nullable: boolean;
  primary_key: boolean;
  unique: boolean;
  auto_increment: boolean;
  default_value?: string;
  comment?: string;
}

export interface DbIndex {
  id: string;
  name: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gist' | 'gin';
}

export interface DbConstraint {
  id: string;
  type: 'foreign_key' | 'check' | 'unique';
  columns: string[];
  reference_table?: string;
  reference_columns?: string[];
  on_delete?: 'cascade' | 'set_null' | 'restrict';
  on_update?: 'cascade' | 'set_null' | 'restrict';
}

export interface CreateDbDesignDto {
  name: string;
  db_type: string;
  description?: string;
}

export interface UpdateDbDesignDto {
  name?: string;
  description?: string;
  tables?: DbTable[];
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    table?: string;
    column?: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: string[];
}

export interface OptimizationSuggestion {
  type: 'index' | 'normalization' | 'data_type' | 'constraint';
  table: string;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
}

export interface GenerateSqlOptions {
  db_type: string;
  include_drop: boolean;
  include_indexes: boolean;
  include_constraints: boolean;
}

export interface GenerateModelsOptions {
  orm_type: 'sqlalchemy' | 'django' | 'sequelize' | 'typeorm';
  language: 'python' | 'javascript' | 'typescript';
}

// ==================== API 方法 ====================

class DbDesignApi {
  private baseUrl = '/db-designs';

  /**
   * 获取项目的数据库设计列表
   */
  async getDesignsByProject(projectId: string, params?: {
    page?: number;
    limit?: number;
    db_type?: string;
  }) {
    const response = await httpClient.get<{
      designs: DbDesign[];
      total: number;
      page: number;
      limit: number;
    }>(`/projects/${projectId}/db-designs`, { params });
    return response.data;
  }

  /**
   * 创建数据库设计
   */
  async createDesign(projectId: string, data: CreateDbDesignDto) {
    const response = await httpClient.post<DbDesign>(
      `/projects/${projectId}/db-designs`,
      data
    );
    return response.data;
  }

  /**
   * 获取数据库设计详情
   */
  async getDesignDetail(designId: string, full = true) {
    const response = await httpClient.get<DbDesign>(
      `${this.baseUrl}/${designId}`,
      { params: { full } }
    );
    return response.data;
  }

  /**
   * 更新数据库设计
   */
  async updateDesign(designId: string, data: UpdateDbDesignDto) {
    const response = await httpClient.put<DbDesign>(
      `${this.baseUrl}/${designId}`,
      data
    );
    return response.data;
  }

  /**
   * 删除数据库设计
   */
  async deleteDesign(designId: string) {
    const response = await httpClient.delete(`${this.baseUrl}/${designId}`);
    return response.data;
  }

  /**
   * 复制数据库设计
   */
  async duplicateDesign(designId: string, newName: string) {
    const response = await httpClient.post<DbDesign>(
      `${this.baseUrl}/${designId}/duplicate`,
      { name: newName }
    );
    return response.data;
  }

  // ==================== ERD 相关 ====================

  /**
   * 获取 ERD 图数据
   */
  async getErd(designId: string) {
    const response = await httpClient.get(`${this.baseUrl}/${designId}/erd`);
    return response.data;
  }

  /**
   * 生成 ERD 图
   */
  async generateErd(designId: string) {
    const response = await httpClient.post(`${this.baseUrl}/${designId}/erd/generate`);
    return response.data;
  }

  /**
   * 更新 ERD 图
   */
  async updateErd(designId: string, erdData: any) {
    const response = await httpClient.put(
      `${this.baseUrl}/${designId}/erd`,
      erdData
    );
    return response.data;
  }

  // ==================== 验证和优化 ====================

  /**
   * 验证设计
   */
  async validateDesign(designId: string) {
    const response = await httpClient.post<ValidationResult>(
      `${this.baseUrl}/${designId}/validate`
    );
    return response.data;
  }

  /**
   * 获取优化建议
   */
  async getOptimizationSuggestions(designId: string) {
    const response = await httpClient.post<{
      suggestions: OptimizationSuggestion[];
    }>(`${this.baseUrl}/${designId}/optimize`);
    return response.data;
  }

  /**
   * 性能分析
   */
  async analyzePerformance(designId: string) {
    const response = await httpClient.post(`${this.baseUrl}/${designId}/analyze`);
    return response.data;
  }

  /**
   * 规范化分析
   */
  async analyzeNormalization(designId: string) {
    const response = await httpClient.post(
      `${this.baseUrl}/${designId}/normalize`
    );
    return response.data;
  }

  // ==================== 代码生成 ====================

  /**
   * 生成 SQL 脚本
   */
  async generateSql(designId: string, options: GenerateSqlOptions) {
    const response = await httpClient.post<{ sql: string }>(
      `${this.baseUrl}/${designId}/generate-sql`,
      options
    );
    return response.data;
  }

  /**
   * 生成迁移脚本
   */
  async generateMigration(designId: string, options?: {
    from_version?: string;
    to_version?: string;
  }) {
    const response = await httpClient.post<{ migration: string }>(
      `${this.baseUrl}/${designId}/generate-migration`,
      options
    );
    return response.data;
  }

  /**
   * 生成数据库文档
   */
  async generateDocs(designId: string, format: 'html' | 'markdown' | 'pdf' | 'json') {
    const response = await httpClient.post<{ docs: string }>(
      `${this.baseUrl}/${designId}/generate-docs`,
      { format }
    );
    return response.data;
  }

  /**
   * 生成 ORM 模型
   */
  async generateModels(designId: string, options: GenerateModelsOptions) {
    const response = await httpClient.post<{ models: string }>(
      `${this.baseUrl}/${designId}/generate-models`,
      options
    );
    return response.data;
  }

  // ==================== 逆向工程 ====================

  /**
   * 从现有数据库逆向生成设计
   */
  async reverseEngineer(data: {
    db_type: string;
    connection_string: string;
    schema?: string;
  }) {
    const response = await httpClient.post<DbDesign>(
      `${this.baseUrl}/reverse-engineer`,
      data
    );
    return response.data;
  }

  /**
   * 从 SQL 脚本导入设计
   */
  async importSql(data: {
    sql: string;
    db_type: string;
  }) {
    const response = await httpClient.post<DbDesign>(
      `${this.baseUrl}/import-sql`,
      data
    );
    return response.data;
  }

  // ==================== 比较和同步 ====================

  /**
   * 比较不同版本
   */
  async compareVersions(designId: string, targetVersion: string) {
    const response = await httpClient.post(
      `${this.baseUrl}/${designId}/compare`,
      { target_version: targetVersion }
    );
    return response.data;
  }

  /**
   * 同步到目标数据库
   */
  async syncToDatabase(designId: string, data: {
    connection_string: string;
    dry_run: boolean;
  }) {
    const response = await httpClient.post(
      `${this.baseUrl}/${designId}/sync`,
      data
    );
    return response.data;
  }

  /**
   * 获取版本差异
   */
  async getVersionDiff(designId: string, targetVersion: string) {
    const response = await httpClient.get(
      `${this.baseUrl}/${designId}/diff/${targetVersion}`
    );
    return response.data;
  }
}

export const dbDesignApi = new DbDesignApi();
