import React, { useState, useRef, useEffect } from 'react';
import { useCollaboration } from '../../contexts/CollaborationProvider';
import { UserPresence } from '../../services/collaboration/WebSocketClient';

interface ActiveUsersProps {
  maxVisible?: number;
  showDetails?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function ActiveUsers({ 
  maxVisible = 5, 
  showDetails = true, 
  position = 'right',
  className = '' 
}: ActiveUsersProps) {
  const { state, getUserById } = useCollaboration();
  const [showUserList, setShowUserList] = useState(false);
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const activeUsers = state.roomUsers.filter(user => user.status === 'online');
  const visibleUsers = activeUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, activeUsers.length - maxVisible);

  // 点击外部关闭用户列表
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (listRef.current && !listRef.current.contains(event.target as Node)) {
        setShowUserList(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 获取用户状态颜色
  const getStatusColor = (status: UserPresence['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  // 获取用户最后活动时间
  const getLastActivityText = (user: UserPresence) => {
    const lastActivity = new Date(user.lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return '刚刚活跃';
    if (diffMinutes < 60) return `${diffMinutes}分钟前活跃`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}小时前活跃`;
    return '超过1天前';
  };

  // 用户头像组件
  const UserAvatar = ({ 
    user, 
    size = 'sm', 
    showStatus = true 
  }: { 
    user: UserPresence; 
    size?: 'xs' | 'sm' | 'md' | 'lg'; 
    showStatus?: boolean; 
  }) => {
    const sizeClasses = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg',
    };

    const statusSizeClasses = {
      xs: 'w-2 h-2',
      sm: 'w-2.5 h-2.5',
      md: 'w-3 h-3',
      lg: 'w-3.5 h-3.5',
    };

    return (
      <div className="relative">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.username}
            className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white shadow-sm`}
          />
        ) : (
          <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium border-2 border-white shadow-sm`}>
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}
        {showStatus && (
          <div className={`absolute -bottom-0.5 -right-0.5 ${statusSizeClasses[size]} ${getStatusColor(user.status)} rounded-full border border-white`} />
        )}
      </div>
    );
  };

  // 用户详情卡片
  const UserCard = ({ user }: { user: UserPresence }) => (
    <div className="bg-white rounded-lg shadow-lg border p-4 min-w-64">
      <div className="flex items-center space-x-3">
        <UserAvatar user={user} size="md" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{user.username}</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className={`w-2 h-2 ${getStatusColor(user.status)} rounded-full`} />
            <span className="capitalize">{user.status}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-3 space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>加入时间:</span>
          <span>{new Date(user.joinedAt).toLocaleTimeString()}</span>
        </div>
        <div className="flex justify-between">
          <span>最后活跃:</span>
          <span>{getLastActivityText(user)}</span>
        </div>
        {user.cursor && (
          <div className="flex justify-between">
            <span>光标位置:</span>
            <span>({user.cursor.x}, {user.cursor.y})</span>
          </div>
        )}
        {user.selection && (
          <div className="flex justify-between">
            <span>选中元素:</span>
            <span className="truncate max-w-24">{user.selection.elementId}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (activeUsers.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={listRef}>
      {/* 用户头像列表 */}
      <div className="flex items-center space-x-1">
        {/* 可见用户 */}
        {visibleUsers.map((user) => (
          <div
            key={user.userId}
            className="relative cursor-pointer transform hover:scale-110 transition-transform duration-200"
            onMouseEnter={() => setHoveredUser(user.userId)}
            onMouseLeave={() => setHoveredUser(null)}
            onClick={() => setShowUserList(!showUserList)}
          >
            <UserAvatar user={user} />
            
            {/* 悬停显示用户信息 */}
            {hoveredUser === user.userId && showDetails && (
              <div className={`absolute z-50 ${
                position === 'top' ? 'bottom-full mb-2' :
                position === 'bottom' ? 'top-full mt-2' :
                position === 'left' ? 'right-full mr-2' :
                'left-full ml-2'
              }`}>
                <UserCard user={user} />
              </div>
            )}
          </div>
        ))}

        {/* 更多用户指示器 */}
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowUserList(!showUserList)}
            className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            +{hiddenCount}
          </button>
        )}

        {/* 在线人数 */}
        <div className="ml-2 text-sm text-gray-500 font-medium">
          {activeUsers.length} 在线
        </div>
      </div>

      {/* 展开的用户列表 */}
      {showUserList && (
        <div className={`absolute z-40 ${
          position === 'top' ? 'bottom-full mb-2' :
          position === 'bottom' ? 'top-full mt-2' :
          position === 'left' ? 'right-full mr-2' :
          'left-full ml-2'
        } bg-white rounded-lg shadow-lg border min-w-80 max-h-96 overflow-y-auto`}>
          {/* 头部 */}
          <div className="p-4 border-b bg-gray-50 rounded-t-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">在线用户</h3>
              <button
                onClick={() => setShowUserList(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              共 {activeUsers.length} 位用户在线
            </p>
          </div>

          {/* 用户列表 */}
          <div className="p-2">
            {activeUsers.map((user) => (
              <div
                key={user.userId}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <UserAvatar user={user} size="sm" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900 truncate">
                      {user.username}
                    </h4>
                    {user.userId === state.currentUser?.userId && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                        你
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-1">
                    <div className={`w-2 h-2 ${getStatusColor(user.status)} rounded-full`} />
                    <span className="text-sm text-gray-500 capitalize">
                      {user.status}
                    </span>
                    <span className="text-sm text-gray-400">•</span>
                    <span className="text-sm text-gray-500">
                      {getLastActivityText(user)}
                    </span>
                  </div>
                </div>

                {/* 当前活动指示器 */}
                {user.cursor && (
                  <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    活跃中
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 底部操作 */}
          <div className="p-3 border-t bg-gray-50 rounded-b-lg">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>房间: {state.currentRoom || '未知'}</span>
              <button
                onClick={() => {
                  // 可以添加邀请用户功能
                  console.log('Invite users');
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                邀请用户
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 简化版本 - 只显示头像
export function SimpleActiveUsers({ maxVisible = 3, className = '' }: { maxVisible?: number; className?: string }) {
  const { state } = useCollaboration();
  const activeUsers = state.roomUsers.filter(user => user.status === 'online');
  const visibleUsers = activeUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, activeUsers.length - maxVisible);

  if (activeUsers.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex -space-x-1">
        {visibleUsers.map((user) => (
          <div key={user.userId} className="relative">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-6 h-6 rounded-full border-2 border-white"
                title={user.username}
              />
            ) : (
              <div 
                className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                title={user.username}
              >
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        ))}
        {hiddenCount > 0 && (
          <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
            +{hiddenCount}
          </div>
        )}
      </div>
    </div>
  );
}