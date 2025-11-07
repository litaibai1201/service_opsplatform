import { useState, useEffect, useCallback } from 'react';
import { adminApi, AdminStats, SystemAlert } from '@/services/api';

export interface UseAdminStatsReturn {
  stats: AdminStats | null;
  alerts: SystemAlert[];
  recentActivities: any[];
  isLoading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
  resolveAlert: (alertId: string) => Promise<void>;
}

export const useAdminStats = (autoRefresh: boolean = false, refreshInterval: number = 30000): UseAdminStatsReturn => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [statsData, alertsData, activitiesData] = await Promise.all([
        adminApi.getAdminStats(),
        adminApi.getSystemAlerts(),
        adminApi.getRecentActivities(10),
      ]);

      setStats(statsData);
      setAlerts(alertsData);
      setRecentActivities(activitiesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取统计数据失败');
      console.error('Failed to fetch admin stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      await adminApi.resolveAlert(alertId);
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true } : alert
      ));
    } catch (err) {
      console.error('Failed to resolve alert:', err);
      throw err;
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(refreshStats, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshStats]);

  return {
    stats,
    alerts,
    recentActivities,
    isLoading,
    error,
    refreshStats,
    resolveAlert,
  };
};