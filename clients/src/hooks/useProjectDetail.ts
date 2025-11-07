import { useState, useEffect, useCallback, useMemo } from 'react';
import { projectApi, ProjectDetailResponse } from '@/services/api/projectApi';
import { Project } from '@/types/entities';

interface UseProjectDetailOptions {
  projectId: string;
  autoFetch?: boolean;
  refreshInterval?: number;
}

interface UseProjectDetailReturn {
  project: ProjectDetailResponse | null;
  loading: boolean;
  error: string | null;
  fetchProject: () => Promise<void>;
  refreshProject: () => Promise<void>;
  updateProject: (data: any) => Promise<Project | null>;
  deleteProject: () => Promise<boolean>;
  archiveProject: () => Promise<Project | null>;
  unarchiveProject: () => Promise<Project | null>;
  deployProject: (config?: any) => Promise<any>;
  exportProject: (format: string, options?: any) => Promise<any>;
  clearError: () => void;
  isRefreshing: boolean;
  lastFetchTime: Date | null;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canManageMembers: boolean;
    canDeploy: boolean;
    canArchive: boolean;
  };
}

export const useProjectDetail = (options: UseProjectDetailOptions): UseProjectDetailReturn => {
  const { projectId, autoFetch = true, refreshInterval } = options;

  const [project, setProject] = useState<ProjectDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;

    try {
      if (!project) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const response = await projectApi.getProjectDetail(projectId);
      setProject(response);
      setLastFetchTime(new Date());
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取项目详情失败';
      setError(errorMessage);
      console.error('Failed to fetch project detail:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [projectId, project]);

  const refreshProject = useCallback(async () => {
    await fetchProject();
  }, [fetchProject]);

  const updateProject = useCallback(async (data: any): Promise<Project | null> => {
    if (!projectId) return null;

    try {
      setError(null);
      const updatedProject = await projectApi.updateProject(projectId, data);
      
      // 重新获取完整的项目详情
      await fetchProject();
      
      return updatedProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新项目失败';
      setError(errorMessage);
      console.error('Failed to update project:', err);
      return null;
    }
  }, [projectId, fetchProject]);

  const deleteProject = useCallback(async (): Promise<boolean> => {
    if (!projectId) return false;

    try {
      setError(null);
      await projectApi.deleteProject(projectId);
      
      // 清除本地项目数据
      setProject(null);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除项目失败';
      setError(errorMessage);
      console.error('Failed to delete project:', err);
      return false;
    }
  }, [projectId]);

  const archiveProject = useCallback(async (): Promise<Project | null> => {
    if (!projectId) return null;

    try {
      setError(null);
      const archivedProject = await projectApi.archiveProject(projectId);
      
      // 重新获取项目详情以更新状态
      await fetchProject();
      
      return archivedProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '归档项目失败';
      setError(errorMessage);
      console.error('Failed to archive project:', err);
      return null;
    }
  }, [projectId, fetchProject]);

  const unarchiveProject = useCallback(async (): Promise<Project | null> => {
    if (!projectId) return null;

    try {
      setError(null);
      const unarchivedProject = await projectApi.unarchiveProject(projectId);
      
      // 重新获取项目详情以更新状态
      await fetchProject();
      
      return unarchivedProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '恢复项目失败';
      setError(errorMessage);
      console.error('Failed to unarchive project:', err);
      return null;
    }
  }, [projectId, fetchProject]);

  const deployProject = useCallback(async (config?: any): Promise<any> => {
    if (!projectId) return null;

    try {
      setError(null);
      const result = await projectApi.deployProject(projectId, config);
      
      // 部署后刷新项目详情
      await fetchProject();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '部署项目失败';
      setError(errorMessage);
      console.error('Failed to deploy project:', err);
      return null;
    }
  }, [projectId, fetchProject]);

  const exportProject = useCallback(async (format: string, options?: any): Promise<any> => {
    if (!projectId) return null;

    try {
      setError(null);
      const result = await projectApi.exportProject(projectId, format as any, options);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导出项目失败';
      setError(errorMessage);
      console.error('Failed to export project:', err);
      return null;
    }
  }, [projectId]);

  // 自动获取项目详情
  useEffect(() => {
    if (autoFetch && projectId) {
      fetchProject();
    }
  }, [autoFetch, projectId, fetchProject]);

  // 定时刷新
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(() => {
        if (!loading && !isRefreshing) {
          refreshProject();
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, loading, isRefreshing, refreshProject]);

  // 计算权限信息
  const permissions = useMemo(() => {
    return project?.permissions || {
      canEdit: false,
      canDelete: false,
      canManageMembers: false,
      canDeploy: false,
      canArchive: false,
    };
  }, [project?.permissions]);

  return {
    project,
    loading,
    error,
    fetchProject,
    refreshProject,
    updateProject,
    deleteProject,
    archiveProject,
    unarchiveProject,
    deployProject,
    exportProject,
    clearError,
    isRefreshing,
    lastFetchTime,
    permissions,
  };
};

// 项目活动Hook
interface UseProjectActivityReturn {
  activities: any[];
  loading: boolean;
  error: string | null;
  fetchActivity: (params?: any) => Promise<void>;
  refreshActivity: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export const useProjectActivity = (projectId: string): UseProjectActivityReturn => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentParams, setCurrentParams] = useState<any>({});

  const fetchActivity = useCallback(async (params?: any) => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);
      setCurrentParams(params || {});
      setCurrentPage(1);
      
      const response = await projectApi.getProjectActivity(projectId, {
        ...params,
        page: 1,
      });
      
      setActivities(response.items);
      setHasMore(response.page * response.limit < response.total);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取项目活动失败';
      setError(errorMessage);
      console.error('Failed to fetch project activity:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const refreshActivity = useCallback(() => {
    return fetchActivity(currentParams);
  }, [fetchActivity, currentParams]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !projectId) return;

    try {
      setLoading(true);
      const nextPage = currentPage + 1;
      
      const response = await projectApi.getProjectActivity(projectId, {
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
  }, [hasMore, loading, projectId, currentPage, currentParams]);

  useEffect(() => {
    if (projectId) {
      fetchActivity();
    }
  }, [projectId, fetchActivity]);

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

// 项目文档Hook
interface UseProjectDocumentsReturn {
  documents: any[];
  loading: boolean;
  error: string | null;
  fetchDocuments: (params?: any) => Promise<void>;
  refreshDocuments: () => Promise<void>;
  uploadDocument: (file: File, metadata?: any, onProgress?: (progress: number) => void) => Promise<any>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export const useProjectDocuments = (projectId: string): UseProjectDocumentsReturn => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentParams, setCurrentParams] = useState<any>({});

  const fetchDocuments = useCallback(async (params?: any) => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);
      setCurrentParams(params || {});
      setCurrentPage(1);
      
      const response = await projectApi.getProjectDocuments(projectId, {
        ...params,
        page: 1,
      });
      
      setDocuments(response.items);
      setHasMore(response.page * response.limit < response.total);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取项目文档失败';
      setError(errorMessage);
      console.error('Failed to fetch project documents:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const refreshDocuments = useCallback(() => {
    return fetchDocuments(currentParams);
  }, [fetchDocuments, currentParams]);

  const uploadDocument = useCallback(async (
    file: File,
    metadata?: any,
    onProgress?: (progress: number) => void
  ): Promise<any> => {
    if (!projectId) return null;

    try {
      setError(null);
      const result = await projectApi.uploadDocument(projectId, file, metadata, onProgress);
      
      // 上传成功后刷新文档列表
      await refreshDocuments();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '上传文档失败';
      setError(errorMessage);
      console.error('Failed to upload document:', err);
      return null;
    }
  }, [projectId, refreshDocuments]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !projectId) return;

    try {
      setLoading(true);
      const nextPage = currentPage + 1;
      
      const response = await projectApi.getProjectDocuments(projectId, {
        ...currentParams,
        page: nextPage,
      });
      
      setDocuments(prev => [...prev, ...response.items]);
      setHasMore(nextPage * response.limit < response.total);
      setCurrentPage(nextPage);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载更多文档失败';
      setError(errorMessage);
      console.error('Failed to load more documents:', err);
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, projectId, currentPage, currentParams]);

  useEffect(() => {
    if (projectId) {
      fetchDocuments();
    }
  }, [projectId, fetchDocuments]);

  return {
    documents,
    loading,
    error,
    fetchDocuments,
    refreshDocuments,
    uploadDocument,
    hasMore,
    loadMore,
  };
};

// 项目部署历史Hook
interface UseProjectDeploymentsReturn {
  deployments: any[];
  loading: boolean;
  error: string | null;
  fetchDeployments: () => Promise<void>;
  refreshDeployments: () => Promise<void>;
}

export const useProjectDeployments = (projectId: string): UseProjectDeploymentsReturn => {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeployments = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await projectApi.getDeploymentHistory(projectId);
      setDeployments(response);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取部署历史失败';
      setError(errorMessage);
      console.error('Failed to fetch deployment history:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const refreshDeployments = useCallback(() => {
    return fetchDeployments();
  }, [fetchDeployments]);

  useEffect(() => {
    if (projectId) {
      fetchDeployments();
    }
  }, [projectId, fetchDeployments]);

  return {
    deployments,
    loading,
    error,
    fetchDeployments,
    refreshDeployments,
  };
};

export default useProjectDetail;