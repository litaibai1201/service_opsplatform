import React from 'react';

interface GridOverlayProps {
  zoom: number;
  gridSize?: number;
  className?: string;
}

const GridOverlay: React.FC<GridOverlayProps> = ({
  zoom,
  gridSize = 20,
  className = ''
}) => {
  // 根据缩放级别调整网格大小和透明度
  const adjustedGridSize = gridSize * (zoom / 100);
  const opacity = Math.max(0.1, Math.min(0.5, zoom / 200));
  
  // 生成网格模式的SVG定义
  const patternId = 'grid-pattern';
  
  return (
    <div 
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ 
        opacity,
        backgroundImage: `
          linear-gradient(rgba(156, 163, 175, 0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(156, 163, 175, 0.3) 1px, transparent 1px)
        `,
        backgroundSize: `${adjustedGridSize}px ${adjustedGridSize}px`,
        backgroundPosition: '0 0, 0 0'
      }}
    >
      {/* 可选：使用SVG实现更复杂的网格样式 */}
      <svg 
        className="absolute inset-0 w-full h-full" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'none' }} // 默认隐藏，可根据需要启用
      >
        <defs>
          <pattern
            id={patternId}
            width={adjustedGridSize}
            height={adjustedGridSize}
            patternUnits="userSpaceOnUse"
          >
            {/* 主网格线 */}
            <path
              d={`M ${adjustedGridSize} 0 L 0 0 0 ${adjustedGridSize}`}
              fill="none"
              stroke="rgba(156, 163, 175, 0.3)"
              strokeWidth="1"
            />
            
            {/* 每5格一条粗线 */}
            {adjustedGridSize >= 10 && (
              <path
                d={`M ${adjustedGridSize} 0 L 0 0 0 ${adjustedGridSize}`}
                fill="none"
                stroke="rgba(156, 163, 175, 0.5)"
                strokeWidth="2"
                style={{
                  display: (adjustedGridSize * 5) % 100 === 0 ? 'block' : 'none'
                }}
              />
            )}
            
            {/* 中心点标记 */}
            {adjustedGridSize >= 15 && (
              <circle
                cx={adjustedGridSize / 2}
                cy={adjustedGridSize / 2}
                r="0.5"
                fill="rgba(156, 163, 175, 0.4)"
              />
            )}
          </pattern>
        </defs>
        
        <rect 
          width="100%" 
          height="100%" 
          fill={`url(#${patternId})`} 
        />
      </svg>
      
      {/* 网格信息显示 */}
      {zoom >= 50 && (
        <div className="absolute top-4 left-4 bg-white bg-opacity-75 text-xs text-gray-600 px-2 py-1 rounded">
          网格: {gridSize}px (缩放: {zoom}%)
        </div>
      )}
    </div>
  );
};

export default GridOverlay;