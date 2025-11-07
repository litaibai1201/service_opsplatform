import React, { useCallback, useRef, useState, useEffect } from 'react';
import { TrashIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';

interface DiagramNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  data: {
    label: string;
    description?: string;
    properties?: Record<string, any>;
  };
  style?: Record<string, any>;
}

interface DiagramConnection {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  label?: string;
  style?: Record<string, any>;
}

interface DiagramLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  nodeIds: string[];
}

interface DiagramCanvasProps {
  nodes: DiagramNode[];
  connections: DiagramConnection[];
  layers: DiagramLayer[];
  selectedNode: DiagramNode | null;
  selectedConnection: DiagramConnection | null;
  isSimulating: boolean;
  canvasSize: { width: number; height: number };
  viewPort: { x: number; y: number };
  onNodeSelect: (node: DiagramNode | null) => void;
  onConnectionSelect: (connection: DiagramConnection | null) => void;
  onNodeUpdate: (nodeId: string, updates: Partial<DiagramNode>) => void;
  onConnectionUpdate: (connectionId: string, updates: Partial<DiagramConnection>) => void;
  onNodeDelete: (nodeId: string) => void;
  onConnectionDelete: (connectionId: string) => void;
  onAddConnection: (sourceId: string, targetId: string, type?: string) => void;
  onViewPortChange: (delta: { x: number; y: number }) => void;
}

