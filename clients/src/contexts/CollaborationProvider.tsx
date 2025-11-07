import React, { createContext, useContext, useEffect, useReducer, useCallback, ReactNode } from 'react';
import { WebSocketClient, WebSocketManager, UserPresence, ConnectionState } from '../services/collaboration/WebSocketClient';

export interface CollaborationState {
  isConnected: boolean;
  connectionState: ConnectionState;
  currentRoom: string | null;
  currentUser: UserPresence | null;
  roomUsers: UserPresence[];
  operations: Operation[];
  chatMessages: ChatMessage[];
  comments: Comment[];
  isReconnecting: boolean;
  error: string | null;
}

export interface Operation {
  id: string;
  type: string;
  data: any;
  userId: string;
  timestamp: number;
  roomId: string;
  applied: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  message: string;
  timestamp: number;
  roomId: string;
  type: 'text' | 'system' | 'file';
  metadata?: any;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  content: string;
  elementId: string;
  position: { x: number; y: number };
  timestamp: number;
  roomId: string;
  resolved: boolean;
  replies: CommentReply[];
}

export interface CommentReply {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  content: string;
  timestamp: number;
}

export interface CollaborationContextType {
  state: CollaborationState;
  
  // Connection methods
  connect: (roomId: string) => Promise<void>;
  disconnect: () => void;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  
  // Presence methods
  updatePresence: (presence: Partial<UserPresence>) => void;
  updateCursor: (x: number, y: number, elementId?: string) => void;
  updateSelection: (elementId: string, range?: { start: number; end: number }) => void;
  
  // Operation methods
  broadcastOperation: (operation: Omit<Operation, 'id' | 'userId' | 'timestamp' | 'roomId' | 'applied'>) => void;
  applyOperation: (operation: Operation) => void;
  
  // Chat methods
  sendChatMessage: (message: string) => void;
  sendDirectMessage: (targetUserId: string, message: string) => void;
  
  // Comment methods
  addComment: (elementId: string, content: string, position: { x: number; y: number }) => void;
  resolveComment: (commentId: string) => void;
  replyToComment: (commentId: string, content: string) => void;
  deleteComment: (commentId: string) => void;
  
  // Utility methods
  getUserById: (userId: string) => UserPresence | null;
  isUserOnline: (userId: string) => boolean;
  getRoomUserCount: () => number;
}

