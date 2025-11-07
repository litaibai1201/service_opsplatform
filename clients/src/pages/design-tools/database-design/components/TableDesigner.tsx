import React, { useState, useCallback } from 'react';
import { Button, Input, Select, Textarea, Checkbox } from '@/components/ui';
import { 
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  Square3Stack3DIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  CodeBracketIcon
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

interface TableDesignerProps {
  tables: Table[];
  selectedTable: Table | null;
  onTableSelect: (table: Table | null) => void;
  onTableUpdate: (tableId: string, updates: Partial<Table>) => void;
  onTableDelete: (tableId: string) => void;
  onAddTable: () => void;
  engine: 'mysql' | 'postgresql' | 'sqlite' | 'mongodb';
}

const TableDesigner: React.FC<TableDesignerProps> = ({
  tables,
  selectedTable,
  onTableSelect,
  onTableUpdate,
  onTableDelete,
  onAddTable,
  engine
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState<'columns' | 'indexes' | 'constraints'>('columns');
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [editingIndex, setEditingIndex] = useState<Index | null>(null);
  const [editingConstraint, setEditingConstraint] = useState<Constraint | null>(null);

  // 数据类型选项
  const getDataTypes = useCallback(() => {
    switch (engine) {
      case 'mysql':
        return [
          'tinyint', 'smallint', 'mediumint', 'int', 'bigint',
          'float', 'double', 'decimal',
          'char', 'varchar', 'text', 'mediumtext', 'longtext',
          'date', 'time', 'datetime', 'timestamp', 'year',
          'binary', 'varbinary', 'blob', 'mediumblob', 'longblob',
          'json', 'enum', 'set'
        ];
      case 'postgresql':
        return [
          'smallint', 'integer', 'bigint', 'serial', 'bigserial',
          'real', 'double precision', 'numeric',
          'char', 'varchar', 'text',
          'date', 'time', 'timestamp', 'timestamptz', 'interval',
          'boolean', 'bytea', 'uuid', 'json', 'jsonb',
          'inet', 'cidr', 'macaddr', 'point', 'line', 'polygon'
        ];
      case 'sqlite':
        return [
          'integer', 'real', 'text', 'blob', 'numeric'
        ];
      default:
        return ['string', 'number', 'boolean', 'date', 'object', 'array'];
    }
  }, [engine]);

  // 过滤表格
  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.comment?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 添加列
  const handleAddColumn = useCallback(() => {
    if (!selectedTable) return;

    const newColumn: Column = {
      id: `col_${Date.now()}`,
      name: `column_${selectedTable.columns.length + 1}`,
      type: getDataTypes()[0],
      nullable: true,
      primaryKey: false,
      unique: false,
      autoIncrement: false,
      comment: ''
    };

    onTableUpdate(selectedTable.id, {
      columns: [...selectedTable.columns, newColumn]
    });
    setEditingColumn(newColumn);
  }, [selectedTable, onTableUpdate, getDataTypes]);

  // 更新列
  const handleUpdateColumn = useCallback((columnId: string, updates: Partial<Column>) => {
    if (!selectedTable) return;

    const updatedColumns = selectedTable.columns.map(col =>
      col.id === columnId ? { ...col, ...updates } : col
    );

    onTableUpdate(selectedTable.id, { columns: updatedColumns });

    if (editingColumn?.id === columnId) {
      setEditingColumn(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedTable, onTableUpdate, editingColumn]);

  // 删除列
  const handleDeleteColumn = useCallback((columnId: string) => {
    if (!selectedTable) return;

    const updatedColumns = selectedTable.columns.filter(col => col.id !== columnId);
    onTableUpdate(selectedTable.id, { columns: updatedColumns });

    if (editingColumn?.id === columnId) {
      setEditingColumn(null);
    }
  }, [selectedTable, onTableUpdate, editingColumn]);

  // 添加索引
  const handleAddIndex = useCallback(() => {
    if (!selectedTable) return;

    const newIndex: Index = {
      id: `idx_${Date.now()}`,
      name: `idx_${selectedTable.name}_${selectedTable.indexes.length + 1}`,
      columns: [],
      unique: false,
      type: 'btree'
    };

    onTableUpdate(selectedTable.id, {
      indexes: [...selectedTable.indexes, newIndex]
    });
    setEditingIndex(newIndex);
  }, [selectedTable, onTableUpdate]);

  // 更新索引
  const handleUpdateIndex = useCallback((indexId: string, updates: Partial<Index>) => {
    if (!selectedTable) return;

    const updatedIndexes = selectedTable.indexes.map(idx =>
      idx.id === indexId ? { ...idx, ...updates } : idx
    );

    onTableUpdate(selectedTable.id, { indexes: updatedIndexes });

    if (editingIndex?.id === indexId) {
      setEditingIndex(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedTable, onTableUpdate, editingIndex]);

  // 删除索引
  const handleDeleteIndex = useCallback((indexId: string) => {
    if (!selectedTable) return;

    const updatedIndexes = selectedTable.indexes.filter(idx => idx.id !== indexId);
    onTableUpdate(selectedTable.id, { indexes: updatedIndexes });

    if (editingIndex?.id === indexId) {
      setEditingIndex(null);
    }
  }, [selectedTable, onTableUpdate, editingIndex]);

  // 添加约束
  const handleAddConstraint = useCallback(() => {
    if (!selectedTable) return;

    const newConstraint: Constraint = {
      id: `const_${Date.now()}`,
      name: `const_${selectedTable.name}_${selectedTable.constraints.length + 1}`,
      type: 'check',
      columns: []
    };

    onTableUpdate(selectedTable.id, {
      constraints: [...selectedTable.constraints, newConstraint]
    });
    setEditingConstraint(newConstraint);
  }, [selectedTable, onTableUpdate]);

  // 更新约束
  const handleUpdateConstraint = useCallback((constraintId: string, updates: Partial<Constraint>) => {
    if (!selectedTable) return;

    const updatedConstraints = selectedTable.constraints.map(const_ =>
      const_.id === constraintId ? { ...const_, ...updates } : const_
    );

    onTableUpdate(selectedTable.id, { constraints: updatedConstraints });

    if (editingConstraint?.id === constraintId) {
      setEditingConstraint(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedTable, onTableUpdate, editingConstraint]);

  // 删除约束
  const handleDeleteConstraint = useCallback((constraintId: string) => {
    if (!selectedTable) return;

    const updatedConstraints = selectedTable.constraints.filter(const_ => const_.id !== constraintId);
    onTableUpdate(selectedTable.id, { constraints: updatedConstraints });

    if (editingConstraint?.id === constraintId) {
      setEditingConstraint(null);
    }
  }, [selectedTable, onTableUpdate, editingConstraint]);

  // 渲染列编辑器
  const renderColumnEditor = () => (
    <div className="space-y-4">
      {/* 列列表 */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">列定义</h4>
        <Button variant="outline" size="sm" onClick={handleAddColumn}>
          <PlusIcon className="w-4 h-4 mr-1" />
          添加列
        </Button>
      </div>

      <div className="space-y-2">
        {selectedTable?.columns.map(column => (
          <div
            key={column.id}
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              editingColumn?.id === column.id
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setEditingColumn(column)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {column.primaryKey && (
                  <KeyIcon className="w-4 h-4 text-yellow-500" title="主键" />
                )}
                <span className="font-medium text-gray-900">{column.name}</span>
                <span className="text-sm text-gray-500">
                  {column.length ? `${column.type}(${column.length})` : column.type}
                </span>
                {!column.nullable && (
                  <span className="text-xs bg-red-100 text-red-800 px-1 rounded">NOT NULL</span>
                )}
                {column.unique && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">UNIQUE</span>
                )}
                {column.autoIncrement && (
                  <span className="text-xs bg-green-100 text-green-800 px-1 rounded">AUTO</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteColumn(column.id);
                }}
                className="text-red-600 hover:text-red-800"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </div>
            {column.comment && (
              <p className="text-sm text-gray-600 mt-1">{column.comment}</p>
            )}
          </div>
        ))}
      </div>

      {/* 列详细编辑 */}
      {editingColumn && (
        <div className="border-t pt-4">
          <h5 className="font-medium text-gray-900 mb-3">编辑列: {editingColumn.name}</h5>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">列名</label>
              <Input
                value={editingColumn.name}
                onChange={(e) => handleUpdateColumn(editingColumn.id, { name: e.target.value })}
                size="sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">数据类型</label>
              <Select
                value={editingColumn.type}
                onChange={(e) => handleUpdateColumn(editingColumn.id, { type: e.target.value })}
                size="sm"
              >
                {getDataTypes().map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">长度</label>
              <Input
                type="number"
                value={editingColumn.length || ''}
                onChange={(e) => handleUpdateColumn(editingColumn.id, { 
                  length: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                size="sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">默认值</label>
              <Input
                value={editingColumn.defaultValue || ''}
                onChange={(e) => handleUpdateColumn(editingColumn.id, { defaultValue: e.target.value })}
                size="sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">注释</label>
              <Input
                value={editingColumn.comment || ''}
                onChange={(e) => handleUpdateColumn(editingColumn.id, { comment: e.target.value })}
                size="sm"
              />
            </div>
            <div className="col-span-2">
              <div className="flex flex-wrap gap-4">
                <Checkbox
                  checked={!editingColumn.nullable}
                  onChange={(e) => handleUpdateColumn(editingColumn.id, { nullable: !e.target.checked })}
                  label="非空"
                />
                <Checkbox
                  checked={editingColumn.primaryKey}
                  onChange={(e) => handleUpdateColumn(editingColumn.id, { primaryKey: e.target.checked })}
                  label="主键"
                />
                <Checkbox
                  checked={editingColumn.unique}
                  onChange={(e) => handleUpdateColumn(editingColumn.id, { unique: e.target.checked })}
                  label="唯一"
                />
                <Checkbox
                  checked={editingColumn.autoIncrement}
                  onChange={(e) => handleUpdateColumn(editingColumn.id, { autoIncrement: e.target.checked })}
                  label="自增"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 渲染索引编辑器
  const renderIndexEditor = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">索引管理</h4>
        <Button variant="outline" size="sm" onClick={handleAddIndex}>
          <PlusIcon className="w-4 h-4 mr-1" />
          添加索引
        </Button>
      </div>

      <div className="space-y-2">
        {selectedTable?.indexes.map(index => (
          <div
            key={index.id}
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              editingIndex?.id === index.id
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setEditingIndex(index)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{index.name}</span>
                <span className="text-sm text-gray-500">({index.columns.join(', ')})</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  index.unique ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {index.unique ? 'UNIQUE' : 'INDEX'}
                </span>
                <span className="text-xs text-gray-500">{index.type.toUpperCase()}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteIndex(index.id);
                }}
                className="text-red-600 hover:text-red-800"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {editingIndex && (
        <div className="border-t pt-4">
          <h5 className="font-medium text-gray-900 mb-3">编辑索引: {editingIndex.name}</h5>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">索引名</label>
              <Input
                value={editingIndex.name}
                onChange={(e) => handleUpdateIndex(editingIndex.id, { name: e.target.value })}
                size="sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">索引类型</label>
              <Select
                value={editingIndex.type}
                onChange={(e) => handleUpdateIndex(editingIndex.id, { type: e.target.value as any })}
                size="sm"
              >
                <option value="btree">B-Tree</option>
                <option value="hash">Hash</option>
                {engine === 'postgresql' && (
                  <>
                    <option value="gist">GiST</option>
                    <option value="gin">GIN</option>
                  </>
                )}
              </Select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">索引列</label>
              <div className="space-y-2">
                {selectedTable?.columns.map(column => (
                  <Checkbox
                    key={column.id}
                    checked={editingIndex.columns.includes(column.name)}
                    onChange={(e) => {
                      const columns = e.target.checked
                        ? [...editingIndex.columns, column.name]
                        : editingIndex.columns.filter(col => col !== column.name);
                      handleUpdateIndex(editingIndex.id, { columns });
                    }}
                    label={column.name}
                  />
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <Checkbox
                checked={editingIndex.unique}
                onChange={(e) => handleUpdateIndex(editingIndex.id, { unique: e.target.checked })}
                label="唯一索引"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 渲染约束编辑器
  const renderConstraintEditor = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">约束管理</h4>
        <Button variant="outline" size="sm" onClick={handleAddConstraint}>
          <PlusIcon className="w-4 h-4 mr-1" />
          添加约束
        </Button>
      </div>

      <div className="space-y-2">
        {selectedTable?.constraints.map(constraint => (
          <div
            key={constraint.id}
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              editingConstraint?.id === constraint.id
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setEditingConstraint(constraint)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{constraint.name}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  constraint.type === 'primary' ? 'bg-yellow-100 text-yellow-800' :
                  constraint.type === 'foreign' ? 'bg-blue-100 text-blue-800' :
                  constraint.type === 'unique' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {constraint.type.toUpperCase()}
                </span>
                <span className="text-sm text-gray-500">
                  ({constraint.columns.join(', ')})
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConstraint(constraint.id);
                }}
                className="text-red-600 hover:text-red-800"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full flex">
      {/* 左侧表格列表 */}
      <div className="w-80 border-r bg-white flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900 mb-3">数据表</h3>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索表格..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              size="sm"
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={onAddTable}
            className="w-full mt-3"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            新建表
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredTables.length > 0 ? (
            <div className="space-y-2">
              {filteredTables.map(table => (
                <div
                  key={table.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedTable?.id === table.id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => onTableSelect(table)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Square3Stack3DIcon className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900">{table.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // 复制表格逻辑
                        }}
                        className="p-1"
                      >
                        <DocumentDuplicateIcon className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTableDelete(table.id);
                        }}
                        className="p-1 text-red-600"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {table.comment && (
                    <p className="text-sm text-gray-600 mt-1">{table.comment}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-xs text-gray-500">{table.columns.length} 列</span>
                    <span className="text-xs text-gray-500">{table.indexes.length} 索引</span>
                    <span className="text-xs text-gray-500">{table.constraints.length} 约束</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Square3Stack3DIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">暂无数据表</p>
            </div>
          )}
        </div>
      </div>

      {/* 右侧详细编辑 */}
      <div className="flex-1 flex flex-col">
        {selectedTable ? (
          <>
            {/* 表格信息 */}
            <div className="border-b bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedTable.name}</h2>
                  <p className="text-sm text-gray-600">{selectedTable.comment || '暂无描述'}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <CodeBracketIcon className="w-4 h-4 mr-1" />
                    生成SQL
                  </Button>
                  <Button variant="outline" size="sm">
                    <AdjustmentsHorizontalIcon className="w-4 h-4 mr-1" />
                    表设置
                  </Button>
                </div>
              </div>

              {/* 表格基本信息编辑 */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">表名</label>
                  <Input
                    value={selectedTable.name}
                    onChange={(e) => onTableUpdate(selectedTable.id, { name: e.target.value })}
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">表注释</label>
                  <Input
                    value={selectedTable.comment || ''}
                    onChange={(e) => onTableUpdate(selectedTable.id, { comment: e.target.value })}
                    size="sm"
                  />
                </div>
              </div>

              {/* 标签页 */}
              <div className="flex items-center space-x-1 mt-4">
                {[
                  { id: 'columns', label: '列定义' },
                  { id: 'indexes', label: '索引' },
                  { id: 'constraints', label: '约束' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id as any)}
                    className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                      currentTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 bg-gray-50 p-4 overflow-y-auto">
              {currentTab === 'columns' && renderColumnEditor()}
              {currentTab === 'indexes' && renderIndexEditor()}
              {currentTab === 'constraints' && renderConstraintEditor()}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Square3Stack3DIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">选择一个表格开始编辑</h3>
              <p className="text-gray-600">从左侧列表中选择表格或创建新表格</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableDesigner;