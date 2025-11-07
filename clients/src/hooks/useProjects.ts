import { useState, useEffect, useCallback, useMemo } from 'react';
import { projectApi, ProjectQueryParams, ProjectListResponse } from '@/services/api/projectApi';
import { Project } from '@/types/entities';

interface UseProjectsOptions {
  initialParams?: ProjectQueryParams;
  autoFetch?: boolean;
  keepPreviousData?: boolean;
}

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
  fetchProjects: (params?: ProjectQueryParams) => Promise<void>;
  refreshProjects: () => Promise<void>;
  createProject: (data: any) => Promise<Project | null>;
  updateProject: (projectId: string, data: any) => Promise<Project | null>;
  deleteProject: (projectId: string) => Promise<boolean>;
  archiveProject: (projectId: string) => Promise<Project | null>;
  unarchiveProject: (projectId: string) => Promise<Project | null>;
  cloneProject: (projectId: string, data: any) => Promise<Project | null>;
  clearError: () => void;
  isRefreshing: boolean;
  lastFetchTime: Date | null;
}

export const useProjects = (options: UseProjectsOptions = {}): UseProjectsReturn => {
  const {
    initialParams = {},
    autoFetch = true,
    keepPreviousData = false,
  } = options;

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [currentParams, setCurrentParams] = useState<ProjectQueryParams>(initialParams);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchProjects = useCallback(async (params?: ProjectQueryParams) => {
    const queryParams = params || currentParams;
    
    try {
      if (!keepPreviousData || projects.length === 0) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const response: ProjectListResponse = await projectApi.getProjects(queryParams);
      
      setProjects(response.items);
      setTotalCount(response.total);
      setHasMore(response.hasMore);
      setCurrentPage(response.page);
      setCurrentParams(queryParams);
      setLastFetchTime(new Date());
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取项目列表失败';
      setError(errorMessage);
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentParams, keepPreviousData, projects.length]);

  const refreshProjects = useCallback(async () => {
    await fetchProjects(currentParams);
  }, [fetchProjects, currentParams]);

  const createProject = useCallback(async (data: any): Promise<Project | null> => {
    try {
      setError(null);
      const newProject = await projectApi.createProject(data);
      
      // 刷新项目列表以包含新项目
      await refreshProjects();
      
      return newProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建项目失败';
      setError(errorMessage);
      console.error('Failed to create project:', err);
      return null;
    }
  }, [refreshProjects]);

  const updateProject = useCallback(async (projectId: string, data: any): Promise<Project | null> => {
    try {
      setError(null);
      const updatedProject = await projectApi.updateProject(projectId, data);
      
      // 更新本地项目列表中的项目数据
      setProjects(prev => prev.map(project => 
        project.id === projectId ? updatedProject : project
      ));
      
      return updatedProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新项目失败';
      setError(errorMessage);
      console.error('Failed to update project:', err);
      return null;
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string): Promise<boolean> => {
    try {
      setError(null);
      await projectApi.deleteProject(projectId);
      
      // 从本地列表中移除已删除的项目
      setProjects(prev => prev.filter(project => project.id !== projectId));
      setTotalCount(prev => prev - 1);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除项目失败';
      setError(errorMessage);
      console.error('Failed to delete project:', err);
      return false;
    }
  }, []);

  const archiveProject = useCallback(async (projectId: string): Promise<Project | null> => {
    try {
      setError(null);
      const archivedProject = await projectApi.archiveProject(projectId);
      
      // 更新本地项目列表中的项目状态
      setProjects(prev => prev.map(project => 
        project.id === projectId ? archivedProject : project
      ));
      
      return archivedProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '归档项目失败';
      setError(errorMessage);
      console.error('Failed to archive project:', err);
      return null;
    }
  }, []);

  const unarchiveProject = useCallback(async (projectId: string): Promise<Project | null> => {
    try {
      setError(null);
      const unarchivedProject = await projectApi.unarchiveProject(projectId);
      
      // 更新本地项目列表中的项目状态
      setProjects(prev => prev.map(project => 
        project.id === projectId ? unarchivedProject : project
      ));
      
      return unarchivedProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '恢复项目失败';
      setError(errorMessage);
      console.error('Failed to unarchive project:', err);
      return null;
    }
  }, []);

  const cloneProject = useCallback(async (projectId: string, data: any): Promise<Project | null> => {
    try {
      setError(null);
      const clonedProject = await projectApi.cloneProject(projectId, data);
      
      // 刷新项目列表以包含克隆的项目
      await refreshProjects();
      
      return clonedProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '克隆项目失败';
      setError(errorMessage);
      console.error('Failed to clone project:', err);
      return null;
    }
  }, [refreshProjects]);

  // 自动获取数据
  useEffect(() => {
    if (autoFetch) {
      fetchProjects();
    }
  }, [autoFetch]);

  // 缓存计算属性
  const memoizedReturn = useMemo(() => ({
    projects,
    loading,
    error,
    totalCount,
    hasMore,
    currentPage,
    fetchProjects,
    refreshProjects,
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
    unarchiveProject,
    cloneProject,
    clearError,
    isRefreshing,
    lastFetchTime,
  }), [
    projects,
    loading,
    error,
    totalCount,
    hasMore,
    currentPage,
    fetchProjects,
    refreshProjects,
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
    unarchiveProject,
    cloneProject,
    clearError,
    isRefreshing,
    lastFetchTime,
  ]);

  return memoizedReturn;
};

// 项目统计Hook
interface UseProjectStatsReturn {
  stats: any;
  loading: boolean;
  error: string | null;
  fetchStats: (projectId?: string) => Promise<void>;
  refreshStats: () => Promise<void>;
}

export const useProjectStats = (projectId?: string): UseProjectStatsReturn => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (id?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await projectApi.getProjectStats(id);
      setStats(response);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取项目统计失败';
      setError(errorMessage);
      console.error('Failed to fetch project stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStats = useCallback(() => {
    return fetchStats(projectId);
  }, [fetchStats, projectId]);

  useEffect(() => {
    fetchStats(projectId);
  }, [fetchStats, projectId]);

  return {
    stats,
    loading,
    error,
    fetchStats,
    refreshStats,
  };
};

// 公共项目搜索Hook
interface UsePublicProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  searchProjects: (query: string, filters?: any) => Promise<void>;
  clearSearch: () => void;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export const usePublicProjects = (): UsePublicProjectsReturn => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentFilters, setCurrentFilters] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);

  const searchProjects = useCallback(async (query: string, filters?: any) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentQuery(query);
      setCurrentFilters(filters || {});
      setCurrentPage(1);
      
      const response = await projectApi.searchPublicProjects({
        query,
        ...filters,
        page: 1,
      });
      
      setProjects(response.items);
      setHasMore(response.hasMore);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '搜索项目失败';
      setError(errorMessage);
      console.error('Failed to search projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    
    try {
      setLoading(true);
      const nextPage = currentPage + 1;
      
      const response = await projectApi.searchPublicProjects({
        query: currentQuery,
        ...currentFilters,
        page: nextPage,
      });
      
      setProjects(prev => [...prev, ...response.items]);
      setHasMore(response.hasMore);
      setCurrentPage(nextPage);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载更多项目失败';
      setError(errorMessage);
      console.error('Failed to load more projects:', err);
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, currentPage, currentQuery, currentFilters]);

  const clearSearch = useCallback(() => {
    setProjects([]);
    setCurrentQuery('');
    setCurrentFilters({});
    setCurrentPage(1);
    setHasMore(false);
    setError(null);
  }, []);

  return {
    projects,
    loading,
    error,
    searchProjects,
    clearSearch,
    hasMore,
    loadMore,
  };
};

export default useProjects;