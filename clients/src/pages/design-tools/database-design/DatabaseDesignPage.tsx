import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui';
import { 
  DocumentPlusIcon,
  FolderOpenIcon,
  DocumentArrowDownIcon,
  ShareIcon,
  PlayIcon,
  Cog6ToothIcon,
  EyeIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';
import ERDCanvas from './components/ERDCanvas';
import TableDesigner from './components/TableDesigner';
import RelationshipEditor from './components/RelationshipEditor';
import SchemaValidator from './components/SchemaValidator';
import SqlGenerator from './components/SqlGenerator';

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

const DatabaseDesignPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'design' | 'tables' | 'relationships' | 'validation' | 'sql'>('design');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 示例数据库架构
  const [schema, setSchema] = useState<DatabaseSchema>({
    id: 'schema_1',
    name: '用户管理系统',
    description: '用户管理系统数据库设计',
    version: '1.0.0',
    engine: 'mysql',
    tables: [
      {
        id: 'table_users',
        name: 'users',
        position: { x: 100, y: 100 },
        columns: [
          {
            id: 'col_1',
            name: 'id',
            type: 'bigint',
            nullable: false,
            primaryKey: true,
            unique: true,
            autoIncrement: true,
            comment: '用户ID'
          },
          {
            id: 'col_2',
            name: 'username',
            type: 'varchar',
            length: 50,
            nullable: false,
            primaryKey: false,
            unique: true,
            autoIncrement: false,
            comment: '用户名'
          },
          {
            id: 'col_3',
            name: 'email',
            type: 'varchar',
            length: 100,
            nullable: false,
            primaryKey: false,
            unique: true,
            autoIncrement: false,
            comment: '邮箱'
          },
          {
            id: 'col_4',
            name: 'created_at',
            type: 'timestamp',
            nullable: false,
            primaryKey: false,
            unique: false,
            autoIncrement: false,
            defaultValue: 'CURRENT_TIMESTAMP',
            comment: '创建时间'
          }
        ],
        indexes: [
          {
            id: 'idx_1',
            name: 'idx_username',
            columns: ['username'],
            unique: true,
            type: 'btree'
          }
        ],
        constraints: [
          {
            id: 'const_1',
            name: 'pk_users',
            type: 'primary',
            columns: ['id']
          }
        ],
        comment: '用户表'
      },
      {
        id: 'table_posts',
        name: 'posts',
        position: { x: 400, y: 100 },
        columns: [
          {
            id: 'col_5',
            name: 'id',
            type: 'bigint',
            nullable: false,
            primaryKey: true,
            unique: true,
            autoIncrement: true,
            comment: '文章ID'
          },
          {
            id: 'col_6',
            name: 'user_id',
            type: 'bigint',
            nullable: false,
            primaryKey: false,
            unique: false,
            autoIncrement: false,
            comment: '用户ID'
          },
          {
            id: 'col_7',
            name: 'title',
            type: 'varchar',
            length: 200,
            nullable: false,
            primaryKey: false,
            unique: false,
            autoIncrement: false,
            comment: '标题'
          },
          {
            id: 'col_8',
            name: 'content',
            type: 'text',
            nullable: true,
            primaryKey: false,
            unique: false,
            autoIncrement: false,
            comment: '内容'
          }
        ],
        indexes: [
          {
            id: 'idx_2',
            name: 'idx_user_id',
            columns: ['user_id'],
            unique: false,
            type: 'btree'
          }
        ],
        constraints: [
          {
            id: 'const_2',
            name: 'pk_posts',
            type: 'primary',
            columns: ['id']
          },
          {
            id: 'const_3',
            name: 'fk_posts_user',
            type: 'foreign',
            columns: ['user_id'],
            referencedTable: 'users',
            referencedColumns: ['id'],
            onUpdate: 'cascade',
            onDelete: 'cascade'
          }
        ],
        comment: '文章表'
      }
    ],
    relationships: [
      {
        id: 'rel_1',
        fromTable: 'users',
        fromColumn: 'id',
        toTable: 'posts',
        toColumn: 'user_id',
        type: 'one-to-many',
        label: '用户发布文章'
      }
    ],
    views: [],
    procedures: [],
    triggers: []
  });

  // 添加表
  const handleAddTable = useCallback(() => {
    const newTable: Table = {
      id: `table_${Date.now()}`,
      name: 'new_table',
      position: { x: 200, y: 200 },
      columns: [
        {
          id: `col_${Date.now()}`,
          name: 'id',
          type: 'bigint',
          nullable: false,
          primaryKey: true,
          unique: true,
          autoIncrement: true,
          comment: '主键ID'
        }
      ],
      indexes: [],
      constraints: [],
      comment: '新建表'
    };

    setSchema(prev => ({
      ...prev,
      tables: [...prev.tables, newTable]
    }));
    setSelectedTable(newTable);
  }, []);

  // 更新表
  const handleUpdateTable = useCallback((tableId: string, updates: Partial<Table>) => {
    setSchema(prev => ({
      ...prev,
      tables: prev.tables.map(table => 
        table.id === tableId ? { ...table, ...updates } : table
      )
    }));

    if (selectedTable?.id === tableId) {
      setSelectedTable(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedTable]);

  // 删除表
  const handleDeleteTable = useCallback((tableId: string) => {
    setSchema(prev => ({
      ...prev,
      tables: prev.tables.filter(table => table.id !== tableId),
      relationships: prev.relationships.filter(rel => 
        rel.fromTable !== tableId && rel.toTable !== tableId
      )
    }));

    if (selectedTable?.id === tableId) {
      setSelectedTable(null);
    }
  }, [selectedTable]);

  // 添加关系
  const handleAddRelationship = useCallback((relationship: Omit<Relationship, 'id'>) => {
    const newRelationship: Relationship = {
      id: `rel_${Date.now()}`,
      ...relationship
    };

    setSchema(prev => ({
      ...prev,
      relationships: [...prev.relationships, newRelationship]
    }));
  }, []);

  // 更新关系
  const handleUpdateRelationship = useCallback((relationshipId: string, updates: Partial<Relationship>) => {
    setSchema(prev => ({
      ...prev,
      relationships: prev.relationships.map(rel => 
        rel.id === relationshipId ? { ...rel, ...updates } : rel
      )
    }));
  }, []);

  // 删除关系
  const handleDeleteRelationship = useCallback((relationshipId: string) => {
    setSchema(prev => ({
      ...prev,
      relationships: prev.relationships.filter(rel => rel.id !== relationshipId)
    }));

    if (selectedRelationship?.id === relationshipId) {
      setSelectedRelationship(null);
    }
  }, [selectedRelationship]);

  // 导入架构
  const handleImportSchema = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.sql';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsLoading(true);
        try {
          const content = await file.text();
          if (file.name.endsWith('.json')) {
            const importedSchema = JSON.parse(content);
            setSchema(importedSchema);
          } else if (file.name.endsWith('.sql')) {
            // TODO: 解析SQL文件
            console.log('解析SQL文件:', content);
          }
        } catch (error) {
          console.error('导入失败:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    input.click();
  }, []);

  // 导出架构
  const handleExportSchema = useCallback((format: 'json' | 'sql' | 'png') => {
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${schema.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'sql') {
      // TODO: 生成SQL
      console.log('导出SQL');
    } else if (format === 'png') {
      // TODO: 导出图片
      console.log('导出图片');
    }
  }, [schema]);

  const tabs = [
    { id: 'design', label: 'ER图设计', icon: EyeIcon },
    { id: 'tables', label: '表设计', icon: DocumentPlusIcon },
    { id: 'relationships', label: '关系管理', icon: ShareIcon },
    { id: 'validation', label: '架构验证', icon: Cog6ToothIcon },
    { id: 'sql', label: 'SQL生成', icon: CodeBracketIcon }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">数据库设计</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>{schema.name}</span>
              <span>•</span>
              <span>v{schema.version}</span>
              <span>•</span>
              <span className="capitalize">{schema.engine}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportSchema}
              disabled={isLoading}
            >
              <FolderOpenIcon className="w-4 h-4 mr-1" />
              导入
            </Button>
            
            <div className="relative group">
              <Button
                variant="outline"
                size="sm"
              >
                <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                导出
              </Button>
              <div className="absolute right-0 top-full mt-1 w-32 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExportSchema('json')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  JSON 格式
                </button>
                <button
                  onClick={() => handleExportSchema('sql')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  SQL 脚本
                </button>
                <button
                  onClick={() => handleExportSchema('png')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  PNG 图片
                </button>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleAddTable}
            >
              <DocumentPlusIcon className="w-4 h-4 mr-1" />
              新建表
            </Button>
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex items-center space-x-1 mt-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 mr-1 inline" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'design' && (
          <ERDCanvas
            schema={schema}
            selectedTable={selectedTable}
            selectedRelationship={selectedRelationship}
            onTableSelect={setSelectedTable}
            onTableUpdate={handleUpdateTable}
            onTableDelete={handleDeleteTable}
            onRelationshipSelect={setSelectedRelationship}
            onRelationshipAdd={handleAddRelationship}
            onRelationshipUpdate={handleUpdateRelationship}
            onRelationshipDelete={handleDeleteRelationship}
          />
        )}

        {currentTab === 'tables' && (
          <TableDesigner
            tables={schema.tables}
            selectedTable={selectedTable}
            onTableSelect={setSelectedTable}
            onTableUpdate={handleUpdateTable}
            onTableDelete={handleDeleteTable}
            onAddTable={handleAddTable}
            engine={schema.engine}
          />
        )}

        {currentTab === 'relationships' && (
          <RelationshipEditor
            tables={schema.tables}
            relationships={schema.relationships}
            selectedRelationship={selectedRelationship}
            onRelationshipSelect={setSelectedRelationship}
            onRelationshipAdd={handleAddRelationship}
            onRelationshipUpdate={handleUpdateRelationship}
            onRelationshipDelete={handleDeleteRelationship}
          />
        )}

        {currentTab === 'validation' && (
          <SchemaValidator
            schema={schema}
          />
        )}

        {currentTab === 'sql' && (
          <SqlGenerator
            schema={schema}
            engine={schema.engine}
          />
        )}
      </div>
    </div>
  );
};

export default DatabaseDesignPage;