// API 端点常量
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
    VERIFY_EMAIL: '/auth/verify-email',
    SEND_VERIFICATION: '/auth/send-verification',
  },
  TEAMS: {
    LIST: '/teams',
    CREATE: '/teams',
    DETAIL: (id: string) => `/teams/${id}`,
    UPDATE: (id: string) => `/teams/${id}`,
    DELETE: (id: string) => `/teams/${id}`,
    MEMBERS: (id: string) => `/teams/${id}/members`,
    INVITATIONS: (id: string) => `/teams/${id}/invitations`,
    JOIN_REQUESTS: (id: string) => `/teams/${id}/join-requests`,
    STATISTICS: (id: string) => `/teams/${id}/statistics`,
  },
  PROJECTS: {
    LIST: '/projects',
    CREATE: (teamId: string) => `/teams/${teamId}/projects`,
    DETAIL: (id: string) => `/projects/${id}`,
    UPDATE: (id: string) => `/projects/${id}`,
    DELETE: (id: string) => `/projects/${id}`,
    MAINTAINERS: (id: string) => `/projects/${id}/maintainers`,
    STATISTICS: (id: string) => `/projects/${id}/statistics`,
  },
  DESIGN_TOOLS: {
    DIAGRAMS: (projectId: string) => `/projects/${projectId}/diagrams`,
    DIAGRAM_DETAIL: (id: string) => `/diagrams/${id}`,
    API_SPECS: (projectId: string) => `/projects/${projectId}/api-specs`,
    API_SPEC_DETAIL: (id: string) => `/api-specs/${id}`,
    DB_DESIGNS: (projectId: string) => `/projects/${projectId}/db-designs`,
    DB_DESIGN_DETAIL: (id: string) => `/db-designs/${id}`,
    FEATURE_MAPS: (projectId: string) => `/projects/${projectId}/feature-maps`,
    FEATURE_MAP_DETAIL: (id: string) => `/feature-maps/${id}`,
  },
  COLLABORATION: {
    JOIN: '/collaboration/join',
    LEAVE: '/collaboration/leave',
    OPERATIONS: '/collaboration/operations',
    ACTIVE_USERS: (documentId: string) => `/collaboration/active-users/${documentId}`,
    LOCKS: (documentId: string) => `/collaboration/locks/${documentId}`,
  },
  VERSION_CONTROL: {
    BRANCHES: '/version-control/branches',
    COMMITS: '/version-control/commits',
    MERGE_REQUESTS: '/version-control/merge-requests',
    TAGS: '/version-control/tags',
  },
} as const;

// 应用配置常量
export const APP_CONFIG = {
  NAME: 'Service Ops Platform',
  SHORT_NAME: 'SOP',
  VERSION: '1.0.0',
  DESCRIPTION: '企业级软件服务管理与协作设计平台',
  SUPPORT_EMAIL: 'support@serviceops.com',
  DOCUMENTATION_URL: 'https://docs.serviceops.com',
} as const;

// 路由路径常量
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  
  // 团队相关路由
  TEAMS: '/teams',
  TEAM_DETAIL: (id: string) => `/teams/${id}`,
  TEAM_SETTINGS: (id: string) => `/teams/${id}/settings`,
  TEAM_MEMBERS: (id: string) => `/teams/${id}/members`,
  TEAM_PROJECTS: (id: string) => `/teams/${id}/projects`,
  
  // 项目相关路由
  PROJECTS: '/projects',
  PROJECT_DETAIL: (id: string) => `/projects/${id}`,
  PROJECT_SETTINGS: (id: string) => `/projects/${id}/settings`,
  PROJECT_MEMBERS: (id: string) => `/projects/${id}/members`,
  
  // 设计工具路由
  DESIGN_TOOLS: {
    ARCHITECTURE: (projectId: string) => `/projects/${projectId}/architecture`,
    FLOW_DIAGRAM: (projectId: string) => `/projects/${projectId}/flow-diagram`,
    API_DESIGN: (projectId: string) => `/projects/${projectId}/api-design`,
    DATABASE_DESIGN: (projectId: string) => `/projects/${projectId}/database-design`,
    FEATURE_MAP: (projectId: string) => `/projects/${projectId}/feature-map`,
  },
  
  // 协作相关路由
  COLLABORATION: '/collaboration',
  VERSION_CONTROL: '/version-control',
  
  // 管理员路由
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_TEAMS: '/admin/teams',
  ADMIN_SYSTEM: '/admin/system',
} as const;

// 权限常量
export const PERMISSIONS = {
  PLATFORM: {
    ADMIN: 'platform:admin',
    USER_MANAGE: 'platform:user:manage',
    SYSTEM_CONFIG: 'platform:system:config',
  },
  TEAM: {
    VIEW: 'team:view',
    CREATE: 'team:create',
    UPDATE: 'team:update',
    DELETE: 'team:delete',
    TRANSFER: 'team:transfer',
    MEMBER_INVITE: 'team:member:invite',
    MEMBER_REMOVE: 'team:member:remove',
    MEMBER_PROMOTE: 'team:member:promote',
  },
  PROJECT: {
    VIEW: 'project:view',
    CREATE: 'project:create',
    UPDATE: 'project:update',
    DELETE: 'project:delete',
    ARCHIVE: 'project:archive',
    MAINTAINER_ASSIGN: 'project:maintainer:assign',
    SETTINGS_CHANGE: 'project:settings:change',
  },
  DESIGN: {
    VIEW: 'design:view',
    CREATE: 'design:create',
    UPDATE: 'design:update',
    DELETE: 'design:delete',
    COMMENT: 'design:comment',
    EXPORT: 'design:export',
  },
  COLLABORATION: {
    JOIN: 'collaboration:join',
    EDIT: 'collaboration:edit',
    LOCK: 'collaboration:lock',
    REVIEW: 'collaboration:review',
  },
} as const;

