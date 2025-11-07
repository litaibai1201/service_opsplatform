import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';

interface Table {
  id: string;
  name: string;
  position: { x: number; y: number };
  columns: Column[];
  indexes: Index[];
  constraints: Constraint[];
  comment?: string;
}

interface Column {
  id: string;
  name: string;
  type: string;
  length?: number;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  autoIncrement: boolean;
  defaultValue?: string;
  comment?: string;
}

interface Index {
  id: string;
  name: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gist' | 'gin';
}

interface Constraint {
  id: string;
  name: string;
  type: 'primary' | 'foreign' | 'unique' | 'check';
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
  onUpdate?: 'cascade' | 'restrict' | 'set null' | 'set default';
  onDelete?: 'cascade' | 'restrict' | 'set null' | 'set default';
  expression?: string;
}

interface Relationship {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  label?: string;
}

interface DatabaseSchema {
  id: string;
  name: string;
  description?: string;
  version: string;
  engine: 'mysql' | 'postgresql' | 'sqlite' | 'mongodb';
  tables: Table[];
  relationships: Relationship[];
  views: any[];
  procedures: any[];
  triggers: any[];
}

interface ValidationIssue {
  id: string;
  level: 'error' | 'warning' | 'info';
  category: 'structure' | 'naming' | 'performance' | 'security' | 'compatibility';
  table?: string;
  column?: string;
  constraint?: string;
  relationship?: string;
  message: string;
  description: string;
  suggestion?: string;
  fixable: boolean;
}

interface SchemaValidatorProps {
  schema: DatabaseSchema;
}

