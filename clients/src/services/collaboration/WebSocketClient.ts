// Real-time collaboration WebSocket client
import { EventEmitter } from 'events';

export interface WebSocketMessage {
  id: string;
  type: string;
  data: any;
  userId: string;
  timestamp: number;
  roomId?: string;
}

export interface ConnectionOptions {
  url: string;
  token?: string;
  roomId?: string;
  userId: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export interface RoomInfo {
  id: string;
  name: string;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserPresence {
  userId: string;
  username: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  cursor?: {
    x: number;
    y: number;
    elementId?: string;
  };
  selection?: {
    elementId: string;
    range?: {
      start: number;
      end: number;
    };
  };
  joinedAt: string;
  lastActivity: string;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private options: ConnectionOptions;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private pendingMessages = new Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();

  constructor(options: ConnectionOptions) {
    super();
    this.options = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...options,
    };
  }

  // 连接到WebSocket服务器
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connectionState === 'connected') {
        resolve();
        return;
      }

      this.connectionState = 'connecting';
      this.emit('stateChange', this.connectionState);

      try {
        const url = new URL(this.options.url);
        if (this.options.token) {
          url.searchParams.set('token', this.options.token);
        }
        if (this.options.roomId) {
          url.searchParams.set('roomId', this.options.roomId);
        }
        url.searchParams.set('userId', this.options.userId);

        this.ws = new WebSocket(url.toString());

        this.ws.onopen = () => {
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          this.emit('stateChange', this.connectionState);
          this.emit('connected');
          this.startHeartbeat();
          this.flushMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
            this.emit('error', error);
          }
        };

        this.ws.onclose = (event) => {
          this.connectionState = 'disconnected';
          this.emit('stateChange', this.connectionState);
          this.emit('disconnected', event);
          this.stopHeartbeat();
          
          if (!event.wasClean && this.shouldReconnect()) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this.connectionState = 'error';
          this.emit('stateChange', this.connectionState);
          this.emit('error', error);
          reject(error);
        };

      } catch (error) {
        this.connectionState = 'error';
        this.emit('stateChange', this.connectionState);
        reject(error);
      }
    });
  }

  // 断开连接
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connectionState = 'disconnected';
    this.emit('stateChange', this.connectionState);
  }

  // 发送消息
  send(type: string, data: any, roomId?: string): Promise<WebSocketMessage | void> {
    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type,
      data,
      userId: this.options.userId,
      timestamp: Date.now(),
      roomId: roomId || this.options.roomId,
    };

    if (this.connectionState !== 'connected') {
      this.messageQueue.push(message);
      return Promise.resolve();
    }

    return this.sendMessage(message);
  }

  // 发送消息并等待响应
  sendWithResponse(type: string, data: any, timeout = 10000, roomId?: string): Promise<WebSocketMessage> {
    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type,
      data,
      userId: this.options.userId,
      timestamp: Date.now(),
      roomId: roomId || this.options.roomId,
    };

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingMessages.delete(message.id);
        reject(new Error('Message timeout'));
      }, timeout);

      this.pendingMessages.set(message.id, {
        resolve,
        reject,
        timeout: timeoutId,
      });

      if (this.connectionState !== 'connected') {
        this.messageQueue.push(message);
      } else {
        this.sendMessage(message).catch(reject);
      }
    });
  }

  // 加入房间
  joinRoom(roomId: string): Promise<RoomInfo> {
    return this.sendWithResponse('join_room', { roomId }).then(response => response.data);
  }

  // 离开房间
  leaveRoom(roomId: string): Promise<void> {
    return this.sendWithResponse('leave_room', { roomId }).then(() => {});
  }

  // 更新用户状态
  updatePresence(presence: Partial<UserPresence>): Promise<void> {
    return this.send('update_presence', presence).then(() => {});
  }

  // 获取房间用户列表
  getRoomUsers(roomId?: string): Promise<UserPresence[]> {
    return this.sendWithResponse('get_room_users', { roomId }).then(response => response.data);
  }

  // 广播操作到房间
  broadcastOperation(operation: any, roomId?: string): Promise<void> {
    return this.send('broadcast_operation', operation, roomId).then(() => {});
  }

  // 私聊消息
  sendDirectMessage(targetUserId: string, message: string): Promise<void> {
    return this.send('direct_message', { targetUserId, message }).then(() => {});
  }

  // 获取连接状态
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  // 获取当前房间ID
  getCurrentRoom(): string | undefined {
    return this.options.roomId;
  }

  // 设置当前房间
  setCurrentRoom(roomId: string): void {
    this.options.roomId = roomId;
  }

  // 获取消息队列长度
  getQueueLength(): number {
    return this.messageQueue.length;
  }

  // 处理收到的消息
  private handleMessage(message: WebSocketMessage): void {
    // 处理响应消息
    if (this.pendingMessages.has(message.id)) {
      const pending = this.pendingMessages.get(message.id)!;
      clearTimeout(pending.timeout);
      this.pendingMessages.delete(message.id);
      pending.resolve(message);
      return;
    }

    // 触发事件
    this.emit('message', message);
    this.emit(`message:${message.type}`, message.data, message);

    // 处理特殊消息类型
    switch (message.type) {
      case 'user_joined':
        this.emit('userJoined', message.data);
        break;
      case 'user_left':
        this.emit('userLeft', message.data);
        break;
      case 'presence_update':
        this.emit('presenceUpdate', message.data);
        break;
      case 'operation':
        this.emit('operation', message.data);
        break;
      case 'chat_message':
        this.emit('chatMessage', message.data);
        break;
      case 'direct_message':
        this.emit('directMessage', message.data);
        break;
      case 'error':
        this.emit('error', new Error(message.data.message));
        break;
    }
  }

  // 发送消息到服务器
  private sendMessage(message: WebSocketMessage): Promise<WebSocketMessage | void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }

      try {
        this.ws.send(JSON.stringify(message));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // 判断是否应该重连
  private shouldReconnect(): boolean {
    return this.reconnectAttempts < (this.options.maxReconnectAttempts || 10);
  }

  // 安排重连
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    this.connectionState = 'reconnecting';
    this.emit('stateChange', this.connectionState);

    const delay = Math.min(
      (this.options.reconnectInterval || 3000) * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
        if (this.shouldReconnect()) {
          this.scheduleReconnect();
        }
      });
    }, delay);
  }

  // 开始心跳
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      this.send('ping', { timestamp: Date.now() }).catch(() => {
        // 心跳失败，可能连接已断开
      });
    }, this.options.heartbeatInterval || 30000);
  }

  // 停止心跳
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // 清空消息队列
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.sendMessage(message).catch(error => {
        console.error('Failed to send queued message:', error);
      });
    }
  }

  // 生成消息ID
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// WebSocket客户端单例
export class WebSocketManager {
  private static instance: WebSocketClient | null = null;
  private static options: ConnectionOptions | null = null;

  static initialize(options: ConnectionOptions): WebSocketClient {
    if (this.instance) {
      this.instance.disconnect();
    }

    this.options = options;
    this.instance = new WebSocketClient(options);
    return this.instance;
  }

  static getInstance(): WebSocketClient | null {
    return this.instance;
  }

  static async connect(): Promise<WebSocketClient> {
    if (!this.instance || !this.options) {
      throw new Error('WebSocketManager not initialized');
    }

    await this.instance.connect();
    return this.instance;
  }

  static disconnect(): void {
    if (this.instance) {
      this.instance.disconnect();
      this.instance = null;
      this.options = null;
    }
  }

  static isConnected(): boolean {
    return this.instance?.getConnectionState() === 'connected';
  }
}