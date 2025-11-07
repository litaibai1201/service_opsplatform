import { useState, useCallback, useEffect } from 'react';
import { dashboardApi } from '@/services/api/dashboardApi';
import { showToast } from '@/components/ui/ToastContainer';
import type { DashboardStats } from '@/pages/dashboard/components/StatsCards';
import type { Activity } from '@/pages/dashboard/components/ActivityFeed';
import type { RecentProject } from '@/pages/dashboard/components/RecentProjects';

export interface DashboardData {
  stats: DashboardStats | null;
  activities: Activity[];
  recentProjects: RecentProject[];
  charts: any; // 图表数据，后续可以具体定义
}

export interface UseDashboardReturn {
  // 数据
  stats: DashboardStats | null;
  activities: Activity[];
  recentProjects: RecentProject[];
  charts: any;
  
  // 状态
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // 操作
  refreshDashboard: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshActivities: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  clearError: () => void;
}

export const useDashboard = (): UseDashboardReturn => {
  const [data, setData] = useState<DashboardData>({
    stats: null,
    activities: [],
    recentProjects: [],
    charts: null,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 获取仪表板统计数据
  const refreshStats = useCallback(async () => {
    try {
      setError(null);
      const stats = await dashboardApi.getStats();
      setData(prev => ({ ...prev, stats }));
    } catch (err: any) {
      const errorMessage = err.message || '获取统计数据失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // 获取活动动态
  const refreshActivities = useCallback(async () => {
    try {
      setError(null);
      const activities = await dashboardApi.getActivities();
      setData(prev => ({ ...prev, activities }));
    } catch (err: any) {
      const errorMessage = err.message || '获取活动数据失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // 获取最近项目
  const refreshProjects = useCallback(async () => {
    try {
      setError(null);
      const recentProjects = await dashboardApi.getRecentProjects();
      setData(prev => ({ ...prev, recentProjects }));
    } catch (err: any) {
      const errorMessage = err.message || '获取项目数据失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // 刷新所有仪表板数据
  const refreshDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 并行获取所有数据
      const [statsData, activitiesData, projectsData] = await Promise.allSettled([
        dashboardApi.getStats(),
        dashboardApi.getActivities(),
        dashboardApi.getRecentProjects(),
      ]);

      // 处理统计数据
      if (statsData.status === 'fulfilled') {
        setData(prev => ({ ...prev, stats: statsData.value }));
      }

      // 处理活动数据
      if (activitiesData.status === 'fulfilled') {
        setData(prev => ({ ...prev, activities: activitiesData.value }));
      }

      // 处理项目数据
      if (projectsData.status === 'fulfilled') {
        setData(prev => ({ ...prev, recentProjects: projectsData.value }));
      }

      // 检查是否有任何请求失败
      const failedRequests = [statsData, activitiesData, projectsData].filter(
        result => result.status === 'rejected'
      );

      if (failedRequests.length > 0) {
        const errorMessages = failedRequests.map((result: any) => 
          result.reason?.message || '请求失败'
        );
        throw new Error(`部分数据加载失败: ${errorMessages.join(', ')}`);
      }

      setLastUpdated(new Date());
    } catch (err: any) {
      const errorMessage = err.message || '刷新仪表板数据失败';
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 组件挂载时加载数据
  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  // 定期刷新数据（每5分钟）
  useEffect(() => {
    const interval = setInterval(() => {
      refreshDashboard();
    }, 5 * 60 * 1000); // 5分钟

    return () => clearInterval(interval);
  }, [refreshDashboard]);

  return {
    // 数据
    stats: data.stats,
    activities: data.activities,
    recentProjects: data.recentProjects,
    charts: data.charts,
    
    // 状态
    isLoading,
    error,
    lastUpdated,
    
    // 操作
    refreshDashboard,
    refreshStats,
    refreshActivities,
    refreshProjects,
    clearError,
  };
};

// 只获取统计数据的Hook
export const useDashboardStats = () => {
  const { stats, isLoading, error, refreshStats, clearError } = useDashboard();
  return { stats, isLoading, error, refreshStats, clearError };
};

// 只获取活动数据的Hook
export const useDashboardActivities = () => {
  const { activities, isLoading, error, refreshActivities, clearError } = useDashboard();
  return { activities, isLoading, error, refreshActivities, clearError };
};

// 只获取项目数据的Hook
export const useDashboardProjects = () => {
  const { recentProjects, isLoading, error, refreshProjects, clearError } = useDashboard();
  return { recentProjects, isLoading, error, refreshProjects, clearError };
};

export default useDashboard;