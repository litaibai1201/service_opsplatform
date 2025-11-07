import { apiClient } from '../api';

export interface DatabaseColumn {
  id: string;
  name: string;
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  autoIncrement: boolean;
  defaultValue?: string;
  comment?: string;
  foreignKey?: {
    referencedTable: string;
    referencedColumn: string;
    onUpdate: 'cascade' | 'restrict' | 'set null' | 'set default' | 'no action';
    onDelete: 'cascade' | 'restrict' | 'set null' | 'set default' | 'no action';
  };
}

export interface DatabaseIndex {
  id: string;
  name: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gist' | 'gin' | 'fulltext' | 'spatial';
  condition?: string;
  comment?: string;
}

export interface DatabaseConstraint {
  id: string;
  name: string;
  type: 'primary' | 'foreign' | 'unique' | 'check' | 'not null';
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
  onUpdate?: 'cascade' | 'restrict' | 'set null' | 'set default' | 'no action';
  onDelete?: 'cascade' | 'restrict' | 'set null' | 'set default' | 'no action';
  expression?: string;
  comment?: string;
}

export interface DatabaseTable {
  id: string;
  name: string;
  schema?: string;
  comment?: string;
  position: { x: number; y: number };
  columns: DatabaseColumn[];
  indexes: DatabaseIndex[];
  constraints: DatabaseConstraint[];
  partitioning?: {
    type: 'range' | 'list' | 'hash' | 'key';
    expression: string;
    partitions: Array<{
      name: string;
      expression: string;
      comment?: string;
    }>;
  };
  engine?: string;
  charset?: string;
  collation?: string;
  rowFormat?: string;
  autoIncrement?: number;
  avgRowLength?: number;
  checksum?: boolean;
  compression?: string;
}

export interface DatabaseView {
  id: string;
  name: string;
  schema?: string;
  definition: string;
  comment?: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    comment?: string;
  }>;
  dependencies: string[];
  security: 'definer' | 'invoker';
  checkOption?: 'cascaded' | 'local';
}

export interface DatabaseProcedure {
  id: string;
  name: string;
  schema?: string;
  type: 'procedure' | 'function';
  definition: string;
  comment?: string;
  parameters: Array<{
    name: string;
    type: string;
    mode: 'in' | 'out' | 'inout';
    defaultValue?: string;
    comment?: string;
  }>;
  returnType?: string;
  language: 'sql' | 'plpgsql' | 'javascript' | 'python';
  security: 'definer' | 'invoker';
  deterministic?: boolean;
  sqlDataAccess?: 'contains sql' | 'no sql' | 'reads sql data' | 'modifies sql data';
}

export interface DatabaseTrigger {
  id: string;
  name: string;
  table: string;
  schema?: string;
  timing: 'before' | 'after' | 'instead of';
  events: ('insert' | 'update' | 'delete')[];
  definition: string;
  comment?: string;
  condition?: string;
  order?: number;
}

export interface DatabaseSchema {
  id: string;
  name: string;
  description?: string;
  version: string;
  projectId?: string;
  engine: 'mysql' | 'postgresql' | 'sqlite' | 'oracle' | 'sqlserver' | 'mongodb';
  charset?: string;
  collation?: string;
  tables: DatabaseTable[];
  views: DatabaseView[];
  procedures: DatabaseProcedure[];
  triggers: DatabaseTrigger[];
  relationships: Array<{
    id: string;
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    label?: string;
  }>;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    tags: string[];
    isPublic: boolean;
  };
  settings: {
    showRelationships: boolean;
    showIndexes: boolean;
    showConstraints: boolean;
    autoLayout: boolean;
    theme: 'light' | 'dark';
  };
}

export interface CreateDatabaseSchemaRequest {
  name: string;
  description?: string;
  engine: DatabaseSchema['engine'];
  projectId?: string;
  template?: string;
  charset?: string;
  collation?: string;
}

