// API 配置
export const API_CONFIG = {
  // 基础 URL
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  
  // WebSocket URL
  WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8001',
  
  // 超时配置
  TIMEOUT: 10000, // 10秒
  
  // 重试配置
  RETRY: {
    times: 3,
    delay: 1000, // 1秒
  },
  
  // 认证相关
  AUTH: {
    TOKEN_KEY: 'auth_token',
    REFRESH_TOKEN_KEY: 'refresh_token',
    TOKEN_HEADER: 'Authorization',
    TOKEN_PREFIX: 'Bearer ',
  },
  
  // API 端点
  ENDPOINTS: {
    // 认证相关
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
      PROFILE: '/auth/profile',
      FORGOT_PASSWORD: '/auth/forgot-password',
      RESET_PASSWORD: '/auth/reset-password',
      VERIFY_EMAIL: '/auth/verify-email',
      RESEND_VERIFICATION: '/auth/resend-verification',
      CHANGE_PASSWORD: '/auth/change-password',
    },
    
    // 用户相关
    USERS: {
      LIST: '/users',
      DETAIL: '/users/:id',
      UPDATE: '/users/:id',
      DELETE: '/users/:id',
      AVATAR: '/users/:id/avatar',
    },
    
    // 团队相关
    TEAMS: {
      LIST: '/teams',
      CREATE: '/teams',
      DETAIL: '/teams/:id',
      UPDATE: '/teams/:id',
      DELETE: '/teams/:id',
      MEMBERS: '/teams/:id/members',
      INVITATIONS: '/teams/:id/invitations',
      INVITE: '/teams/:id/invite',
      JOIN: '/teams/:id/join',
      LEAVE: '/teams/:id/leave',
      STATS: '/teams/:id/stats',
    },
    
    // 项目相关
    PROJECTS: {
      LIST: '/projects',
      CREATE: '/projects',
      DETAIL: '/projects/:id',
      UPDATE: '/projects/:id',
      DELETE: '/projects/:id',
      MAINTAINERS: '/projects/:id/maintainers',
      TEMPLATES: '/project-templates',
      TAGS: '/project-tags',
    },
    
    // 设计工具相关
    DESIGN: {
      // 架构设计
      ARCHITECTURE: {
        LIST: '/projects/:projectId/architecture',
        CREATE: '/projects/:projectId/architecture',
        DETAIL: '/projects/:projectId/architecture/:id',
        UPDATE: '/projects/:projectId/architecture/:id',
        DELETE: '/projects/:projectId/architecture/:id',
      },
      
      // 流程图设计
      FLOW_DIAGRAM: {
        LIST: '/projects/:projectId/flow-diagrams',
        CREATE: '/projects/:projectId/flow-diagrams',
        DETAIL: '/projects/:projectId/flow-diagrams/:id',
        UPDATE: '/projects/:projectId/flow-diagrams/:id',
        DELETE: '/projects/:projectId/flow-diagrams/:id',
      },
      
      // API 设计
      API_DESIGN: {
        LIST: '/projects/:projectId/api-designs',
        CREATE: '/projects/:projectId/api-designs',
        DETAIL: '/projects/:projectId/api-designs/:id',
        UPDATE: '/projects/:projectId/api-designs/:id',
        DELETE: '/projects/:projectId/api-designs/:id',
        MOCK: '/projects/:projectId/api-designs/:id/mock',
      },
      
      // 数据库设计
      DATABASE: {
        LIST: '/projects/:projectId/database-designs',
        CREATE: '/projects/:projectId/database-designs',
        DETAIL: '/projects/:projectId/database-designs/:id',
        UPDATE: '/projects/:projectId/database-designs/:id',
        DELETE: '/projects/:projectId/database-designs/:id',
        GENERATE_SQL: '/projects/:projectId/database-designs/:id/sql',
      },
      
      // 功能导图
      FEATURE_MAP: {
        LIST: '/projects/:projectId/feature-maps',
        CREATE: '/projects/:projectId/feature-maps',
        DETAIL: '/projects/:projectId/feature-maps/:id',
        UPDATE: '/projects/:projectId/feature-maps/:id',
        DELETE: '/projects/:projectId/feature-maps/:id',
      },
    },
    
    // 协作相关
    COLLABORATION: {
      ROOMS: '/collaboration/rooms',
      JOIN: '/collaboration/rooms/:id/join',
      LEAVE: '/collaboration/rooms/:id/leave',
      COMMENTS: '/collaboration/comments',
      PRESENCE: '/collaboration/presence',
    },
    
    // 文件相关
    FILES: {
      UPLOAD: '/files/upload',
      DOWNLOAD: '/files/:id/download',
      DELETE: '/files/:id',
    },
    
    // 通知相关
    NOTIFICATIONS: {
      LIST: '/notifications',
      MARK_READ: '/notifications/:id/read',
      MARK_ALL_READ: '/notifications/read-all',
      SETTINGS: '/notifications/settings',
    },
    
    // 仪表板相关
    DASHBOARD: {
      STATS: '/dashboard/stats',
      ACTIVITIES: '/dashboard/activities',
      RECENT_PROJECTS: '/dashboard/recent-projects',
      CHARTS: '/dashboard/charts',
    },
    
    // 管理员相关
    ADMIN: {
      USERS: '/admin/users',
      TEAMS: '/admin/teams',
      PROJECTS: '/admin/projects',
      SYSTEM: '/admin/system',
      AUDIT_LOGS: '/admin/audit-logs',
      SETTINGS: '/admin/settings',
    },
  },
};

// URL 参数替换辅助函数
export const buildUrl = (endpoint: string, params?: Record<string, string | number>): string => {
  let url = endpoint;
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, String(value));
    });
  }
  
  return url;
};

// 获取完整 URL
export const getFullUrl = (endpoint: string, params?: Record<string, string | number>): string => {
  const url = buildUrl(endpoint, params);
  return `${API_CONFIG.BASE_URL}${url}`;
};

// 存储相关辅助函数
export const storage = {
  // 获取 token
  getToken: (): string | null => {
    return localStorage.getItem(API_CONFIG.AUTH.TOKEN_KEY);
  },
  
  // 设置 token
  setToken: (token: string): void => {
    localStorage.setItem(API_CONFIG.AUTH.TOKEN_KEY, token);
  },
  
  // 移除 token
  removeToken: (): void => {
    localStorage.removeItem(API_CONFIG.AUTH.TOKEN_KEY);
  },
  
  // 获取 refresh token
  getRefreshToken: (): string | null => {
    return localStorage.getItem(API_CONFIG.AUTH.REFRESH_TOKEN_KEY);
  },
  
  // 设置 refresh token
  setRefreshToken: (token: string): void => {
    localStorage.setItem(API_CONFIG.AUTH.REFRESH_TOKEN_KEY, token);
  },
  
  // 移除 refresh token
  removeRefreshToken: (): void => {
    localStorage.removeItem(API_CONFIG.AUTH.REFRESH_TOKEN_KEY);
  },
  
  // 清除所有认证信息
  clearAuth: (): void => {
    localStorage.removeItem(API_CONFIG.AUTH.TOKEN_KEY);
    localStorage.removeItem(API_CONFIG.AUTH.REFRESH_TOKEN_KEY);
  },
};

export default API_CONFIG;