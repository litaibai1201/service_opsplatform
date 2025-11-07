import React, { useEffect, useState, useRef } from 'react';
import { useCollaboration } from '../../contexts/CollaborationProvider';
import { UserPresence } from '../../services/collaboration/WebSocketClient';

interface UserCursorProps {
  userId: string;
  cursor: { x: number; y: number; elementId?: string };
  user: UserPresence;
  containerRef?: React.RefObject<HTMLElement>;
  showLabel?: boolean;
  labelPosition?: 'top' | 'bottom' | 'left' | 'right';
  cursorColor?: string;
}

interface CursorPosition {
  x: number;
  y: number;
  visible: boolean;
}

export function UserCursor({
  userId,
  cursor,
  user,
  containerRef,
  showLabel = true,
  labelPosition = 'top',
  cursorColor,
}: UserCursorProps) {
  const [position, setPosition] = useState<CursorPosition>({ x: 0, y: 0, visible: false });
  const [isHovered, setIsHovered] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // 获取用户颜色
  const getUserColor = (userId: string): string => {
    if (cursorColor) return cursorColor;
    
    // 基于用户ID生成一致的颜色
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
      '#8b5cf6', '#f97316', '#06b6d4', '#84cc16',
      '#ec4899', '#6b7280'
    ];
    
    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  // 计算光标在容器中的实际位置
  const calculatePosition = (cursorX: number, cursorY: number): CursorPosition => {
    const container = containerRef?.current || document.body;
    const containerRect = container.getBoundingClientRect();
    
    // 将全局坐标转换为容器内坐标
    let x = cursorX;
    let y = cursorY;
    
    if (containerRef?.current) {
      x = cursorX - containerRect.left;
      y = cursorY - containerRect.top;
    }
    
    // 检查是否在容器边界内
    const visible = x >= 0 && y >= 0 && 
                   x <= containerRect.width && 
                   y <= containerRect.height;
    
    return { x, y, visible };
  };

  // 更新光标位置
  useEffect(() => {
    const newPosition = calculatePosition(cursor.x, cursor.y);
    
    // 使用动画平滑移动
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animationRef.current = requestAnimationFrame(() => {
      setPosition(newPosition);
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [cursor.x, cursor.y, containerRef]);

  // 监听容器大小变化
  useEffect(() => {
    const container = containerRef?.current || window;
    
    const handleResize = () => {
      const newPosition = calculatePosition(cursor.x, cursor.y);
      setPosition(newPosition);
    };
    
    if (container instanceof Window) {
      container.addEventListener('resize', handleResize);
      return () => container.removeEventListener('resize', handleResize);
    } else if (container instanceof HTMLElement) {
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }
  }, [cursor.x, cursor.y, containerRef]);

  if (!position.visible) {
    return null;
  }

  const color = getUserColor(userId);
  const labelOffset = 20;

  return (
    <div
      ref={cursorRef}
      className="absolute pointer-events-none z-50 transform transition-all duration-150 ease-out"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-2px, -2px)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 光标图标 */}
      <div className="relative">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          className="drop-shadow-md"
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))' }}
        >
          {/* 光标主体 */}
          <path
            d="M2 2 L2 18 L7 13 L10 13 L14 18 L18 14 L13 10 L13 7 Z"
            fill={color}
            stroke="white"
            strokeWidth="1"
          />
          {/* 光标尖端 */}
          <circle
            cx="2"
            cy="2"
            r="1.5"
            fill="white"
          />
        </svg>

        {/* 用户标签 */}
        {showLabel && (isHovered || true) && (
          <div
            className={`absolute whitespace-nowrap pointer-events-auto ${
              labelPosition === 'top' ? '-top-8 left-0' :
              labelPosition === 'bottom' ? 'top-6 left-0' :
              labelPosition === 'left' ? 'top-0 -left-20' :
              'top-0 left-6'
            }`}
          >
            <div
              className="px-2 py-1 rounded-md text-white text-xs font-medium shadow-lg flex items-center space-x-1"
              style={{ backgroundColor: color }}
            >
              {/* 用户头像 */}
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-4 h-4 rounded-full border border-white/20"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
              
              {/* 用户名 */}
              <span>{user.username}</span>
              
              {/* 状态指示器 */}
              {user.status !== 'online' && (
                <div className={`w-2 h-2 rounded-full ${
                  user.status === 'away' ? 'bg-yellow-300' :
                  user.status === 'busy' ? 'bg-red-300' :
                  'bg-gray-300'
                }`} />
              )}
            </div>
            
            {/* 箭头指示器 */}
            <div
              className="absolute w-0 h-0"
              style={{
                borderStyle: 'solid',
                ...(labelPosition === 'top' ? {
                  top: '100%',
                  left: '8px',
                  borderWidth: '4px 4px 0 4px',
                  borderColor: `${color} transparent transparent transparent`,
                } : labelPosition === 'bottom' ? {
                  bottom: '100%',
                  left: '8px',
                  borderWidth: '0 4px 4px 4px',
                  borderColor: `transparent transparent ${color} transparent`,
                } : labelPosition === 'left' ? {
                  top: '6px',
                  left: '100%',
                  borderWidth: '4px 0 4px 4px',
                  borderColor: `transparent transparent transparent ${color}`,
                } : {
                  top: '6px',
                  right: '100%',
                  borderWidth: '4px 4px 4px 0',
                  borderColor: `transparent ${color} transparent transparent`,
                })
              }}
            />
          </div>
        )}

        {/* 选择范围指示器 */}
        {cursor.elementId && (
          <div className="absolute top-6 left-6">
            <div
              className="px-2 py-1 rounded text-xs font-medium shadow-sm border"
              style={{
                backgroundColor: `${color}20`,
                borderColor: color,
                color: color,
              }}
            >
              选中: {cursor.elementId}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 用户光标管理器组件
export function UserCursors({ 
  containerRef, 
  showOwnCursor = false 
}: { 
  containerRef?: React.RefObject<HTMLElement>;
  showOwnCursor?: boolean;
}) {
  const { state } = useCollaboration();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // 跟踪自己的鼠标位置
  useEffect(() => {
    if (!showOwnCursor) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [showOwnCursor]);

  // 过滤有光标位置的用户
  const usersWithCursors = state.roomUsers.filter(user => 
    user.cursor && 
    user.status === 'online' &&
    (showOwnCursor || user.userId !== state.currentUser?.userId)
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* 其他用户的光标 */}
      {usersWithCursors.map(user => (
        user.cursor && (
          <UserCursor
            key={user.userId}
            userId={user.userId}
            cursor={user.cursor}
            user={user}
            containerRef={containerRef}
          />
        )
      ))}

      {/* 自己的光标（如果启用） */}
      {showOwnCursor && state.currentUser && (
        <UserCursor
          userId={state.currentUser.userId}
          cursor={mousePosition}
          user={state.currentUser}
          containerRef={containerRef}
          cursorColor="#000000"
        />
      )}
    </div>
  );
}

// 高性能光标组件 - 使用Canvas渲染
export function CanvasUserCursors({ 
  containerRef,
  width,
  height 
}: { 
  containerRef?: React.RefObject<HTMLElement>;
  width: number;
  height: number;
}) {
  const { state } = useCollaboration();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const usersWithCursors = state.roomUsers.filter(user => 
    user.cursor && 
    user.status === 'online' &&
    user.userId !== state.currentUser?.userId
  );

  // 绘制光标
  const drawCursors = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 绘制每个用户的光标
    usersWithCursors.forEach(user => {
      if (!user.cursor) return;

      const color = getUserColor(user.userId);
      const x = user.cursor.x;
      const y = user.cursor.y;

      // 绘制光标
      ctx.fillStyle = color;
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 16);
      ctx.lineTo(x + 4, y + 12);
      ctx.lineTo(x + 8, y + 12);
      ctx.lineTo(x + 12, y + 16);
      ctx.lineTo(x + 16, y + 12);
      ctx.lineTo(x + 12, y + 8);
      ctx.lineTo(x + 12, y + 4);
      ctx.closePath();
      
      ctx.fill();
      ctx.stroke();

      // 绘制用户名标签
      ctx.fillStyle = color;
      ctx.fillRect(x + 20, y - 20, user.username.length * 7 + 16, 20);
      
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.fillText(user.username, x + 28, y - 6);
    });
  };

  // 获取用户颜色
  const getUserColor = (userId: string): string => {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
      '#8b5cf6', '#f97316', '#06b6d4', '#84cc16',
      '#ec4899', '#6b7280'
    ];
    
    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  // 动画循环
  useEffect(() => {
    const animate = () => {
      drawCursors();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [usersWithCursors, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none z-40"
      style={{ width, height }}
    />
  );
}