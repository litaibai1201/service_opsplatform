import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui';
import { 
  MagnifyingGlassIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  ArrowsPointingOutIcon,
  Square3Stack3DIcon,
  LinkIcon,
  ViewfinderCircleIcon
} from '@heroicons/react/24/outline';
import FeatureNode from './FeatureNode';

interface Feature {
  id: string;
  name: string;
  description?: string;
  type: 'epic' | 'feature' | 'story' | 'task' | 'bug';
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;
  parent?: string;
  children: string[];
  dependencies: string[];
  tags: string[];
  assignee?: string;
  startDate?: Date;
  endDate?: Date;
  progress: number;
  attachments: string[];
  comments: Comment[];
}

interface Connection {
  id: string;
  fromFeature: string;
  toFeature: string;
  type: 'dependency' | 'parent-child' | 'related' | 'blocks';
  label?: string;
}

interface FeatureMap {
  id: string;
  name: string;
  description?: string;
  version: string;
  features: Feature[];
  connections: Connection[];
  layout: 'mindmap' | 'hierarchy' | 'timeline' | 'kanban';
  settings: {
    showProgress: boolean;
    showDependencies: boolean;
    showAssignees: boolean;
    showPriorities: boolean;
    autoLayout: boolean;
  };
}

interface MindMapCanvasProps {
  featureMap: FeatureMap;
  selectedFeature: Feature | null;
  onFeatureSelect: (feature: Feature | null) => void;
  onFeatureUpdate: (featureId: string, updates: Partial<Feature>) => void;
  onFeatureDelete: (featureId: string) => void;
  onConnectionAdd: (connection: Omit<Connection, 'id'>) => void;
  onConnectionUpdate: (connectionId: string, updates: Partial<Connection>) => void;
  onConnectionDelete: (connectionId: string) => void;
}

