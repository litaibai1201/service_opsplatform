import { useState, useEffect, useCallback, useMemo } from 'react';
import { maintainerApi, MaintainerQueryParams, MaintainerListResponse } from '@/services/api/maintainerApi';
import { ProjectMaintainer } from '@/types/entities';

interface UseProjectMaintainersOptions {
  projectId: string;
  initialParams?: MaintainerQueryParams;
  autoFetch?: boolean;
}

interface UseProjectMaintainersReturn {
  maintainers: ProjectMaintainer[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
  fetchMaintainers: (params?: MaintainerQueryParams) => Promise<void>;
  refreshMaintainers: () => Promise<void>;
  addMaintainer: (data: any) => Promise<ProjectMaintainer | null>;
  addMaintainers: (data: any) => Promise<any>;
  removeMaintainer: (maintainerId: string, reason?: string) => Promise<boolean>;
  removeMaintainers: (maintainerIds: string[], reason?: string) => Promise<any>;
  suspendMaintainer: (maintainerId: string, data: any) => Promise<ProjectMaintainer | null>;
  unsuspendMaintainer: (maintainerId: string) => Promise<ProjectMaintainer | null>;
  transferMaintainer: (maintainerId: string, targetProjectId: string) => Promise<boolean>;
  updatePermissions: (maintainerId: string, permissions: any) => Promise<any>;
  clearError: () => void;
  isRefreshing: boolean;
  lastFetchTime: Date | null;
}

export const useProjectMaintainers = (options: UseProjectMaintainersOptions): UseProjectMaintainersReturn => {
  const { projectId, initialParams = {}, autoFetch = true } = options;

  const [maintainers, setMaintainers] = useState<ProjectMaintainer[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [currentParams, setCurrentParams] = useState<MaintainerQueryParams>(initialParams);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchMaintainers = useCallback(async (params?: MaintainerQueryParams) => {
    if (!projectId) return;

    const queryParams = params || currentParams;
    
    try {
      if (maintainers.length === 0) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const response: MaintainerListResponse = await maintainerApi.getProjectMaintainers(
        projectId,
        queryParams
      );
      
      setMaintainers(response.items);
      setTotalCount(response.total);
      setHasMore(response.hasMore);
      setCurrentPage(response.page);
      setCurrentParams(queryParams);
      setLastFetchTime(new Date());
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取维护员列表失败';
      setError(errorMessage);
      console.error('Failed to fetch maintainers:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [projectId, currentParams, maintainers.length]);

  const refreshMaintainers = useCallback(async () => {
    await fetchMaintainers(currentParams);
  }, [fetchMaintainers, currentParams]);

  const addMaintainer = useCallback(async (data: any): Promise<ProjectMaintainer | null> => {
    if (!projectId) return null;

    try {
      setError(null);
      const newMaintainer = await maintainerApi.addMaintainer(projectId, data);
      
      // 刷新维护员列表
      await refreshMaintainers();
      
      return newMaintainer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '添加维护员失败';
      setError(errorMessage);
      console.error('Failed to add maintainer:', err);
      return null;
    }
  }, [projectId, refreshMaintainers]);

  const addMaintainers = useCallback(async (data: any): Promise<any> => {
    if (!projectId) return null;

    try {
      setError(null);
      const result = await maintainerApi.addMaintainers(projectId, data);
      
      // 刷新维护员列表
      await refreshMaintainers();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '批量添加维护员失败';
      setError(errorMessage);
      console.error('Failed to add maintainers:', err);
      return null;
    }
  }, [projectId, refreshMaintainers]);

  const removeMaintainer = useCallback(async (maintainerId: string, reason?: string): Promise<boolean> => {
    if (!projectId) return false;

    try {
      setError(null);
      await maintainerApi.removeMaintainer(projectId, maintainerId, reason);
      
      // 从本地列表中移除维护员
      setMaintainers(prev => prev.filter(m => m.id !== maintainerId));
      setTotalCount(prev => prev - 1);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '移除维护员失败';
      setError(errorMessage);
      console.error('Failed to remove maintainer:', err);
      return false;
    }
  }, [projectId]);

  const removeMaintainers = useCallback(async (maintainerIds: string[], reason?: string): Promise<any> => {
    if (!projectId) return null;

    try {
      setError(null);
      const result = await maintainerApi.removeMaintainers(projectId, maintainerIds, reason);
      
      // 刷新维护员列表
      await refreshMaintainers();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '批量移除维护员失败';
      setError(errorMessage);
      console.error('Failed to remove maintainers:', err);
      return null;
    }
  }, [projectId, refreshMaintainers]);

  const suspendMaintainer = useCallback(async (maintainerId: string, data: any): Promise<ProjectMaintainer | null> => {
    if (!projectId) return null;

    try {
      setError(null);
      const suspendedMaintainer = await maintainerApi.suspendMaintainer(projectId, maintainerId, data);
      
      // 更新本地维护员状态
      setMaintainers(prev => prev.map(m => 
        m.id === maintainerId ? suspendedMaintainer : m
      ));
      
      return suspendedMaintainer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '暂停维护员失败';
      setError(errorMessage);
      console.error('Failed to suspend maintainer:', err);
      return null;
    }
  }, [projectId]);

  const unsuspendMaintainer = useCallback(async (maintainerId: string): Promise<ProjectMaintainer | null> => {
    if (!projectId) return null;

    try {
      setError(null);
      const unsuspendedMaintainer = await maintainerApi.unsuspendMaintainer(projectId, maintainerId);
      
      // 更新本地维护员状态
      setMaintainers(prev => prev.map(m => 
        m.id === maintainerId ? unsuspendedMaintainer : m
      ));
      
      return unsuspendedMaintainer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '恢复维护员失败';
      setError(errorMessage);
      console.error('Failed to unsuspend maintainer:', err);
      return null;
    }
  }, [projectId]);

  const transferMaintainer = useCallback(async (maintainerId: string, targetProjectId: string): Promise<boolean> => {
    if (!projectId) return false;

    try {
      setError(null);
      await maintainerApi.transferMaintainer(projectId, maintainerId, targetProjectId);
      
      // 从本地列表中移除已转移的维护员
      setMaintainers(prev => prev.filter(m => m.id !== maintainerId));
      setTotalCount(prev => prev - 1);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '转移维护员失败';
      setError(errorMessage);
      console.error('Failed to transfer maintainer:', err);
      return false;
    }
  }, [projectId]);

  const updatePermissions = useCallback(async (maintainerId: string, permissions: any): Promise<any> => {
    if (!projectId) return null;

    try {
      setError(null);
      const result = await maintainerApi.updateMaintainerPermissions(projectId, maintainerId, permissions);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新维护员权限失败';
      setError(errorMessage);
      console.error('Failed to update maintainer permissions:', err);
      return null;
    }
  }, [projectId]);

  // 自动获取数据
  useEffect(() => {
    if (autoFetch && projectId) {
      fetchMaintainers();
    }
  }, [autoFetch, projectId]);

  return {
    maintainers,
    loading,
    error,
    totalCount,
    hasMore,
    currentPage,
    fetchMaintainers,
    refreshMaintainers,
    addMaintainer,
    addMaintainers,
    removeMaintainer,
    removeMaintainers,
    suspendMaintainer,
    unsuspendMaintainer,
    transferMaintainer,
    updatePermissions,
    clearError,
    isRefreshing,
    lastFetchTime,
  };
};

// 维护员详情Hook
interface UseMaintainerDetailReturn {
  maintainer: any;
  loading: boolean;
  error: string | null;
  fetchMaintainer: () => Promise<void>;
  refreshMaintainer: () => Promise<void>;
  permissions: any;
  stats: any;
  activities: any[];
}

export const useMaintainerDetail = (projectId: string, maintainerId: string): UseMaintainerDetailReturn => {
  const [maintainer, setMaintainer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMaintainer = useCallback(async () => {
    if (!projectId || !maintainerId) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await maintainerApi.getMaintainerDetail(projectId, maintainerId);
      setMaintainer(response);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取维护员详情失败';
      setError(errorMessage);
      console.error('Failed to fetch maintainer detail:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, maintainerId]);

  const refreshMaintainer = useCallback(() => {
    return fetchMaintainer();
  }, [fetchMaintainer]);

  const permissions = useMemo(() => {
    return maintainer?.permissions || {};
  }, [maintainer?.permissions]);

  const stats = useMemo(() => {
    return maintainer?.stats || {};
  }, [maintainer?.stats]);

  const activities = useMemo(() => {
    return maintainer?.activities || [];
  }, [maintainer?.activities]);

  useEffect(() => {
    if (projectId && maintainerId) {
      fetchMaintainer();
    }
  }, [projectId, maintainerId, fetchMaintainer]);

  return {
    maintainer,
    loading,
    error,
    fetchMaintainer,
    refreshMaintainer,
    permissions,
    stats,
    activities,
  };
};

// 维护员统计Hook
interface UseMaintainerStatsReturn {
  stats: any;
  loading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

export const useMaintainerStats = (projectId: string): UseMaintainerStatsReturn => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await maintainerApi.getMaintainerStats(projectId);
      setStats(response);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取维护员统计失败';
      setError(errorMessage);
      console.error('Failed to fetch maintainer stats:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const refreshStats = useCallback(() => {
    return fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (projectId) {
      fetchStats();
    }
  }, [projectId, fetchStats]);

  return {
    stats,
    loading,
    error,
    fetchStats,
    refreshStats,
  };
};

// 用户搜索Hook
interface UseUserSearchReturn {
  users: any[];
  loading: boolean;
  error: string | null;
  searchUsers: (query: string, options?: any) => Promise<void>;
  clearSearch: () => void;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export const useUserSearch = (): UseUserSearchReturn => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentOptions, setCurrentOptions] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);

  const searchUsers = useCallback(async (query: string, options?: any) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentQuery(query);
      setCurrentOptions(options || {});
      setCurrentPage(1);
      
      const response = await maintainerApi.searchUsers({
        query,
        ...options,
        page: 1,
      });
      
      setUsers(response.items);
      setHasMore(response.page * response.limit < response.total);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '搜索用户失败';
      setError(errorMessage);
      console.error('Failed to search users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !currentQuery) return;

    try {
      setLoading(true);
      const nextPage = currentPage + 1;
      
      const response = await maintainerApi.searchUsers({
        query: currentQuery,
        ...currentOptions,
        page: nextPage,
      });
      
      setUsers(prev => [...prev, ...response.items]);
      setHasMore(nextPage * response.limit < response.total);
      setCurrentPage(nextPage);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载更多用户失败';
      setError(errorMessage);
      console.error('Failed to load more users:', err);
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, currentQuery, currentOptions, currentPage]);

  const clearSearch = useCallback(() => {
    setUsers([]);
    setCurrentQuery('');
    setCurrentOptions({});
    setCurrentPage(1);
    setHasMore(false);
    setError(null);
  }, []);

  return {
    users,
    loading,
    error,
    searchUsers,
    clearSearch,
    hasMore,
    loadMore,
  };
};

// 维护员活动Hook
interface UseMaintainerActivityReturn {
  activities: any[];
  loading: boolean;
  error: string | null;
  fetchActivity: (params?: any) => Promise<void>;
  refreshActivity: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export const useMaintainerActivity = (projectId: string, maintainerId: string): UseMaintainerActivityReturn => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentParams, setCurrentParams] = useState<any>({});

  const fetchActivity = useCallback(async (params?: any) => {
    if (!projectId || !maintainerId) return;

    try {
      setLoading(true);
      setError(null);
      setCurrentParams(params || {});
      setCurrentPage(1);
      
      const response = await maintainerApi.getMaintainerActivity(projectId, maintainerId, {
        ...params,
        page: 1,
      });
      
      setActivities(response.items);
      setHasMore(response.page * response.limit < response.total);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取维护员活动失败';
      setError(errorMessage);
      console.error('Failed to fetch maintainer activity:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, maintainerId]);

  const refreshActivity = useCallback(() => {
    return fetchActivity(currentParams);
  }, [fetchActivity, currentParams]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !projectId || !maintainerId) return;

    try {
      setLoading(true);
      const nextPage = currentPage + 1;
      
      const response = await maintainerApi.getMaintainerActivity(projectId, maintainerId, {
        ...currentParams,
        page: nextPage,
      });
      
      setActivities(prev => [...prev, ...response.items]);
      setHasMore(nextPage * response.limit < response.total);
      setCurrentPage(nextPage);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载更多活动失败';
      setError(errorMessage);
      console.error('Failed to load more activity:', err);
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, projectId, maintainerId, currentPage, currentParams]);

  useEffect(() => {
    if (projectId && maintainerId) {
      fetchActivity();
    }
  }, [projectId, maintainerId, fetchActivity]);

  return {
    activities,
    loading,
    error,
    fetchActivity,
    refreshActivity,
    hasMore,
    loadMore,
  };
};

export default useProjectMaintainers;