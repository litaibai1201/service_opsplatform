import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { User, LoginRequest, RegisterRequest, ApiResponse } from '@/types';
import { storage } from '@/utils/helpers';
import { STORAGE_KEYS } from '@/utils/constants';

// 异步 actions
export const login = createAsyncThunk<
  ApiResponse<{ user: User; token: string; refreshToken: string }>,
  LoginRequest,
  { rejectValue: string }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    // TODO: 替换为实际的 API 调用
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    
    if (!response.ok) {
      throw new Error('登录失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '登录失败');
  }
});

export const register = createAsyncThunk<
  ApiResponse<{ user: User; token: string; refreshToken: string }>,
  RegisterRequest,
  { rejectValue: string }
>('auth/register', async (userData, { rejectWithValue }) => {
  try {
    // TODO: 替换为实际的 API 调用
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      throw new Error('注册失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '注册失败');
  }
});

export const logout = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // TODO: 替换为实际的 API 调用
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${storage.get(STORAGE_KEYS.AUTH_TOKEN)}`,
        },
      });
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : '登出失败');
    }
  }
);

export const refreshToken = createAsyncThunk<
  ApiResponse<{ token: string; refreshToken: string }>,
  void,
  { rejectValue: string }
>('auth/refreshToken', async (_, { rejectWithValue }) => {
  try {
    const refreshToken = storage.get(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      throw new Error('无有效的刷新令牌');
    }
    
    // TODO: 替换为实际的 API 调用
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      throw new Error('令牌刷新失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '令牌刷新失败');
  }
});

export const fetchUserProfile = createAsyncThunk<
  ApiResponse<User>,
  void,
  { rejectValue: string }
>('auth/fetchUserProfile', async (_, { rejectWithValue }) => {
  try {
    const token = storage.get(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) {
      throw new Error('无有效的访问令牌');
    }
    
    // TODO: 替换为实际的 API 调用
    const response = await fetch('/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('获取用户信息失败');
    }
    
    return await response.json();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '获取用户信息失败');
  }
});

// 状态接口
interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastActivity: number | null;
}

// 初始状态
const initialState: AuthState = {
  user: null,
  token: storage.get(STORAGE_KEYS.AUTH_TOKEN),
  refreshToken: storage.get(STORAGE_KEYS.REFRESH_TOKEN),
  isAuthenticated: Boolean(storage.get(STORAGE_KEYS.AUTH_TOKEN)),
  isLoading: false,
  error: null,
  lastActivity: null,
};

// 创建 slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },

    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },

    updateUserProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },

    setAuthData: (state, action: PayloadAction<{ user: User; token: string; refreshToken: string }>) => {
      const { user, token, refreshToken } = action.payload;
      state.user = user;
      state.token = token;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      state.lastActivity = Date.now();
      state.error = null;

      // 保存到本地存储
      storage.set(STORAGE_KEYS.AUTH_TOKEN, token);
      storage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    },

    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
      state.lastActivity = null;

      // 清除本地存储
      storage.remove(STORAGE_KEYS.AUTH_TOKEN);
      storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    },
  },
  extraReducers: (builder) => {
    // 登录
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        
        if (action.payload.success && action.payload.data) {
          const { user, token, refreshToken } = action.payload.data;
          state.user = user;
          state.token = token;
          state.refreshToken = refreshToken;
          state.isAuthenticated = true;
          state.lastActivity = Date.now();
          
          // 保存到本地存储
          storage.set(STORAGE_KEYS.AUTH_TOKEN, token);
          storage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || '登录失败';
        state.isAuthenticated = false;
      });

    // 注册
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        
        if (action.payload.success && action.payload.data) {
          const { user, token, refreshToken } = action.payload.data;
          state.user = user;
          state.token = token;
          state.refreshToken = refreshToken;
          state.isAuthenticated = true;
          state.lastActivity = Date.now();
          
          // 保存到本地存储
          storage.set(STORAGE_KEYS.AUTH_TOKEN, token);
          storage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || '注册失败';
      });

    // 登出
    builder
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
        state.lastActivity = null;
        
        // 清除本地存储
        storage.remove(STORAGE_KEYS.AUTH_TOKEN);
        storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || '登出失败';
        
        // 即使登出失败，也清除本地状态
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        storage.remove(STORAGE_KEYS.AUTH_TOKEN);
        storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
      });

    // 刷新令牌
    builder
      .addCase(refreshToken.fulfilled, (state, action) => {
        if (action.payload.success && action.payload.data) {
          const { token, refreshToken } = action.payload.data;
          state.token = token;
          state.refreshToken = refreshToken;
          state.lastActivity = Date.now();
          
          // 更新本地存储
          storage.set(STORAGE_KEYS.AUTH_TOKEN, token);
          storage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.error = action.payload || '令牌刷新失败';
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        
        // 清除本地存储
        storage.remove(STORAGE_KEYS.AUTH_TOKEN);
        storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
      });

    // 获取用户信息
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        
        if (action.payload.success && action.payload.data) {
          state.user = action.payload.data;
          state.lastActivity = Date.now();
        }
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || '获取用户信息失败';
        
        // 如果是认证错误，清除认证状态
        if (action.payload?.includes('401') || action.payload?.includes('认证')) {
          state.user = null;
          state.token = null;
          state.refreshToken = null;
          state.isAuthenticated = false;
          storage.remove(STORAGE_KEYS.AUTH_TOKEN);
          storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
        }
      });
  },
});

// 导出 actions
export const { clearError, updateLastActivity, updateUserProfile, setAuthData, clearAuth } = authSlice.actions;

// 导出 selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;

// 导出 reducer
export default authSlice.reducer;