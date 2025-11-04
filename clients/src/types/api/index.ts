import type {
  User,
  Team,
  TeamMember,
  TeamInvitation,
  Project,
  ProjectMaintainer,
  Diagram,
  ApiSpec,
  DatabaseDesign,
  CollaborationSession,
  Operation,
  VersionBranch,
  VersionCommit,
  MergeRequest,
  PaginationParams,
  PaginatedResponse,
  ApiResponse,
} from '@/types/entities';

// 认证相关 API 类型
export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName: string;
  timezone?: string;
  language?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  timezone?: string;
  language?: string;
  preferences?: Record<string, any>;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: string;
}

// 群组相关 API 类型
export interface CreateTeamRequest {
  name: string;
  description?: string;
  visibility: 'public' | 'private' | 'internal';
  maxMembers?: number;
  autoApproveJoin?: boolean;
  allowMemberInvite?: boolean;
  requireApprovalForProjects?: boolean;
  defaultProjectVisibility?: 'public' | 'private';
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'internal';
  maxMembers?: number;
  autoApproveJoin?: boolean;
  allowMemberInvite?: boolean;
  requireApprovalForProjects?: boolean;
  defaultProjectVisibility?: 'public' | 'private';
  settings?: Record<string, any>;
}

export interface InviteTeamMemberRequest {
  email: string;
  role: 'admin' | 'member';
  message?: string;
}

export interface JoinTeamRequest {
  teamId: string;
  message?: string;
}

export interface UpdateMemberRoleRequest {
  role: 'admin' | 'member';
}

export interface TransferTeamOwnershipRequest {
  newOwnerId: string;
}

// 项目相关 API 类型
export interface CreateProjectRequest {
  name: string;
  description?: string;
  teamId: string;
  visibility: 'public' | 'private';
  templateId?: string;
  allowMemberEdit?: boolean;
  allowExternalView?: boolean;
  allowExternalComment?: boolean;
  settings?: Record<string, any>;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  visibility?: 'public' | 'private';
  allowMemberEdit?: boolean;
  allowExternalView?: boolean;
  allowExternalComment?: boolean;
  settings?: Record<string, any>;
}

export interface AssignProjectMaintainerRequest {
  userId: string;
}

export interface ProjectAccessRequest {
  projectId: string;
  accessType: 'view' | 'maintainer';
  message?: string;
}

// 设计工具相关 API 类型
export interface CreateDiagramRequest {
  projectId: string;
  name: string;
  description?: string;
  type: 'system_architecture' | 'deployment' | 'network' | 'data_flow' | 'component';
  data?: {
    nodes?: any[];
    edges?: any[];
    layout?: Record<string, any>;
    styles?: Record<string, any>;
  };
}

export interface UpdateDiagramRequest {
  name?: string;
  description?: string;
  data?: {
    nodes?: any[];
    edges?: any[];
    layout?: Record<string, any>;
    styles?: Record<string, any>;
  };
}

export interface CreateApiSpecRequest {
  projectId: string;
  name: string;
  description?: string;
  type: 'rest' | 'graphql' | 'grpc' | 'websocket';
  spec?: Record<string, any>;
  version?: string;
}

export interface UpdateApiSpecRequest {
  name?: string;
  description?: string;
  spec?: Record<string, any>;
  version?: string;
  status?: 'draft' | 'review' | 'published' | 'deprecated';
}

export interface CreateDatabaseDesignRequest {
  projectId: string;
  name: string;
  description?: string;
  dbType: 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'oracle';
  version?: string;
}

export interface UpdateDatabaseDesignRequest {
  name?: string;
  description?: string;
  version?: string;
  schemas?: any[];
  relationships?: any[];
}

// 协作相关 API 类型
export interface JoinCollaborationRequest {
  documentId: string;
  documentType: 'diagram' | 'api_spec' | 'db_design' | 'flow' | 'mind_map';
}

export interface SubmitOperationRequest {
  documentId: string;
  documentType: string;
  operationType: string;
  operationData: Record<string, any>;
}

export interface UpdateCursorRequest {
  documentId: string;
  position: Record<string, any>;
}

