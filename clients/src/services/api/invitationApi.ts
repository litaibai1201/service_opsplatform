import httpClient from './httpClient';
import { TeamRole } from '@/types/entities';

// 邮箱邀请请求数据
export interface EmailInviteRequest {
  emails: string[];
  role: TeamRole;
  message?: string;
  expiresIn?: number; // 有效期（小时）
}

// 生成邀请链接请求数据
export interface GenerateInviteLinkRequest {
  role: TeamRole;
  expiresIn: number; // 有效期（天）
  allowMultipleUse: boolean;
  maxUses?: number;
  message?: string;
}

// 邀请响应数据
export interface InvitationResponse {
  id: string;
  teamId: string;
  inviterId: string;
  inviterName: string;
  type: 'email' | 'link';
  role: TeamRole;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  email?: string;
  token: string;
  message?: string;
  expiresAt: string;
  createdAt: string;
  usedAt?: string;
  usedBy?: string;
  maxUses?: number;
  currentUses?: number;
}

// 邀请列表查询参数
export interface InvitationQueryParams {
  page?: number;
  limit?: number;
  type?: 'email' | 'link';
  status?: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  role?: TeamRole;
  sortBy?: 'createdAt' | 'expiresAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// 邀请列表响应数据
export interface InvitationListResponse {
  items: InvitationResponse[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// 邀请统计数据
export interface InvitationStatsResponse {
  totalInvitations: number;
  pendingInvitations: number;
  acceptedInvitations: number;
  rejectedInvitations: number;
  expiredInvitations: number;
  acceptanceRate: number;
  invitationsByType: {
    email: number;
    link: number;
  };
  invitationsByRole: {
    owner: number;
    admin: number;
    member: number;
  };
  recentInvitations: number;
}

// 邀请详情响应数据
export interface InvitationDetailResponse extends InvitationResponse {
  team: {
    id: string;
    name: string;
    description?: string;
    visibility: string;
    memberCount: number;
  };
  inviter: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: TeamRole;
  };
  canAccept: boolean;
  canReject: boolean;
  canCancel: boolean;
}

// 团队邀请API服务类
class InvitationApiService {
  /**
   * 发送邮箱邀请
   */
  async sendEmailInvites(
    teamId: string,
    data: EmailInviteRequest
  ): Promise<{
    sent: Array<{
      email: string;
      invitationId: string;
    }>;
    failed: Array<{
      email: string;
      error: string;
    }>;
    message: string;
  }> {
    const response = await httpClient.post(
      `/teams/${teamId}/invitations/email`,
      data
    );
    return response.data;
  }

  /**
   * 生成邀请链接
   */
  async generateInviteLink(
    teamId: string,
    data: GenerateInviteLinkRequest
  ): Promise<{
    invitation: InvitationResponse;
    inviteUrl: string;
    qrCode?: string;
  }> {
    const response = await httpClient.post(
      `/teams/${teamId}/invitations/link`,
      data
    );
    return response.data;
  }

  /**
   * 获取团队邀请列表
   */
  async getTeamInvitations(
    teamId: string,
    params?: InvitationQueryParams
  ): Promise<InvitationListResponse> {
    const response = await httpClient.get<InvitationListResponse>(
      `/teams/${teamId}/invitations`,
      { params }
    );
    return response.data;
  }

  /**
   * 获取邀请详情
   */
  async getInvitationDetail(
    invitationId: string
  ): Promise<InvitationDetailResponse> {
    const response = await httpClient.get<InvitationDetailResponse>(
      `/invitations/${invitationId}`
    );
    return response.data;
  }

  /**
   * 通过邀请令牌获取邀请详情
   */
  async getInvitationByToken(
    token: string
  ): Promise<InvitationDetailResponse> {
    const response = await httpClient.get<InvitationDetailResponse>(
      `/invitations/token/${token}`
    );
    return response.data;
  }

  /**
   * 接受邀请
   */
  async acceptInvitation(
    invitationId: string
  ): Promise<{
    team: {
      id: string;
      name: string;
    };
    member: {
      id: string;
      role: TeamRole;
    };
    message: string;
  }> {
    const response = await httpClient.post(
      `/invitations/${invitationId}/accept`
    );
    return response.data;
  }

  /**
   * 通过令牌接受邀请
   */
  async acceptInvitationByToken(
    token: string
  ): Promise<{
    team: {
      id: string;
      name: string;
    };
    member: {
      id: string;
      role: TeamRole;
    };
    message: string;
  }> {
    const response = await httpClient.post(`/invitations/token/${token}/accept`);
    return response.data;
  }

