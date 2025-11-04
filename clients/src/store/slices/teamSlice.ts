import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { 
  Team, 
  TeamMember, 
  TeamInvitation, 
  CreateTeamRequest, 
  UpdateTeamRequest,
  ApiResponse,
  PaginatedResponse
} from '@/types';

// 异步 actions
export const fetchTeams = createAsyncThunk<
  ApiResponse<PaginatedResponse<Team>>,
  { page?: number; pageSize?: number; search?: string },
  { rejectValue: string }
>('teams/fetchTeams', async (params, { rejectWithValue }) => {
  try {
    const searchParams = new URLSearchParams({
      page: (params.page || 1).toString(),
      pageSize: (params.pageSize || 20).toString(),
      ...(params.search && { search: params.search }),
    });
    
    const response = await fetch(`/api/teams?${searchParams}`);
    
    if (!response.ok) {
      throw new Error('获取团队列表失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '获取团队列表失败');
  }
});

export const fetchTeamDetail = createAsyncThunk<
  ApiResponse<Team>,
  string,
  { rejectValue: string }
>('teams/fetchTeamDetail', async (teamId, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/teams/${teamId}`);
    
    if (!response.ok) {
      throw new Error('获取团队详情失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '获取团队详情失败');
  }
});

export const createTeam = createAsyncThunk<
  ApiResponse<Team>,
  CreateTeamRequest,
  { rejectValue: string }
>('teams/createTeam', async (teamData, { rejectWithValue }) => {
  try {
    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamData),
    });
    
    if (!response.ok) {
      throw new Error('创建团队失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '创建团队失败');
  }
});

export const updateTeam = createAsyncThunk<
  ApiResponse<Team>,
  { teamId: string; data: UpdateTeamRequest },
  { rejectValue: string }
>('teams/updateTeam', async ({ teamId, data }, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/teams/${teamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('更新团队失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '更新团队失败');
  }
});

export const deleteTeam = createAsyncThunk<
  ApiResponse<void>,
  string,
  { rejectValue: string }
>('teams/deleteTeam', async (teamId, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/teams/${teamId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('删除团队失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '删除团队失败');
  }
});

export const fetchTeamMembers = createAsyncThunk<
  ApiResponse<TeamMember[]>,
  string,
  { rejectValue: string }
>('teams/fetchTeamMembers', async (teamId, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/teams/${teamId}/members`);
    
    if (!response.ok) {
      throw new Error('获取团队成员失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '获取团队成员失败');
  }
});

export const inviteTeamMember = createAsyncThunk<
  ApiResponse<TeamInvitation>,
  { teamId: string; email: string; role: 'admin' | 'member'; message?: string },
  { rejectValue: string }
>('teams/inviteTeamMember', async ({ teamId, email, role, message }, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/teams/${teamId}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role, message }),
    });
    
    if (!response.ok) {
      throw new Error('邀请成员失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '邀请成员失败');
  }
});

export const removeMember = createAsyncThunk<
  ApiResponse<void>,
  { teamId: string; userId: string },
  { rejectValue: string }
>('teams/removeMember', async ({ teamId, userId }, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('移除成员失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '移除成员失败');
  }
});

export const updateMemberRole = createAsyncThunk<
  ApiResponse<TeamMember>,
  { teamId: string; userId: string; role: 'admin' | 'member' },
  { rejectValue: string }
