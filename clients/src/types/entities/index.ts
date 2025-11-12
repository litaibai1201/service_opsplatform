// 用户相关类型
export enum UserRole {
  EXTERNAL_USER = 'external_user',
  TEAM_MEMBER = 'team_member',
  PROJECT_MAINTAINER = 'project_maintainer',
  TEAM_ADMIN = 'team_admin',
  TEAM_OWNER = 'team_owner',
  PLATFORM_ADMIN = 'platform_admin',
}

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  platformRole: 'platform_admin' | 'platform_user';
  role: UserRole;
  permissions?: string[];
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  timezone: string;
  language: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  teamMemberships?: Array<{
    teamId: string;
    role: UserRole;
  }>;
  projectMaintainerships?: Array<{
    projectId: string;
    canManage: boolean;
  }>;
}

// 团队相关类型
export type TeamRole = 'owner' | 'admin' | 'member';

export interface TeamSettings {
  allowMemberInvite: boolean;
  allowMemberProjectCreate: boolean;
  requireApprovalForJoin: boolean;
  defaultMemberRole: 'member' | 'viewer';
  notifications: {
    newMember: boolean;
    projectUpdates: boolean;
    memberActivity: boolean;
  };
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  visibility: 'public' | 'private' | 'internal';
  joinPolicy: 'open' | 'invite_only' | 'request';
  status: 'active' | 'archived' | 'pending';
  memberCount?: number;
  projectCount?: number;
  activityScore?: number;
  settings?: TeamSettings;
  lastActivityAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  name: string;
  email?: string;
  avatar?: string;
  role: TeamRole;
  status: 'active' | 'pending' | 'inactive';
  bio?: string;
  phone?: string;
  invitedBy?: string;
  joinedAt: string;
  lastActiveAt?: string;
  projectCount?: number;
  contributionScore?: number;
  user?: User;
}

export interface TeamActivity {
  id: string;
  teamId: string;
  type: string;
  description: string;
  actor: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata?: {
    projectName?: string;
    newRole?: string;
    target?: string;
    repository?: string;
    location?: string;
    details?: string;
  };
  createdAt: string;
}

// 项目相关类型
export interface Project {
  id: string;
  name: string;
  description?: string;
  teamId: string;
  type: 'web' | 'mobile' | 'api' | 'desktop' | 'library';
  visibility: 'public' | 'private';
  status: 'active' | 'completed' | 'paused' | 'archived' | 'planning';
  priority?: 'high' | 'medium' | 'low';
  progress?: number;
  memberCount?: number;
  dueDate?: string;
  lastActivityAt?: string;
  templateId?: string;
  settings?: Record<string, any>;
  allowMemberEdit?: boolean;
  allowExternalView?: boolean;
  allowExternalComment?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  team?: Team;
  tags?: Tag[];
}

export interface ProjectMaintainer {
  id: string;
  projectId: string;
  userId: string;
  assignedBy: string;
  assignedAt: string;
  user?: User;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  category?: string;
  description?: string;
  usageCount: number;
  createdBy: string;
  createdAt: string;
}

// 设计文档相关类型
export interface Diagram {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  type: 'system_architecture' | 'deployment' | 'network' | 'data_flow' | 'component';
  data: {
    nodes: DiagramNode[];
    edges: DiagramEdge[];
    layout: Record<string, any>;
    styles: Record<string, any>;
  };
  metadata: {
    version: number;
    createdBy: string;
    lastModifiedBy: string;
    createdAt: string;
    updatedAt: string;
    tags: string[];
    complexityScore: number;
    validationStatus: 'valid' | 'warning' | 'error';
  };
  collaboration: {
    lockedBy?: string;
    lockedAt?: string;
    activeEditors: string[];
  };
  sharing: {
    isPublic: boolean;
    shareToken?: string;
    allowedUsers: string[];
  };
}

export interface DiagramNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
  style?: Record<string, any>;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: Record<string, any>;
  style?: Record<string, any>;
}