  /**
   * 拒绝邀请
   */
  async rejectInvitation(
    invitationId: string,
    reason?: string
  ): Promise<{ message: string }> {
    const response = await httpClient.post(
      `/invitations/${invitationId}/reject`,
      { reason }
    );
    return response.data;
  }

  /**
   * 通过令牌拒绝邀请
   */
  async rejectInvitationByToken(
    token: string,
    reason?: string
  ): Promise<{ message: string }> {
    const response = await httpClient.post(
      `/invitations/token/${token}/reject`,
      { reason }
    );
    return response.data;
  }

  /**
   * 取消邀请
   */
  async cancelInvitation(
    teamId: string,
    invitationId: string
  ): Promise<{ message: string }> {
    const response = await httpClient.delete(
      `/teams/${teamId}/invitations/${invitationId}`
    );
    return response.data;
  }

  /**
   * 批量取消邀请
   */
  async cancelInvitations(
    teamId: string,
    invitationIds: string[]
  ): Promise<{
    cancelled: string[];
    failed: Array<{
      invitationId: string;
      error: string;
    }>;
    message: string;
  }> {
    const response = await httpClient.post(
      `/teams/${teamId}/invitations/batch-cancel`,
      { invitationIds }
    );
    return response.data;
  }

  /**
   * 重新发送邀请
   */
  async resendInvitation(
    teamId: string,
    invitationId: string
  ): Promise<{ message: string }> {
    const response = await httpClient.post(
      `/teams/${teamId}/invitations/${invitationId}/resend`
    );
    return response.data;
  }

  /**
   * 更新邀请（修改角色、过期时间等）
   */
  async updateInvitation(
    teamId: string,
    invitationId: string,
    data: {
      role?: TeamRole;
      expiresAt?: string;
      message?: string;
    }
  ): Promise<InvitationResponse> {
    const response = await httpClient.put<InvitationResponse>(
      `/teams/${teamId}/invitations/${invitationId}`,
      data
    );
    return response.data;
  }

  /**
   * 获取邀请统计数据
   */
  async getInvitationStats(teamId: string): Promise<InvitationStatsResponse> {
    const response = await httpClient.get<InvitationStatsResponse>(
      `/teams/${teamId}/invitations/stats`
    );
    return response.data;
  }

  /**
   * 获取用户的待处理邀请列表
   */
  async getPendingInvitations(params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    items: Array<{
      id: string;
      team: {
        id: string;
        name: string;
        description?: string;
        visibility: string;
        memberCount: number;
      };
      inviter: {
        id: string;
        name: string;
        avatar?: string;
      };
      role: TeamRole;
      message?: string;
      createdAt: string;
      expiresAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await httpClient.get('/invitations/pending', { params });
    return response.data;
  }

  /**
   * 批量处理待处理邀请
   */
  async batchHandleInvitations(data: {
    invitations: Array<{
      id: string;
      action: 'accept' | 'reject';
      reason?: string;
    }>;
  }): Promise<{
    processed: Array<{
      id: string;
      action: string;
      success: boolean;
      error?: string;
    }>;
    message: string;
  }> {
    const response = await httpClient.post(
      '/invitations/batch-handle',
      data
    );
    return response.data;
  }

  /**
   * 获取邀请链接使用记录
   */
  async getInviteLinkUsage(
    teamId: string,
    invitationId: string
  ): Promise<{
    invitation: InvitationResponse;
    usageHistory: Array<{
      id: string;
      user: {
        id: string;
        name: string;
        email: string;
        avatar?: string;
      };
      usedAt: string;
      ipAddress: string;
      userAgent: string;
      location?: string;
    }>;
    stats: {
      totalUses: number;
      uniqueUsers: number;
      successfulJoins: number;
    };
  }> {
    const response = await httpClient.get(
      `/teams/${teamId}/invitations/${invitationId}/usage`
    );
    return response.data;
  }

  /**
   * 验证邀请令牌有效性
   */
  async validateInviteToken(token: string): Promise<{
    valid: boolean;
    team?: {
      id: string;
      name: string;
      description?: string;
    };
    role?: TeamRole;
    expiresAt?: string;
    error?: string;
  }> {
    const response = await httpClient.get(`/invitations/validate/${token}`);
    return response.data;
  }

  /**
   * 导出邀请数据
   */
  async exportInvitations(
    teamId: string,
    format: 'csv' | 'xlsx',
    options?: {
      status?: string;
      dateRange?: {
        start: string;
        end: string;
      };
    }
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    expiresAt: string;
  }> {
    const response = await httpClient.post(
      `/teams/${teamId}/invitations/export`,
      {
        format,
        ...options,
      }
    );
    return response.data;
  }
}

// 创建并导出服务实例
export const invitationApi = new InvitationApiService();
export default invitationApi;