const DiagramCanvas: React.FC<DiagramCanvasProps> = ({
  nodes,
  connections,
  layers,
  selectedNode,
  selectedConnection,
  isSimulating,
  canvasSize,
  viewPort,
  onNodeSelect,
  onConnectionSelect,
  onNodeUpdate,
  onConnectionUpdate,
  onNodeDelete,
  onConnectionDelete,
  onAddConnection,
  onViewPortChange,
}) => {
  const canvasRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [tempConnection, setTempConnection] = useState<{ x: number; y: number } | null>(null);

  // 获取节点样式
  const getNodeStyle = useCallback((node: DiagramNode) => {
    const baseStyle = {
      server: { fill: '#3B82F6', stroke: '#1E40AF' },
      database: { fill: '#10B981', stroke: '#047857' },
      api: { fill: '#F59E0B', stroke: '#D97706' },
      client: { fill: '#8B5CF6', stroke: '#7C3AED' },
      service: { fill: '#EF4444', stroke: '#DC2626' },
      queue: { fill: '#F97316', stroke: '#EA580C' },
      cache: { fill: '#06B6D4', stroke: '#0891B2' },
    };

    return baseStyle[node.type as keyof typeof baseStyle] || { fill: '#6B7280', stroke: '#374151' };
  }, []);

  // 获取连接线样式
  const getConnectionStyle = useCallback((connection: DiagramConnection) => {
    const baseStyle = {
      sync: { stroke: '#3B82F6', strokeWidth: 2, strokeDasharray: 'none' },
      async: { stroke: '#10B981', strokeWidth: 2, strokeDasharray: '5,5' },
      request: { stroke: '#F59E0B', strokeWidth: 2, strokeDasharray: 'none' },
      response: { stroke: '#8B5CF6', strokeWidth: 2, strokeDasharray: 'none' },
      data: { stroke: '#EF4444', strokeWidth: 2, strokeDasharray: '10,5' },
    };

    return baseStyle[connection.type as keyof typeof baseStyle] || { stroke: '#6B7280', strokeWidth: 1, strokeDasharray: 'none' };
  }, []);

  // 计算连接线路径
  const calculateConnectionPath = useCallback((source: DiagramNode, target: DiagramNode) => {
    const sourceCenter = {
      x: source.position.x + source.size.width / 2,
      y: source.position.y + source.size.height / 2,
    };
    const targetCenter = {
      x: target.position.x + target.size.width / 2,
      y: target.position.y + target.size.height / 2,
    };

    // 简单的直线连接，可以根据需要实现更复杂的路径算法
    return `M ${sourceCenter.x} ${sourceCenter.y} L ${targetCenter.x} ${targetCenter.y}`;
  }, []);

  // 处理节点拖拽
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: DiagramNode) => {
    e.stopPropagation();
    
    if (e.ctrlKey || e.metaKey) {
      // 开始连接模式
      setIsConnecting(true);
      setConnectionStart(node.id);
      return;
    }

    onNodeSelect(node);
    setIsDragging(true);
    setDragStart({ x: e.clientX - node.position.x, y: e.clientY - node.position.y });
  }, [onNodeSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && selectedNode) {
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      };
      
      onNodeUpdate(selectedNode.id, { position: newPosition });
    } else if (isConnecting && connectionStart) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setTempConnection({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    }
  }, [isDragging, selectedNode, dragStart, onNodeUpdate, isConnecting, connectionStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
    }
    
    if (isConnecting) {
      setIsConnecting(false);
      setConnectionStart(null);
      setTempConnection(null);
    }
  }, [isDragging, isConnecting]);

  // 处理连接创建
  const handleNodeMouseUp = useCallback((e: React.MouseEvent, targetNode: DiagramNode) => {
    e.stopPropagation();
    
    if (isConnecting && connectionStart && connectionStart !== targetNode.id) {
      onAddConnection(connectionStart, targetNode.id);
      setIsConnecting(false);
      setConnectionStart(null);
      setTempConnection(null);
    }
  }, [isConnecting, connectionStart, onAddConnection]);

  // 处理连接选择
  const handleConnectionClick = useCallback((e: React.MouseEvent, connection: DiagramConnection) => {
    e.stopPropagation();
    onConnectionSelect(connection);
  }, [onConnectionSelect]);

  // 处理画布点击
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onNodeSelect(null);
      onConnectionSelect(null);
    }
  }, [onNodeSelect, onConnectionSelect]);

  // 渲染节点
  const renderNode = useCallback((node: DiagramNode) => {
    const layer = layers.find(l => l.nodeIds.includes(node.id));
    if (!layer?.visible) return null;

    const style = getNodeStyle(node);
    const isSelected = selectedNode?.id === node.id;
    const isAnimated = isSimulating;

    return (
      <g key={node.id} opacity={layer?.opacity || 1}>
        {/* 节点主体 */}
        <rect
          x={node.position.x}
          y={node.position.y}
          width={node.size.width}
          height={node.size.height}
          fill={style.fill}
          stroke={isSelected ? '#F59E0B' : style.stroke}
          strokeWidth={isSelected ? 3 : 1}
          rx={8}
          className={`cursor-pointer transition-all duration-200 ${
            isAnimated ? 'animate-pulse' : ''
          } ${layer?.locked ? 'cursor-not-allowed' : 'hover:brightness-110'}`}
          onMouseDown={(e) => !layer?.locked && handleNodeMouseDown(e, node)}
          onMouseUp={(e) => !layer?.locked && handleNodeMouseUp(e, node)}
        />
        
        {/* 节点文本 */}
        <text
          x={node.position.x + node.size.width / 2}
          y={node.position.y + node.size.height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="12"
          fontWeight="500"
          className="pointer-events-none select-none"
        >
          {node.data.label}
        </text>
        
        {/* 节点类型标识 */}
        <text
          x={node.position.x + 4}
          y={node.position.y + 12}
          fill="white"
          fontSize="8"
          className="pointer-events-none select-none"
        >
          {node.type.toUpperCase()}
        </text>
        
        {/* 选中状态的控制点 */}
        {isSelected && (
          <>
            {/* 删除按钮 */}
            <g
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onNodeDelete(node.id);
              }}
            >
              <circle
                cx={node.position.x + node.size.width + 8}
                cy={node.position.y - 8}
                r="8"
                fill="#EF4444"
                stroke="white"
                strokeWidth="2"
              />
              <TrashIcon
                x={node.position.x + node.size.width + 4}
                y={node.position.y - 12}
                width="8"
                height="8"
                className="fill-white pointer-events-none"
              />
            </g>
            
            {/* 调整大小控制点 */}
            <rect
              x={node.position.x + node.size.width - 4}
              y={node.position.y + node.size.height - 4}
              width="8"
              height="8"
              fill="#F59E0B"
              stroke="white"
              strokeWidth="1"
              className="cursor-se-resize"
            />
          </>
        )}
      </g>
    );
  }, [
    layers,
    selectedNode,
    isSimulating,
    getNodeStyle,
    handleNodeMouseDown,
    handleNodeMouseUp,
    onNodeDelete,
  ]);

  // 渲染连接线
  const renderConnection = useCallback((connection: DiagramConnection) => {
    const sourceNode = nodes.find(n => n.id === connection.sourceId);
    const targetNode = nodes.find(n => n.id === connection.targetId);
    
    if (!sourceNode || !targetNode) return null;

    const style = getConnectionStyle(connection);
    const isSelected = selectedConnection?.id === connection.id;
    const path = calculateConnectionPath(sourceNode, targetNode);

    return (
      <g key={connection.id}>
        {/* 连接线 */}
        <path
          d={path}
          fill="none"
          stroke={isSelected ? '#F59E0B' : style.stroke}
          strokeWidth={isSelected ? style.strokeWidth + 1 : style.strokeWidth}
          strokeDasharray={style.strokeDasharray}
          className="cursor-pointer hover:brightness-110"
          onClick={(e) => handleConnectionClick(e, connection)}
        />
        
        {/* 箭头 */}
        <defs>
          <marker
            id={`arrowhead-${connection.id}`}
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill={isSelected ? '#F59E0B' : style.stroke}
            />
          </marker>
        </defs>
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth="1"
          markerEnd={`url(#arrowhead-${connection.id})`}
        />
        
        {/* 连接线标签 */}
        {connection.label && (
          <text
            x={(sourceNode.position.x + sourceNode.size.width / 2 + targetNode.position.x + targetNode.size.width / 2) / 2}
            y={(sourceNode.position.y + sourceNode.size.height / 2 + targetNode.position.y + targetNode.size.height / 2) / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#374151"
            fontSize="10"
            className="pointer-events-none select-none"
          >
            {connection.label}
          </text>
        )}
        
        {/* 选中状态的删除按钮 */}
        {isSelected && (
          <g
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onConnectionDelete(connection.id);
            }}
          >
            <circle
              cx={(sourceNode.position.x + sourceNode.size.width / 2 + targetNode.position.x + targetNode.size.width / 2) / 2 + 15}
              cy={(sourceNode.position.y + sourceNode.size.height / 2 + targetNode.position.y + targetNode.size.height / 2) / 2 - 15}
              r="6"
              fill="#EF4444"
              stroke="white"
              strokeWidth="1"
            />
            <TrashIcon
              x={(sourceNode.position.x + sourceNode.size.width / 2 + targetNode.position.x + targetNode.size.width / 2) / 2 + 11}
              y={(sourceNode.position.y + sourceNode.size.height / 2 + targetNode.position.y + targetNode.size.height / 2) / 2 - 19}
              width="8"
              height="8"
              className="fill-white pointer-events-none"
            />
          </g>
        )}
      </g>
    );
  }, [
    nodes,
    selectedConnection,
    getConnectionStyle,
    calculateConnectionPath,
    handleConnectionClick,
    onConnectionDelete,
  ]);

  // 渲染临时连接线
  const renderTempConnection = useCallback(() => {
    if (!isConnecting || !connectionStart || !tempConnection) return null;

    const sourceNode = nodes.find(n => n.id === connectionStart);
    if (!sourceNode) return null;

    const sourceCenter = {
      x: sourceNode.position.x + sourceNode.size.width / 2,
      y: sourceNode.position.y + sourceNode.size.height / 2,
    };

    return (
      <line
        x1={sourceCenter.x}
        y1={sourceCenter.y}
        x2={tempConnection.x}
        y2={tempConnection.y}
        stroke="#F59E0B"
        strokeWidth="2"
        strokeDasharray="5,5"
        className="pointer-events-none"
      />
    );
  }, [isConnecting, connectionStart, tempConnection, nodes]);

  return (
    <svg
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className="absolute inset-0 cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleCanvasClick}
    >
      {/* 渲染连接线 */}
      {connections.map(renderConnection)}
      
      {/* 渲染临时连接线 */}
      {renderTempConnection()}
      
      {/* 渲染节点 */}
      {nodes.map(renderNode)}
    </svg>
  );
};

export default DiagramCanvas;