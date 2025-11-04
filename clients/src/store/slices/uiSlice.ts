import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { storage } from '@/utils/helpers';
import { STORAGE_KEYS, DEFAULTS } from '@/utils/constants';
import type { ThemeConfig, NotificationItem } from '@/types';

// UI 状态接口
interface UIState {
  theme: ThemeConfig;
  sidebarCollapsed: boolean;
  notifications: NotificationItem[];
  loading: {
    global: boolean;
    components: Record<string, boolean>;
  };
  modals: {
    [key: string]: {
      isOpen: boolean;
      data?: any;
    };
  };
  toasts: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message?: string;
    duration?: number;
    timestamp: number;
  }>;
  breadcrumbs: Array<{
    label: string;
    href?: string;
    current?: boolean;
  }>;
  pageTitle: string;
  pageSubtitle?: string;
}

// 初始状态
const initialState: UIState = {
  theme: storage.get(STORAGE_KEYS.THEME) || {
    mode: DEFAULTS.THEME as 'light' | 'dark' | 'system',
    primaryColor: '#3b82f6',
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    compactMode: false,
  },
  sidebarCollapsed: storage.get(STORAGE_KEYS.SIDEBAR_COLLAPSED) || false,
  notifications: [],
  loading: {
    global: false,
    components: {},
  },
  modals: {},
  toasts: [],
  breadcrumbs: [],
  pageTitle: '',
  pageSubtitle: undefined,
};

// 创建 slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // 主题相关
    setTheme: (state, action: PayloadAction<Partial<ThemeConfig>>) => {
      state.theme = { ...state.theme, ...action.payload };
      storage.set(STORAGE_KEYS.THEME, state.theme);
    },
    
    toggleThemeMode: (state) => {
      const modes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
      const currentIndex = modes.indexOf(state.theme.mode);
      const nextIndex = (currentIndex + 1) % modes.length;
      state.theme.mode = modes[nextIndex];
      storage.set(STORAGE_KEYS.THEME, state.theme);
    },

    // 侧边栏相关
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
      storage.set(STORAGE_KEYS.SIDEBAR_COLLAPSED, action.payload);
    },
    
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      storage.set(STORAGE_KEYS.SIDEBAR_COLLAPSED, state.sidebarCollapsed);
    },

    // 通知相关
    addNotification: (state, action: PayloadAction<Omit<NotificationItem, 'id' | 'timestamp' | 'read'>>) => {
      const notification: NotificationItem = {
        ...action.payload,
        id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        read: false,
      };
      state.notifications.unshift(notification);
    },
    
    markNotificationRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    
    markAllNotificationsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
    },

    // 加载状态相关
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },
    
    setComponentLoading: (state, action: PayloadAction<{ component: string; loading: boolean }>) => {
      const { component, loading } = action.payload;
      if (loading) {
        state.loading.components[component] = true;
      } else {
        delete state.loading.components[component];
      }
    },

    // 模态框相关
    openModal: (state, action: PayloadAction<{ modalId: string; data?: any }>) => {
      const { modalId, data } = action.payload;
      state.modals[modalId] = {
        isOpen: true,
        data,
      };
    },
    
    closeModal: (state, action: PayloadAction<string>) => {
      const modalId = action.payload;
      if (state.modals[modalId]) {
        state.modals[modalId].isOpen = false;
        delete state.modals[modalId].data;
      }
    },
    
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(modalId => {
        state.modals[modalId].isOpen = false;
        delete state.modals[modalId].data;
      });
    },

    // Toast 通知相关
    addToast: (state, action: PayloadAction<Omit<UIState['toasts'][0], 'id' | 'timestamp'>>) => {
      const toast = {
        ...action.payload,
        id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };
      state.toasts.push(toast);
    },
    
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
    },
    
    clearToasts: (state) => {
      state.toasts = [];
    },

    // 面包屑导航相关
    setBreadcrumbs: (state, action: PayloadAction<UIState['breadcrumbs']>) => {
      state.breadcrumbs = action.payload;
    },
    
    addBreadcrumb: (state, action: PayloadAction<UIState['breadcrumbs'][0]>) => {
      // 移除当前项标记
      state.breadcrumbs.forEach(item => {
        item.current = false;
      });
      
      // 添加新项并标记为当前
      state.breadcrumbs.push({
        ...action.payload,
        current: true,
      });
    },
    
    clearBreadcrumbs: (state) => {
      state.breadcrumbs = [];
    },

    // 页面标题相关
    setPageTitle: (state, action: PayloadAction<{ title: string; subtitle?: string }>) => {
      state.pageTitle = action.payload.title;
      state.pageSubtitle = action.payload.subtitle;
      
      // 更新浏览器标题
      document.title = action.payload.title 
        ? `${action.payload.title} - Service Ops Platform`
        : 'Service Ops Platform';
    },
  },
});

// 导出 actions
export const {
  setTheme,
  toggleThemeMode,
  setSidebarCollapsed,
  toggleSidebar,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
  removeNotification,
  clearNotifications,
  setGlobalLoading,
  setComponentLoading,
  openModal,
  closeModal,
  closeAllModals,
  addToast,
  removeToast,
  clearToasts,
  setBreadcrumbs,
  addBreadcrumb,
  clearBreadcrumbs,
  setPageTitle,
} = uiSlice.actions;

// 导出 selectors
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectSidebarCollapsed = (state: { ui: UIState }) => state.ui.sidebarCollapsed;
export const selectNotifications = (state: { ui: UIState }) => state.ui.notifications;
export const selectUnreadNotificationCount = (state: { ui: UIState }) => 
  state.ui.notifications.filter(n => !n.read).length;
export const selectGlobalLoading = (state: { ui: UIState }) => state.ui.loading.global;
export const selectComponentLoading = (component: string) => (state: { ui: UIState }) => 
  state.ui.loading.components[component] || false;
export const selectModal = (modalId: string) => (state: { ui: UIState }) => 
  state.ui.modals[modalId] || { isOpen: false };
export const selectToasts = (state: { ui: UIState }) => state.ui.toasts;
export const selectBreadcrumbs = (state: { ui: UIState }) => state.ui.breadcrumbs;
export const selectPageTitle = (state: { ui: UIState }) => state.ui.pageTitle;
export const selectPageSubtitle = (state: { ui: UIState }) => state.ui.pageSubtitle;

// 导出 reducer
export default uiSlice.reducer;