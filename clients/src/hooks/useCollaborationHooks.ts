// Collaboration hooks for real-time features
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useCollaboration } from '../contexts/CollaborationProvider';
import { collaborationApi, Room, DocumentVersion, CollaborationStats } from '../services/collaboration/collaborationApi';
import { SyncEngine } from '../services/collaboration/SyncEngine';
import { ConflictResolver } from '../services/collaboration/ConflictResolver';
import { Operation } from '../services/collaboration/OperationalTransform';
import { UserPresence } from '../services/collaboration/WebSocketClient';

// WebSocket连接状态管理Hook
export function useWebSocketConnection() {
  const { state, connect, disconnect } = useCollaboration();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const connectToRoom = useCallback(async (roomId: string) => {
    if (state.isConnected && state.currentRoom === roomId) {
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      await connect(roomId);
    } catch (error) {
      setConnectionError((error as Error).message);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [connect, state.isConnected, state.currentRoom]);

  const disconnectFromRoom = useCallback(() => {
    disconnect();
    setConnectionError(null);
  }, [disconnect]);

  return {
    isConnected: state.isConnected,
    isConnecting,
    connectionError,
    connectionState: state.connectionState,
    currentRoom: state.currentRoom,
    connectToRoom,
    disconnectFromRoom,
  };
}

// 在线状态管理Hook
export function usePresence() {
  const { state, updatePresence, updateCursor, updateSelection } = useCollaboration();
  const [isTracking, setIsTracking] = useState(false);
  const trackingRef = useRef<boolean>(false);

  // 开始跟踪鼠标和选择
  const startTracking = useCallback(() => {
    if (trackingRef.current) return;
    
    trackingRef.current = true;
    setIsTracking(true);

    const handleMouseMove = (e: MouseEvent) => {
      if (trackingRef.current) {
        updateCursor(e.clientX, e.clientY);
      }
    };

    const handleSelectionChange = () => {
      if (!trackingRef.current) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        updateSelection('', undefined);
        return;
      }

      const range = selection.getRangeAt(0);
      if (range.collapsed) {
        updateSelection('', undefined);
        return;
      }

      // 查找选择所在的元素
      let container = range.commonAncestorContainer;
      while (container && container.nodeType !== Node.ELEMENT_NODE) {
        container = container.parentNode;
      }

      if (container) {
        const element = container as Element;
        const elementId = element.id || element.getAttribute('data-element-id') || '';
        
        if (elementId) {
          const textContent = element.textContent || '';
          const selectedText = selection.toString();
          const startOffset = textContent.indexOf(selectedText);
          
          if (startOffset !== -1) {
            updateSelection(elementId, {
              start: startOffset,
              end: startOffset + selectedText.length,
            });
          }
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [updateCursor, updateSelection]);

  // 停止跟踪
  const stopTracking = useCallback(() => {
    trackingRef.current = false;
    setIsTracking(false);
  }, []);

  // 更新用户状态
  const setUserStatus = useCallback((status: UserPresence['status']) => {
    updatePresence({ status });
  }, [updatePresence]);

  return {
    currentUser: state.currentUser,
    roomUsers: state.roomUsers,
    isTracking,
    startTracking,
    stopTracking,
    setUserStatus,
    updatePresence,
  };
}

// 房间管理Hook
export function useRoomManagement() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取房间列表
  const fetchRooms = useCallback(async (params?: Parameters<typeof collaborationApi.room.getRooms>[0]) => {
    setLoading(true);
    setError(null);

    try {
      const response = await collaborationApi.room.getRooms(params);
      setRooms(response.rooms);
      return response;
    } catch (error) {
      setError((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取房间详情
  const fetchRoom = useCallback(async (roomId: string) => {
    setLoading(true);
    setError(null);

    try {
      const room = await collaborationApi.room.getRoom(roomId);
      setCurrentRoom(room);
      return room;
    } catch (error) {
      setError((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建房间
  const createRoom = useCallback(async (data: Parameters<typeof collaborationApi.room.createRoom>[0]) => {
    setLoading(true);
    setError(null);

    try {
      const room = await collaborationApi.room.createRoom(data);
      setRooms(prev => [room, ...prev]);
      return room;
    } catch (error) {
      setError((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新房间
  const updateRoom = useCallback(async (
    roomId: string, 
    data: Parameters<typeof collaborationApi.room.updateRoom>[1]
  ) => {
    setLoading(true);
    setError(null);

    try {
      const room = await collaborationApi.room.updateRoom(roomId, data);
      setRooms(prev => prev.map(r => r.id === roomId ? room : r));
      if (currentRoom?.id === roomId) {
        setCurrentRoom(room);
      }
      return room;
    } catch (error) {
      setError((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentRoom]);

  // 删除房间
  const deleteRoom = useCallback(async (roomId: string) => {
    setLoading(true);
    setError(null);

    try {
      await collaborationApi.room.deleteRoom(roomId);
      setRooms(prev => prev.filter(r => r.id !== roomId));
      if (currentRoom?.id === roomId) {
        setCurrentRoom(null);
      }
    } catch (error) {
      setError((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentRoom]);

  // 邀请用户
  const inviteUsers = useCallback(async (data: Parameters<typeof collaborationApi.room.inviteUsers>[0]) => {
    try {
      return await collaborationApi.room.inviteUsers(data);
    } catch (error) {
      setError((error as Error).message);
      throw error;
    }
  }, []);

  return {
    rooms,
    currentRoom,
    loading,
    error,
    fetchRooms,
    fetchRoom,
    createRoom,
    updateRoom,
    deleteRoom,
    inviteUsers,
  };
}

// 文档同步Hook
export function useDocumentSync(documentId: string) {
  const [syncEngine, setSyncEngine] = useState<SyncEngine | null>(null);
  const [syncStatus, setSyncStatus] = useState<{
    isLoading: boolean;
    hasError: boolean;
    error: string | null;
    pendingOperations: number;
    lastSyncTime: number;
  }>({
    isLoading: false,
    hasError: false,
    error: null,
    pendingOperations: 0,
    lastSyncTime: 0,
  });

  // 初始化同步引擎
  useEffect(() => {
    if (!documentId) return;

    const engine = SyncEngine.getInstance();
    setSyncEngine(engine);

    const initializeDocument = async () => {
      try {
        setSyncStatus(prev => ({ ...prev, isLoading: true, hasError: false, error: null }));
        await engine.initializeDocument(documentId);
        setSyncStatus(prev => ({ ...prev, isLoading: false }));
      } catch (error) {
        setSyncStatus(prev => ({
          ...prev,
          isLoading: false,
          hasError: true,
          error: (error as Error).message,
        }));
      }
    };

    initializeDocument();

    // 监听同步事件
    const handleSyncComplete = () => {
      setSyncStatus(prev => ({
        ...prev,
        lastSyncTime: Date.now(),
      }));
    };

    const handleSyncError = (event: any) => {
      setSyncStatus(prev => ({
        ...prev,
        hasError: true,
        error: event.data.error?.message || 'Sync error',
      }));
    };

    engine.on('sync-complete', handleSyncComplete);
    engine.on('sync-error', handleSyncError);

    return () => {
      engine.off('sync-complete', handleSyncComplete);
      engine.off('sync-error', handleSyncError);
      engine.cleanupDocument(documentId);
    };
  }, [documentId]);

  // 应用操作
  const applyOperation = useCallback((operation: Omit<Operation, 'id' | 'userId' | 'timestamp'>) => {
    if (!syncEngine) return;

    try {
      syncEngine.applyLocalOperation(documentId, {
        ...operation,
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: 'current-user', // 应该从认证上下文获取
        timestamp: Date.now(),
      });
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        hasError: true,
        error: (error as Error).message,
      }));
    }
  }, [syncEngine, documentId]);

  // 强制同步
  const forceSync = useCallback(async () => {
    if (!syncEngine) return;

    try {
      setSyncStatus(prev => ({ ...prev, isLoading: true }));
      await syncEngine.syncDocument(documentId);
      setSyncStatus(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
        error: (error as Error).message,
      }));
    }
  }, [syncEngine, documentId]);

  // 获取文档状态
  const documentState = useMemo(() => {
    if (!syncEngine) return null;
    return syncEngine.getDocumentState(documentId);
  }, [syncEngine, documentId]);

  return {
    syncEngine,
    syncStatus,
    documentState,
    applyOperation,
    forceSync,
  };
}

// 版本控制Hook
export function useVersionControl(documentId: string) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<DocumentVersion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取版本列表
  const fetchVersions = useCallback(async () => {
    if (!documentId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await collaborationApi.version.getVersions(documentId);
      setVersions(response.versions);
      return response;
    } catch (error) {
      setError((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  // 创建版本
  const createVersion = useCallback(async (
    content: string,
    operations: Operation[],
    description?: string
  ) => {
    if (!documentId) return;

    setLoading(true);
    setError(null);

    try {
      const version = await collaborationApi.version.createVersion({
        documentId,
        content,
        operations,
        description,
      });
      setVersions(prev => [version, ...prev]);
      return version;
    } catch (error) {
      setError((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  // 恢复版本
  const restoreVersion = useCallback(async (versionId: string) => {
    if (!documentId) return;

    setLoading(true);
    setError(null);

    try {
      const version = await collaborationApi.version.restoreVersion(documentId, versionId);
      setCurrentVersion(version);
      return version;
    } catch (error) {
      setError((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  // 比较版本
  const compareVersions = useCallback(async (fromVersion: number, toVersion: number) => {
    if (!documentId) return;

    try {
      return await collaborationApi.version.compareVersions(documentId, fromVersion, toVersion);
    } catch (error) {
      setError((error as Error).message);
      throw error;
    }
  }, [documentId]);

  // 初始化时获取版本列表
  useEffect(() => {
    if (documentId) {
      fetchVersions();
    }
  }, [documentId, fetchVersions]);

  return {
    versions,
    currentVersion,
    loading,
    error,
    fetchVersions,
    createVersion,
    restoreVersion,
    compareVersions,
  };
}

// 冲突解决Hook
export function useConflictResolution() {
  const [conflictResolver] = useState(() => ConflictResolver.getInstance());
  const [conflicts, setConflicts] = useState(() => conflictResolver.getActiveConflicts());

  // 更新冲突列表
  useEffect(() => {
    const updateConflicts = () => {
      setConflicts(conflictResolver.getActiveConflicts());
    };

    // 定期更新冲突列表
    const interval = setInterval(updateConflicts, 1000);
    return () => clearInterval(interval);
  }, [conflictResolver]);

  // 解决冲突
  const resolveConflict = useCallback(async (
    conflictId: string,
    strategy: Parameters<typeof conflictResolver.resolveConflict>[1],
    options?: Parameters<typeof conflictResolver.resolveConflict>[2]
  ) => {
    try {
      const resolution = await conflictResolver.resolveConflict(conflictId, strategy, options);
      setConflicts(conflictResolver.getActiveConflicts());
      return resolution;
    } catch (error) {
      throw error;
    }
  }, [conflictResolver]);

  // 预测冲突
  const predictConflict = useCallback((
    newOperation: Operation,
    existingOperations: Operation[]
  ) => {
    return conflictResolver.predictConflict(newOperation, existingOperations);
  }, [conflictResolver]);

  // 获取冲突统计
  const getStats = useCallback(() => {
    return conflictResolver.getConflictStats();
  }, [conflictResolver]);

  return {
    conflicts,
    resolveConflict,
    predictConflict,
    getStats,
  };
}

// 协作统计Hook
export function useCollaborationStats(roomId?: string) {
  const [stats, setStats] = useState<CollaborationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    if (!roomId) return;

    setLoading(true);
    setError(null);

    try {
      const stats = await collaborationApi.stats.getRoomStats(roomId);
      setStats(stats);
      return stats;
    } catch (error) {
      setError((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // 获取实时统计
  const fetchRealTimeStats = useCallback(async () => {
    if (!roomId) return;

    try {
      return await collaborationApi.stats.getRealTimeStats(roomId);
    } catch (error) {
      setError((error as Error).message);
      throw error;
    }
  }, [roomId]);

  // 定期更新统计
  useEffect(() => {
    if (roomId) {
      fetchStats();
      
      const interval = setInterval(fetchStats, 30000); // 30秒更新一次
      return () => clearInterval(interval);
    }
  }, [roomId, fetchStats]);

  return {
    stats,
    loading,
    error,
    fetchStats,
    fetchRealTimeStats,
  };
}

// 评论管理Hook
export function useComments(elementId?: string) {
  const { state, addComment, resolveComment, replyToComment, deleteComment } = useCollaboration();
  
  const comments = useMemo(() => {
    return elementId 
      ? state.comments.filter(comment => comment.elementId === elementId)
      : state.comments;
  }, [state.comments, elementId]);

  const unresolvedComments = useMemo(() => {
    return comments.filter(comment => !comment.resolved);
  }, [comments]);

  const resolvedComments = useMemo(() => {
    return comments.filter(comment => comment.resolved);
  }, [comments]);

  // 添加评论
  const handleAddComment = useCallback((
    targetElementId: string,
    content: string,
    position: { x: number; y: number }
  ) => {
    addComment(targetElementId, content, position);
  }, [addComment]);

  // 解决评论
  const handleResolveComment = useCallback((commentId: string) => {
    resolveComment(commentId);
  }, [resolveComment]);

  // 回复评论
  const handleReplyComment = useCallback((commentId: string, content: string) => {
    replyToComment(commentId, content);
  }, [replyToComment]);

  // 删除评论
  const handleDeleteComment = useCallback((commentId: string) => {
    deleteComment(commentId);
  }, [deleteComment]);

  return {
    comments,
    unresolvedComments,
    resolvedComments,
    addComment: handleAddComment,
    resolveComment: handleResolveComment,
    replyToComment: handleReplyComment,
    deleteComment: handleDeleteComment,
  };
}

// 聊天Hook
export function useChat() {
  const { state, sendChatMessage, sendDirectMessage } = useCollaboration();
  
  const messages = state.chatMessages;
  const currentUserId = state.currentUser?.userId;

  // 发送消息
  const handleSendMessage = useCallback((message: string) => {
    sendChatMessage(message);
  }, [sendChatMessage]);

  // 发送私聊消息
  const handleSendDirectMessage = useCallback((targetUserId: string, message: string) => {
    sendDirectMessage(targetUserId, message);
  }, [sendDirectMessage]);

  // 获取与特定用户的私聊消息
  const getDirectMessages = useCallback((userId: string) => {
    return messages.filter(msg => 
      (msg.userId === currentUserId && msg.metadata?.targetUserId === userId) ||
      (msg.userId === userId && msg.metadata?.targetUserId === currentUserId)
    );
  }, [messages, currentUserId]);

  return {
    messages,
    sendMessage: handleSendMessage,
    sendDirectMessage: handleSendDirectMessage,
    getDirectMessages,
  };
}