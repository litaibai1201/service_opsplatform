import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { 
  Project, 
  ProjectMaintainer, 
  CreateProjectRequest, 
  UpdateProjectRequest,
  ApiResponse,
  PaginatedResponse
} from '@/types';

// 异步 actions
export const fetchProjects = createAsyncThunk<
  ApiResponse<PaginatedResponse<Project>>,
  { teamId?: string; page?: number; pageSize?: number; search?: string },
  { rejectValue: string }
>('projects/fetchProjects', async (params, { rejectWithValue }) => {
  try {
    const searchParams = new URLSearchParams({
      page: (params.page || 1).toString(),
      pageSize: (params.pageSize || 20).toString(),
      ...(params.search && { search: params.search }),
      ...(params.teamId && { teamId: params.teamId }),
    });
    
    const response = await fetch(`/api/projects?${searchParams}`);
    
    if (!response.ok) {
      throw new Error('获取项目列表失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '获取项目列表失败');
  }
});

export const fetchProjectDetail = createAsyncThunk<
  ApiResponse<Project>,
  string,
  { rejectValue: string }
>('projects/fetchProjectDetail', async (projectId, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/projects/${projectId}`);
    
    if (!response.ok) {
      throw new Error('获取项目详情失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '获取项目详情失败');
  }
});

export const createProject = createAsyncThunk<
  ApiResponse<Project>,
  CreateProjectRequest,
  { rejectValue: string }
>('projects/createProject', async (projectData, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/teams/${projectData.teamId}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData),
    });
    
    if (!response.ok) {
      throw new Error('创建项目失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '创建项目失败');
  }
});

export const updateProject = createAsyncThunk<
  ApiResponse<Project>,
  { projectId: string; data: UpdateProjectRequest },
  { rejectValue: string }
>('projects/updateProject', async ({ projectId, data }, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('更新项目失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '更新项目失败');
  }
});

export const deleteProject = createAsyncThunk<
  ApiResponse<void>,
  string,
  { rejectValue: string }
>('projects/deleteProject', async (projectId, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('删除项目失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '删除项目失败');
  }
});

export const archiveProject = createAsyncThunk<
  ApiResponse<Project>,
  string,
  { rejectValue: string }
>('projects/archiveProject', async (projectId, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/projects/${projectId}/archive`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('归档项目失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '归档项目失败');
  }
});

export const fetchProjectMaintainers = createAsyncThunk<
  ApiResponse<ProjectMaintainer[]>,
  string,
  { rejectValue: string }
>('projects/fetchProjectMaintainers', async (projectId, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/projects/${projectId}/maintainers`);
    
    if (!response.ok) {
      throw new Error('获取项目维护者失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '获取项目维护者失败');
  }
});

export const assignMaintainer = createAsyncThunk<
  ApiResponse<ProjectMaintainer>,
  { projectId: string; userId: string },
  { rejectValue: string }
>('projects/assignMaintainer', async ({ projectId, userId }, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/projects/${projectId}/maintainers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    
    if (!response.ok) {
      throw new Error('指定维护者失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '指定维护者失败');
  }
});

export const removeMaintainer = createAsyncThunk<
  ApiResponse<void>,
  { projectId: string; userId: string },
  { rejectValue: string }
>('projects/removeMaintainer', async ({ projectId, userId }, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/projects/${projectId}/maintainers/${userId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('移除维护者失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '移除维护者失败');
  }
});

// 状态接口
interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  maintainers: ProjectMaintainer[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  loading: {
    projects: boolean;
    currentProject: boolean;
    maintainers: boolean;
    creating: boolean;
    updating: boolean;
    deleting: boolean;
    archiving: boolean;
  };
  error: string | null;
  filters: {
    search: string;
    teamId: string | null;
    visibility: 'all' | 'public' | 'private';
    status: 'all' | 'active' | 'archived';
  };
}

// 初始状态
const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  maintainers: [],
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0,
  },
  loading: {
    projects: false,
    currentProject: false,
    maintainers: false,
    creating: false,
    updating: false,
    deleting: false,
    archiving: false,
  },
  error: null,
  filters: {
    search: '',
    teamId: null,
    visibility: 'all',
    status: 'all',
  },
};

// 创建 slice
const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    
    setCurrentProject: (state, action: PayloadAction<Project | null>) => {
      state.currentProject = action.payload;
    },
    
    updateFilters: (state, action: PayloadAction<Partial<ProjectState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    clearProjects: (state) => {
      state.projects = [];
      state.pagination = initialState.pagination;
    },
    
    clearCurrentProject: (state) => {
      state.currentProject = null;
      state.maintainers = [];
    },
    
    addProject: (state, action: PayloadAction<Project>) => {
      state.projects.unshift(action.payload);
      state.pagination.total += 1;
    },
    
    updateProjectInList: (state, action: PayloadAction<Project>) => {
      const index = state.projects.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.projects[index] = action.payload;
      }
    },
    
    removeProjectFromList: (state, action: PayloadAction<string>) => {
      state.projects = state.projects.filter(p => p.id !== action.payload);
      state.pagination.total -= 1;
    },
  },
  extraReducers: (builder) => {
    // 获取项目列表
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading.projects = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading.projects = false;
        
        if (action.payload.success && action.payload.data) {
          const { data, total, page, pageSize } = action.payload.data;
          state.projects = data;
          state.pagination = {
            current: page,
            pageSize,
            total,
          };
        }
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading.projects = false;
        state.error = action.payload || '获取项目列表失败';
      });

    // 获取项目详情
    builder
      .addCase(fetchProjectDetail.pending, (state) => {
        state.loading.currentProject = true;
        state.error = null;
      })
      .addCase(fetchProjectDetail.fulfilled, (state, action) => {
        state.loading.currentProject = false;
        
        if (action.payload.success && action.payload.data) {
          state.currentProject = action.payload.data;
        }
      })
      .addCase(fetchProjectDetail.rejected, (state, action) => {
        state.loading.currentProject = false;
        state.error = action.payload || '获取项目详情失败';
      });

    // 创建项目
    builder
      .addCase(createProject.pending, (state) => {
        state.loading.creating = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.loading.creating = false;
        
        if (action.payload.success && action.payload.data) {
          state.projects.unshift(action.payload.data);
          state.pagination.total += 1;
        }
      })
      .addCase(createProject.rejected, (state, action) => {
        state.loading.creating = false;
        state.error = action.payload || '创建项目失败';
      });

    // 更新项目
    builder
      .addCase(updateProject.pending, (state) => {
        state.loading.updating = true;
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.loading.updating = false;
        
        if (action.payload.success && action.payload.data) {
          const updatedProject = action.payload.data;
          
          // 更新项目列表中的数据
          const index = state.projects.findIndex(project => project.id === updatedProject.id);
          if (index !== -1) {
            state.projects[index] = updatedProject;
          }
          
          // 更新当前项目数据
          if (state.currentProject?.id === updatedProject.id) {
            state.currentProject = updatedProject;
          }
        }
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.loading.updating = false;
        state.error = action.payload || '更新项目失败';
      });

    // 删除项目
    builder
      .addCase(deleteProject.pending, (state) => {
        state.loading.deleting = true;
        state.error = null;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.loading.deleting = false;
        
        if (action.payload.success) {
          const projectId = action.meta.arg;
          state.projects = state.projects.filter(project => project.id !== projectId);
          state.pagination.total -= 1;
          
          if (state.currentProject?.id === projectId) {
            state.currentProject = null;
            state.maintainers = [];
          }
        }
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.loading.deleting = false;
        state.error = action.payload || '删除项目失败';
      });

    // 归档项目
    builder
      .addCase(archiveProject.pending, (state) => {
        state.loading.archiving = true;
        state.error = null;
      })
      .addCase(archiveProject.fulfilled, (state, action) => {
        state.loading.archiving = false;
        
        if (action.payload.success && action.payload.data) {
          const archivedProject = action.payload.data;
          
          // 更新项目列表中的数据
          const index = state.projects.findIndex(project => project.id === archivedProject.id);
          if (index !== -1) {
            state.projects[index] = archivedProject;
          }
          
          // 更新当前项目数据
          if (state.currentProject?.id === archivedProject.id) {
            state.currentProject = archivedProject;
          }
        }
      })
      .addCase(archiveProject.rejected, (state, action) => {
        state.loading.archiving = false;
        state.error = action.payload || '归档项目失败';
      });

    // 获取项目维护者
    builder
      .addCase(fetchProjectMaintainers.pending, (state) => {
        state.loading.maintainers = true;
        state.error = null;
      })
      .addCase(fetchProjectMaintainers.fulfilled, (state, action) => {
        state.loading.maintainers = false;
        
        if (action.payload.success && action.payload.data) {
          state.maintainers = action.payload.data;
        }
      })
      .addCase(fetchProjectMaintainers.rejected, (state, action) => {
        state.loading.maintainers = false;
        state.error = action.payload || '获取项目维护者失败';
      });

    // 指定维护者
    builder
      .addCase(assignMaintainer.fulfilled, (state, action) => {
        if (action.payload.success && action.payload.data) {
          state.maintainers.push(action.payload.data);
        }
      });

    // 移除维护者
    builder
      .addCase(removeMaintainer.fulfilled, (state, action) => {
        if (action.payload.success) {
          const { userId } = action.meta.arg;
          state.maintainers = state.maintainers.filter(maintainer => maintainer.userId !== userId);
        }
      });
  },
});

// 导出 actions
export const {
  clearError,
  setCurrentProject,
  updateFilters,
  clearProjects,
  clearCurrentProject,
  addProject,
  updateProjectInList,
  removeProjectFromList,
} = projectSlice.actions;

// 导出 selectors
export const selectProjects = (state: { projects: ProjectState }) => state.projects.projects;
export const selectCurrentProject = (state: { projects: ProjectState }) => state.projects.currentProject;
export const selectProjectMaintainers = (state: { projects: ProjectState }) => state.projects.maintainers;
export const selectProjectPagination = (state: { projects: ProjectState }) => state.projects.pagination;
export const selectProjectLoading = (state: { projects: ProjectState }) => state.projects.loading;
export const selectProjectError = (state: { projects: ProjectState }) => state.projects.error;
export const selectProjectFilters = (state: { projects: ProjectState }) => state.projects.filters;

// 导出 reducer
export default projectSlice.reducer;