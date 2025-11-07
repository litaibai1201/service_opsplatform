import React, { useState, useEffect } from 'react';
import { useCollaboration } from '../../contexts/CollaborationProvider';
import { UserPresence } from '../../services/collaboration/WebSocketClient';

interface PresenceIndicatorProps {
  userId: string;
  showUsername?: boolean;
  showStatus?: boolean;
  showLastActivity?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

interface StatusDotProps {
  status: UserPresence['status'];
  size?: 'xs' | 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

interface PresenceBadgeProps {
  user: UserPresence;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showTooltip?: boolean;
}

// 状态指示点
function StatusDot({ status, size = 'sm', pulse = false }: StatusDotProps) {
  const sizeClasses = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const getStatusColor = (status: UserPresence['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div
      className={`
        ${sizeClasses[size]} 
        ${getStatusColor(status)} 
        rounded-full 
        ${pulse && status === 'online' ? 'animate-pulse' : ''}
        border border-white
      `}
    />
  );
}

// 在线状态徽章
function PresenceBadge({ 
  user, 
  position = 'bottom-right', 
  showTooltip = true 
}: PresenceBadgeProps) {
  const [showTooltipState, setShowTooltipState] = useState(false);

  const positionClasses = {
    'top-left': '-top-1 -left-1',
    'top-right': '-top-1 -right-1',
    'bottom-left': '-bottom-1 -left-1',
    'bottom-right': '-bottom-1 -right-1',
  };

  const getStatusText = (status: UserPresence['status']) => {
    switch (status) {
      case 'online': return '在线';
      case 'away': return '离开';
      case 'busy': return '忙碌';
      case 'offline': return '离线';
      default: return '未知';
    }
  };

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

  return (
    <div className="relative">
      <div
        className={`absolute ${positionClasses[position]} z-10`}
        onMouseEnter={() => showTooltip && setShowTooltipState(true)}
        onMouseLeave={() => setShowTooltipState(false)}
      >
        <StatusDot status={user.status} pulse={user.status === 'online'} />
      </div>

      {/* 工具提示 */}
      {showTooltip && showTooltipState && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
            <div className="font-medium">{user.username}</div>
            <div className="text-gray-300">{getStatusText(user.status)}</div>
            <div className="text-gray-400 text-xs">{getLastActivityText(user)}</div>
            
            {/* 箭头 */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}

// 主要的在线状态指示器组件
export function PresenceIndicator({
  userId,
  showUsername = false,
  showStatus = true,
  showLastActivity = false,
  size = 'sm',
  className = '',
}: PresenceIndicatorProps) {
  const { getUserById } = useCollaboration();
  const user = getUserById(userId);

  if (!user) {
    return null;
  }

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const getStatusText = (status: UserPresence['status']) => {
    switch (status) {
      case 'online': return '在线';
      case 'away': return '离开';
      case 'busy': return '忙碌';
      case 'offline': return '离线';
      default: return '未知';
    }
  };

  const getLastActivityText = (user: UserPresence) => {
    const lastActivity = new Date(user.lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return '刚刚活跃';
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    return '超过1天前';
  };

  return (
    <div className={`flex items-center space-x-2 ${sizeClasses[size]} ${className}`}>
      <StatusDot status={user.status} size={size} pulse={user.status === 'online'} />
      
      <div className="flex flex-col">
        {showUsername && (
          <span className="font-medium text-gray-900">{user.username}</span>
        )}
        
        {showStatus && (
          <span className={`text-gray-600 ${showUsername ? 'text-xs' : ''}`}>
            {getStatusText(user.status)}
          </span>
        )}
        
        {showLastActivity && (
          <span className="text-xs text-gray-400">
            {getLastActivityText(user)}
          </span>
        )}
      </div>
    </div>
  );
}

// 在线状态列表组件
export function PresenceList({ 
  showOffline = false,
  maxUsers = 10,
  className = '' 
}: { 
  showOffline?: boolean;
  maxUsers?: number;
  className?: string;
}) {
  const { state } = useCollaboration();
  
  const filteredUsers = state.roomUsers
    .filter(user => showOffline || user.status !== 'offline')
    .slice(0, maxUsers);

  const onlineCount = state.roomUsers.filter(user => user.status === 'online').length;
  const awayCount = state.roomUsers.filter(user => user.status === 'away').length;
  const busyCount = state.roomUsers.filter(user => user.status === 'busy').length;
  const offlineCount = state.roomUsers.filter(user => user.status === 'offline').length;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 统计概览 */}
      <div className="flex items-center space-x-4 text-sm text-gray-600">
        <div className="flex items-center space-x-1">
          <StatusDot status="online" size="xs" />
          <span>{onlineCount} 在线</span>
        </div>
        
        {awayCount > 0 && (
          <div className="flex items-center space-x-1">
            <StatusDot status="away" size="xs" />
            <span>{awayCount} 离开</span>
          </div>
        )}
        
        {busyCount > 0 && (
          <div className="flex items-center space-x-1">
            <StatusDot status="busy" size="xs" />
            <span>{busyCount} 忙碌</span>
          </div>
        )}
        
        {showOffline && offlineCount > 0 && (
          <div className="flex items-center space-x-1">
            <StatusDot status="offline" size="xs" />
            <span>{offlineCount} 离线</span>
          </div>
        )}
      </div>

      {/* 用户列表 */}
      <div className="space-y-2">
        {filteredUsers.map(user => (
          <PresenceIndicator
            key={user.userId}
            userId={user.userId}
            showUsername
            showLastActivity
            size="sm"
          />
        ))}
        
        {state.roomUsers.length > maxUsers && (
          <div className="text-sm text-gray-500">
            还有 {state.roomUsers.length - maxUsers} 位用户...
          </div>
        )}
      </div>
    </div>
  );
}

// 实时在线状态动画组件
export function LivePresenceIndicator({ 
  userId, 
  showActivity = true 
}: { 
  userId: string; 
  showActivity?: boolean; 
}) {
  const { getUserById } = useCollaboration();
  const [activityPulse, setActivityPulse] = useState(false);
  const user = getUserById(userId);

  // 监听用户活动
  useEffect(() => {
    if (!user) return;

    const lastActivity = new Date(user.lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    
    // 如果最近5秒内有活动，显示脉冲效果
    if (diffMs < 5000) {
      setActivityPulse(true);
      const timer = setTimeout(() => setActivityPulse(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [user?.lastActivity]);

  if (!user) return null;

  return (
    <div className="relative">
      <StatusDot 
        status={user.status} 
        pulse={user.status === 'online'} 
      />
      
      {/* 活动脉冲环 */}
      {showActivity && activityPulse && user.status === 'online' && (
        <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping" />
      )}
    </div>
  );
}

// 群组在线状态概览
export function GroupPresenceOverview({ 
  className = '' 
}: { 
  className?: string; 
}) {
  const { state } = useCollaboration();
  
  const statusCounts = state.roomUsers.reduce((counts, user) => {
    counts[user.status] = (counts[user.status] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const total = state.roomUsers.length;

  return (
    <div className={`bg-gray-50 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">在线状态</h4>
        <span className="text-sm text-gray-500">{total} 人</span>
      </div>
      
      {/* 状态分布条 */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div className="flex h-full rounded-full overflow-hidden">
          {statusCounts.online > 0 && (
            <div 
              className="bg-green-500" 
              style={{ width: `${(statusCounts.online / total) * 100}%` }}
            />
          )}
          {statusCounts.away > 0 && (
            <div 
              className="bg-yellow-500" 
              style={{ width: `${(statusCounts.away / total) * 100}%` }}
            />
          )}
          {statusCounts.busy > 0 && (
            <div 
              className="bg-red-500" 
              style={{ width: `${(statusCounts.busy / total) * 100}%` }}
            />
          )}
          {statusCounts.offline > 0 && (
            <div 
              className="bg-gray-400" 
              style={{ width: `${(statusCounts.offline / total) * 100}%` }}
            />
          )}
        </div>
      </div>
      
      {/* 详细数据 */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center space-x-1">
          <StatusDot status="online" size="xs" />
          <span className="text-gray-600">{statusCounts.online || 0} 在线</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <StatusDot status="away" size="xs" />
          <span className="text-gray-600">{statusCounts.away || 0} 离开</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <StatusDot status="busy" size="xs" />
          <span className="text-gray-600">{statusCounts.busy || 0} 忙碌</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <StatusDot status="offline" size="xs" />
          <span className="text-gray-600">{statusCounts.offline || 0} 离线</span>
        </div>
      </div>
    </div>
  );
}

// 带头像的在线状态指示器
export function AvatarWithPresence({
  user,
  size = 'md',
  showBadge = true,
  className = '',
}: {
  user: UserPresence;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  className?: string;
}) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  return (
    <div className={`relative ${className}`}>
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.username}
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
      ) : (
        <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium`}>
          {user.username.charAt(0).toUpperCase()}
        </div>
      )}
      
      {showBadge && (
        <PresenceBadge user={user} position="bottom-right" />
      )}
    </div>
  );
}