import React, { useState, useCallback } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { 
  PlusIcon,
  TrashIcon,
  ArrowRightIcon,
  LinkIcon,
  Square3Stack3DIcon,
  ExclamationTriangleIcon
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

interface RelationshipEditorProps {
  tables: Table[];
  relationships: Relationship[];
  selectedRelationship: Relationship | null;
  onRelationshipSelect: (relationship: Relationship | null) => void;
  onRelationshipAdd: (relationship: Omit<Relationship, 'id'>) => void;
  onRelationshipUpdate: (relationshipId: string, updates: Partial<Relationship>) => void;
  onRelationshipDelete: (relationshipId: string) => void;
}

const RelationshipEditor: React.FC<RelationshipEditorProps> = ({
  tables,
  relationships,
  selectedRelationship,
  onRelationshipSelect,
  onRelationshipAdd,
  onRelationshipUpdate,
  onRelationshipDelete,
}) => {
  const [isAddingRelationship, setIsAddingRelationship] = useState(false);
  const [newRelationship, setNewRelationship] = useState<Omit<Relationship, 'id'>>({
    fromTable: '',
    fromColumn: '',
    toTable: '',
    toColumn: '',
    type: 'one-to-many',
    label: ''
  });

  // 获取表的列选项
  const getTableColumns = useCallback((tableName: string) => {
    const table = tables.find(t => t.name === tableName);
    return table ? table.columns : [];
  }, [tables]);

  // 验证关系
  const validateRelationship = useCallback((rel: Omit<Relationship, 'id'>) => {
    const errors: string[] = [];

    if (!rel.fromTable) errors.push('请选择源表');
    if (!rel.fromColumn) errors.push('请选择源列');
    if (!rel.toTable) errors.push('请选择目标表');
    if (!rel.toColumn) errors.push('请选择目标列');
    
    if (rel.fromTable === rel.toTable) {
      errors.push('源表和目标表不能相同');
    }

    if (rel.fromTable && rel.toTable) {
      const fromTable = tables.find(t => t.name === rel.fromTable);
      const toTable = tables.find(t => t.name === rel.toTable);
      
      if (fromTable && toTable) {
        const fromColumn = fromTable.columns.find(c => c.name === rel.fromColumn);
        const toColumn = toTable.columns.find(c => c.name === rel.toColumn);
        
        if (fromColumn && toColumn) {
          if (fromColumn.type !== toColumn.type) {
            errors.push('源列和目标列的数据类型不匹配');
          }
        }
      }
    }

    // 检查是否已存在相同关系
    const exists = relationships.some(existing => 
      existing.fromTable === rel.fromTable &&
      existing.fromColumn === rel.fromColumn &&
      existing.toTable === rel.toTable &&
      existing.toColumn === rel.toColumn
    );
    
    if (exists) {
      errors.push('该关系已存在');
    }

    return errors;
  }, [tables, relationships]);

  // 添加关系
  const handleAddRelationship = useCallback(() => {
    const errors = validateRelationship(newRelationship);
    
    if (errors.length === 0) {
      const label = newRelationship.label || 
        `${newRelationship.fromTable}.${newRelationship.fromColumn} → ${newRelationship.toTable}.${newRelationship.toColumn}`;
      
      onRelationshipAdd({
        ...newRelationship,
        label
      });
      
      setNewRelationship({
        fromTable: '',
        fromColumn: '',
        toTable: '',
        toColumn: '',
        type: 'one-to-many',
        label: ''
      });
      setIsAddingRelationship(false);
    } else {
      alert('请修正以下错误:\n' + errors.join('\n'));
    }
  }, [newRelationship, validateRelationship, onRelationshipAdd]);

  // 获取关系类型描述
  const getRelationshipTypeDescription = useCallback((type: string) => {
    switch (type) {
      case 'one-to-one':
        return '一对一 (1:1)';
      case 'one-to-many':
        return '一对多 (1:N)';
      case 'many-to-many':
        return '多对多 (M:N)';
      default:
        return type;
    }
  }, []);

  // 获取关系类型图标
  const getRelationshipTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'one-to-one':
        return '○——○';
      case 'one-to-many':
        return '○——⟨';
      case 'many-to-many':
        return '⟨——⟩';
      default:
        return '○——○';
    }
  }, []);

  // 获取关系建议
  const getRelationshipSuggestions = useCallback(() => {
    const suggestions: Array<{ from: string; to: string; reason: string }> = [];
    
    tables.forEach(fromTable => {
      fromTable.columns.forEach(fromColumn => {
        // 查找可能的外键关系
        if (fromColumn.name.endsWith('_id') && !fromColumn.primaryKey) {
          const referencedTableName = fromColumn.name.replace('_id', '');
          const referencedTable = tables.find(t => 
            t.name === referencedTableName || 
            t.name === referencedTableName + 's' ||
            t.name === referencedTableName.slice(0, -1)
          );
          
          if (referencedTable) {
            const primaryKey = referencedTable.columns.find(c => c.primaryKey);
            if (primaryKey) {
              const exists = relationships.some(rel => 
                rel.fromTable === referencedTable.name &&
                rel.fromColumn === primaryKey.name &&
                rel.toTable === fromTable.name &&
                rel.toColumn === fromColumn.name
              );
              
              if (!exists) {
                suggestions.push({
                  from: `${referencedTable.name}.${primaryKey.name}`,
                  to: `${fromTable.name}.${fromColumn.name}`,
                  reason: '外键命名约定'
                });
              }
            }
          }
        }
      });
    });
    
    return suggestions;
  }, [tables, relationships]);

  const suggestions = getRelationshipSuggestions();

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">关系管理</h3>
            <p className="text-sm text-gray-600">
              管理表之间的关系和外键约束 ({relationships.length} 个关系)
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddingRelationship(true)}
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            添加关系
          </Button>
        </div>

        {/* 关系建议 */}
        {suggestions.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">建议的关系</h4>
            <div className="space-y-1">
              {suggestions.slice(0, 3).map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-blue-800">
                    {suggestion.from} → {suggestion.to}
                  </span>
                  <span className="text-blue-600 text-xs">({suggestion.reason})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧关系列表 */}
        <div className="w-96 border-r bg-white overflow-y-auto">
          <div className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">现有关系</h4>
            
            {relationships.length > 0 ? (
              <div className="space-y-2">
                {relationships.map(relationship => (
                  <div
                    key={relationship.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedRelationship?.id === relationship.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => onRelationshipSelect(relationship)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-mono">
                          {getRelationshipTypeIcon(relationship.type)}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          relationship.type === 'one-to-one' ? 'bg-green-100 text-green-800' :
                          relationship.type === 'one-to-many' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {getRelationshipTypeDescription(relationship.type)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRelationshipDelete(relationship.id);
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="text-sm">
                      <div className="flex items-center space-x-2 text-gray-900">
                        <span className="font-medium">{relationship.fromTable}</span>
                        <span className="text-gray-500">({relationship.fromColumn})</span>
                      </div>
                      <div className="flex items-center justify-center my-1">
                        <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex items-center space-x-2 text-gray-900">
                        <span className="font-medium">{relationship.toTable}</span>
                        <span className="text-gray-500">({relationship.toColumn})</span>
                      </div>
                    </div>
                    
                    {relationship.label && (
                      <p className="text-xs text-gray-600 mt-2">{relationship.label}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <LinkIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">暂无关系</p>
                <p className="text-xs text-gray-400">创建表之间的关系</p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧详细编辑 */}
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          {isAddingRelationship ? (
            /* 添加关系表单 */
            <div className="p-6">
              <div className="bg-white rounded-lg border p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">创建新关系</h4>
                
                <div className="space-y-6">
                  {/* 源表和列 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        源表
                      </label>
                      <Select
                        value={newRelationship.fromTable}
                        onChange={(e) => {
                          setNewRelationship(prev => ({
                            ...prev,
                            fromTable: e.target.value,
                            fromColumn: ''
                          }));
                        }}
                        size="sm"
                      >
                        <option value="">选择表</option>
                        {tables.map(table => (
                          <option key={table.id} value={table.name}>
                            {table.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        源列
                      </label>
                      <Select
                        value={newRelationship.fromColumn}
                        onChange={(e) => {
                          setNewRelationship(prev => ({
                            ...prev,
                            fromColumn: e.target.value
                          }));
                        }}
                        disabled={!newRelationship.fromTable}
                        size="sm"
                      >
                        <option value="">选择列</option>
                        {getTableColumns(newRelationship.fromTable).map(column => (
                          <option key={column.id} value={column.name}>
                            {column.name} ({column.type})
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {/* 关系类型 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      关系类型
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'one-to-one', label: '一对一', icon: '○——○' },
                        { value: 'one-to-many', label: '一对多', icon: '○——⟨' },
                        { value: 'many-to-many', label: '多对多', icon: '⟨——⟩' }
                      ].map(type => (
                        <button
                          key={type.value}
                          onClick={() => setNewRelationship(prev => ({ ...prev, type: type.value as any }))}
                          className={`p-3 border rounded-lg text-center transition-colors ${
                            newRelationship.type === type.value
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-lg font-mono mb-1">{type.icon}</div>
                          <div className="text-sm font-medium">{type.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 目标表和列 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        目标表
                      </label>
                      <Select
                        value={newRelationship.toTable}
                        onChange={(e) => {
                          setNewRelationship(prev => ({
                            ...prev,
                            toTable: e.target.value,
                            toColumn: ''
                          }));
                        }}
                        size="sm"
                      >
                        <option value="">选择表</option>
                        {tables.filter(table => table.name !== newRelationship.fromTable).map(table => (
                          <option key={table.id} value={table.name}>
                            {table.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        目标列
                      </label>
                      <Select
                        value={newRelationship.toColumn}
                        onChange={(e) => {
                          setNewRelationship(prev => ({
                            ...prev,
                            toColumn: e.target.value
                          }));
                        }}
                        disabled={!newRelationship.toTable}
                        size="sm"
                      >
                        <option value="">选择列</option>
                        {getTableColumns(newRelationship.toTable).map(column => (
                          <option key={column.id} value={column.name}>
                            {column.name} ({column.type})
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {/* 关系标签 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      关系标签（可选）
                    </label>
                    <Input
                      value={newRelationship.label}
                      onChange={(e) => setNewRelationship(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="描述这个关系..."
                      size="sm"
                    />
                  </div>

                  {/* 验证结果 */}
                  {newRelationship.fromTable && newRelationship.toTable && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">关系预览</h5>
                      <div className="text-sm text-gray-700">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{newRelationship.fromTable}</span>
                          <span>({newRelationship.fromColumn})</span>
                          <ArrowRightIcon className="w-4 h-4" />
                          <span className="font-medium">{newRelationship.toTable}</span>
                          <span>({newRelationship.toColumn})</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          {getRelationshipTypeDescription(newRelationship.type)}
                        </div>
                      </div>
                      
                      {(() => {
                        const errors = validateRelationship(newRelationship);
                        return errors.length > 0 && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <div className="flex items-start space-x-2">
                              <ExclamationTriangleIcon className="w-4 h-4 text-red-500 mt-0.5" />
                              <div className="text-sm text-red-700">
                                {errors.map((error, index) => (
                                  <div key={index}>• {error}</div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex items-center justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddingRelationship(false)}
                    >
                      取消
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleAddRelationship}
                      disabled={validateRelationship(newRelationship).length > 0}
                    >
                      创建关系
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedRelationship ? (
            /* 编辑选中的关系 */
            <div className="p-6">
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    编辑关系
                  </h4>
                  <Button
                    variant="outline"
                    onClick={() => onRelationshipSelect(null)}
                  >
                    关闭
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* 关系信息显示 */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-mono mb-2">
                        {getRelationshipTypeIcon(selectedRelationship.type)}
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {selectedRelationship.fromTable}.{selectedRelationship.fromColumn}
                        </div>
                        <div className="text-gray-500 my-1">
                          {getRelationshipTypeDescription(selectedRelationship.type)}
                        </div>
                        <div className="font-medium text-gray-900">
                          {selectedRelationship.toTable}.{selectedRelationship.toColumn}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 编辑表单 */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        关系类型
                      </label>
                      <Select
                        value={selectedRelationship.type}
                        onChange={(e) => onRelationshipUpdate(selectedRelationship.id, { 
                          type: e.target.value as any 
                        })}
                        size="sm"
                      >
                        <option value="one-to-one">一对一 (1:1)</option>
                        <option value="one-to-many">一对多 (1:N)</option>
                        <option value="many-to-many">多对多 (M:N)</option>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        关系标签
                      </label>
                      <Input
                        value={selectedRelationship.label || ''}
                        onChange={(e) => onRelationshipUpdate(selectedRelationship.id, { 
                          label: e.target.value 
                        })}
                        placeholder="描述这个关系..."
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* 相关表信息 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-2">源表</h5>
                      <div className="space-y-1 text-sm">
                        <div>表名: {selectedRelationship.fromTable}</div>
                        <div>列名: {selectedRelationship.fromColumn}</div>
                        {(() => {
                          const table = tables.find(t => t.name === selectedRelationship.fromTable);
                          const column = table?.columns.find(c => c.name === selectedRelationship.fromColumn);
                          return column && (
                            <div>类型: {column.type}</div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-2">目标表</h5>
                      <div className="space-y-1 text-sm">
                        <div>表名: {selectedRelationship.toTable}</div>
                        <div>列名: {selectedRelationship.toColumn}</div>
                        {(() => {
                          const table = tables.find(t => t.name === selectedRelationship.toTable);
                          const column = table?.columns.find(c => c.name === selectedRelationship.toColumn);
                          return column && (
                            <div>类型: {column.type}</div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 空状态 */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <LinkIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">管理表关系</h3>
                <p className="text-gray-600 mb-4">
                  创建和管理表之间的外键关系
                </p>
                <Button
                  variant="primary"
                  onClick={() => setIsAddingRelationship(true)}
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  创建关系
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RelationshipEditor;