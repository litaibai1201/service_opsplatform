import React, { useState, useCallback, useMemo } from 'react';
import { Button, Select, Checkbox, Textarea } from '@/components/ui';
import { 
  DocumentArrowDownIcon,
  ClipboardDocumentIcon,
  PlayIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  EyeIcon
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

interface SqlGeneratorProps {
  schema: DatabaseSchema;
  engine: 'mysql' | 'postgresql' | 'sqlite' | 'mongodb';
}

interface GenerateOptions {
  includeDropStatements: boolean;
  includeComments: boolean;
  includeIndexes: boolean;
  includeConstraints: boolean;
  includeSampleData: boolean;
  formatSql: boolean;
  createDatabase: boolean;
  useIfNotExists: boolean;
}

const SqlGenerator: React.FC<SqlGeneratorProps> = ({ schema, engine }) => {
  const [selectedTables, setSelectedTables] = useState<string[]>(schema.tables.map(t => t.id));
  const [sqlType, setSqlType] = useState<'create' | 'alter' | 'drop' | 'insert'>('create');
  const [generatedSql, setGeneratedSql] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState<'sql' | 'preview'>('sql');
  
  const [options, setOptions] = useState<GenerateOptions>({
    includeDropStatements: false,
    includeComments: true,
    includeIndexes: true,
    includeConstraints: true,
    includeSampleData: false,
    formatSql: true,
    createDatabase: false,
    useIfNotExists: true
  });

  // 获取选中的表
  const selectedTableObjects = useMemo(() => {
    return schema.tables.filter(table => selectedTables.includes(table.id));
  }, [schema.tables, selectedTables]);

  // 生成SQL
  const generateSql = useCallback(async () => {
    setIsGenerating(true);
    
    try {
      let sql = '';
      
      // 数据库创建语句
      if (options.createDatabase && sqlType === 'create') {
        sql += generateDatabaseSql();
        sql += '\n\n';
      }
      
      // 删除语句
      if (options.includeDropStatements && sqlType === 'create') {
        sql += generateDropSql();
        sql += '\n\n';
      }
      
      // 根据类型生成不同的SQL
      switch (sqlType) {
        case 'create':
          sql += generateCreateSql();
          break;
        case 'alter':
          sql += generateAlterSql();
          break;
        case 'drop':
          sql += generateDropSql();
          break;
        case 'insert':
          sql += generateInsertSql();
          break;
      }
      
      // 格式化SQL
      if (options.formatSql) {
        sql = formatSql(sql);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setGeneratedSql(sql);
    } catch (error) {
      console.error('生成SQL失败:', error);
      setGeneratedSql('-- 生成SQL时发生错误\n-- ' + error);
    } finally {
      setIsGenerating(false);
    }
  }, [schema, selectedTableObjects, sqlType, options, engine]);

  // 生成数据库创建SQL
  const generateDatabaseSql = useCallback(() => {
    const dbName = schema.name.replace(/\s+/g, '_').toLowerCase();
    
    switch (engine) {
      case 'mysql':
        return `CREATE DATABASE IF NOT EXISTS \`${dbName}\` 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE \`${dbName}\`;`;
      
      case 'postgresql':
        return `CREATE DATABASE "${dbName}" 
  WITH ENCODING 'UTF8' 
  LC_COLLATE='en_US.UTF-8' 
  LC_CTYPE='en_US.UTF-8';
\\c ${dbName};`;
      
      case 'sqlite':
        return `-- SQLite 使用文件数据库，无需创建数据库语句\n-- 数据库文件: ${dbName}.db`;
      
      default:
        return '';
    }
  }, [schema.name, engine]);

  // 生成创建表SQL
  const generateCreateSql = useCallback(() => {
    const statements: string[] = [];
    
    // 生成表创建语句
    selectedTableObjects.forEach(table => {
      statements.push(generateCreateTableSql(table));
    });
    
    // 生成索引语句
    if (options.includeIndexes) {
      selectedTableObjects.forEach(table => {
        table.indexes.forEach(index => {
          statements.push(generateCreateIndexSql(table, index));
        });
      });
    }
    
    // 生成外键约束
    if (options.includeConstraints) {
      selectedTableObjects.forEach(table => {
        table.constraints.forEach(constraint => {
          if (constraint.type === 'foreign') {
            statements.push(generateAlterTableAddConstraintSql(table, constraint));
          }
        });
      });
    }
    
    // 生成示例数据
    if (options.includeSampleData) {
      selectedTableObjects.forEach(table => {
        statements.push(generateSampleDataSql(table));
      });
    }
    
    return statements.join('\n\n');
  }, [selectedTableObjects, options, engine]);

  // 生成单个表的创建SQL
  const generateCreateTableSql = useCallback((table: Table) => {
    const tableName = escapeIdentifier(table.name);
    const ifNotExists = options.useIfNotExists ? 'IF NOT EXISTS ' : '';
    
    let sql = `CREATE TABLE ${ifNotExists}${tableName} (\n`;
    
    // 列定义
    const columnSqls = table.columns.map(column => {
      return '  ' + generateColumnSql(column);
    });
    
    // 主键约束
    const primaryKeys = table.columns.filter(col => col.primaryKey);
    if (primaryKeys.length > 0) {
      const pkColumns = primaryKeys.map(col => escapeIdentifier(col.name)).join(', ');
      columnSqls.push(`  PRIMARY KEY (${pkColumns})`);
    }
    
    // 唯一约束
    const uniqueConstraints = table.constraints.filter(constraint => constraint.type === 'unique');
    uniqueConstraints.forEach(constraint => {
      const columns = constraint.columns.map(col => escapeIdentifier(col)).join(', ');
      columnSqls.push(`  UNIQUE KEY ${escapeIdentifier(constraint.name)} (${columns})`);
    });
    
    sql += columnSqls.join(',\n');
    sql += '\n)';
    
    // 引擎特定选项
    if (engine === 'mysql') {
      sql += ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    }
    
    sql += ';';
    
    // 表注释
    if (options.includeComments && table.comment) {
      if (engine === 'mysql') {
        sql = sql.slice(0, -1) + ` COMMENT='${table.comment}';`;
      } else if (engine === 'postgresql') {
        sql += `\nCOMMENT ON TABLE ${tableName} IS '${table.comment}';`;
      }
    }
    
    // 列注释
    if (options.includeComments && engine === 'postgresql') {
      table.columns.forEach(column => {
        if (column.comment) {
          sql += `\nCOMMENT ON COLUMN ${tableName}.${escapeIdentifier(column.name)} IS '${column.comment}';`;
        }
      });
    }
    
    return sql;
  }, [options, engine]);

  // 生成列定义SQL
  const generateColumnSql = useCallback((column: Column) => {
    const columnName = escapeIdentifier(column.name);
    let sql = columnName + ' ';
    
    // 数据类型
    let dataType = column.type.toUpperCase();
    if (column.length && ['VARCHAR', 'CHAR', 'DECIMAL', 'NUMERIC'].includes(dataType)) {
      dataType += `(${column.length})`;
    }
    sql += dataType;
    
    // 自增
    if (column.autoIncrement) {
      if (engine === 'mysql') {
        sql += ' AUTO_INCREMENT';
      } else if (engine === 'postgresql') {
        sql = sql.replace(dataType, 'SERIAL');
      } else if (engine === 'sqlite') {
        sql += ' AUTOINCREMENT';
      }
    }
    
    // 非空约束
    if (!column.nullable) {
      sql += ' NOT NULL';
    }
    
    // 默认值
    if (column.defaultValue) {
      sql += ` DEFAULT ${column.defaultValue}`;
    }
    
    // 唯一约束
    if (column.unique && !column.primaryKey) {
      sql += ' UNIQUE';
    }
    
    // 列注释 (MySQL)
    if (options.includeComments && column.comment && engine === 'mysql') {
      sql += ` COMMENT '${column.comment}'`;
    }
    
    return sql;
  }, [options, engine]);

  // 生成索引SQL
  const generateCreateIndexSql = useCallback((table: Table, index: Index) => {
    const tableName = escapeIdentifier(table.name);
    const indexName = escapeIdentifier(index.name);
    const columns = index.columns.map(col => escapeIdentifier(col)).join(', ');
    
    const unique = index.unique ? 'UNIQUE ' : '';
    
    if (engine === 'mysql') {
      return `CREATE ${unique}INDEX ${indexName} ON ${tableName} (${columns}) USING ${index.type.toUpperCase()};`;
    } else if (engine === 'postgresql') {
      return `CREATE ${unique}INDEX ${indexName} ON ${tableName} USING ${index.type} (${columns});`;
    } else {
      return `CREATE ${unique}INDEX ${indexName} ON ${tableName} (${columns});`;
    }
  }, [engine]);

  // 生成约束SQL
  const generateAlterTableAddConstraintSql = useCallback((table: Table, constraint: Constraint) => {
    const tableName = escapeIdentifier(table.name);
    const constraintName = escapeIdentifier(constraint.name);
    
    if (constraint.type === 'foreign') {
      const columns = constraint.columns.map(col => escapeIdentifier(col)).join(', ');
      const refTable = escapeIdentifier(constraint.referencedTable!);
      const refColumns = constraint.referencedColumns!.map(col => escapeIdentifier(col)).join(', ');
      
      let sql = `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} `;
      sql += `FOREIGN KEY (${columns}) REFERENCES ${refTable} (${refColumns})`;
      
      if (constraint.onUpdate) {
        sql += ` ON UPDATE ${constraint.onUpdate.toUpperCase().replace(' ', ' ')}`;
      }
      
      if (constraint.onDelete) {
        sql += ` ON DELETE ${constraint.onDelete.toUpperCase().replace(' ', ' ')}`;
      }
      
      return sql + ';';
    }
    
    return '';
  }, []);

  // 生成示例数据SQL
  const generateSampleDataSql = useCallback((table: Table) => {
    const tableName = escapeIdentifier(table.name);
    const columns = table.columns.filter(col => !col.autoIncrement);
    const columnNames = columns.map(col => escapeIdentifier(col.name)).join(', ');
    
    // 生成示例值
    const sampleValues = columns.map(column => {
      switch (column.type.toLowerCase()) {
        case 'varchar':
        case 'char':
        case 'text':
          return `'示例${column.name}'`;
        case 'int':
        case 'bigint':
        case 'integer':
          return '1';
        case 'decimal':
        case 'float':
        case 'double':
          return '1.0';
        case 'boolean':
          return engine === 'postgresql' ? 'true' : '1';
        case 'date':
          return "'2024-01-01'";
        case 'datetime':
        case 'timestamp':
          return "'2024-01-01 00:00:00'";
        default:
          return 'NULL';
      }
    }).join(', ');
    
    return `-- 示例数据\nINSERT INTO ${tableName} (${columnNames}) VALUES (${sampleValues});`;
  }, [engine]);

  // 生成删除SQL
  const generateDropSql = useCallback(() => {
    const statements: string[] = [];
    
    // 先删除外键约束
    selectedTableObjects.forEach(table => {
      table.constraints.forEach(constraint => {
        if (constraint.type === 'foreign') {
          const tableName = escapeIdentifier(table.name);
          const constraintName = escapeIdentifier(constraint.name);
          statements.push(`ALTER TABLE ${tableName} DROP FOREIGN KEY ${constraintName};`);
        }
      });
    });
    
    // 删除表（逆序）
    const reversedTables = [...selectedTableObjects].reverse();
    reversedTables.forEach(table => {
      const tableName = escapeIdentifier(table.name);
      const ifExists = options.useIfNotExists ? 'IF EXISTS ' : '';
      statements.push(`DROP TABLE ${ifExists}${tableName};`);
    });
    
    return statements.join('\n');
  }, [selectedTableObjects, options]);

  // 生成ALTER SQL
  const generateAlterSql = useCallback(() => {
    return '-- ALTER 语句生成功能开发中\n-- 请在表设计器中进行修改';
  }, []);

  // 生成INSERT SQL
  const generateInsertSql = useCallback(() => {
    const statements: string[] = [];
    
    selectedTableObjects.forEach(table => {
      statements.push(generateSampleDataSql(table));
    });
    
    return statements.join('\n\n');
  }, [selectedTableObjects, generateSampleDataSql]);

  // 转义标识符
  const escapeIdentifier = useCallback((identifier: string) => {
    switch (engine) {
      case 'mysql':
        return `\`${identifier}\``;
      case 'postgresql':
        return `"${identifier}"`;
      case 'sqlite':
        return `"${identifier}"`;
      default:
        return identifier;
    }
  }, [engine]);

  // 格式化SQL
  const formatSql = useCallback((sql: string) => {
    return sql
      .replace(/;\s*\n/g, ';\n\n')
      .replace(/,\s*\n/g, ',\n')
      .trim();
  }, []);

  // 复制SQL
  const copySql = useCallback(() => {
    navigator.clipboard.writeText(generatedSql).then(() => {
      // TODO: 显示成功提示
    });
  }, [generatedSql]);

  // 下载SQL文件
  const downloadSql = useCallback(() => {
    const blob = new Blob([generatedSql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schema.name.replace(/\s+/g, '_').toLowerCase()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedSql, schema.name]);

  // 自动生成SQL
  React.useEffect(() => {
    generateSql();
  }, [selectedTables, sqlType, options]);

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">SQL 生成器</h3>
            <p className="text-sm text-gray-600">
              为 {engine.toUpperCase()} 生成数据库脚本
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copySql}
              disabled={!generatedSql}
            >
              <ClipboardDocumentIcon className="w-4 h-4 mr-1" />
              复制
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSql}
              disabled={!generatedSql}
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
              下载
            </Button>
            
            <Button
              variant="primary"
              size="sm"
              onClick={generateSql}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>生成中...</>
              ) : (
                <>
                  <CodeBracketIcon className="w-4 h-4 mr-1" />
                  生成 SQL
                </>
              )}
            </Button>
          </div>
        </div>

        {/* SQL类型和选项 */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SQL 类型
            </label>
            <Select
              value={sqlType}
              onChange={(e) => setSqlType(e.target.value as any)}
              size="sm"
            >
              <option value="create">CREATE (创建)</option>
              <option value="alter">ALTER (修改)</option>
              <option value="drop">DROP (删除)</option>
              <option value="insert">INSERT (插入)</option>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              视图模式
            </label>
            <Select
              value={previewMode}
              onChange={(e) => setPreviewMode(e.target.value as any)}
              size="sm"
            >
              <option value="sql">SQL 代码</option>
              <option value="preview">预览模式</option>
            </Select>
          </div>
          
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              生成选项
            </label>
            <div className="flex flex-wrap gap-3">
              <Checkbox
                checked={options.includeComments}
                onChange={(e) => setOptions(prev => ({ ...prev, includeComments: e.target.checked }))}
                label="注释"
                size="sm"
              />
              <Checkbox
                checked={options.includeIndexes}
                onChange={(e) => setOptions(prev => ({ ...prev, includeIndexes: e.target.checked }))}
                label="索引"
                size="sm"
              />
              <Checkbox
                checked={options.includeConstraints}
                onChange={(e) => setOptions(prev => ({ ...prev, includeConstraints: e.target.checked }))}
                label="约束"
                size="sm"
              />
              <Checkbox
                checked={options.useIfNotExists}
                onChange={(e) => setOptions(prev => ({ ...prev, useIfNotExists: e.target.checked }))}
                label="IF NOT EXISTS"
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧表选择 */}
        <div className="w-80 border-r bg-white overflow-y-auto">
          <div className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">选择表格</h4>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedTables.length === schema.tables.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTables(schema.tables.map(t => t.id));
                    } else {
                      setSelectedTables([]);
                    }
                  }}
                  label="全选"
                />
                <span className="text-sm text-gray-600">
                  ({selectedTables.length}/{schema.tables.length})
                </span>
              </div>
              
              {schema.tables.map(table => (
                <div key={table.id} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedTables.includes(table.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTables(prev => [...prev, table.id]);
                      } else {
                        setSelectedTables(prev => prev.filter(id => id !== table.id));
                      }
                    }}
                    label={table.name}
                  />
                  <span className="text-xs text-gray-500">
                    ({table.columns.length} 列)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧SQL显示 */}
        <div className="flex-1 flex flex-col">
          {previewMode === 'sql' ? (
            <div className="flex-1 bg-gray-900">
              <Textarea
                value={generatedSql}
                onChange={() => {}}
                className="w-full h-full bg-gray-900 text-green-400 font-mono text-sm border-0 resize-none"
                placeholder={isGenerating ? '正在生成 SQL...' : '选择表格并配置选项生成 SQL'}
                readOnly
              />
            </div>
          ) : (
            <div className="flex-1 bg-white p-4 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">SQL 预览</h4>
                
                <div className="space-y-4">
                  {selectedTableObjects.map(table => (
                    <div key={table.id} className="border rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">{table.name}</h5>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h6 className="text-sm font-medium text-gray-700 mb-2">列结构</h6>
                          <div className="space-y-1">
                            {table.columns.map(column => (
                              <div key={column.id} className="text-sm">
                                <span className="font-mono">{column.name}</span>
                                <span className="text-gray-500 ml-2">{column.type}</span>
                                {column.primaryKey && (
                                  <span className="text-yellow-600 ml-1">PK</span>
                                )}
                                {!column.nullable && (
                                  <span className="text-red-600 ml-1">NOT NULL</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h6 className="text-sm font-medium text-gray-700 mb-2">索引和约束</h6>
                          <div className="space-y-1">
                            {table.indexes.map(index => (
                              <div key={index.id} className="text-sm">
                                <span className="font-mono">{index.name}</span>
                                <span className="text-gray-500 ml-2">
                                  ({index.columns.join(', ')})
                                </span>
                                {index.unique && (
                                  <span className="text-blue-600 ml-1">UNIQUE</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* 底部状态栏 */}
          <div className="border-t bg-gray-50 px-4 py-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <span>{selectedTables.length} 个表已选择</span>
                <span>引擎: {engine.toUpperCase()}</span>
                <span>类型: {sqlType.toUpperCase()}</span>
              </div>
              
              <div className="flex items-center space-x-4">
                <span>{generatedSql.split('\n').length} 行</span>
                <span>{generatedSql.length} 字符</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SqlGenerator;