export interface UpdateDatabaseSchemaRequest {
  name?: string;
  description?: string;
  tables?: DatabaseTable[];
  views?: DatabaseView[];
  procedures?: DatabaseProcedure[];
  triggers?: DatabaseTrigger[];
  relationships?: DatabaseSchema['relationships'];
  settings?: Partial<DatabaseSchema['settings']>;
  tags?: string[];
  isPublic?: boolean;
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: Array<{
    type: 'error' | 'warning' | 'info';
    level: 'critical' | 'high' | 'medium' | 'low';
    category: 'structure' | 'naming' | 'performance' | 'security' | 'compatibility';
    table?: string;
    column?: string;
    constraint?: string;
    message: string;
    description: string;
    suggestion?: string;
    fixable: boolean;
  }>;
  statistics: {
    tableCount: number;
    columnCount: number;
    indexCount: number;
    constraintCount: number;
    relationshipCount: number;
    issues: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}

export interface SqlGenerationOptions {
  includeDropStatements: boolean;
  includeComments: boolean;
  includeIndexes: boolean;
  includeConstraints: boolean;
  includeSampleData: boolean;
  formatSql: boolean;
  createDatabase: boolean;
  useIfNotExists: boolean;
  engine: DatabaseSchema['engine'];
  target: 'create' | 'alter' | 'drop' | 'migrate';
}

class DatabaseApiService {
  private baseUrl = '/api/v1/design-tools/database-schemas';

  // 获取数据库架构列表
  async getDatabaseSchemas(params?: {
    projectId?: string;
    engine?: string;
    search?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }) {
    const response = await apiClient.get<{
      schemas: DatabaseSchema[];
      total: number;
      page: number;
      limit: number;
    }>(this.baseUrl, { params });
    return response.data;
  }

