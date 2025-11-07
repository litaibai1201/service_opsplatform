import { useState, useEffect, useCallback } from 'react';
import { adminApi, SystemHealth, ServiceStatus, HealthCheck } from '@/services/api';

export interface UseSystemHealthReturn {
  systemHealth: SystemHealth | null;
  isLoading: boolean;
  error: string | null;
  refreshHealth: () => Promise<void>;
}

export const useSystemHealth = (autoRefresh: boolean = false, refreshInterval: number = 30000): UseSystemHealthReturn => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshHealth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const healthData = await adminApi.getSystemHealth();
      setSystemHealth(healthData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取系统健康状态失败');
      console.error('Failed to fetch system health:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(refreshHealth, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshHealth]);

  return {
    systemHealth,
    isLoading,
    error,
    refreshHealth,
  };
};