import React, { useMemo } from 'react';

interface ConnectionPoint {
  x: number;
  y: number;
}

interface ConnectionLineProps {
  start: ConnectionPoint;
  end: ConnectionPoint;
  type?: 'straight' | 'curved' | 'orthogonal' | 'step';
  animated?: boolean;
  dashed?: boolean;
  color?: string;
  strokeWidth?: number;
  label?: string;
  showArrow?: boolean;
  arrowSize?: number;
  className?: string;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({
  start,
  end,
  type = 'orthogonal',
  animated = false,
  dashed = false,
  color = '#6B7280',
  strokeWidth = 2,
  label,
  showArrow = true,
  arrowSize = 8,
  className = '',
}) => {
  // 计算路径
  const path = useMemo(() => {
    switch (type) {
      case 'straight':
        return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
      
      case 'curved':
        return calculateCurvedPath(start, end);
      
      case 'step':
        return calculateStepPath(start, end);
      
      case 'orthogonal':
      default:
        return calculateOrthogonalPath(start, end);
    }
  }, [start, end, type]);

  // 计算标签位置
  const labelPosition = useMemo(() => {
    return {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    };
  }, [start, end]);

  // 计算箭头角度
  const arrowAngle = useMemo(() => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }, [start, end]);

  // 生成唯一ID
  const uniqueId = useMemo(() => 
    `connection-${Math.random().toString(36).substr(2, 9)}`,
    []
  );

  return (
    <g className={className}>
      {/* 定义箭头标记 */}
      {showArrow && (
        <defs>
          <marker
            id={`arrowhead-${uniqueId}`}
            markerWidth={arrowSize + 2}
            markerHeight={arrowSize}
            refX={arrowSize}
            refY={arrowSize / 2}
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon
              points={`0,0 ${arrowSize},${arrowSize / 2} 0,${arrowSize}`}
              fill={color}
            />
          </marker>
        </defs>
      )}

      {/* 连接线路径 */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashed ? '5,5' : 'none'}
        markerEnd={showArrow ? `url(#arrowhead-${uniqueId})` : 'none'}
        className={animated ? 'animate-pulse' : ''}
      />

      {/* 动画效果 */}
      {animated && (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 1}
          opacity="0.5"
          strokeDasharray="4,4"
          className="animate-pulse"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;8"
            dur="1s"
            repeatCount="indefinite"
          />
        </path>
      )}

      {/* 标签 */}
      {label && (
        <g>
          {/* 标签背景 */}
          <rect
            x={labelPosition.x - (label.length * 3)}
            y={labelPosition.y - 8}
            width={label.length * 6}
            height={16}
            fill="white"
            stroke={color}
            strokeWidth="1"
            rx="2"
            opacity="0.9"
          />
          {/* 标签文本 */}
          <text
            x={labelPosition.x}
            y={labelPosition.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fill="#374151"
            className="pointer-events-none select-none"
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
};

// 计算正交路径（直角转弯）
function calculateOrthogonalPath(start: ConnectionPoint, end: ConnectionPoint): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  
  // 判断主要方向
  if (Math.abs(dx) > Math.abs(dy)) {
    // 水平方向为主
    const midX = start.x + dx / 2;
    return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
  } else {
    // 垂直方向为主
    const midY = start.y + dy / 2;
    return `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
  }
}

// 计算曲线路径
function calculateCurvedPath(start: ConnectionPoint, end: ConnectionPoint): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  
  // 控制点距离
  const controlDistance = Math.min(Math.abs(dx), Math.abs(dy)) * 0.5;
  
  // 计算控制点
  const cp1x = start.x + (dx > 0 ? controlDistance : -controlDistance);
  const cp1y = start.y;
  const cp2x = end.x + (dx > 0 ? -controlDistance : controlDistance);
  const cp2y = end.y;
  
  return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
}

// 计算阶梯路径
function calculateStepPath(start: ConnectionPoint, end: ConnectionPoint): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  
  const steps = 3;
  const stepX = dx / steps;
  const stepY = dy / steps;
  
  let path = `M ${start.x} ${start.y}`;
  
  for (let i = 1; i <= steps; i++) {
    const x = start.x + stepX * i;
    const y = start.y + stepY * i;
    
    if (i % 2 === 1) {
      // 水平步骤
      path += ` L ${x} ${start.y + stepY * (i - 1)}`;
      path += ` L ${x} ${y}`;
    } else {
      // 垂直步骤
      path += ` L ${start.x + stepX * (i - 1)} ${y}`;
      path += ` L ${x} ${y}`;
    }
  }
  
  return path;
}

export default ConnectionLine;