import React, { useCallback, useRef, useState, useEffect } from 'react';
import { TrashIcon, PlayCircleIcon } from '@heroicons/react/24/outline';

interface FlowNode {
  id: string;
  type: 'start' | 'end' | 'process' | 'decision' | 'input' | 'output' | 'connector';
  position: { x: number; y: number };
  size: { width: number; height: number };
  data: {
    label: string;
    description?: string;
    condition?: string;
    variables?: Record<string, any>;
    properties?: Record<string, any>;
  };
  style?: Record<string, any>;
}

interface FlowConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: 'default' | 'yes' | 'no' | 'conditional';
  label?: string;
  condition?: string;
  style?: Record<string, any>;
}

interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  currentNodeId: string | null;
  stepCount: number;
  variables: Record<string, any>;
  executionPath: string[];
  breakpoints: string[];
}

interface FlowCanvasProps {
  nodes: FlowNode[];
  connections: FlowConnection[];
  selectedNode: FlowNode | null;
  selectedConnection: FlowConnection | null;
  simulationState: SimulationState;
  canvasSize: { width: number; height: number };
  viewPort: { x: number; y: number };
  zoom: number;
  onNodeSelect: (node: FlowNode | null) => void;
  onConnectionSelect: (connection: FlowConnection | null) => void;
  onNodeUpdate: (nodeId: string, updates: Partial<FlowNode>) => void;
  onConnectionUpdate: (connectionId: string, updates: Partial<FlowConnection>) => void;
  onNodeDelete: (nodeId: string) => void;
  onConnectionDelete: (connectionId: string) => void;
  onAddConnection: (sourceId: string, targetId: string, type?: string) => void;
  onViewPortChange: (viewPort: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
}

const FlowCanvas: React.FC<FlowCanvasProps> = ({
  nodes,
  connections,
  selectedNode,
  selectedConnection,
  simulationState,
  canvasSize,
  viewPort,
  zoom,
  onNodeSelect,
  onConnectionSelect,
  onNodeUpdate,
  onConnectionUpdate,
  onNodeDelete,
  onConnectionDelete,
  onAddConnection,
  onViewPortChange,
  onZoomChange,
}) => {
  const canvasRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [tempConnection, setTempConnection] = useState<{ x: number; y: number } | null>(null);

  // 获取节点样式
  const getNodeStyle = useCallback((node: FlowNode) => {
    const baseStyles = {
      start: { 
        fill: '#10B981', 
        stroke: '#047857',
        shape: 'ellipse'
      },
      end: { 
        fill: '#EF4444', 
        stroke: '#DC2626',
        shape: 'ellipse'
      },
      process: { 
        fill: '#3B82F6', 
        stroke: '#1E40AF',
        shape: 'rectangle'
      },
      decision: { 
        fill: '#F59E0B', 
        stroke: '#D97706',
        shape: 'diamond'
      },
      input: { 
        fill: '#8B5CF6', 
        stroke: '#7C3AED',
        shape: 'parallelogram'
      },
      output: { 
        fill: '#06B6D4', 
        stroke: '#0891B2',
        shape: 'parallelogram'
      },
      connector: { 
        fill: '#6B7280', 
        stroke: '#374151',
        shape: 'circle'
      }
    };

    const style = baseStyles[node.type];
    
    // 仿真状态下的样式
    if (simulationState.isRunning) {
      if (simulationState.currentNodeId === node.id) {
        return { ...style, fill: '#FBBF24', stroke: '#F59E0B' }; // 当前执行节点
      } else if (simulationState.executionPath.includes(node.id)) {
        return { ...style, fill: '#34D399', stroke: '#10B981' }; // 已执行节点
      }
    }

    return style;
  }, [simulationState]);

  // 获取连接线样式
  const getConnectionStyle = useCallback((connection: FlowConnection) => {
    const baseStyles = {
      default: { stroke: '#6B7280', strokeWidth: 2, strokeDasharray: 'none' },
      yes: { stroke: '#10B981', strokeWidth: 2, strokeDasharray: 'none' },
      no: { stroke: '#EF4444', strokeWidth: 2, strokeDasharray: 'none' },
      conditional: { stroke: '#F59E0B', strokeWidth: 2, strokeDasharray: '5,5' }
    };

    return baseStyles[connection.type] || baseStyles.default;
  }, []);

  // 计算连接线路径
  const calculateConnectionPath = useCallback((source: FlowNode, target: FlowNode) => {
    const sourceCenter = {
      x: source.position.x + source.size.width / 2,
      y: source.position.y + source.size.height / 2,
    };
    const targetCenter = {
      x: target.position.x + target.size.width / 2,
      y: target.position.y + target.size.height / 2,
    };

    // 智能路径计算
    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // 水平连接
      const midX = sourceCenter.x + dx / 2;
      return `M ${sourceCenter.x} ${sourceCenter.y} L ${midX} ${sourceCenter.y} L ${midX} ${targetCenter.y} L ${targetCenter.x} ${targetCenter.y}`;
    } else {
      // 垂直连接
      const midY = sourceCenter.y + dy / 2;
      return `M ${sourceCenter.x} ${sourceCenter.y} L ${sourceCenter.x} ${midY} L ${targetCenter.x} ${midY} L ${targetCenter.x} ${targetCenter.y}`;
    }
  }, []);

