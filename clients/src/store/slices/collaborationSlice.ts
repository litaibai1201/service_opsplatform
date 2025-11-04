import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { 
  CollaborationSession, 
  Operation, 
  VersionBranch, 
  VersionCommit,
  MergeRequest,
  ApiResponse
} from '@/types';

// 异步 actions
export const joinCollaboration = createAsyncThunk<
  ApiResponse<CollaborationSession>,
  { documentId: string; documentType: string },
  { rejectValue: string }
>('collaboration/joinCollaboration', async ({ documentId, documentType }, { rejectWithValue }) => {
  try {
    const response = await fetch('/api/collaboration/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, documentType }),
    });
    
    if (!response.ok) {
      throw new Error('加入协作失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '加入协作失败');
  }
});

export const leaveCollaboration = createAsyncThunk<
  ApiResponse<void>,
  string,
  { rejectValue: string }
>('collaboration/leaveCollaboration', async (sessionId, { rejectWithValue }) => {
  try {
    const response = await fetch('/api/collaboration/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    
    if (!response.ok) {
      throw new Error('离开协作失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '离开协作失败');
  }
});

export const submitOperation = createAsyncThunk<
  ApiResponse<Operation>,
  { documentId: string; documentType: string; operationType: string; operationData: any },
  { rejectValue: string }
>('collaboration/submitOperation', async (operationData, { rejectWithValue }) => {
  try {
    const response = await fetch('/api/collaboration/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operationData),
    });
    
    if (!response.ok) {
      throw new Error('提交操作失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '提交操作失败');
  }
});

export const fetchOperationHistory = createAsyncThunk<
  ApiResponse<Operation[]>,
  { documentId: string; limit?: number; offset?: number },
  { rejectValue: string }
>('collaboration/fetchOperationHistory', async ({ documentId, limit = 50, offset = 0 }, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    
    const response = await fetch(`/api/collaboration/operations/${documentId}?${params}`);
    
    if (!response.ok) {
      throw new Error('获取操作历史失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '获取操作历史失败');
  }
});

export const fetchBranches = createAsyncThunk<
  ApiResponse<VersionBranch[]>,
  { documentId: string; documentType: string },
  { rejectValue: string }
>('collaboration/fetchBranches', async ({ documentId, documentType }, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams({ documentId, documentType });
    const response = await fetch(`/api/version-control/branches?${params}`);
    
    if (!response.ok) {
      throw new Error('获取分支失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '获取分支失败');
  }
});

export const createBranch = createAsyncThunk<
  ApiResponse<VersionBranch>,
  { documentId: string; documentType: string; branchName: string; parentBranchId?: string },
  { rejectValue: string }
>('collaboration/createBranch', async (branchData, { rejectWithValue }) => {
  try {
    const response = await fetch('/api/version-control/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branchData),
    });
    
    if (!response.ok) {
      throw new Error('创建分支失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '创建分支失败');
  }
});

export const createCommit = createAsyncThunk<
  ApiResponse<VersionCommit>,
  { branchId: string; message: string; documentSnapshot: any; changesSummary?: any },
  { rejectValue: string }
>('collaboration/createCommit', async (commitData, { rejectWithValue }) => {
  try {
    const response = await fetch('/api/version-control/commits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commitData),
    });
    
    if (!response.ok) {
      throw new Error('创建提交失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '创建提交失败');
  }
});

export const fetchMergeRequests = createAsyncThunk<
  ApiResponse<MergeRequest[]>,
  { documentId: string; documentType: string; status?: string },
  { rejectValue: string }
>('collaboration/fetchMergeRequests', async ({ documentId, documentType, status }, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams({ 
      documentId, 
      documentType,
      ...(status && { status }),
    });
    
    const response = await fetch(`/api/version-control/merge-requests?${params}`);
    
    if (!response.ok) {
      throw new Error('获取合并请求失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '获取合并请求失败');
  }
});

// 状态接口
interface CollaborationState {
  // 当前协作会话
  currentSession: CollaborationSession | null;
  
  // 在线用户
  activeUsers: CollaborationSession[];
  
  // 操作历史
  operations: Operation[];
  operationsPagination: {
    hasMore: boolean;
    offset: number;
    limit: number;
  };
  
  // 版本控制
  branches: VersionBranch[];
  currentBranch: VersionBranch | null;
  commits: VersionCommit[];
  mergeRequests: MergeRequest[];
  
  // 实时状态
  cursors: Record<string, { userId: string; position: any; color: string }>;
  selections: Record<string, { userId: string; range: any; color: string }>;
  locks: Record<string, { userId: string; elements: any[]; lockedAt: string }>;
  
  // 冲突处理
  conflicts: Array<{
    id: string;
    operationId: string;
    type: string;
    description: string;
    suggestions: any[];
  }>;
  
  // 加载状态
  loading: {
    joining: boolean;
    operations: boolean;
    branches: boolean;
    commits: boolean;
    mergeRequests: boolean;
  };
  
  // 错误状态
  error: string | null;
  
  // 连接状态
  connected: boolean;
  reconnecting: boolean;
  
  // 设置
  settings: {
    autoSave: boolean;
    autoSaveInterval: number;
    showCursors: boolean;
    showSelections: boolean;
    conflictResolution: 'auto' | 'manual';
  };
}

// 初始状态
const initialState: CollaborationState = {
  currentSession: null,
  activeUsers: [],
  operations: [],
  operationsPagination: {
    hasMore: true,
    offset: 0,
    limit: 50,
  },
  branches: [],
  currentBranch: null,
  commits: [],
  mergeRequests: [],
  cursors: {},
  selections: {},
  locks: {},
  conflicts: [],
  loading: {
    joining: false,
    operations: false,
    branches: false,
    commits: false,
    mergeRequests: false,
  },
  error: null,
  connected: false,
  reconnecting: false,
  settings: {
    autoSave: true,
    autoSaveInterval: 30000,
    showCursors: true,
    showSelections: true,
    conflictResolution: 'manual',
  },
};

// 创建 slice
const collaborationSlice = createSlice({
  name: 'collaboration',
  initialState,
  reducers: {
    // 连接状态
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
      if (action.payload) {
        state.reconnecting = false;
      }
    },
    
    setReconnecting: (state, action: PayloadAction<boolean>) => {
      state.reconnecting = action.payload;
    },
    
    // 清除错误
    clearError: (state) => {
      state.error = null;
    },
    
    // 清除协作状态
    clearCollaboration: (state) => {
      state.currentSession = null;
      state.activeUsers = [];
      state.operations = [];
      state.cursors = {};
      state.selections = {};
      state.locks = {};
      state.conflicts = [];
      state.connected = false;
    },
    
    // 用户加入/离开
    userJoined: (state, action: PayloadAction<CollaborationSession>) => {
      const existingIndex = state.activeUsers.findIndex(user => user.userId === action.payload.userId);
      if (existingIndex === -1) {
        state.activeUsers.push(action.payload);
      } else {
        state.activeUsers[existingIndex] = action.payload;
      }
    },
    
    userLeft: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      state.activeUsers = state.activeUsers.filter(user => user.userId !== userId);
      delete state.cursors[userId];
      delete state.selections[userId];
    },
    
    // 光标位置更新
    updateCursor: (state, action: PayloadAction<{ userId: string; position: any; color: string }>) => {
      const { userId, position, color } = action.payload;
      state.cursors[userId] = { userId, position, color };
    },
    
    removeCursor: (state, action: PayloadAction<string>) => {
      delete state.cursors[action.payload];
    },
    
    // 选择范围更新
    updateSelection: (state, action: PayloadAction<{ userId: string; range: any; color: string }>) => {
      const { userId, range, color } = action.payload;
      state.selections[userId] = { userId, range, color };
    },
    
    removeSelection: (state, action: PayloadAction<string>) => {
      delete state.selections[action.payload];
    },
    
    // 锁定状态
    addLock: (state, action: PayloadAction<{ userId: string; elements: any[]; lockedAt: string }>) => {
      const { userId, elements, lockedAt } = action.payload;
      state.locks[userId] = { userId, elements, lockedAt };
    },
    
    removeLock: (state, action: PayloadAction<string>) => {
      delete state.locks[action.payload];
    },
    
    // 操作处理
    addOperation: (state, action: PayloadAction<Operation>) => {
      state.operations.unshift(action.payload);
      
      // 保持操作历史在合理数量内
      if (state.operations.length > 1000) {
        state.operations = state.operations.slice(0, 1000);
      }
    },
    
    // 冲突处理
    addConflict: (state, action: PayloadAction<CollaborationState['conflicts'][0]>) => {
      state.conflicts.push(action.payload);
    },
    
    resolveConflict: (state, action: PayloadAction<string>) => {
      state.conflicts = state.conflicts.filter(conflict => conflict.id !== action.payload);
    },
    
    clearConflicts: (state) => {
      state.conflicts = [];
    },
    
    // 分支管理
    setCurrentBranch: (state, action: PayloadAction<VersionBranch | null>) => {
      state.currentBranch = action.payload;
    },
    
    addBranch: (state, action: PayloadAction<VersionBranch>) => {
      state.branches.push(action.payload);
    },
    
    updateBranch: (state, action: PayloadAction<VersionBranch>) => {
      const index = state.branches.findIndex(branch => branch.id === action.payload.id);
      if (index !== -1) {
        state.branches[index] = action.payload;
      }
    },
    
    // 提交管理
    addCommit: (state, action: PayloadAction<VersionCommit>) => {
      state.commits.unshift(action.payload);
    },
    
    // 合并请求
    addMergeRequest: (state, action: PayloadAction<MergeRequest>) => {
      state.mergeRequests.unshift(action.payload);
    },
    
    updateMergeRequest: (state, action: PayloadAction<MergeRequest>) => {
      const index = state.mergeRequests.findIndex(mr => mr.id === action.payload.id);
      if (index !== -1) {
        state.mergeRequests[index] = action.payload;
      }
    },
    
    // 设置
    updateSettings: (state, action: PayloadAction<Partial<CollaborationState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    // 加入协作
    builder
      .addCase(joinCollaboration.pending, (state) => {
        state.loading.joining = true;
        state.error = null;
      })
      .addCase(joinCollaboration.fulfilled, (state, action) => {
        state.loading.joining = false;
        
        if (action.payload.success && action.payload.data) {
          state.currentSession = action.payload.data;
          state.connected = true;
        }
      })
      .addCase(joinCollaboration.rejected, (state, action) => {
        state.loading.joining = false;
        state.error = action.payload || '加入协作失败';
      });

    // 离开协作
    builder
      .addCase(leaveCollaboration.fulfilled, (state) => {
        state.currentSession = null;
        state.activeUsers = [];
        state.cursors = {};
        state.selections = {};
        state.locks = {};
        state.connected = false;
      });

    // 提交操作
    builder
      .addCase(submitOperation.fulfilled, (state, action) => {
        if (action.payload.success && action.payload.data) {
          state.operations.unshift(action.payload.data);
        }
      });

    // 获取操作历史
    builder
      .addCase(fetchOperationHistory.pending, (state) => {
        state.loading.operations = true;
        state.error = null;
      })
      .addCase(fetchOperationHistory.fulfilled, (state, action) => {
        state.loading.operations = false;
        
        if (action.payload.success && action.payload.data) {
          const newOperations = action.payload.data;
          state.operations = [...state.operations, ...newOperations];
          state.operationsPagination.offset += newOperations.length;
          state.operationsPagination.hasMore = newOperations.length === state.operationsPagination.limit;
        }
      })
      .addCase(fetchOperationHistory.rejected, (state, action) => {
        state.loading.operations = false;
        state.error = action.payload || '获取操作历史失败';
      });

    // 获取分支
    builder
      .addCase(fetchBranches.pending, (state) => {
        state.loading.branches = true;
        state.error = null;
      })
      .addCase(fetchBranches.fulfilled, (state, action) => {
        state.loading.branches = false;
        
        if (action.payload.success && action.payload.data) {
          state.branches = action.payload.data;
          
          // 设置主分支为当前分支
          const mainBranch = state.branches.find(branch => branch.branchName === 'main' || branch.branchName === 'master');
          if (mainBranch && !state.currentBranch) {
            state.currentBranch = mainBranch;
          }
        }
      })
      .addCase(fetchBranches.rejected, (state, action) => {
        state.loading.branches = false;
        state.error = action.payload || '获取分支失败';
      });

    // 创建分支
    builder
      .addCase(createBranch.fulfilled, (state, action) => {
        if (action.payload.success && action.payload.data) {
          state.branches.push(action.payload.data);
        }
      });

    // 创建提交
    builder
      .addCase(createCommit.fulfilled, (state, action) => {
        if (action.payload.success && action.payload.data) {
          state.commits.unshift(action.payload.data);
          
          // 更新当前分支的头提交
          if (state.currentBranch && state.currentBranch.id === action.meta.arg.branchId) {
            state.currentBranch.headCommitId = action.payload.data.id;
          }
        }
      });

    // 获取合并请求
    builder
      .addCase(fetchMergeRequests.pending, (state) => {
        state.loading.mergeRequests = true;
        state.error = null;
      })
      .addCase(fetchMergeRequests.fulfilled, (state, action) => {
        state.loading.mergeRequests = false;
        
        if (action.payload.success && action.payload.data) {
          state.mergeRequests = action.payload.data;
        }
      })
      .addCase(fetchMergeRequests.rejected, (state, action) => {
        state.loading.mergeRequests = false;
        state.error = action.payload || '获取合并请求失败';
      });
  },
});

// 导出 actions
export const {
  setConnected,
  setReconnecting,
  clearError,
  clearCollaboration,
  userJoined,
  userLeft,
  updateCursor,
  removeCursor,
  updateSelection,
  removeSelection,
  addLock,
  removeLock,
  addOperation,
  addConflict,
  resolveConflict,
  clearConflicts,
  setCurrentBranch,
  addBranch,
  updateBranch,
  addCommit,
  addMergeRequest,
  updateMergeRequest,
  updateSettings,
} = collaborationSlice.actions;

// 导出 selectors
export const selectCollaboration = (state: { collaboration: CollaborationState }) => state.collaboration;
export const selectCurrentSession = (state: { collaboration: CollaborationState }) => state.collaboration.currentSession;
export const selectActiveUsers = (state: { collaboration: CollaborationState }) => state.collaboration.activeUsers;
export const selectOperations = (state: { collaboration: CollaborationState }) => state.collaboration.operations;
export const selectBranches = (state: { collaboration: CollaborationState }) => state.collaboration.branches;
export const selectCurrentBranch = (state: { collaboration: CollaborationState }) => state.collaboration.currentBranch;
export const selectCommits = (state: { collaboration: CollaborationState }) => state.collaboration.commits;
export const selectMergeRequests = (state: { collaboration: CollaborationState }) => state.collaboration.mergeRequests;
export const selectCursors = (state: { collaboration: CollaborationState }) => state.collaboration.cursors;
export const selectSelections = (state: { collaboration: CollaborationState }) => state.collaboration.selections;
export const selectLocks = (state: { collaboration: CollaborationState }) => state.collaboration.locks;
export const selectConflicts = (state: { collaboration: CollaborationState }) => state.collaboration.conflicts;
export const selectCollaborationLoading = (state: { collaboration: CollaborationState }) => state.collaboration.loading;
export const selectCollaborationError = (state: { collaboration: CollaborationState }) => state.collaboration.error;
export const selectCollaborationConnected = (state: { collaboration: CollaborationState }) => state.collaboration.connected;
export const selectCollaborationSettings = (state: { collaboration: CollaborationState }) => state.collaboration.settings;

// 导出 reducer
export default collaborationSlice.reducer;