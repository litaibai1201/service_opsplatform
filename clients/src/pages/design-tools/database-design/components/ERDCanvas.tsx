import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui';
import { 
  MagnifyingGlassIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  ArrowsPointingOutIcon,
  Square3Stack3DIcon,
  LinkIcon
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

interface ERDCanvasProps {
  schema: DatabaseSchema;
  selectedTable: Table | null;
  selectedRelationship: Relationship | null;
  onTableSelect: (table: Table | null) => void;
  onTableUpdate: (tableId: string, updates: Partial<Table>) => void;
  onTableDelete: (tableId: string) => void;
  onRelationshipSelect: (relationship: Relationship | null) => void;
  onRelationshipAdd: (relationship: Omit<Relationship, 'id'>) => void;
  onRelationshipUpdate: (relationshipId: string, updates: Partial<Relationship>) => void;
  onRelationshipDelete: (relationshipId: string) => void;
}

const ERDCanvas: React.FC<ERDCanvasProps> = ({
  schema,
  selectedTable,
  selectedRelationship,
  onTableSelect,
  onTableUpdate,
  onTableDelete,
  onRelationshipSelect,
  onRelationshipAdd,
  onRelationshipUpdate,
  onRelationshipDelete,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{ table: string; column: string } | null>(null);

  // 缩放控制
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, 0.3));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (!schema.tables.length) return;

    const minX = Math.min(...schema.tables.map(t => t.position.x));
    const maxX = Math.max(...schema.tables.map(t => t.position.x + 250));
    const minY = Math.min(...schema.tables.map(t => t.position.y));
    const maxY = Math.max(...schema.tables.map(t => t.position.y + 200));

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const canvasWidth = canvasRef.current?.clientWidth || 800;
    const canvasHeight = canvasRef.current?.clientHeight || 600;

    const scaleX = canvasWidth / contentWidth;
    const scaleY = canvasHeight / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 1) * 0.9;

    setZoom(newZoom);
    setPan({
      x: (canvasWidth - contentWidth * newZoom) / 2 - minX * newZoom,
      y: (canvasHeight - contentHeight * newZoom) / 2 - minY * newZoom
    });
  }, [schema.tables]);

  // 鼠标事件处理
  const handleMouseDown = useCallback((e: React.MouseEvent, tableId?: string) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragTarget(tableId || null);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    if (dragTarget) {
      // 拖动表格
      const table = schema.tables.find(t => t.id === dragTarget);
      if (table) {
        onTableUpdate(dragTarget, {
          position: {
            x: table.position.x + deltaX / zoom,
            y: table.position.y + deltaY / zoom
          }
        });
      }
    } else {
      // 拖动画布
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
    }

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, dragTarget, schema.tables, onTableUpdate, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragTarget(null);
  }, []);

  // 绑定全局鼠标事件
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 开始连接
  const handleStartConnection = useCallback((table: string, column: string) => {
    setIsConnecting(true);
    setConnectionStart({ table, column });
  }, []);

  // 完成连接
  const handleCompleteConnection = useCallback((toTable: string, toColumn: string) => {
    if (connectionStart && connectionStart.table !== toTable) {
      onRelationshipAdd({
        fromTable: connectionStart.table,
        fromColumn: connectionStart.column,
        toTable,
        toColumn,
        type: 'one-to-many',
        label: `${connectionStart.table}.${connectionStart.column} -> ${toTable}.${toColumn}`
      });
    }
    setIsConnecting(false);
    setConnectionStart(null);
  }, [connectionStart, onRelationshipAdd]);

  // 取消连接
  const handleCancelConnection = useCallback(() => {
    setIsConnecting(false);
    setConnectionStart(null);
  }, []);

  // 渲染表格
  const renderTable = useCallback((table: Table) => {
    const isSelected = selectedTable?.id === table.id;
    const primaryKeys = table.columns.filter(col => col.primaryKey);
    const regularColumns = table.columns.filter(col => !col.primaryKey);

    return (
      <div
        key={table.id}
        className={`absolute bg-white border-2 rounded-lg shadow-lg cursor-move min-w-60 ${
          isSelected ? 'border-blue-500 shadow-blue-200' : 'border-gray-300'
        }`}
        style={{
          left: table.position.x,
          top: table.position.y,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left'
        }}
        onMouseDown={(e) => handleMouseDown(e, table.id)}
        onClick={() => onTableSelect(table)}
      >
        {/* 表头 */}
        <div className="bg-gray-50 px-3 py-2 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">{table.name}</h3>
            <Square3Stack3DIcon className="w-4 h-4 text-gray-500" />
          </div>
          {table.comment && (
            <p className="text-xs text-gray-600 mt-1">{table.comment}</p>
          )}
        </div>

        {/* 主键列 */}
        {primaryKeys.length > 0 && (
          <div className="bg-yellow-50">
            {primaryKeys.map(column => renderColumn(table, column, true))}
          </div>
        )}

        {/* 普通列 */}
        <div>
          {regularColumns.map(column => renderColumn(table, column, false))}
        </div>

        {/* 表底部信息 */}
        <div className="bg-gray-50 px-3 py-1 border-t text-xs text-gray-500">
          {table.columns.length} 列 • {table.indexes.length} 索引
        </div>
      </div>
    );
  }, [selectedTable, zoom, handleMouseDown, onTableSelect]);

  // 渲染列
  const renderColumn = useCallback((table: Table, column: Column, isPrimaryKey: boolean) => {
    const typeDisplay = column.length ? `${column.type}(${column.length})` : column.type;
    
    return (
      <div
        key={column.id}
        className={`px-3 py-1 border-b last:border-b-0 hover:bg-gray-50 ${
          isPrimaryKey ? 'bg-yellow-50' : ''
        }`}
        onDoubleClick={() => {
          if (isConnecting) {
            handleCompleteConnection(table.id, column.id);
          } else {
            handleStartConnection(table.id, column.id);
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {column.primaryKey && (
              <div className="w-2 h-2 bg-yellow-500 rounded-full" title="主键" />
            )}
            {column.unique && !column.primaryKey && (
              <div className="w-2 h-2 bg-blue-500 rounded-full" title="唯一" />
            )}
            <span className="text-sm font-medium text-gray-900">{column.name}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-600">{typeDisplay}</span>
            {!column.nullable && (
              <span className="text-xs text-red-600 font-medium">NOT NULL</span>
            )}
          </div>
        </div>
        {column.comment && (
          <p className="text-xs text-gray-500 mt-1">{column.comment}</p>
        )}
      </div>
    );
  }, [isConnecting, handleCompleteConnection, handleStartConnection]);

  // 渲染关系线
  const renderRelationships = useCallback(() => {
    return schema.relationships.map(relationship => {
      const fromTable = schema.tables.find(t => t.name === relationship.fromTable);
      const toTable = schema.tables.find(t => t.name === relationship.toTable);
      
      if (!fromTable || !toTable) return null;

      const fromX = fromTable.position.x + 250; // 表格宽度
      const fromY = fromTable.position.y + 50;  // 大致中心位置
      const toX = toTable.position.x;
      const toY = toTable.position.y + 50;

      const isSelected = selectedRelationship?.id === relationship.id;

      return (
        <g key={relationship.id}>
          <line
            x1={fromX}
            y1={fromY}
            x2={toX}
            y2={toY}
            stroke={isSelected ? "#3b82f6" : "#6b7280"}
            strokeWidth={isSelected ? "3" : "2"}
            className="cursor-pointer"
            onClick={() => onRelationshipSelect(relationship)}
          />
          
          {/* 关系类型标记 */}
          <circle
            cx={fromX}
            cy={fromY}
            r="4"
            fill={relationship.type === 'one-to-one' ? "#10b981" : 
                  relationship.type === 'one-to-many' ? "#f59e0b" : "#8b5cf6"}
          />
          
          {relationship.type === 'one-to-many' && (
            <g>
              <line x1={toX-10} y1={toY-5} x2={toX} y2={toY} stroke="#6b7280" strokeWidth="2" />
              <line x1={toX-10} y1={toY+5} x2={toX} y2={toY} stroke="#6b7280" strokeWidth="2" />
            </g>
          )}
          
          {relationship.type === 'many-to-many' && (
            <g>
              <line x1={fromX+5} y1={fromY-5} x2={fromX+10} y2={fromY} stroke="#6b7280" strokeWidth="2" />
              <line x1={fromX+5} y1={fromY+5} x2={fromX+10} y2={fromY} stroke="#6b7280" strokeWidth="2" />
              <line x1={toX-10} y1={toY-5} x2={toX} y2={toY} stroke="#6b7280" strokeWidth="2" />
              <line x1={toX-10} y1={toY+5} x2={toX} y2={toY} stroke="#6b7280" strokeWidth="2" />
            </g>
          )}

          {/* 关系标签 */}
          {relationship.label && (
            <text
              x={(fromX + toX) / 2}
              y={(fromY + toY) / 2 - 10}
              textAnchor="middle"
              className="text-xs fill-gray-600 bg-white"
            >
              {relationship.label}
            </text>
          )}
        </g>
      );
    });
  }, [schema.relationships, schema.tables, selectedRelationship, onRelationshipSelect]);

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="border-b bg-white p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.3}
            >
              <MagnifyingGlassMinusIcon className="w-4 h-4" />
            </Button>
            
            <span className="text-sm text-gray-600 min-w-16 text-center">
              {Math.round(zoom * 100)}%
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
            >
              <MagnifyingGlassPlusIcon className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomReset}
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleFitToScreen}
            >
              <ArrowsPointingOutIcon className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {isConnecting && (
              <>
                <span className="text-sm text-blue-600">
                  连接模式：双击目标列完成连接
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelConnection}
                >
                  取消
                </Button>
              </>
            )}
            
            <Button
              variant={isConnecting ? "primary" : "outline"}
              size="sm"
              onClick={() => setIsConnecting(!isConnecting)}
            >
              <LinkIcon className="w-4 h-4 mr-1" />
              {isConnecting ? '连接中' : '连接模式'}
            </Button>
          </div>
        </div>
      </div>

      {/* 画布区域 */}
      <div
        ref={canvasRef}
        className="flex-1 bg-gray-50 overflow-hidden relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        {/* SVG关系线层 */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top left'
          }}
        >
          <g className="pointer-events-auto">
            {renderRelationships()}
          </g>
        </svg>

        {/* 表格层 */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'top left'
          }}
        >
          {schema.tables.map(renderTable)}
        </div>

        {/* 空状态 */}
        {schema.tables.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Square3Stack3DIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">开始设计数据库</h3>
              <p className="text-gray-600 mb-4">创建第一个数据表开始你的数据库设计</p>
              <Button variant="primary" onClick={() => {}}>
                <Square3Stack3DIcon className="w-4 h-4 mr-1" />
                创建表格
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="border-t bg-white px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>{schema.tables.length} 个表</span>
            <span>{schema.relationships.length} 个关系</span>
            {selectedTable && (
              <span>已选择: {selectedTable.name}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <span>缩放: {Math.round(zoom * 100)}%</span>
            <span>引擎: {schema.engine.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ERDCanvas;