// API 设计相关类型
export interface ApiSpec {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  type: 'rest' | 'graphql' | 'grpc' | 'websocket';
  spec: Record<string, any>;
  version: string;
  status: 'draft' | 'review' | 'published' | 'deprecated';
  environments: ApiEnvironment[];
  testing: {
    testCases: any[];
    coverageReport: Record<string, any>;
    performanceMetrics: Record<string, any>;
    lastTestRun?: string;
  };
  documentation: {
    examples: any[];
    guides: any[];
    changelogs: any[];
    autoGenerated: boolean;
  };
  collaboration: {
    reviewers: string[];
    approvalStatus: string;
    comments: any[];
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiEnvironment {
  name: string;
  baseUrl: string;
  headers: Record<string, string>;
  authConfig: Record<string, any>;
  variables: Record<string, any>;
}

// 数据库设计相关类型
export interface DatabaseDesign {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  dbType: 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'oracle';
  version: string;
  schemas: DatabaseSchema[];
  relationships: DatabaseRelationship[];
  optimization: {
    performanceAnalysis: Record<string, any>;
    indexSuggestions: any[];
    normalizationLevel: string;
    queryOptimization: any[];
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseSchema {
  name: string;
  tables: DatabaseTable[];
  views: DatabaseView[];
  procedures: DatabaseProcedure[];
  functions: DatabaseFunction[];
}

export interface DatabaseTable {
  name: string;
  comment?: string;
  columns: DatabaseColumn[];
  indexes: DatabaseIndex[];
  triggers: DatabaseTrigger[];
  partitioning?: {
    type: 'range' | 'hash' | 'list';
    column: string;
    partitions: any[];
  };
}

export interface DatabaseColumn {
  name: string;
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  defaultValue?: string;
  autoIncrement: boolean;
  primaryKey: boolean;
  unique: boolean;
  comment?: string;
  foreignKey?: {
    table: string;
    column: string;
    onDelete: string;
    onUpdate: string;
  };
}

export interface DatabaseIndex {
  name: string;
  type: 'btree' | 'hash' | 'fulltext';
  columns: string[];
  unique: boolean;
  comment?: string;
}

export interface DatabaseTrigger {
  name: string;
  event: 'insert' | 'update' | 'delete';
  timing: 'before' | 'after';
  definition: string;
}

export interface DatabaseView {
  name: string;
  definition: string;
  comment?: string;
  dependencies: string[];
}

export interface DatabaseProcedure {
  name: string;
  parameters: any[];
  definition: string;
  comment?: string;
}

export interface DatabaseFunction {
  name: string;
  parameters: any[];
  returnType: string;
  definition: string;
  comment?: string;
}

export interface DatabaseRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: string;
  cardinality: string;
  description?: string;
}

// 协作相关类型
export interface CollaborationSession {
  id: string;
  documentId: string;
  documentType: 'diagram' | 'api_spec' | 'db_design' | 'flow' | 'mind_map';
  userId: string;
  sessionToken: string;
  cursorPosition?: Record<string, any>;
  selectionRange?: Record<string, any>;
  userColor?: string;
  permissions: Record<string, any>;
  joinedAt: string;
  lastActivity: string;
  user?: User;
}

export interface Operation {
  id: string;
  documentId: string;
  documentType: string;
  userId: string;
  operationType: string;
  operationData: Record<string, any>;
  timestamp: string;
  sequenceNumber: number;
  applied: boolean;
  conflictsWith?: any[];
  conflictResolution?: Record<string, any>;
}

// 版本控制相关类型
export interface VersionBranch {
  id: string;
  documentId: string;
  documentType: string;
  branchName: string;
  parentBranchId?: string;
  headCommitId?: string;
  isProtected: boolean;
  protectionRules: Record<string, any>;
  createdBy: string;
  createdAt: string;
}

export interface VersionCommit {
  id: string;
  branchId: string;
  commitHash: string;
  parentCommitId?: string;
  authorId: string;
  commitMessage: string;
  documentSnapshot: Record<string, any>;
  changesSummary: Record<string, any>;
  isMergeCommit: boolean;
  mergeFromBranch?: string;
  createdAt: string;
  author?: User;
}

export interface MergeRequest {
  id: string;
  sourceBranchId: string;
  targetBranchId: string;
  title: string;
  description?: string;
  status: 'open' | 'merged' | 'closed' | 'draft';
  conflicts?: any[];
  reviewRequired: boolean;
  createdBy: string;
  assigneeId?: string;
  reviewers: string[];
  approvals: any[];
  mergedBy?: string;
  mergeCommitId?: string;
  createdAt: string;
  mergedAt?: string;
}

// 通用类型
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
  href?: string;
  children?: MenuItem[];
  badge?: string | number;
  disabled?: boolean;
}

export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  metadata: Record<string, any>;
  userId: string;
  createdAt: string;
  user?: User;
}