  // 获取单个数据库架构详情
  async getDatabaseSchema(id: string) {
    const response = await apiClient.get<DatabaseSchema>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  // 创建新的数据库架构
  async createDatabaseSchema(data: CreateDatabaseSchemaRequest) {
    const response = await apiClient.post<DatabaseSchema>(this.baseUrl, data);
    return response.data;
  }

  // 更新数据库架构
  async updateDatabaseSchema(id: string, data: UpdateDatabaseSchemaRequest) {
    const response = await apiClient.put<DatabaseSchema>(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  // 删除数据库架构
  async deleteDatabaseSchema(id: string) {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  // 复制数据库架构
  async duplicateDatabaseSchema(id: string, name?: string) {
    const response = await apiClient.post<DatabaseSchema>(`${this.baseUrl}/${id}/duplicate`, {
      name: name || `${await this.getDatabaseSchema(id).then(s => s.name)} (副本)`
    });
    return response.data;
  }

  // 表管理

  // 添加表
  async addTable(id: string, table: Omit<DatabaseTable, 'id'>) {
    const response = await apiClient.post<DatabaseTable>(`${this.baseUrl}/${id}/tables`, table);
    return response.data;
  }

  // 更新表
  async updateTable(id: string, tableId: string, updates: Partial<DatabaseTable>) {
    const response = await apiClient.put<DatabaseTable>(`${this.baseUrl}/${id}/tables/${tableId}`, updates);
    return response.data;
  }

  // 删除表
  async deleteTable(id: string, tableId: string) {
    await apiClient.delete(`${this.baseUrl}/${id}/tables/${tableId}`);
  }

  // 添加列
  async addColumn(id: string, tableId: string, column: Omit<DatabaseColumn, 'id'>) {
    const response = await apiClient.post<DatabaseColumn>(`${this.baseUrl}/${id}/tables/${tableId}/columns`, column);
    return response.data;
  }

  // 更新列
  async updateColumn(id: string, tableId: string, columnId: string, updates: Partial<DatabaseColumn>) {
    const response = await apiClient.put<DatabaseColumn>(`${this.baseUrl}/${id}/tables/${tableId}/columns/${columnId}`, updates);
    return response.data;
  }

  // 删除列
  async deleteColumn(id: string, tableId: string, columnId: string) {
    await apiClient.delete(`${this.baseUrl}/${id}/tables/${tableId}/columns/${columnId}`);
  }

  // 索引管理

  // 添加索引
  async addIndex(id: string, tableId: string, index: Omit<DatabaseIndex, 'id'>) {
    const response = await apiClient.post<DatabaseIndex>(`${this.baseUrl}/${id}/tables/${tableId}/indexes`, index);
    return response.data;
  }

  // 更新索引
  async updateIndex(id: string, tableId: string, indexId: string, updates: Partial<DatabaseIndex>) {
    const response = await apiClient.put<DatabaseIndex>(`${this.baseUrl}/${id}/tables/${tableId}/indexes/${indexId}`, updates);
    return response.data;
  }

  // 删除索引
  async deleteIndex(id: string, tableId: string, indexId: string) {
    await apiClient.delete(`${this.baseUrl}/${id}/tables/${tableId}/indexes/${indexId}`);
  }

  // 约束管理

  // 添加约束
  async addConstraint(id: string, tableId: string, constraint: Omit<DatabaseConstraint, 'id'>) {
    const response = await apiClient.post<DatabaseConstraint>(`${this.baseUrl}/${id}/tables/${tableId}/constraints`, constraint);
    return response.data;
  }

  // 更新约束
  async updateConstraint(id: string, tableId: string, constraintId: string, updates: Partial<DatabaseConstraint>) {
    const response = await apiClient.put<DatabaseConstraint>(`${this.baseUrl}/${id}/tables/${tableId}/constraints/${constraintId}`, updates);
    return response.data;
  }

  // 删除约束
  async deleteConstraint(id: string, tableId: string, constraintId: string) {
    await apiClient.delete(`${this.baseUrl}/${id}/tables/${tableId}/constraints/${constraintId}`);
  }

  // 关系管理

  // 添加关系
  async addRelationship(id: string, relationship: Omit<DatabaseSchema['relationships'][0], 'id'>) {
    const response = await apiClient.post(`${this.baseUrl}/${id}/relationships`, relationship);
    return response.data;
  }

  // 更新关系
  async updateRelationship(id: string, relationshipId: string, updates: Partial<DatabaseSchema['relationships'][0]>) {
    const response = await apiClient.put(`${this.baseUrl}/${id}/relationships/${relationshipId}`, updates);
    return response.data;
  }

  // 删除关系
  async deleteRelationship(id: string, relationshipId: string) {
    await apiClient.delete(`${this.baseUrl}/${id}/relationships/${relationshipId}`);
  }

  // 验证和分析

  // 验证数据库架构
  async validateSchema(id: string) {
    const response = await apiClient.post<SchemaValidationResult>(`${this.baseUrl}/${id}/validate`);
    return response.data;
  }

  // 获取架构分析报告
  async getSchemaAnalysis(id: string) {
    const response = await apiClient.get<{
      overview: {
        complexity: 'low' | 'medium' | 'high';
        maintainability: number;
        performance: number;
        security: number;
      };
      recommendations: Array<{
        type: 'performance' | 'security' | 'maintainability' | 'design';
        priority: 'high' | 'medium' | 'low';
        title: string;
        description: string;
        tables?: string[];
        columns?: string[];
        impact: string;
        effort: string;
      }>;
      metrics: {
        normalFormLevel: number;
        relationshipDensity: number;
        indexCoverage: number;
        constraintCoverage: number;
        namingConsistency: number;
      };
    }>(`${this.baseUrl}/${id}/analysis`);
    return response.data;
  }

  // SQL生成

  // 生成SQL脚本
  async generateSql(id: string, options: SqlGenerationOptions) {
    const response = await apiClient.post<{
      sql: string;
      statements: Array<{
        type: 'create' | 'alter' | 'drop' | 'insert';
        target: 'database' | 'table' | 'index' | 'constraint' | 'data';
        sql: string;
        dependencies: string[];
      }>;
      warnings: string[];
    }>(`${this.baseUrl}/${id}/generate-sql`, options);
    return response.data;
  }

  // 生成迁移脚本
  async generateMigration(fromId: string, toId: string, options?: {
    preserveData: boolean;
    generateRollback: boolean;
    safeMode: boolean;
  }) {
    const response = await apiClient.post<{
      upSql: string;
      downSql: string;
      changes: Array<{
        type: 'create' | 'alter' | 'drop' | 'rename';
        target: 'table' | 'column' | 'index' | 'constraint';
        name: string;
        description: string;
        risk: 'low' | 'medium' | 'high';
        sql: string;
      }>;
      warnings: string[];
      risks: string[];
    }>(`${this.baseUrl}/${fromId}/migrate-to/${toId}`, options);
    return response.data;
  }

  // 导入导出

  // 导出数据库架构
  async exportSchema(id: string, format: 'json' | 'sql' | 'xml' | 'yaml' | 'png' | 'pdf' | 'dbml') {
    const response = await apiClient.get(`${this.baseUrl}/${id}/export`, {
      params: { format },
      responseType: format === 'json' || format === 'xml' || format === 'yaml' || format === 'dbml' ? 'text' : 'blob'
    });
    return response.data;
  }

  // 导入数据库架构
  async importSchema(file: File, options: {
    projectId?: string;
    engine?: DatabaseSchema['engine'];
    merge?: boolean;
    preserveIds?: boolean;
  }) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify(options));

    const response = await apiClient.post<DatabaseSchema>(`${this.baseUrl}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // 从数据库连接导入
  async importFromDatabase(connection: {
    engine: DatabaseSchema['engine'];
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
    schemas?: string[];
    tables?: string[];
  }, options: {
    projectId?: string;
    includeTables?: boolean;
    includeViews?: boolean;
    includeProcedures?: boolean;
    includeTriggers?: boolean;
    includeData?: boolean;
    sampleSize?: number;
  }) {
    const response = await apiClient.post<DatabaseSchema>(`${this.baseUrl}/import-database`, {
      connection,
      options
    });
    return response.data;
  }

  // 逆向工程

  // 从SQL脚本逆向工程
  async reverseEngineerSql(sql: string, engine: DatabaseSchema['engine'], projectId?: string) {
    const response = await apiClient.post<DatabaseSchema>(`${this.baseUrl}/reverse-engineer-sql`, {
      sql,
      engine,
      projectId
    });
    return response.data;
  }

  // 从应用代码逆向工程
  async reverseEngineerCode(files: File[], framework: string, projectId?: string) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('framework', framework);
    if (projectId) {
      formData.append('projectId', projectId);
    }

    const response = await apiClient.post<DatabaseSchema>(`${this.baseUrl}/reverse-engineer-code`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // 模板和向导

  // 获取数据库模板
  async getTemplates(engine?: string, category?: string) {
    const response = await apiClient.get<{
      templates: Array<{
        id: string;
        name: string;
        description: string;
        engine: DatabaseSchema['engine'];
        category: string;
        tags: string[];
        thumbnail: string;
        tables: number;
        complexity: 'simple' | 'medium' | 'complex';
      }>;
      categories: string[];
    }>(`${this.baseUrl}/templates`, {
      params: { engine, category }
    });
    return response.data;
  }

  // 从模板创建架构
  async createFromTemplate(templateId: string, data: CreateDatabaseSchemaRequest) {
    const response = await apiClient.post<DatabaseSchema>(`${this.baseUrl}/templates/${templateId}/create`, data);
    return response.data;
  }

  // 获取数据类型映射
  async getDataTypeMappings(fromEngine: string, toEngine: string) {
    const response = await apiClient.get<{
      mappings: Record<string, {
        type: string;
        defaultLength?: number;
        notes?: string;
        compatible: boolean;
      }>;
      warnings: string[];
    }>(`${this.baseUrl}/data-type-mappings`, {
      params: { from: fromEngine, to: toEngine }
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
        changes: Array<{
          type: 'create' | 'alter' | 'drop';
          target: 'table' | 'column' | 'index' | 'constraint';
          name: string;
          description: string;
        }>;
        size: number;
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
    const response = await apiClient.post<DatabaseSchema>(`${this.baseUrl}/${id}/versions/${versionId}/restore`);
    return response.data;
  }

  // 比较版本
  async compareVersions(id: string, fromVersionId: string, toVersionId: string) {
    const response = await apiClient.get<{
      differences: Array<{
        type: 'create' | 'alter' | 'drop';
        target: 'table' | 'column' | 'index' | 'constraint';
        name: string;
        before?: any;
        after?: any;
        impact: 'low' | 'medium' | 'high';
        description: string;
      }>;
      summary: {
        created: number;
        modified: number;
        deleted: number;
        compatibility: 'compatible' | 'breaking' | 'warning';
      };
    }>(`${this.baseUrl}/${id}/versions/compare`, {
      params: { from: fromVersionId, to: toVersionId }
    });
    return response.data;
  }

  // 共享和协作

  // 共享数据库架构
  async shareSchema(id: string, settings: {
    isPublic: boolean;
    permissions: 'view' | 'edit' | 'comment';
    expiresAt?: Date;
    password?: string;
    allowExport?: boolean;
  }) {
    const response = await apiClient.post<{
      shareId: string;
      shareUrl: string;
    }>(`${this.baseUrl}/${id}/share`, settings);
    return response.data;
  }

  // 获取共享的数据库架构
  async getSharedSchema(shareId: string, password?: string) {
    const response = await apiClient.get<DatabaseSchema>(`${this.baseUrl}/shared/${shareId}`, {
      params: { password }
    });
    return response.data;
  }
}

export const databaseApi = new DatabaseApiService();