type CollaborationAction =
  | { type: 'SET_CONNECTION_STATE'; payload: ConnectionState }
  | { type: 'SET_CURRENT_USER'; payload: UserPresence | null }
  | { type: 'SET_CURRENT_ROOM'; payload: string | null }
  | { type: 'SET_ROOM_USERS'; payload: UserPresence[] }
  | { type: 'ADD_USER'; payload: UserPresence }
  | { type: 'REMOVE_USER'; payload: string }
  | { type: 'UPDATE_USER_PRESENCE'; payload: UserPresence }
  | { type: 'ADD_OPERATION'; payload: Operation }
  | { type: 'APPLY_OPERATION'; payload: string }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'ADD_COMMENT'; payload: Comment }
  | { type: 'UPDATE_COMMENT'; payload: Comment }
  | { type: 'DELETE_COMMENT'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_RECONNECTING'; payload: boolean }
  | { type: 'RESET' };

const initialState: CollaborationState = {
  isConnected: false,
  connectionState: 'disconnected',
  currentRoom: null,
  currentUser: null,
  roomUsers: [],
  operations: [],
  chatMessages: [],
  comments: [],
  isReconnecting: false,
  error: null,
};

function collaborationReducer(state: CollaborationState, action: CollaborationAction): CollaborationState {
  switch (action.type) {
    case 'SET_CONNECTION_STATE':
      return {
        ...state,
        connectionState: action.payload,
        isConnected: action.payload === 'connected',
        isReconnecting: action.payload === 'reconnecting',
      };

    case 'SET_CURRENT_USER':
      return {
        ...state,
        currentUser: action.payload,
      };

    case 'SET_CURRENT_ROOM':
      return {
        ...state,
        currentRoom: action.payload,
      };

    case 'SET_ROOM_USERS':
      return {
        ...state,
        roomUsers: action.payload,
      };

    case 'ADD_USER':
      return {
        ...state,
        roomUsers: [...state.roomUsers.filter(u => u.userId !== action.payload.userId), action.payload],
      };

    case 'REMOVE_USER':
      return {
        ...state,
        roomUsers: state.roomUsers.filter(u => u.userId !== action.payload),
      };

    case 'UPDATE_USER_PRESENCE':
      return {
        ...state,
        roomUsers: state.roomUsers.map(u => 
          u.userId === action.payload.userId ? { ...u, ...action.payload } : u
        ),
      };

    case 'ADD_OPERATION':
      return {
        ...state,
        operations: [...state.operations, action.payload].slice(-100), // Keep last 100 operations
      };

    case 'APPLY_OPERATION':
      return {
        ...state,
        operations: state.operations.map(op => 
          op.id === action.payload ? { ...op, applied: true } : op
        ),
      };

    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.payload].slice(-200), // Keep last 200 messages
      };

    case 'ADD_COMMENT':
      return {
        ...state,
        comments: [...state.comments, action.payload],
      };

    case 'UPDATE_COMMENT':
      return {
        ...state,
        comments: state.comments.map(c => 
          c.id === action.payload.id ? action.payload : c
        ),
      };

    case 'DELETE_COMMENT':
      return {
        ...state,
        comments: state.comments.filter(c => c.id !== action.payload),
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'SET_RECONNECTING':
      return {
        ...state,
        isReconnecting: action.payload,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export interface CollaborationProviderProps {
  children: ReactNode;
  userId: string;
  username: string;
  avatar?: string;
  wsUrl: string;
  authToken?: string;
}

export function CollaborationProvider({
  children,
  userId,
  username,
  avatar,
  wsUrl,
  authToken,
}: CollaborationProviderProps) {
  const [state, dispatch] = useReducer(collaborationReducer, initialState);

  // Initialize current user
  useEffect(() => {
    const currentUser: UserPresence = {
      userId,
      username,
      avatar,
      status: 'online',
      joinedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };
    dispatch({ type: 'SET_CURRENT_USER', payload: currentUser });
  }, [userId, username, avatar]);

  // Initialize WebSocket connection
  useEffect(() => {
    const wsClient = WebSocketManager.initialize({
      url: wsUrl,
      token: authToken,
      userId,
    });

    // Connection state changes
    wsClient.on('stateChange', (connectionState: ConnectionState) => {
      dispatch({ type: 'SET_CONNECTION_STATE', payload: connectionState });
    });

    // User events
    wsClient.on('userJoined', (user: UserPresence) => {
      dispatch({ type: 'ADD_USER', payload: user });
    });

    wsClient.on('userLeft', (data: { userId: string }) => {
      dispatch({ type: 'REMOVE_USER', payload: data.userId });
    });

    wsClient.on('presenceUpdate', (presence: UserPresence) => {
      dispatch({ type: 'UPDATE_USER_PRESENCE', payload: presence });
    });

    // Operation events
    wsClient.on('operation', (operation: Operation) => {
      dispatch({ type: 'ADD_OPERATION', payload: operation });
    });

    // Chat events
    wsClient.on('chatMessage', (message: ChatMessage) => {
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: message });
    });

    // Error handling
    wsClient.on('error', (error: Error) => {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    });

    return () => {
      wsClient.removeAllListeners();
      WebSocketManager.disconnect();
    };
  }, [wsUrl, authToken, userId]);

  // Connection methods
  const connect = useCallback(async (roomId: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const wsClient = WebSocketManager.getInstance();
      if (!wsClient) throw new Error('WebSocket client not initialized');
      
      wsClient.setCurrentRoom(roomId);
      await wsClient.connect();
      dispatch({ type: 'SET_CURRENT_ROOM', payload: roomId });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    WebSocketManager.disconnect();
    dispatch({ type: 'RESET' });
  }, []);

  const joinRoom = useCallback(async (roomId: string) => {
    try {
      const wsClient = WebSocketManager.getInstance();
      if (!wsClient) throw new Error('WebSocket client not initialized');
      
      await wsClient.joinRoom(roomId);
      const users = await wsClient.getRoomUsers(roomId);
      
      dispatch({ type: 'SET_CURRENT_ROOM', payload: roomId });
      dispatch({ type: 'SET_ROOM_USERS', payload: users });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      throw error;
    }
  }, []);

  const leaveRoom = useCallback(async () => {
    try {
      const wsClient = WebSocketManager.getInstance();
      if (!wsClient || !state.currentRoom) return;
      
      await wsClient.leaveRoom(state.currentRoom);
      dispatch({ type: 'SET_CURRENT_ROOM', payload: null });
      dispatch({ type: 'SET_ROOM_USERS', payload: [] });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    }
  }, [state.currentRoom]);

  // Presence methods
  const updatePresence = useCallback((presence: Partial<UserPresence>) => {
    const wsClient = WebSocketManager.getInstance();
    if (!wsClient) return;
    
    wsClient.updatePresence(presence);
    
    if (state.currentUser) {
      const updatedUser = { ...state.currentUser, ...presence, lastActivity: new Date().toISOString() };
      dispatch({ type: 'SET_CURRENT_USER', payload: updatedUser });
    }
  }, [state.currentUser]);

  const updateCursor = useCallback((x: number, y: number, elementId?: string) => {
    updatePresence({ cursor: { x, y, elementId } });
  }, [updatePresence]);

  const updateSelection = useCallback((elementId: string, range?: { start: number; end: number }) => {
    updatePresence({ selection: { elementId, range } });
  }, [updatePresence]);

  // Operation methods
  const broadcastOperation = useCallback((operation: Omit<Operation, 'id' | 'userId' | 'timestamp' | 'roomId' | 'applied'>) => {
    const wsClient = WebSocketManager.getInstance();
    if (!wsClient || !state.currentRoom) return;
    
    const fullOperation: Operation = {
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      timestamp: Date.now(),
      roomId: state.currentRoom,
      applied: false,
    };
    
    wsClient.broadcastOperation(fullOperation);
    dispatch({ type: 'ADD_OPERATION', payload: fullOperation });
  }, [state.currentRoom, userId]);

  const applyOperation = useCallback((operation: Operation) => {
    dispatch({ type: 'APPLY_OPERATION', payload: operation.id });
  }, []);

  // Chat methods
  const sendChatMessage = useCallback((message: string) => {
    const wsClient = WebSocketManager.getInstance();
    if (!wsClient || !state.currentRoom || !state.currentUser) return;
    
    const chatMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      username: state.currentUser.username,
      avatar: state.currentUser.avatar,
      message,
      timestamp: Date.now(),
      roomId: state.currentRoom,
      type: 'text',
    };
    
    wsClient.send('chat_message', chatMessage);
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: chatMessage });
  }, [state.currentRoom, state.currentUser, userId]);

  const sendDirectMessage = useCallback((targetUserId: string, message: string) => {
    const wsClient = WebSocketManager.getInstance();
    if (!wsClient) return;
    
    wsClient.sendDirectMessage(targetUserId, message);
  }, []);

  // Comment methods
  const addComment = useCallback((elementId: string, content: string, position: { x: number; y: number }) => {
    const wsClient = WebSocketManager.getInstance();
    if (!wsClient || !state.currentRoom || !state.currentUser) return;
    
    const comment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      username: state.currentUser.username,
      avatar: state.currentUser.avatar,
      content,
      elementId,
      position,
      timestamp: Date.now(),
      roomId: state.currentRoom,
      resolved: false,
      replies: [],
    };
    
    wsClient.send('add_comment', comment);
    dispatch({ type: 'ADD_COMMENT', payload: comment });
  }, [state.currentRoom, state.currentUser, userId]);

  const resolveComment = useCallback((commentId: string) => {
    const wsClient = WebSocketManager.getInstance();
    if (!wsClient) return;
    
    wsClient.send('resolve_comment', { commentId });
    
    const comment = state.comments.find(c => c.id === commentId);
    if (comment) {
      dispatch({ type: 'UPDATE_COMMENT', payload: { ...comment, resolved: true } });
    }
  }, [state.comments]);

  const replyToComment = useCallback((commentId: string, content: string) => {
    const wsClient = WebSocketManager.getInstance();
    if (!wsClient || !state.currentUser) return;
    
    const reply: CommentReply = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      username: state.currentUser.username,
      avatar: state.currentUser.avatar,
      content,
      timestamp: Date.now(),
    };
    
    wsClient.send('reply_comment', { commentId, reply });
    
    const comment = state.comments.find(c => c.id === commentId);
    if (comment) {
      dispatch({ 
        type: 'UPDATE_COMMENT', 
        payload: { 
          ...comment, 
          replies: [...comment.replies, reply] 
        } 
      });
    }
  }, [state.comments, state.currentUser, userId]);

  const deleteComment = useCallback((commentId: string) => {
    const wsClient = WebSocketManager.getInstance();
    if (!wsClient) return;
    
    wsClient.send('delete_comment', { commentId });
    dispatch({ type: 'DELETE_COMMENT', payload: commentId });
  }, []);

  // Utility methods
  const getUserById = useCallback((userId: string) => {
    return state.roomUsers.find(u => u.userId === userId) || null;
  }, [state.roomUsers]);

  const isUserOnline = useCallback((userId: string) => {
    const user = getUserById(userId);
    return user?.status === 'online';
  }, [getUserById]);

  const getRoomUserCount = useCallback(() => {
    return state.roomUsers.length;
  }, [state.roomUsers]);

  const contextValue: CollaborationContextType = {
    state,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    updatePresence,
    updateCursor,
    updateSelection,
    broadcastOperation,
    applyOperation,
    sendChatMessage,
    sendDirectMessage,
    addComment,
    resolveComment,
    replyToComment,
    deleteComment,
    getUserById,
    isUserOnline,
    getRoomUserCount,
  };

  return (
    <CollaborationContext.Provider value={contextValue}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
}