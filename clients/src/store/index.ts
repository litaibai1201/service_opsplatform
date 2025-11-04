import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';

// 导入 slice reducers
import authSlice from './slices/authSlice';
import uiSlice from './slices/uiSlice';
import teamSlice from './slices/teamSlice';
import projectSlice from './slices/projectSlice';
import collaborationSlice from './slices/collaborationSlice';

// 配置 store
export const store = configureStore({
  reducer: {
    auth: authSlice,
    ui: uiSlice,
    teams: teamSlice,
    projects: projectSlice,
    collaboration: collaborationSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['items.dates'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// 导出类型
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 导出类型化的 hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;