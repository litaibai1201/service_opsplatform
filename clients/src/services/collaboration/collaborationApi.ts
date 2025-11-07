// Collaboration API services
import { apiRequest } from '../api';
import { Operation } from './OperationalTransform';
import { UserPresence } from './WebSocketClient';

export interface Room {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  type: 'project' | 'team' | 'document' | 'design';
  participants: RoomParticipant[];
  settings: RoomSettings;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface RoomParticipant {
  userId: string;
  username: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  permissions: string[];
  joinedAt: string;
  lastActivity: string;
  isOnline: boolean;
}

export interface RoomSettings {
  isPublic: boolean;
  allowGuests: boolean;
  maxParticipants: number;
  enableChat: boolean;
  enableComments: boolean;
  enableVoice: boolean;
  enableVideo: boolean;
  autoSave: boolean;
  versionHistory: boolean;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  userJoined: boolean;
  userLeft: boolean;
  newComment: boolean;
  mentionReceived: boolean;
  documentChanged: boolean;
  conflictDetected: boolean;
}

export interface CreateRoomRequest {
  name: string;
  description?: string;
  type: Room['type'];
  settings?: Partial<RoomSettings>;
  metadata?: Record<string, any>;
}

export interface UpdateRoomRequest {
  name?: string;
  description?: string;
  settings?: Partial<RoomSettings>;
  metadata?: Record<string, any>;
}

export interface InviteRequest {
  roomId: string;
  userIds?: string[];
  emails?: string[];
  role: RoomParticipant['role'];
  message?: string;
}

export interface InviteResponse {
  id: string;
  roomId: string;
  inviterId: string;
  inviteeId?: string;
  email?: string;
  role: RoomParticipant['role'];
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  operations: Operation[];
  authorId: string;
  authorName: string;
  createdAt: string;
  description?: string;
  tags?: string[];
}

export interface CreateVersionRequest {
  documentId: string;
  content: string;
  operations: Operation[];
  description?: string;
  tags?: string[];
}

export interface PermissionCheck {
  action: string;
  resource: string;
  resourceId: string;
  allowed: boolean;
  reason?: string;
}

export interface ActivityLog {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  action: string;
  target: string;
  targetId: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CollaborationStats {
  roomId: string;
  totalParticipants: number;
  activeParticipants: number;
  totalOperations: number;
  operationsPerHour: number;
  totalComments: number;
  unresolvedComments: number;
  totalChatMessages: number;
  lastActivity: string;
  peakConcurrency: number;
  averageSessionDuration: number;
}

export interface SyncStatus {
  documentId: string;
  clientVersion: number;
  serverVersion: number;
  pendingOperations: number;
  lastSyncTime: string;
  syncState: 'synced' | 'syncing' | 'conflict' | 'error';
  conflictCount: number;
}

// 房间管理 API
export const roomApi = {
  // 获取房间列表
  getRooms: async (params?: {
    type?: Room['type'];
    userId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ rooms: Room[]; total: number; page: number; limit: number }> => {
    return apiRequest('/api/collaboration/rooms', {
      method: 'GET',
      params,
    });
  },

  // 获取房间详情
  getRoom: async (roomId: string): Promise<Room> => {
    return apiRequest(`/api/collaboration/rooms/${roomId}`, {
      method: 'GET',
    });
  },

  // 创建房间
  createRoom: async (data: CreateRoomRequest): Promise<Room> => {
    return apiRequest('/api/collaboration/rooms', {
      method: 'POST',
      data,
    });
  },

  // 更新房间
  updateRoom: async (roomId: string, data: UpdateRoomRequest): Promise<Room> => {
    return apiRequest(`/api/collaboration/rooms/${roomId}`, {
      method: 'PUT',
      data,
    });
  },

  // 删除房间
  deleteRoom: async (roomId: string): Promise<void> => {
    return apiRequest(`/api/collaboration/rooms/${roomId}`, {
      method: 'DELETE',
    });
  },

  // 加入房间
  joinRoom: async (roomId: string, password?: string): Promise<RoomParticipant> => {
    return apiRequest(`/api/collaboration/rooms/${roomId}/join`, {
      method: 'POST',
      data: { password },
    });
  },

  // 离开房间
  leaveRoom: async (roomId: string): Promise<void> => {
    return apiRequest(`/api/collaboration/rooms/${roomId}/leave`, {
      method: 'POST',
    });
  },

  // 获取房间参与者
  getParticipants: async (roomId: string): Promise<RoomParticipant[]> => {
    return apiRequest(`/api/collaboration/rooms/${roomId}/participants`, {
      method: 'GET',
    });
  },

  // 邀请用户
  inviteUsers: async (data: InviteRequest): Promise<InviteResponse[]> => {
    return apiRequest('/api/collaboration/invites', {
      method: 'POST',
      data,
    });
  },

  // 处理邀请
  handleInvite: async (inviteId: string, action: 'accept' | 'reject'): Promise<void> => {
    return apiRequest(`/api/collaboration/invites/${inviteId}/${action}`, {
      method: 'POST',
    });
  },

  // 更新参与者角色
  updateParticipantRole: async (
    roomId: string, 
    userId: string, 
    role: RoomParticipant['role']
  ): Promise<RoomParticipant> => {
    return apiRequest(`/api/collaboration/rooms/${roomId}/participants/${userId}`, {
      method: 'PUT',
      data: { role },
    });
  },

  // 移除参与者
  removeParticipant: async (roomId: string, userId: string): Promise<void> => {
    return apiRequest(`/api/collaboration/rooms/${roomId}/participants/${userId}`, {
      method: 'DELETE',
    });
  },
};

// 文档版本控制 API
export const versionApi = {
  // 获取文档版本列表
  getVersions: async (
    documentId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ versions: DocumentVersion[]; total: number }> => {
    return apiRequest(`/api/collaboration/documents/${documentId}/versions`, {
      method: 'GET',
      params,
    });
  },

  // 获取特定版本
  getVersion: async (documentId: string, versionId: string): Promise<DocumentVersion> => {
    return apiRequest(`/api/collaboration/documents/${documentId}/versions/${versionId}`, {
      method: 'GET',
    });
  },

  // 创建新版本
  createVersion: async (data: CreateVersionRequest): Promise<DocumentVersion> => {
    return apiRequest('/api/collaboration/versions', {
      method: 'POST',
      data,
    });
  },

  // 比较版本
  compareVersions: async (
    documentId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<{
    from: DocumentVersion;
    to: DocumentVersion;
    diff: any;
    conflicts: any[];
  }> => {
    return apiRequest(`/api/collaboration/documents/${documentId}/versions/compare`, {
      method: 'POST',
      data: { fromVersion, toVersion },
    });
  },

  // 恢复到指定版本
  restoreVersion: async (documentId: string, versionId: string): Promise<DocumentVersion> => {
    return apiRequest(`/api/collaboration/documents/${documentId}/versions/${versionId}/restore`, {
      method: 'POST',
    });
  },

  // 删除版本
  deleteVersion: async (documentId: string, versionId: string): Promise<void> => {
    return apiRequest(`/api/collaboration/documents/${documentId}/versions/${versionId}`, {
      method: 'DELETE',
    });
  },
};

// 权限管理 API
export const permissionApi = {
  // 检查权限
  checkPermissions: async (checks: Omit<PermissionCheck, 'allowed' | 'reason'>[]): Promise<PermissionCheck[]> => {
    return apiRequest('/api/collaboration/permissions/check', {
      method: 'POST',
      data: { checks },
    });
  },

  // 获取用户权限
  getUserPermissions: async (userId: string, roomId: string): Promise<string[]> => {
    return apiRequest(`/api/collaboration/users/${userId}/permissions`, {
      method: 'GET',
      params: { roomId },
    });
  },

  // 更新用户权限
  updateUserPermissions: async (
    userId: string,
    roomId: string,
    permissions: string[]
  ): Promise<void> => {
    return apiRequest(`/api/collaboration/users/${userId}/permissions`, {
      method: 'PUT',
      data: { roomId, permissions },
    });
  },

  // 获取角色权限
  getRolePermissions: async (role: RoomParticipant['role']): Promise<string[]> => {
    return apiRequest(`/api/collaboration/roles/${role}/permissions`, {
      method: 'GET',
    });
  },
};

// 活动日志 API
export const activityApi = {
  // 获取活动日志
  getActivities: async (
    roomId: string,
    params?: {
      userId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ activities: ActivityLog[]; total: number }> => {
    return apiRequest(`/api/collaboration/rooms/${roomId}/activities`, {
      method: 'GET',
      params,
    });
  },

  // 记录活动
  logActivity: async (
    roomId: string,
    activity: Omit<ActivityLog, 'id' | 'roomId' | 'timestamp' | 'ipAddress' | 'userAgent'>
  ): Promise<ActivityLog> => {
    return apiRequest(`/api/collaboration/rooms/${roomId}/activities`, {
      method: 'POST',
      data: activity,
    });
  },

  // 获取用户活动统计
  getUserActivityStats: async (
    userId: string,
    params?: { roomId?: string; period?: '1d' | '7d' | '30d' | '90d' }
  ): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    activeRooms: number;
    averageSessionDuration: number;
  }> => {
    return apiRequest(`/api/collaboration/users/${userId}/activity-stats`, {
      method: 'GET',
      params,
    });
  },
};

// 协作统计 API
export const statsApi = {
  // 获取房间统计
  getRoomStats: async (roomId: string): Promise<CollaborationStats> => {
    return apiRequest(`/api/collaboration/rooms/${roomId}/stats`, {
      method: 'GET',
    });
  },

  // 获取平台统计
  getPlatformStats: async (params?: {
    period?: '1d' | '7d' | '30d' | '90d';
  }): Promise<{
    totalRooms: number;
    activeRooms: number;
    totalUsers: number;
    activeUsers: number;
    totalOperations: number;
    operationsPerSecond: number;
    averageConcurrency: number;
    peakConcurrency: number;
  }> => {
    return apiRequest('/api/collaboration/stats', {
      method: 'GET',
      params,
    });
  },

  // 获取实时统计
  getRealTimeStats: async (roomId: string): Promise<{
    onlineUsers: number;
    activeOperations: number;
    pendingOperations: number;
    syncLatency: number;
    serverLoad: number;
  }> => {
    return apiRequest(`/api/collaboration/rooms/${roomId}/realtime-stats`, {
      method: 'GET',
    });
  },
};

// 同步状态 API
export const syncApi = {
  // 获取同步状态
  getSyncStatus: async (documentId: string): Promise<SyncStatus> => {
    return apiRequest(`/api/collaboration/documents/${documentId}/sync-status`, {
      method: 'GET',
    });
  },

  // 强制同步
  forceSync: async (documentId: string): Promise<SyncStatus> => {
    return apiRequest(`/api/collaboration/documents/${documentId}/force-sync`, {
      method: 'POST',
    });
  },

  // 解决同步冲突
  resolveConflicts: async (
    documentId: string,
    conflicts: Array<{
      operationId: string;
      resolution: 'accept' | 'reject' | 'merge';
      mergedOperation?: Operation;
    }>
  ): Promise<SyncStatus> => {
    return apiRequest(`/api/collaboration/documents/${documentId}/resolve-conflicts`, {
      method: 'POST',
      data: { conflicts },
    });
  },

  // 重置文档状态
  resetDocument: async (
    documentId: string,
    toVersion?: number
  ): Promise<SyncStatus> => {
    return apiRequest(`/api/collaboration/documents/${documentId}/reset`, {
      method: 'POST',
      data: { toVersion },
    });
  },
};

// 在线状态 API
export const presenceApi = {
  // 更新在线状态
  updatePresence: async (
    roomId: string,
    presence: Partial<UserPresence>
  ): Promise<void> => {
    return apiRequest(`/api/collaboration/rooms/${roomId}/presence`, {
      method: 'PUT',
      data: presence,
    });
  },

  // 获取房间在线用户
  getRoomPresence: async (roomId: string): Promise<UserPresence[]> => {
    return apiRequest(`/api/collaboration/rooms/${roomId}/presence`, {
      method: 'GET',
    });
  },

  // 获取用户在线状态
  getUserPresence: async (userId: string): Promise<UserPresence | null> => {
    return apiRequest(`/api/collaboration/users/${userId}/presence`, {
      method: 'GET',
    });
  },

  // 批量获取用户在线状态
  getBatchPresence: async (userIds: string[]): Promise<Record<string, UserPresence | null>> => {
    return apiRequest('/api/collaboration/presence/batch', {
      method: 'POST',
      data: { userIds },
    });
  },
};

// 导出所有 API
export const collaborationApi = {
  room: roomApi,
  version: versionApi,
  permission: permissionApi,
  activity: activityApi,
  stats: statsApi,
  sync: syncApi,
  presence: presenceApi,
};