>('teams/updateMemberRole', async ({ teamId, userId, role }, { rejectWithValue }) => {
  try {
    const action = role === 'admin' ? 'promote' : 'demote';
    const response = await fetch(`/api/teams/${teamId}/members/${userId}/${action}`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('更新成员角色失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '更新成员角色失败');
  }
});

// 状态接口
interface TeamState {
  teams: Team[];
  currentTeam: Team | null;
  members: TeamMember[];
  invitations: TeamInvitation[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  loading: {
    teams: boolean;
    currentTeam: boolean;
    members: boolean;
    creating: boolean;
    updating: boolean;
    deleting: boolean;
  };
  error: string | null;
  filters: {
    search: string;
    visibility: 'all' | 'public' | 'private' | 'internal';
  };
}

// 初始状态
const initialState: TeamState = {
  teams: [],
  currentTeam: null,
  members: [],
  invitations: [],
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0,
  },
  loading: {
    teams: false,
    currentTeam: false,
    members: false,
    creating: false,
    updating: false,
    deleting: false,
  },
  error: null,
  filters: {
    search: '',
    visibility: 'all',
  },
};

// 创建 slice
const teamSlice = createSlice({
  name: 'teams',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    
    setCurrentTeam: (state, action: PayloadAction<Team | null>) => {
      state.currentTeam = action.payload;
    },
    
    updateFilters: (state, action: PayloadAction<Partial<TeamState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    clearTeams: (state) => {
      state.teams = [];
      state.pagination = initialState.pagination;
    },
    
    clearCurrentTeam: (state) => {
      state.currentTeam = null;
      state.members = [];
      state.invitations = [];
    },
  },
  extraReducers: (builder) => {
    // 获取团队列表
    builder
      .addCase(fetchTeams.pending, (state) => {
        state.loading.teams = true;
        state.error = null;
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.loading.teams = false;
        
        if (action.payload.success && action.payload.data) {
          const { data, total, page, pageSize } = action.payload.data;
          state.teams = data;
          state.pagination = {
            current: page,
            pageSize,
            total,
          };
        }
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.loading.teams = false;
        state.error = action.payload || '获取团队列表失败';
      });

    // 获取团队详情
    builder
      .addCase(fetchTeamDetail.pending, (state) => {
        state.loading.currentTeam = true;
        state.error = null;
      })
      .addCase(fetchTeamDetail.fulfilled, (state, action) => {
        state.loading.currentTeam = false;
        
        if (action.payload.success && action.payload.data) {
          state.currentTeam = action.payload.data;
        }
      })
      .addCase(fetchTeamDetail.rejected, (state, action) => {
        state.loading.currentTeam = false;
        state.error = action.payload || '获取团队详情失败';
      });

    // 创建团队
    builder
      .addCase(createTeam.pending, (state) => {
        state.loading.creating = true;
        state.error = null;
      })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.loading.creating = false;
        
        if (action.payload.success && action.payload.data) {
          state.teams.unshift(action.payload.data);
          state.pagination.total += 1;
        }
      })
      .addCase(createTeam.rejected, (state, action) => {
        state.loading.creating = false;
        state.error = action.payload || '创建团队失败';
      });

    // 更新团队
    builder
      .addCase(updateTeam.pending, (state) => {
        state.loading.updating = true;
        state.error = null;
      })
      .addCase(updateTeam.fulfilled, (state, action) => {
        state.loading.updating = false;
        
        if (action.payload.success && action.payload.data) {
          const updatedTeam = action.payload.data;
          
          // 更新团队列表中的数据
          const index = state.teams.findIndex(team => team.id === updatedTeam.id);
          if (index !== -1) {
            state.teams[index] = updatedTeam;
          }
          
          // 更新当前团队数据
          if (state.currentTeam?.id === updatedTeam.id) {
            state.currentTeam = updatedTeam;
          }
        }
      })
      .addCase(updateTeam.rejected, (state, action) => {
        state.loading.updating = false;
        state.error = action.payload || '更新团队失败';
      });

    // 删除团队
    builder
      .addCase(deleteTeam.pending, (state) => {
        state.loading.deleting = true;
        state.error = null;
      })
      .addCase(deleteTeam.fulfilled, (state, action) => {
        state.loading.deleting = false;
        
        if (action.payload.success) {
          // 从列表中移除
          const teamId = action.meta.arg;
          state.teams = state.teams.filter(team => team.id !== teamId);
          state.pagination.total -= 1;
          
          // 如果删除的是当前团队，清除当前团队数据
          if (state.currentTeam?.id === teamId) {
            state.currentTeam = null;
            state.members = [];
            state.invitations = [];
          }
        }
      })
      .addCase(deleteTeam.rejected, (state, action) => {
        state.loading.deleting = false;
        state.error = action.payload || '删除团队失败';
      });

    // 获取团队成员
    builder
      .addCase(fetchTeamMembers.pending, (state) => {
        state.loading.members = true;
        state.error = null;
      })
      .addCase(fetchTeamMembers.fulfilled, (state, action) => {
        state.loading.members = false;
        
        if (action.payload.success && action.payload.data) {
          state.members = action.payload.data;
        }
      })
      .addCase(fetchTeamMembers.rejected, (state, action) => {
        state.loading.members = false;
        state.error = action.payload || '获取团队成员失败';
      });

    // 邀请成员
    builder
      .addCase(inviteTeamMember.fulfilled, (state, action) => {
        if (action.payload.success && action.payload.data) {
          state.invitations.push(action.payload.data);
        }
      });

    // 移除成员
    builder
      .addCase(removeMember.fulfilled, (state, action) => {
        if (action.payload.success) {
          const { userId } = action.meta.arg;
          state.members = state.members.filter(member => member.userId !== userId);
        }
      });

    // 更新成员角色
    builder
      .addCase(updateMemberRole.fulfilled, (state, action) => {
        if (action.payload.success && action.payload.data) {
          const updatedMember = action.payload.data;
          const index = state.members.findIndex(member => member.id === updatedMember.id);
          if (index !== -1) {
            state.members[index] = updatedMember;
          }
        }
      });
  },
});

// 导出 actions
export const {
  clearError,
  setCurrentTeam,
  updateFilters,
  clearTeams,
  clearCurrentTeam,
} = teamSlice.actions;

// 导出 selectors
export const selectTeams = (state: { teams: TeamState }) => state.teams.teams;
export const selectCurrentTeam = (state: { teams: TeamState }) => state.teams.currentTeam;
export const selectTeamMembers = (state: { teams: TeamState }) => state.teams.members;
export const selectTeamInvitations = (state: { teams: TeamState }) => state.teams.invitations;
export const selectTeamPagination = (state: { teams: TeamState }) => state.teams.pagination;
export const selectTeamLoading = (state: { teams: TeamState }) => state.teams.loading;
export const selectTeamError = (state: { teams: TeamState }) => state.teams.error;
export const selectTeamFilters = (state: { teams: TeamState }) => state.teams.filters;

// 导出 reducer
export default teamSlice.reducer;