  // 处理节点拖拽
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: FlowNode) => {
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

  const handleMouseUp = useCallback(() => {
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
  const handleNodeMouseUp = useCallback((e: React.MouseEvent, targetNode: FlowNode) => {
    e.stopPropagation();
    
    if (isConnecting && connectionStart && connectionStart !== targetNode.id) {
      const sourceNode = nodes.find(n => n.id === connectionStart);
      const connectionType = sourceNode?.type === 'decision' ? 'yes' : 'default';
      onAddConnection(connectionStart, targetNode.id, connectionType);
      setIsConnecting(false);
      setConnectionStart(null);
      setTempConnection(null);
    }
  }, [isConnecting, connectionStart, nodes, onAddConnection]);

  // 处理连接选择
  const handleConnectionClick = useCallback((e: React.MouseEvent, connection: FlowConnection) => {
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
  const renderNode = useCallback((node: FlowNode) => {
    const style = getNodeStyle(node);
    const isSelected = selectedNode?.id === node.id;
    const isAnimated = simulationState.isRunning && simulationState.currentNodeId === node.id;

    return (
      <g key={node.id}>
        {/* 节点形状 */}
        {style.shape === 'ellipse' && (
          <ellipse
            cx={node.position.x + node.size.width / 2}
            cy={node.position.y + node.size.height / 2}
            rx={node.size.width / 2}
            ry={node.size.height / 2}
            fill={style.fill}
            stroke={isSelected ? '#F59E0B' : style.stroke}
            strokeWidth={isSelected ? 3 : 2}
            className={`cursor-pointer transition-all duration-200 ${
              isAnimated ? 'animate-pulse' : ''
            } hover:brightness-110`}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
            onMouseUp={(e) => handleNodeMouseUp(e, node)}
          />
        )}
        
        {style.shape === 'rectangle' && (
          <rect
            x={node.position.x}
            y={node.position.y}
            width={node.size.width}
            height={node.size.height}
            fill={style.fill}
            stroke={isSelected ? '#F59E0B' : style.stroke}
            strokeWidth={isSelected ? 3 : 2}
            rx={8}
            className={`cursor-pointer transition-all duration-200 ${
              isAnimated ? 'animate-pulse' : ''
            } hover:brightness-110`}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
            onMouseUp={(e) => handleNodeMouseUp(e, node)}
          />
        )}
        
        {style.shape === 'diamond' && (
          <polygon
            points={`${node.position.x + node.size.width / 2},${node.position.y} ${node.position.x + node.size.width},${node.position.y + node.size.height / 2} ${node.position.x + node.size.width / 2},${node.position.y + node.size.height} ${node.position.x},${node.position.y + node.size.height / 2}`}
            fill={style.fill}
            stroke={isSelected ? '#F59E0B' : style.stroke}
            strokeWidth={isSelected ? 3 : 2}
            className={`cursor-pointer transition-all duration-200 ${
              isAnimated ? 'animate-pulse' : ''
            } hover:brightness-110`}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
            onMouseUp={(e) => handleNodeMouseUp(e, node)}
          />
        )}
        
        {style.shape === 'parallelogram' && (
          <polygon
            points={`${node.position.x + 10},${node.position.y} ${node.position.x + node.size.width},${node.position.y} ${node.position.x + node.size.width - 10},${node.position.y + node.size.height} ${node.position.x},${node.position.y + node.size.height}`}
            fill={style.fill}
            stroke={isSelected ? '#F59E0B' : style.stroke}
            strokeWidth={isSelected ? 3 : 2}
            className={`cursor-pointer transition-all duration-200 ${
              isAnimated ? 'animate-pulse' : ''
            } hover:brightness-110`}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
            onMouseUp={(e) => handleNodeMouseUp(e, node)}
          />
        )}
        
        {style.shape === 'circle' && (
          <circle
            cx={node.position.x + node.size.width / 2}
            cy={node.position.y + node.size.height / 2}
            r={node.size.width / 2}
            fill={style.fill}
            stroke={isSelected ? '#F59E0B' : style.stroke}
            strokeWidth={isSelected ? 3 : 2}
            className={`cursor-pointer transition-all duration-200 ${
              isAnimated ? 'animate-pulse' : ''
            } hover:brightness-110`}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
            onMouseUp={(e) => handleNodeMouseUp(e, node)}
          />
        )}
        
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
        
        {/* 仿真状态指示器 */}
        {simulationState.isRunning && simulationState.currentNodeId === node.id && (
          <PlayCircleIcon
            x={node.position.x + node.size.width - 16}
            y={node.position.y - 16}
            width="16"
            height="16"
            className="fill-yellow-500 pointer-events-none"
          />
        )}
        
        {/* 选中状态的控制点 */}
        {isSelected && (
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
        )}
      </g>
    );
  }, [
    selectedNode,
    simulationState,
    getNodeStyle,
    handleNodeMouseDown,
    handleNodeMouseUp,
    onNodeDelete,
  ]);

  // 渲染连接线
  const renderConnection = useCallback((connection: FlowConnection) => {
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
      style={{ 
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'top left'
      }}
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

export default FlowCanvas;