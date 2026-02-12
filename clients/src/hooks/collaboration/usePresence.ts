import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppSelector } from '@/store';
import useWebSocket from './useWebSocket';

export interface PresenceUser {
  userId: string;
  username: string;
  avatar?: string;
  status: 'active' | 'idle' | 'away';
  lastActivity: number;
  cursor?: {
    x: number;
    y: number;
  };
  selection?: {
    start: number;
    end: number;
  };
  color?: string;
}

export interface UsePresenceOptions {
  roomId: string;
  enabled?: boolean;
  idleTimeout?: number; // 闲置超时（毫秒）
  awayTimeout?: number; // 离开超时（毫秒）
  heartbeatInterval?: number; // 心跳间隔（毫秒）
}

export interface UsePresenceReturn {
  users: PresenceUser[];
  activeUsers: PresenceUser[];
  currentUser: PresenceUser | null;
  updateCursor: (x: number, y: number) => void;
  updateSelection: (start: number, end: number) => void;
  setStatus: (status: 'active' | 'idle' | 'away') => void;
  isConnected: boolean;
}

const USER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

const usePresence = (options: UsePresenceOptions): UsePresenceReturn => {
  const {
    roomId,
    enabled = true,
    idleTimeout = 60000, // 1分钟
    awayTimeout = 300000, // 5分钟
    heartbeatInterval = 30000, // 30秒
  } = options;

  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [currentUser, setCurrentUser] = useState<PresenceUser | null>(null);
  const lastActivityRef = useRef(Date.now());
  const heartbeatTimerRef = useRef<NodeJS.Timeout>();
  const statusCheckTimerRef = useRef<NodeJS.Timeout>();

  // 获取当前用户信息
  const { user } = useAppSelector((state) => state.auth);

  // WebSocket连接
  const { socket, isConnected, emit, on, off } = useWebSocket('/presence', {
    autoConnect: enabled,
  });

  // 分配用户颜色
  const assignColor = useCallback((userId: string): string => {
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return USER_COLORS[hash % USER_COLORS.length];
  }, []);

  // 加入房间
  const joinRoom = useCallback(() => {
    if (!socket || !user || !roomId) return;

    const presenceUser: PresenceUser = {
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      status: 'active',
      lastActivity: Date.now(),
      color: assignColor(user.id),
    };

    setCurrentUser(presenceUser);
    emit('presence:join', { roomId, user: presenceUser });
  }, [socket, user, roomId, emit, assignColor]);

  // 离开房间
  const leaveRoom = useCallback(() => {
    if (!socket || !roomId) return;
    emit('presence:leave', { roomId });
  }, [socket, roomId, emit]);

  // 更新光标位置
  const updateCursor = useCallback(
    (x: number, y: number) => {
      if (!socket || !roomId) return;
      lastActivityRef.current = Date.now();

      emit('presence:cursor', {
        roomId,
        cursor: { x, y },
      });

      setCurrentUser((prev) =>
        prev ? { ...prev, cursor: { x, y }, lastActivity: Date.now() } : null
      );
    },
    [socket, roomId, emit]
  );

  // 更新选择范围
  const updateSelection = useCallback(
    (start: number, end: number) => {
      if (!socket || !roomId) return;
      lastActivityRef.current = Date.now();

      emit('presence:selection', {
        roomId,
        selection: { start, end },
      });

      setCurrentUser((prev) =>
        prev ? { ...prev, selection: { start, end }, lastActivity: Date.now() } : null
      );
    },
    [socket, roomId, emit]
  );

  // 设置状态
  const setStatus = useCallback(
    (status: 'active' | 'idle' | 'away') => {
      if (!socket || !roomId) return;

      emit('presence:status', {
        roomId,
        status,
      });

      setCurrentUser((prev) => (prev ? { ...prev, status } : null));
    },
    [socket, roomId, emit]
  );

  // 发送心跳
  const sendHeartbeat = useCallback(() => {
    if (!socket || !roomId) return;

    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;

    // 根据活动时间自动更新状态
    let newStatus: 'active' | 'idle' | 'away' = 'active';
    if (timeSinceActivity > awayTimeout) {
      newStatus = 'away';
    } else if (timeSinceActivity > idleTimeout) {
      newStatus = 'idle';
    }

    emit('presence:heartbeat', {
      roomId,
      status: newStatus,
      lastActivity: lastActivityRef.current,
    });

    setCurrentUser((prev) =>
      prev ? { ...prev, status: newStatus, lastActivity: now } : null
    );
  }, [socket, roomId, emit, idleTimeout, awayTimeout]);

  // 监听在线用户更新
  useEffect(() => {
    if (!socket) return;

    const handleUsersUpdate = (data: { users: PresenceUser[] }) => {
      setUsers(data.users.filter((u) => u.userId !== user?.id));
    };

    const handleUserJoin = (data: { user: PresenceUser }) => {
      if (data.user.userId === user?.id) return;
      setUsers((prev) => [...prev.filter((u) => u.userId !== data.user.userId), data.user]);
    };

    const handleUserLeave = (data: { userId: string }) => {
      setUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    };

    const handleUserUpdate = (data: { user: PresenceUser }) => {
      if (data.user.userId === user?.id) return;
      setUsers((prev) =>
        prev.map((u) => (u.userId === data.user.userId ? { ...u, ...data.user } : u))
      );
    };

    on('presence:users', handleUsersUpdate);
    on('presence:user-join', handleUserJoin);
    on('presence:user-leave', handleUserLeave);
    on('presence:user-update', handleUserUpdate);

    return () => {
      off('presence:users', handleUsersUpdate);
      off('presence:user-join', handleUserJoin);
      off('presence:user-leave', handleUserLeave);
      off('presence:user-update', handleUserUpdate);
    };
  }, [socket, user, on, off]);

  // 加入/离开房间
  useEffect(() => {
    if (isConnected && enabled && roomId) {
      joinRoom();

      // 设置心跳定时器
      heartbeatTimerRef.current = setInterval(sendHeartbeat, heartbeatInterval);

      return () => {
        leaveRoom();
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
        }
      };
    }
  }, [isConnected, enabled, roomId, joinRoom, leaveRoom, sendHeartbeat, heartbeatInterval]);

  // 监听用户活动
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (currentUser?.status !== 'active') {
        setStatus('active');
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [currentUser, setStatus]);

  // 计算活跃用户
  const activeUsers = users.filter((u) => u.status === 'active');

  return {
    users,
    activeUsers,
    currentUser,
    updateCursor,
    updateSelection,
    setStatus,
    isConnected,
  };
};

export default usePresence;