const MindMapCanvas: React.FC<MindMapCanvasProps> = ({
  featureMap,
  selectedFeature,
  onFeatureSelect,
  onFeatureUpdate,
  onFeatureDelete,
  onConnectionAdd,
  onConnectionUpdate,
  onConnectionDelete,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

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
    if (!featureMap.features.length) return;

    const minX = Math.min(...featureMap.features.map(f => f.position.x));
    const maxX = Math.max(...featureMap.features.map(f => f.position.x + f.size.width));
    const minY = Math.min(...featureMap.features.map(f => f.position.y));
    const maxY = Math.max(...featureMap.features.map(f => f.position.y + f.size.height));

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
  }, [featureMap.features]);

  // 鼠标事件处理
  const handleMouseDown = useCallback((e: React.MouseEvent, featureId?: string) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragTarget(featureId || null);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    if (dragTarget) {
      // 拖动功能节点
      const feature = featureMap.features.find(f => f.id === dragTarget);
      if (feature) {
        onFeatureUpdate(dragTarget, {
          position: {
            x: feature.position.x + deltaX / zoom,
            y: feature.position.y + deltaY / zoom
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
  }, [isDragging, dragStart, dragTarget, featureMap.features, onFeatureUpdate, zoom]);

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
  const handleStartConnection = useCallback((featureId: string) => {
    setIsConnecting(true);
    setConnectionStart(featureId);
  }, []);

  // 完成连接
  const handleCompleteConnection = useCallback((toFeatureId: string) => {
    if (connectionStart && connectionStart !== toFeatureId) {
      onConnectionAdd({
        fromFeature: connectionStart,
        toFeature: toFeatureId,
        type: 'related',
        label: ''
      });
    }
    setIsConnecting(false);
    setConnectionStart(null);
  }, [connectionStart, onConnectionAdd]);

  // 取消连接
  const handleCancelConnection = useCallback(() => {
    setIsConnecting(false);
    setConnectionStart(null);
  }, []);

  // 获取功能节点中心点
  const getFeatureCenter = useCallback((feature: Feature) => {
    return {
      x: feature.position.x + feature.size.width / 2,
      y: feature.position.y + feature.size.height / 2
    };
  }, []);

  // 渲染连接线
  const renderConnections = useCallback(() => {
    return featureMap.connections.map(connection => {
      const fromFeature = featureMap.features.find(f => f.id === connection.fromFeature);
      const toFeature = featureMap.features.find(f => f.id === connection.toFeature);
      
      if (!fromFeature || !toFeature) return null;

      const fromCenter = getFeatureCenter(fromFeature);
      const toCenter = getFeatureCenter(toFeature);

      // 计算连接点（边缘而不是中心）
      const angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x);
      const fromEdge = {
        x: fromCenter.x + Math.cos(angle) * (fromFeature.size.width / 2),
        y: fromCenter.y + Math.sin(angle) * (fromFeature.size.height / 2)
      };
      const toEdge = {
        x: toCenter.x - Math.cos(angle) * (toFeature.size.width / 2),
        y: toCenter.y - Math.sin(angle) * (toFeature.size.height / 2)
      };

      const isSelected = selectedFeature?.id === connection.fromFeature || 
                        selectedFeature?.id === connection.toFeature;

      // 连接线颜色和样式
      const getConnectionStyle = (type: string) => {
        switch (type) {
          case 'dependency':
            return { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' };
          case 'parent-child':
            return { stroke: '#3b82f6', strokeWidth: 2 };
          case 'blocks':
            return { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '10,5' };
          default:
            return { stroke: '#6b7280', strokeWidth: 1 };
        }
      };

      const style = getConnectionStyle(connection.type);

      return (
        <g key={connection.id}>
          {/* 连接线 */}
          <line
            x1={fromEdge.x}
            y1={fromEdge.y}
            x2={toEdge.x}
            y2={toEdge.y}
            {...style}
            stroke={isSelected ? '#3b82f6' : style.stroke}
            strokeWidth={isSelected ? style.strokeWidth + 1 : style.strokeWidth}
            className="cursor-pointer"
            onClick={() => {
              // TODO: 选择连接线
            }}
          />
          
          {/* 箭头 */}
          <polygon
            points={`${toEdge.x},${toEdge.y} ${toEdge.x - 8 * Math.cos(angle - 0.3)},${toEdge.y - 8 * Math.sin(angle - 0.3)} ${toEdge.x - 8 * Math.cos(angle + 0.3)},${toEdge.y - 8 * Math.sin(angle + 0.3)}`}
            fill={isSelected ? '#3b82f6' : style.stroke}
          />

          {/* 连接标签 */}
          {connection.label && (
            <text
              x={(fromEdge.x + toEdge.x) / 2}
              y={(fromEdge.y + toEdge.y) / 2 - 10}
              textAnchor="middle"
              className="text-xs fill-gray-600 bg-white"
              style={{ fontSize: '10px' }}
            >
              {connection.label}
            </text>
          )}
        </g>
      );
    });
  }, [featureMap.connections, featureMap.features, selectedFeature, getFeatureCenter]);

  // 渲染功能节点
  const renderFeature = useCallback((feature: Feature) => {
    const isSelected = selectedFeature?.id === feature.id;
    const isHovered = hoveredFeature === feature.id;
    const isConnectingTarget = isConnecting && connectionStart !== feature.id;

    return (
      <div
        key={feature.id}
        className="absolute cursor-pointer"
        style={{
          left: feature.position.x,
          top: feature.position.y,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left'
        }}
        onMouseDown={(e) => handleMouseDown(e, feature.id)}
        onClick={() => onFeatureSelect(feature)}
        onMouseEnter={() => setHoveredFeature(feature.id)}
        onMouseLeave={() => setHoveredFeature(null)}
        onDoubleClick={() => {
          if (isConnecting) {
            handleCompleteConnection(feature.id);
          }
        }}
      >
        <FeatureNode
          feature={feature}
          isSelected={isSelected}
          isHovered={isHovered}
          isConnectingTarget={isConnectingTarget}
          showProgress={featureMap.settings.showProgress}
          showAssignee={featureMap.settings.showAssignees}
          showPriority={featureMap.settings.showPriorities}
          onStartConnection={() => handleStartConnection(feature.id)}
          onUpdate={(updates) => onFeatureUpdate(feature.id, updates)}
          onDelete={() => onFeatureDelete(feature.id)}
        />
      </div>
    );
  }, [
    selectedFeature,
    hoveredFeature,
    isConnecting,
    connectionStart,
    zoom,
    featureMap.settings,
    handleMouseDown,
    onFeatureSelect,
    handleCompleteConnection,
    handleStartConnection,
    onFeatureUpdate,
    onFeatureDelete
  ]);

  // 自动布局
  const applyAutoLayout = useCallback(() => {
    if (!featureMap.settings.autoLayout) return;

    // 简单的层次布局算法
    const rootFeatures = featureMap.features.filter(f => !f.parent);
    const levels: Record<string, number> = {};
    const positions: Record<string, { x: number; y: number }> = {};

    // 计算层级
    const calculateLevel = (featureId: string, level: number = 0) => {
      levels[featureId] = level;
      const feature = featureMap.features.find(f => f.id === featureId);
      if (feature) {
        feature.children.forEach(childId => {
          calculateLevel(childId, level + 1);
        });
      }
    };

    rootFeatures.forEach(root => calculateLevel(root.id));

    // 按层级排列
    const maxLevel = Math.max(...Object.values(levels));
    for (let level = 0; level <= maxLevel; level++) {
      const featuresInLevel = Object.entries(levels)
        .filter(([, l]) => l === level)
        .map(([id]) => id);
      
      featuresInLevel.forEach((featureId, index) => {
        positions[featureId] = {
          x: 50 + index * 200,
          y: 50 + level * 150
        };
      });
    }

    // 应用新位置
    Object.entries(positions).forEach(([featureId, position]) => {
      onFeatureUpdate(featureId, { position });
    });
  }, [featureMap.features, featureMap.settings.autoLayout, onFeatureUpdate]);

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
                  连接模式：双击目标功能完成连接
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

            <Button
              variant="outline"
              size="sm"
              onClick={applyAutoLayout}
            >
              <ViewfinderCircleIcon className="w-4 h-4 mr-1" />
              自动布局
            </Button>
          </div>
        </div>

        {/* 设置快捷开关 */}
        <div className="flex items-center space-x-4 mt-2">
          <label className="flex items-center space-x-1 text-sm">
            <input
              type="checkbox"
              checked={featureMap.settings.showProgress}
              onChange={(e) => {
                // TODO: 更新设置
              }}
              className="rounded"
            />
            <span>显示进度</span>
          </label>
          
          <label className="flex items-center space-x-1 text-sm">
            <input
              type="checkbox"
              checked={featureMap.settings.showDependencies}
              onChange={(e) => {
                // TODO: 更新设置
              }}
              className="rounded"
            />
            <span>显示依赖</span>
          </label>
          
          <label className="flex items-center space-x-1 text-sm">
            <input
              type="checkbox"
              checked={featureMap.settings.showAssignees}
              onChange={(e) => {
                // TODO: 更新设置
              }}
              className="rounded"
            />
            <span>显示负责人</span>
          </label>

          <label className="flex items-center space-x-1 text-sm">
            <input
              type="checkbox"
              checked={featureMap.settings.showPriorities}
              onChange={(e) => {
                // TODO: 更新设置
              }}
              className="rounded"
            />
            <span>显示优先级</span>
          </label>
        </div>
      </div>

      {/* 画布区域 */}
      <div
        ref={canvasRef}
        className="flex-1 bg-gray-50 overflow-hidden relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        {/* SVG连接线层 */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top left'
          }}
        >
          <g className="pointer-events-auto">
            {featureMap.settings.showDependencies && renderConnections()}
          </g>
        </svg>

        {/* 功能节点层 */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'top left'
          }}
        >
          {featureMap.features.map(renderFeature)}
        </div>

        {/* 空状态 */}
        {featureMap.features.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Square3Stack3DIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">开始创建功能地图</h3>
              <p className="text-gray-600 mb-4">添加第一个功能开始你的产品规划</p>
              <Button variant="primary" onClick={() => {}}>
                <Square3Stack3DIcon className="w-4 h-4 mr-1" />
                创建功能
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="border-t bg-white px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>{featureMap.features.length} 个功能</span>
            <span>{featureMap.connections.length} 个连接</span>
            {selectedFeature && (
              <span>已选择: {selectedFeature.name}</span>
            )}
            {isConnecting && connectionStart && (
              <span className="text-blue-600">
                连接起点: {featureMap.features.find(f => f.id === connectionStart)?.name}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <span>缩放: {Math.round(zoom * 100)}%</span>
            <span>布局: {featureMap.layout}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MindMapCanvas;