export interface UpdateSelectionRequest {
  documentId: string;
  range: Record<string, any>;
}

export interface LockDocumentRequest {
  documentId: string;
  documentType: string;
  lockType: 'read' | 'write' | 'exclusive';
  lockedElements?: any[];
}

export interface ResolveConflictRequest {
  operationId: string;
  resolution: Record<string, any>;
}

// 版本控制相关 API 类型
export interface CreateBranchRequest {
  documentId: string;
  documentType: string;
  branchName: string;
  parentBranchId?: string;
}

export interface CreateCommitRequest {
  branchId: string;
  message: string;
  documentSnapshot: Record<string, any>;
  changesSummary?: Record<string, any>;
}

export interface CreateMergeRequestRequest {
  sourceBranchId: string;
  targetBranchId: string;
  title: string;
  description?: string;
  reviewRequired?: boolean;
  assigneeId?: string;
  reviewers?: string[];
}

export interface UpdateMergeRequestRequest {
  title?: string;
  description?: string;
  assigneeId?: string;
  reviewers?: string[];
}

export interface ReviewMergeRequestRequest {
  status: 'approved' | 'rejected' | 'needs_changes';
  comments?: string;
}

export interface MergeBranchRequest {
  mergeRequestId: string;
  commitMessage?: string;
}

// 搜索相关 API 类型
export interface SearchRequest {
  query: string;
  filters?: {
    type?: string[];
    teamId?: string[];
    projectId?: string[];
    createdBy?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  };
  pagination?: PaginationParams;
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  url: string;
  metadata: Record<string, any>;
  highlight: Record<string, string>;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  facets: Record<string, any>;
  suggestions: string[];
  took: number;
}

// 统计相关 API 类型
export interface DashboardStats {
  teams: {
    total: number;
    owned: number;
    joined: number;
  };
  projects: {
    total: number;
    created: number;
    maintained: number;
    public: number;
    private: number;
  };
  designs: {
    total: number;
    diagrams: number;
    apiSpecs: number;
    dbDesigns: number;
    featureMaps: number;
  };
  collaboration: {
    activeSessions: number;
    recentActivity: number;
    pendingReviews: number;
  };
}

export interface TeamStats {
  members: {
    total: number;
    owners: number;
    admins: number;
    members: number;
  };
  projects: {
    total: number;
    active: number;
    archived: number;
    public: number;
    private: number;
  };
  activity: {
    totalActions: number;
    recentActions: number;
    topContributors: Array<{
      userId: string;
      user: User;
      actionCount: number;
    }>;
  };
}

export interface ProjectStats {
  designs: {
    total: number;
    byType: Record<string, number>;
  };
  collaboration: {
    activeSessions: number;
    totalContributors: number;
    recentActivity: number;
  };
  versions: {
    totalCommits: number;
    totalBranches: number;
    openMergeRequests: number;
  };
}

// 权限相关 API 类型
export interface PermissionCheck {
  resource: string;
  action: string;
  resourceId?: string;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

export interface BatchPermissionRequest {
  checks: PermissionCheck[];
}

export interface BatchPermissionResponse {
  results: PermissionResult[];
}

// 文件上传相关 API 类型
export interface FileUploadRequest {
  file: File;
  type: 'avatar' | 'attachment' | 'export';
  metadata?: Record<string, any>;
}

export interface FileUploadResponse {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  metadata: Record<string, any>;
  createdAt: string;
}

// 导出相关 API 类型
export interface ExportRequest {
  documentId: string;
  format: 'pdf' | 'png' | 'svg' | 'json' | 'yaml' | 'sql';
  options?: Record<string, any>;
}

export interface ExportResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// WebSocket 消息类型
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  sender?: string;
}

export interface CollaborationMessage extends WebSocketMessage {
  type: 'operation' | 'cursor' | 'selection' | 'join' | 'leave' | 'lock' | 'unlock';
  documentId: string;
  documentType: string;
}

export interface NotificationMessage extends WebSocketMessage {
  type: 'notification';
  notification: {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    actionUrl?: string;
  };
}