const SchemaValidator: React.FC<SchemaValidatorProps> = ({ schema }) => {
  const [validationResults, setValidationResults] = useState<ValidationIssue[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  // 验证规则配置
  const validationRules = {
    structure: {
      name: '结构验证',
      color: 'blue',
      rules: [
        'table_without_primary_key',
        'empty_table',
        'orphaned_relationships',
        'circular_references',
        'missing_foreign_keys'
      ]
    },
    naming: {
      name: '命名规范',
      color: 'green',
      rules: [
        'table_naming_convention',
        'column_naming_convention',
        'index_naming_convention',
        'constraint_naming_convention'
      ]
    },
    performance: {
      name: '性能优化',
      color: 'yellow',
      rules: [
        'missing_indexes',
        'unused_indexes',
        'large_tables_without_partitions',
        'inefficient_data_types'
      ]
    },
    security: {
      name: '安全检查',
      color: 'red',
      rules: [
        'sensitive_data_without_encryption',
        'weak_password_columns',
        'missing_audit_columns'
      ]
    },
    compatibility: {
      name: '兼容性',
      color: 'purple',
      rules: [
        'engine_specific_features',
        'deprecated_data_types',
        'version_compatibility'
      ]
    }
  };

  // 执行验证
  const runValidation = useCallback(async () => {
    setIsValidating(true);
    const issues: ValidationIssue[] = [];

    try {
      // 结构验证
      issues.push(...validateStructure());
      
      // 命名规范验证
      issues.push(...validateNaming());
      
      // 性能验证
      issues.push(...validatePerformance());
      
      // 安全验证
      issues.push(...validateSecurity());
      
      // 兼容性验证
      issues.push(...validateCompatibility());

      // 模拟异步验证过程
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setValidationResults(issues);
    } catch (error) {
      console.error('验证过程中出错:', error);
    } finally {
      setIsValidating(false);
    }
  }, [schema]);

  // 结构验证
  const validateStructure = useCallback((): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    schema.tables.forEach(table => {
      // 检查主键
      const primaryKeys = table.columns.filter(col => col.primaryKey);
      if (primaryKeys.length === 0) {
        issues.push({
          id: `no_pk_${table.id}`,
          level: 'error',
          category: 'structure',
          table: table.name,
          message: '缺少主键',
          description: `表 "${table.name}" 没有定义主键`,
          suggestion: '每个表都应该有一个主键来唯一标识记录',
          fixable: true
        });
      }

      // 检查空表
      if (table.columns.length === 0) {
        issues.push({
          id: `empty_table_${table.id}`,
          level: 'warning',
          category: 'structure',
          table: table.name,
          message: '空表',
          description: `表 "${table.name}" 没有定义任何列`,
          suggestion: '定义表的列结构或删除空表',
          fixable: false
        });
      }

      // 检查列的数据类型
      table.columns.forEach(column => {
        if (column.type === 'text' && schema.engine === 'mysql' && column.nullable === false) {
          issues.push({
            id: `text_not_null_${column.id}`,
            level: 'warning',
            category: 'structure',
            table: table.name,
            column: column.name,
            message: 'TEXT列不能设置为NOT NULL',
            description: `在MySQL中，TEXT类型的列 "${column.name}" 不建议设置为NOT NULL`,
            suggestion: '使用VARCHAR类型或允许NULL值',
            fixable: true
          });
        }

        // 检查长度设置
        if (['varchar', 'char'].includes(column.type) && !column.length) {
          issues.push({
            id: `missing_length_${column.id}`,
            level: 'error',
            category: 'structure',
            table: table.name,
            column: column.name,
            message: '缺少字段长度',
            description: `${column.type.toUpperCase()}类型的列 "${column.name}" 必须指定长度`,
            suggestion: '为字符串类型指定合适的长度',
            fixable: true
          });
        }
      });
    });

    // 检查孤立的关系
    schema.relationships.forEach(relationship => {
      const fromTable = schema.tables.find(t => t.name === relationship.fromTable);
      const toTable = schema.tables.find(t => t.name === relationship.toTable);
      
      if (!fromTable || !toTable) {
        issues.push({
          id: `orphaned_rel_${relationship.id}`,
          level: 'error',
          category: 'structure',
          relationship: relationship.id,
          message: '孤立的关系',
          description: '关系引用了不存在的表',
          suggestion: '删除无效的关系或创建缺失的表',
          fixable: true
        });
      }
    });

    return issues;
  }, [schema]);

  // 命名规范验证
  const validateNaming = useCallback((): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    schema.tables.forEach(table => {
      // 表名规范检查
      if (!/^[a-z][a-z0-9_]*$/.test(table.name)) {
        issues.push({
          id: `table_naming_${table.id}`,
          level: 'warning',
          category: 'naming',
          table: table.name,
          message: '表名不符合命名规范',
          description: `表名 "${table.name}" 应该使用小写字母、数字和下划线`,
          suggestion: '使用小写字母开头，只包含字母、数字和下划线',
          fixable: true
        });
      }

      // 列名规范检查
      table.columns.forEach(column => {
        if (!/^[a-z][a-z0-9_]*$/.test(column.name)) {
          issues.push({
            id: `column_naming_${column.id}`,
            level: 'warning',
            category: 'naming',
            table: table.name,
            column: column.name,
            message: '列名不符合命名规范',
            description: `列名 "${column.name}" 应该使用小写字母、数字和下划线`,
            suggestion: '使用小写字母开头，只包含字母、数字和下划线',
            fixable: true
          });
        }

        // 检查保留字
        const reservedWords = ['order', 'group', 'select', 'from', 'where', 'join', 'user', 'table'];
        if (reservedWords.includes(column.name.toLowerCase())) {
          issues.push({
            id: `reserved_word_${column.id}`,
            level: 'warning',
            category: 'naming',
            table: table.name,
            column: column.name,
            message: '使用了保留字',
            description: `列名 "${column.name}" 是SQL保留字`,
            suggestion: '避免使用SQL保留字作为列名，或使用反引号包围',
            fixable: true
          });
        }
      });

      // 索引命名检查
      table.indexes.forEach(index => {
        const expectedPrefix = index.unique ? 'uk_' : 'idx_';
        if (!index.name.startsWith(expectedPrefix)) {
          issues.push({
            id: `index_naming_${index.id}`,
            level: 'info',
            category: 'naming',
            table: table.name,
            message: '索引命名不规范',
            description: `索引 "${index.name}" 建议使用 "${expectedPrefix}" 前缀`,
            suggestion: `${index.unique ? '唯一' : '普通'}索引建议使用 "${expectedPrefix}表名_列名" 格式`,
            fixable: true
          });
        }
      });
    });

    return issues;
  }, [schema]);

  // 性能验证
  const validatePerformance = useCallback((): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    schema.tables.forEach(table => {
      // 检查外键列是否有索引
      schema.relationships.forEach(relationship => {
        if (relationship.toTable === table.name) {
          const hasIndex = table.indexes.some(index => 
            index.columns.includes(relationship.toColumn)
          );
          
          if (!hasIndex) {
            issues.push({
              id: `missing_fk_index_${relationship.id}`,
              level: 'warning',
              category: 'performance',
              table: table.name,
              column: relationship.toColumn,
              message: '外键列缺少索引',
              description: `外键列 "${relationship.toColumn}" 没有索引，可能影响查询性能`,
              suggestion: '为外键列创建索引以提高查询性能',
              fixable: true
            });
          }
        }
      });

      // 检查大表的性能问题
      if (table.columns.length > 50) {
        issues.push({
          id: `wide_table_${table.id}`,
          level: 'info',
          category: 'performance',
          table: table.name,
          message: '表结构过宽',
          description: `表 "${table.name}" 有 ${table.columns.length} 列，可能影响性能`,
          suggestion: '考虑垂直分表或将不常用的列分离到子表',
          fixable: false
        });
      }

      // 检查无效的索引
      table.indexes.forEach(index => {
        if (index.columns.length === 0) {
          issues.push({
            id: `empty_index_${index.id}`,
            level: 'error',
            category: 'performance',
            table: table.name,
            message: '空索引',
            description: `索引 "${index.name}" 没有指定任何列`,
            suggestion: '删除无效索引或为其指定列',
            fixable: true
          });
        }
      });
    });

    return issues;
  }, [schema]);

  // 安全验证
  const validateSecurity = useCallback((): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    schema.tables.forEach(table => {
      table.columns.forEach(column => {
        // 检查敏感数据列
        const sensitiveFields = ['password', 'passwd', 'pwd', 'secret', 'token', 'key'];
        if (sensitiveFields.some(field => column.name.toLowerCase().includes(field))) {
          issues.push({
            id: `sensitive_data_${column.id}`,
            level: 'warning',
            category: 'security',
            table: table.name,
            column: column.name,
            message: '敏感数据未加密',
            description: `列 "${column.name}" 可能包含敏感数据，建议加密存储`,
            suggestion: '使用哈希或加密算法保护敏感数据',
            fixable: false
          });
        }

        // 检查用户表的审计字段
        if (table.name.toLowerCase().includes('user')) {
          const auditFields = ['created_at', 'updated_at', 'deleted_at'];
          const hasAuditFields = auditFields.some(field => 
            table.columns.some(col => col.name === field)
          );
          
          if (!hasAuditFields) {
            issues.push({
              id: `missing_audit_${table.id}`,
              level: 'info',
              category: 'security',
              table: table.name,
              message: '缺少审计字段',
              description: `用户表 "${table.name}" 建议添加审计字段`,
              suggestion: '添加 created_at, updated_at 等时间戳字段',
              fixable: true
            });
          }
        }
      });
    });

    return issues;
  }, [schema]);

  // 兼容性验证
  const validateCompatibility = useCallback((): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    schema.tables.forEach(table => {
      table.columns.forEach(column => {
        // 检查引擎特定的数据类型
        if (schema.engine === 'mysql') {
          if (column.type === 'serial') {
            issues.push({
              id: `mysql_incompatible_${column.id}`,
              level: 'error',
              category: 'compatibility',
              table: table.name,
              column: column.name,
              message: 'MySQL不支持的数据类型',
              description: `MySQL不支持 "serial" 数据类型`,
              suggestion: '使用 "bigint auto_increment" 替代',
              fixable: true
            });
          }
        }

        if (schema.engine === 'postgresql') {
          if (['tinyint', 'mediumint'].includes(column.type)) {
            issues.push({
              id: `pg_incompatible_${column.id}`,
              level: 'warning',
              category: 'compatibility',
              table: table.name,
              column: column.name,
              message: 'PostgreSQL不支持的数据类型',
              description: `PostgreSQL不支持 "${column.type}" 数据类型`,
              suggestion: '使用 "smallint" 或 "integer" 替代',
              fixable: true
            });
          }
        }
      });

      // 检查索引类型兼容性
      table.indexes.forEach(index => {
        if (schema.engine === 'mysql' && ['gist', 'gin'].includes(index.type)) {
          issues.push({
            id: `mysql_index_incompatible_${index.id}`,
            level: 'error',
            category: 'compatibility',
            table: table.name,
            message: 'MySQL不支持的索引类型',
            description: `MySQL不支持 "${index.type}" 索引类型`,
            suggestion: '使用 "btree" 或 "hash" 索引类型',
            fixable: true
          });
        }
      });
    });

    return issues;
  }, [schema]);

  // 过滤验证结果
  const filteredResults = validationResults.filter(issue => {
    const categoryMatch = selectedCategory === 'all' || issue.category === selectedCategory;
    const levelMatch = selectedLevel === 'all' || issue.level === selectedLevel;
    return categoryMatch && levelMatch;
  });

  // 统计信息
  const stats = {
    total: validationResults.length,
    errors: validationResults.filter(i => i.level === 'error').length,
    warnings: validationResults.filter(i => i.level === 'warning').length,
    info: validationResults.filter(i => i.level === 'info').length,
    fixable: validationResults.filter(i => i.fixable).length
  };

  // 生成验证报告
  const generateReport = useCallback(() => {
    const report = {
      schema: {
        name: schema.name,
        version: schema.version,
        engine: schema.engine,
        tables: schema.tables.length,
        relationships: schema.relationships.length
      },
      validation: {
        timestamp: new Date().toISOString(),
        stats,
        issues: validationResults
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schema.name}-validation-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [schema, stats, validationResults]);

  // 复制结果
  const copyResults = useCallback(() => {
    const text = filteredResults.map(issue => 
      `[${issue.level.toUpperCase()}] ${issue.message}\n${issue.description}\n`
    ).join('\n');
    
    navigator.clipboard.writeText(text);
  }, [filteredResults]);

  // 组件加载时自动验证
  useEffect(() => {
    runValidation();
  }, [schema, runValidation]);

  // 获取级别图标和颜色
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <CheckCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">架构验证</h3>
            <p className="text-sm text-gray-600">
              检查数据库设计的结构、性能和安全问题
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyResults}
              disabled={filteredResults.length === 0}
            >
              <ClipboardDocumentIcon className="w-4 h-4 mr-1" />
              复制结果
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={generateReport}
              disabled={validationResults.length === 0}
            >
              <DocumentTextIcon className="w-4 h-4 mr-1" />
              导出报告
            </Button>
            
            <Button
              variant="primary"
              size="sm"
              onClick={runValidation}
              disabled={isValidating}
            >
              {isValidating ? (
                <ArrowPathIcon className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <CheckCircleIcon className="w-4 h-4 mr-1" />
              )}
              {isValidating ? '验证中...' : '重新验证'}
            </Button>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="flex items-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">总计:</span>
            <span className="font-medium text-gray-900">{stats.total}</span>
          </div>
          <div className="flex items-center space-x-2">
            <XCircleIcon className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600">错误: {stats.errors}</span>
          </div>
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-yellow-600">警告: {stats.warnings}</span>
          </div>
          <div className="flex items-center space-x-2">
            <InformationCircleIcon className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-blue-600">提示: {stats.info}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">可修复:</span>
            <span className="font-medium text-green-600">{stats.fixable}</span>
          </div>
        </div>

        {/* 过滤器 */}
        <div className="flex items-center space-x-4 mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">分类:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">全部</option>
              {Object.entries(validationRules).map(([key, rule]) => (
                <option key={key} value={key}>{rule.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">级别:</span>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">全部</option>
              <option value="error">错误</option>
              <option value="warning">警告</option>
              <option value="info">提示</option>
            </select>
          </div>
        </div>
      </div>

      {/* 验证结果 */}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        {isValidating ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <ArrowPathIcon className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">正在验证架构</h3>
              <p className="text-gray-600">检查数据库设计中的问题...</p>
            </div>
          </div>
        ) : filteredResults.length > 0 ? (
          <div className="p-4 space-y-3">
            {filteredResults.map(issue => (
              <div
                key={issue.id}
                className={`border rounded-lg p-4 ${getLevelColor(issue.level)}`}
              >
                <div className="flex items-start space-x-3">
                  {getLevelIcon(issue.level)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{issue.message}</h4>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          validationRules[issue.category]?.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                          validationRules[issue.category]?.color === 'green' ? 'bg-green-100 text-green-800' :
                          validationRules[issue.category]?.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          validationRules[issue.category]?.color === 'red' ? 'bg-red-100 text-red-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {validationRules[issue.category]?.name}
                        </span>
                        {issue.fixable && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            可修复
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mt-1">{issue.description}</p>
                    
                    {(issue.table || issue.column || issue.constraint || issue.relationship) && (
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-600">
                        {issue.table && <span>表: {issue.table}</span>}
                        {issue.column && <span>列: {issue.column}</span>}
                        {issue.constraint && <span>约束: {issue.constraint}</span>}
                        {issue.relationship && <span>关系: {issue.relationship}</span>}
                      </div>
                    )}
                    
                    {issue.suggestion && (
                      <div className="mt-3 p-2 bg-white bg-opacity-50 rounded text-sm">
                        <span className="font-medium text-gray-900">建议: </span>
                        <span className="text-gray-700">{issue.suggestion}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">架构验证通过</h3>
              <p className="text-gray-600">
                {stats.total === 0 ? '没有发现任何问题' : '当前过滤条件下没有问题'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchemaValidator;