import httpClient from './httpClient';
import { API_CONFIG, buildUrl } from './apiConfig';

// 管理员统计数据
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTeams: number;
  totalProjects: number;
  systemLoad: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: string;
}

// 系统警告
export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  actions?: {
    label: string;
    action: string;
  }[];
}

// 用户管理相关类型
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  status: 'active' | 'inactive' | 'banned' | 'pending';
  role: 'admin' | 'user' | 'maintainer' | 'viewer';
  avatar?: string;
  createdAt: string;
  lastLoginAt?: string;
  teamCount: number;
  projectCount: number;
  permissions: string[];
}

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: string;
  permissions: string[];
  sendWelcomeEmail?: boolean;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  status?: string;
  role?: string;
  permissions?: string[];
}

export interface BulkUserOperation {
  userIds: string[];
  operation: 'activate' | 'deactivate' | 'ban' | 'delete' | 'changeRole';
  data?: any;
}

// 团队管理相关类型
export interface AdminTeam {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  projectCount: number;
  createdAt: string;
  owner: {
    id: string;
    username: string;
    email: string;
  };
  status: 'active' | 'archived';
}

export interface TeamListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TeamListResponse {
  teams: AdminTeam[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 系统设置相关类型
export interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    contactEmail: string;
    supportUrl: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
  authentication: {
    enableRegistration: boolean;
    enableEmailVerification: boolean;
    enableTwoFactor: boolean;
    passwordMinLength: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
  email: {
    provider: string;
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromAddress: string;
    fromName: string;
  };
  storage: {
    provider: string;
    maxFileSize: number;
    allowedFileTypes: string[];
    storageQuota: number;
  };
  collaboration: {
    enableRealTimeCollaboration: boolean;
    maxCollaborators: number;
    enableComments: boolean;
    enableVersionControl: boolean;
  };
  security: {
    enableAuditLog: boolean;
    enableIpWhitelist: boolean;
    ipWhitelist: string[];
    enableSessionSecurity: boolean;
    enablePasswordPolicy: boolean;
  };
}

// 审计日志相关类型
export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure';
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuditLogParams {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  resource?: string;
  status?: 'success' | 'failure';
  severity?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 系统健康检查相关类型
export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'maintenance';
  responseTime: number;
  lastCheck: string;
  description: string;
  uptime: number;
}

export interface HealthCheck {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface SystemHealth {
  overallStatus: 'healthy' | 'warning' | 'critical';
  services: ServiceStatus[];
  healthChecks: HealthCheck[];
  systemMetrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
}

// 权限相关类型
export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  level: 'read' | 'write' | 'admin';
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
}

export interface PermissionMatrix {
  permissions: Permission[];
  roles: Role[];
  matrix: Record<string, string[]>;
}

// Admin API 服务类
class AdminApiService {
  // 获取管理员统计数据
  async getAdminStats(): Promise<AdminStats> {
    const response = await httpClient.get<AdminStats>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/stats')
    );
    return response.data;
  }

  // 获取系统警告
  async getSystemAlerts(): Promise<SystemAlert[]> {
    const response = await httpClient.get<SystemAlert[]>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/alerts')
    );
    return response.data;
  }

  // 解决系统警告
  async resolveAlert(alertId: string): Promise<void> {
    await httpClient.patch(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/alerts/:id/resolve', { id: alertId })
    );
  }

  // 获取最近活动
  async getRecentActivities(limit: number = 10): Promise<any[]> {
    const response = await httpClient.get<any[]>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/activities'),
      { params: { limit } }
    );
    return response.data;
  }

  // 用户管理
  async getUserList(params: UserListParams = {}): Promise<UserListResponse> {
    const response = await httpClient.get<UserListResponse>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.USERS),
      { params }
    );
    return response.data;
  }

  async getUser(userId: string): Promise<AdminUser> {
    const response = await httpClient.get<AdminUser>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.USERS + '/:id', { id: userId })
    );
    return response.data;
  }

  async createUser(userData: CreateUserRequest): Promise<AdminUser> {
    const response = await httpClient.post<AdminUser>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.USERS),
      userData
    );
    return response.data;
  }

  async updateUser(userId: string, userData: UpdateUserRequest): Promise<AdminUser> {
    const response = await httpClient.put<AdminUser>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.USERS + '/:id', { id: userId }),
      userData
    );
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await httpClient.delete(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.USERS + '/:id', { id: userId })
    );
  }

  async bulkUserOperation(operation: BulkUserOperation): Promise<void> {
    await httpClient.post(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.USERS + '/bulk'),
      operation
    );
  }

  // 团队管理
  async getTeamList(params: TeamListParams = {}): Promise<TeamListResponse> {
    const response = await httpClient.get<TeamListResponse>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.TEAMS),
      { params }
    );
    return response.data;
  }

  async getTeam(teamId: string): Promise<AdminTeam> {
    const response = await httpClient.get<AdminTeam>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.TEAMS + '/:id', { id: teamId })
    );
    return response.data;
  }

  async deleteTeam(teamId: string): Promise<void> {
    await httpClient.delete(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.TEAMS + '/:id', { id: teamId })
    );
  }

  // 系统设置
  async getSystemSettings(): Promise<SystemSettings> {
    const response = await httpClient.get<SystemSettings>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SETTINGS)
    );
    return response.data;
  }

  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const response = await httpClient.put<SystemSettings>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SETTINGS),
      settings
    );
    return response.data;
  }

  async testEmailSettings(emailSettings: any): Promise<{ success: boolean; message: string }> {
    const response = await httpClient.post<{ success: boolean; message: string }>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SETTINGS + '/test-email'),
      emailSettings
    );
    return response.data;
  }

  // 审计日志
  async getAuditLogs(params: AuditLogParams = {}): Promise<AuditLogResponse> {
    const response = await httpClient.get<AuditLogResponse>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.AUDIT_LOGS),
      { params }
    );
    return response.data;
  }

  async exportAuditLogs(params: AuditLogParams = {}): Promise<void> {
    await httpClient.download(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.AUDIT_LOGS + '/export'),
      'audit_logs.csv',
      { params }
    );
  }

  // 系统健康
  async getSystemHealth(): Promise<SystemHealth> {
    const response = await httpClient.get<SystemHealth>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/health')
    );
    return response.data;
  }

  async refreshSystemHealth(): Promise<SystemHealth> {
    const response = await httpClient.post<SystemHealth>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/health/refresh')
    );
    return response.data;
  }

  // 权限管理
  async getPermissionMatrix(): Promise<PermissionMatrix> {
    const response = await httpClient.get<PermissionMatrix>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/permissions')
    );
    return response.data;
  }

  async updateUserPermissions(userId: string, permissions: string[]): Promise<void> {
    await httpClient.put(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.USERS + '/:id/permissions', { id: userId }),
      { permissions }
    );
  }

  async createRole(roleData: { name: string; description: string; permissions: string[] }): Promise<Role> {
    const response = await httpClient.post<Role>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/roles'),
      roleData
    );
    return response.data;
  }

  async updateRole(roleId: string, roleData: Partial<Role>): Promise<Role> {
    const response = await httpClient.put<Role>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/roles/:id', { id: roleId }),
      roleData
    );
    return response.data;
  }

  async deleteRole(roleId: string): Promise<void> {
    await httpClient.delete(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/roles/:id', { id: roleId })
    );
  }

  // 系统维护
  async enableMaintenanceMode(message: string): Promise<void> {
    await httpClient.post(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/maintenance'),
      { enabled: true, message }
    );
  }

  async disableMaintenanceMode(): Promise<void> {
    await httpClient.post(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/maintenance'),
      { enabled: false }
    );
  }

  // 系统备份
  async createBackup(): Promise<{ backupId: string; message: string }> {
    const response = await httpClient.post<{ backupId: string; message: string }>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/backup')
    );
    return response.data;
  }

  async getBackupList(): Promise<any[]> {
    const response = await httpClient.get<any[]>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/backups')
    );
    return response.data;
  }

  async restoreBackup(backupId: string): Promise<{ success: boolean; message: string }> {
    const response = await httpClient.post<{ success: boolean; message: string }>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/backup/:id/restore', { id: backupId })
    );
    return response.data;
  }

  // 缓存管理
  async clearCache(cacheType?: string): Promise<{ success: boolean; message: string }> {
    const response = await httpClient.post<{ success: boolean; message: string }>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/cache/clear'),
      { type: cacheType }
    );
    return response.data;
  }

  // 数据统计
  async getDetailedStats(period: 'day' | 'week' | 'month' | 'year' = 'week'): Promise<any> {
    const response = await httpClient.get(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/stats/detailed'),
      { params: { period } }
    );
    return response.data;
  }

  // 系统日志
  async getSystemLogs(params: {
    level?: string;
    module?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<any> {
    const response = await httpClient.get(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/logs'),
      { params }
    );
    return response.data;
  }

  // 发送系统通知
  async sendSystemNotification(notification: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error';
    targetUsers?: string[];
    targetRoles?: string[];
  }): Promise<{ success: boolean; sentCount: number }> {
    const response = await httpClient.post<{ success: boolean; sentCount: number }>(
      buildUrl(API_CONFIG.ENDPOINTS.ADMIN.SYSTEM + '/notifications'),
      notification
    );
    return response.data;
  }
}

// 创建并导出服务实例
export const adminApi = new AdminApiService();
export default adminApi;