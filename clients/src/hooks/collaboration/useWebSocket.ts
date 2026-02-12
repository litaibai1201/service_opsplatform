import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppSelector } from '@/store';

export interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onReconnect?: (attemptNumber: number) => void;
}

export interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler?: (...args: any[]) => void) => void;
  error: Error | null;
}

const useWebSocket = (
  namespace: string = '/',
  options: UseWebSocketOptions = {}
): UseWebSocketReturn => {
  const {
    url = process.env.VITE_WS_URL || 'ws://localhost:8080',
    autoConnect = true,
    reconnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000,
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reconnectCountRef = useRef(0);

  // 获取认证token
  const { accessToken } = useAppSelector((state) => state.auth);

  // 连接WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    try {
      const socket = io(`${url}${namespace}`, {
        auth: {
          token: accessToken,
        },
        reconnection: reconnect,
        reconnectionAttempts: reconnectAttempts,
        reconnectionDelay: reconnectDelay,
        transports: ['websocket', 'polling'],
      });

      // 连接成功
      socket.on('connect', () => {
        console.log('✅ WebSocket connected:', socket.id);
        setIsConnected(true);
        setError(null);
        reconnectCountRef.current = 0;
        onConnect?.();
      });

      // 连接断开
      socket.on('disconnect', (reason) => {
        console.log('❌ WebSocket disconnected:', reason);
        setIsConnected(false);
        onDisconnect?.(reason);
      });

      // 连接错误
      socket.on('connect_error', (err) => {
        console.error('❌ WebSocket connection error:', err);
        setError(err as Error);
        onError?.(err as Error);
      });

      // 重连尝试
      socket.io.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 WebSocket reconnecting... Attempt ${attemptNumber}`);
        reconnectCountRef.current = attemptNumber;
        onReconnect?.(attemptNumber);
      });

      // 重连成功
      socket.io.on('reconnect', (attemptNumber) => {
        console.log(`✅ WebSocket reconnected after ${attemptNumber} attempts`);
        setError(null);
      });

      // 重连失败
      socket.io.on('reconnect_failed', () => {
        console.error('❌ WebSocket reconnection failed');
        setError(new Error('Failed to reconnect after maximum attempts'));
      });

      socketRef.current = socket;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create socket');
      setError(error);
      onError?.(error);
    }
  }, [url, namespace, accessToken, reconnect, reconnectAttempts, reconnectDelay, onConnect, onDisconnect, onError, onReconnect]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // 发送消息
  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('⚠️ Cannot emit: WebSocket not connected');
    }
  }, []);

  // 监听事件
  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  // 取消监听
  const off = useCallback((event: string, handler?: (...args: any[]) => void) => {
    if (socketRef.current) {
      if (handler) {
        socketRef.current.off(event, handler);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  // 自动连接
  useEffect(() => {
    if (autoConnect && accessToken) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, accessToken, connect, disconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    connect,
    disconnect,
    emit,
    on,
    off,
    error,
  };
};

export default useWebSocket;
