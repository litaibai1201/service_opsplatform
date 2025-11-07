// API服务导出
export { default as authApi } from './authApi';
export { default as dashboardApi } from './dashboardApi';
export { default as teamApi } from './teamApi';
export { default as memberApi } from './memberApi';
export { default as invitationApi } from './invitationApi';
export { default as adminApi } from './adminApi';

// HTTP客户端和配置
export { default as httpClient } from './httpClient';
export { API_CONFIG } from './apiConfig';

// 导出API类型
export type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  ChangePasswordRequest,
  UpdateProfileRequest
} from './authApi';

export type {
  CreateTeamRequest,
  UpdateTeamRequest,
  TeamQueryParams,
  TeamListResponse,
  TeamDetailResponse,
  TeamStatsResponse
} from './teamApi';

export type {
  AddMemberRequest,
  BatchAddMembersRequest,
  UpdateMemberRoleRequest,
  MemberQueryParams,
  MemberListResponse,
  MemberDetailResponse,
  MemberStatsResponse
} from './memberApi';

export type {
  EmailInviteRequest,
  GenerateInviteLinkRequest,
  InvitationResponse,
  InvitationQueryParams,
  InvitationListResponse,
  InvitationStatsResponse,
  InvitationDetailResponse
} from './invitationApi';

export type {
  AdminStats,
  SystemAlert,
  AdminUser,
  UserListParams,
  UserListResponse,
  CreateUserRequest,
  UpdateUserRequest,
  BulkUserOperation,
  AdminTeam,
  TeamListParams,
  TeamListResponse as AdminTeamListResponse,
  SystemSettings,
  AuditLog,
  AuditLogParams,
  AuditLogResponse,
  ServiceStatus,
  HealthCheck,
  SystemHealth,
  Permission,
  Role,
  PermissionMatrix
} from './adminApi';