// 状态常量
export const STATUS = {
  USER: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    PENDING_VERIFICATION: 'pending_verification',
  },
  PROJECT: {
    ACTIVE: 'active',
    ARCHIVED: 'archived',
    DELETED: 'deleted',
  },
  INVITATION: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    EXPIRED: 'expired',
  },
  MERGE_REQUEST: {
    OPEN: 'open',
    MERGED: 'merged',
    CLOSED: 'closed',
    DRAFT: 'draft',
  },
} as const;

// 角色常量
export const ROLES = {
  PLATFORM: {
    ADMIN: 'platform_admin',
    USER: 'platform_user',
  },
  TEAM: {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
  },
} as const;

// 设计工具类型常量
export const DESIGN_TYPES = {
  DIAGRAM: {
    SYSTEM_ARCHITECTURE: 'system_architecture',
    DEPLOYMENT: 'deployment',
    NETWORK: 'network',
    DATA_FLOW: 'data_flow',
    COMPONENT: 'component',
  },
  API: {
    REST: 'rest',
    GRAPHQL: 'graphql',
    GRPC: 'grpc',
    WEBSOCKET: 'websocket',
  },
  DATABASE: {
    MYSQL: 'mysql',
    POSTGRESQL: 'postgresql',
    MONGODB: 'mongodb',
    REDIS: 'redis',
    ORACLE: 'oracle',
  },
  FLOW: {
    BUSINESS_PROCESS: 'business_process',
    SYSTEM_FLOW: 'system_flow',
    USER_JOURNEY: 'user_journey',
    WORKFLOW: 'workflow',
    DECISION_TREE: 'decision_tree',
  },
} as const;

// 通知类型常量
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

// 文件类型常量
export const FILE_TYPES = {
  IMAGE: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'],
  DOCUMENT: ['pdf', 'doc', 'docx', 'txt', 'md'],
  ARCHIVE: ['zip', 'rar', '7z', 'tar', 'gz'],
  CODE: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'go', 'rs'],
} as const;

// 大小限制常量
export const LIMITS = {
  FILE_SIZE: {
    AVATAR: 2 * 1024 * 1024, // 2MB
    ATTACHMENT: 10 * 1024 * 1024, // 10MB
    EXPORT: 50 * 1024 * 1024, // 50MB
  },
  TEXT_LENGTH: {
    USERNAME: { MIN: 3, MAX: 50 },
    PASSWORD: { MIN: 8, MAX: 128 },
    TEAM_NAME: { MIN: 2, MAX: 100 },
    PROJECT_NAME: { MIN: 2, MAX: 100 },
    DESCRIPTION: { MAX: 1000 },
    COMMENT: { MAX: 2000 },
  },
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },
  TEAM: {
    MAX_MEMBERS: 1000,
    MAX_PROJECTS: 100,
  },
  PROJECT: {
    MAX_DESIGNS: 1000,
    MAX_COLLABORATORS: 50,
  },
} as const;

// 缓存键常量
export const CACHE_KEYS = {
  USER_PROFILE: 'user:profile',
  USER_TEAMS: 'user:teams',
  USER_PROJECTS: 'user:projects',
  USER_PERMISSIONS: (userId: string) => `user:${userId}:permissions`,
  TEAM_DETAIL: (teamId: string) => `team:${teamId}`,
  TEAM_MEMBERS: (teamId: string) => `team:${teamId}:members`,
  PROJECT_DETAIL: (projectId: string) => `project:${projectId}`,
  PROJECT_DESIGNS: (projectId: string) => `project:${projectId}:designs`,
} as const;

// 本地存储键常量
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  LANGUAGE: 'language',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  EDITOR_CONFIG: 'editor_config',
  LAST_VISITED_TEAM: 'last_visited_team',
  LAST_VISITED_PROJECT: 'last_visited_project',
} as const;

// 时间格式常量
export const DATE_FORMATS = {
  FULL: 'YYYY-MM-DD HH:mm:ss',
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm:ss',
  DATETIME: 'YYYY-MM-DD HH:mm',
  RELATIVE: 'relative',
} as const;

// 颜色常量
export const COLORS = {
  PRIMARY: '#3b82f6',
  SUCCESS: '#22c55e',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#06b6d4',
  GRAY: '#6b7280',
} as const;

// 动画持续时间常量
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// 默认配置常量
export const DEFAULTS = {
  THEME: 'light',
  LANGUAGE: 'zh-CN',
  TIMEZONE: 'Asia/Shanghai',
  PAGE_SIZE: 20,
  AUTO_SAVE_INTERVAL: 30000, // 30秒
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24小时
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
} as const;