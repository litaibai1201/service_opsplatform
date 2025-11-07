import { useState, useEffect, useCallback, useMemo } from 'react';
import { templateApi, TemplateQueryParams, TemplateListResponse } from '@/services/api/templateApi';
import { ProjectTemplate } from '@/services/api/templateApi';

interface UseProjectTemplatesOptions {
  initialParams?: TemplateQueryParams;
  autoFetch?: boolean;
  keepPreviousData?: boolean;
}

interface UseProjectTemplatesReturn {
  templates: ProjectTemplate[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
  categories: string[];
  popularTags: Array<{ name: string; count: number }>;
  fetchTemplates: (params?: TemplateQueryParams) => Promise<void>;
  refreshTemplates: () => Promise<void>;
  createTemplate: (data: any) => Promise<ProjectTemplate | null>;
  updateTemplate: (templateId: string, data: any) => Promise<ProjectTemplate | null>;
  deleteTemplate: (templateId: string) => Promise<boolean>;
  cloneTemplate: (templateId: string, data: any) => Promise<ProjectTemplate | null>;
  publishTemplate: (templateId: string) => Promise<ProjectTemplate | null>;
  unpublishTemplate: (templateId: string) => Promise<ProjectTemplate | null>;
  createFromProject: (projectId: string, data: any) => Promise<ProjectTemplate | null>;
  clearError: () => void;
  isRefreshing: boolean;
  lastFetchTime: Date | null;
}

export const useProjectTemplates = (options: UseProjectTemplatesOptions = {}): UseProjectTemplatesReturn => {
  const {
    initialParams = {},
    autoFetch = true,
    keepPreviousData = false,
  } = options;

  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<Array<{ name: string; count: number }>>([]);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [currentParams, setCurrentParams] = useState<TemplateQueryParams>(initialParams);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchTemplates = useCallback(async (params?: TemplateQueryParams) => {
    const queryParams = params || currentParams;
    
    try {
      if (!keepPreviousData || templates.length === 0) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const response: TemplateListResponse = await templateApi.getTemplates(queryParams);
      
      setTemplates(response.items);
      setTotalCount(response.total);
      setHasMore(response.hasMore);
      setCurrentPage(response.page);
      setCategories(response.categories);
      setPopularTags(response.popularTags);
      setCurrentParams(queryParams);
      setLastFetchTime(new Date());
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取模板列表失败';
      setError(errorMessage);
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentParams, keepPreviousData, templates.length]);

  const refreshTemplates = useCallback(async () => {
    await fetchTemplates(currentParams);
  }, [fetchTemplates, currentParams]);

  const createTemplate = useCallback(async (data: any): Promise<ProjectTemplate | null> => {
    try {
      setError(null);
      const newTemplate = await templateApi.createTemplate(data);
      
      // 刷新模板列表以包含新模板
      await refreshTemplates();
      
      return newTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建模板失败';
      setError(errorMessage);
      console.error('Failed to create template:', err);
      return null;
    }
  }, [refreshTemplates]);

  const updateTemplate = useCallback(async (templateId: string, data: any): Promise<ProjectTemplate | null> => {
    try {
      setError(null);
      const updatedTemplate = await templateApi.updateTemplate(templateId, data);
      
      // 更新本地模板列表中的模板数据
      setTemplates(prev => prev.map(template => 
        template.id === templateId ? updatedTemplate : template
      ));
      
      return updatedTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新模板失败';
      setError(errorMessage);
      console.error('Failed to update template:', err);
      return null;
    }
  }, []);

  const deleteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    try {
      setError(null);
      await templateApi.deleteTemplate(templateId);
      
      // 从本地列表中移除已删除的模板
      setTemplates(prev => prev.filter(template => template.id !== templateId));
      setTotalCount(prev => prev - 1);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除模板失败';
      setError(errorMessage);
      console.error('Failed to delete template:', err);
      return false;
    }
  }, []);

  const cloneTemplate = useCallback(async (templateId: string, data: any): Promise<ProjectTemplate | null> => {
    try {
      setError(null);
      const clonedTemplate = await templateApi.cloneTemplate(templateId, data);
      
      // 刷新模板列表以包含克隆的模板
      await refreshTemplates();
      
      return clonedTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '克隆模板失败';
      setError(errorMessage);
      console.error('Failed to clone template:', err);
      return null;
    }
  }, [refreshTemplates]);

  const publishTemplate = useCallback(async (templateId: string): Promise<ProjectTemplate | null> => {
    try {
      setError(null);
      const publishedTemplate = await templateApi.publishTemplate(templateId);
      
      // 更新本地模板列表中的模板状态
      setTemplates(prev => prev.map(template => 
        template.id === templateId ? publishedTemplate : template
      ));
      
      return publishedTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发布模板失败';
      setError(errorMessage);
      console.error('Failed to publish template:', err);
      return null;
    }
  }, []);

  const unpublishTemplate = useCallback(async (templateId: string): Promise<ProjectTemplate | null> => {
    try {
      setError(null);
      const unpublishedTemplate = await templateApi.unpublishTemplate(templateId);
      
      // 更新本地模板列表中的模板状态
      setTemplates(prev => prev.map(template => 
        template.id === templateId ? unpublishedTemplate : template
      ));
      
      return unpublishedTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '取消发布模板失败';
      setError(errorMessage);
      console.error('Failed to unpublish template:', err);
      return null;
    }
  }, []);

  const createFromProject = useCallback(async (projectId: string, data: any): Promise<ProjectTemplate | null> => {
    try {
      setError(null);
      const newTemplate = await templateApi.createTemplateFromProject(projectId, data);
      
      // 刷新模板列表以包含新模板
      await refreshTemplates();
      
      return newTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '从项目创建模板失败';
      setError(errorMessage);
      console.error('Failed to create template from project:', err);
      return null;
    }
  }, [refreshTemplates]);

  // 自动获取数据
  useEffect(() => {
    if (autoFetch) {
      fetchTemplates();
    }
  }, [autoFetch]);

  // 缓存计算属性
  const memoizedReturn = useMemo(() => ({
    templates,
    loading,
    error,
    totalCount,
    hasMore,
    currentPage,
    categories,
    popularTags,
    fetchTemplates,
    refreshTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    cloneTemplate,
    publishTemplate,
    unpublishTemplate,
    createFromProject,
    clearError,
    isRefreshing,
    lastFetchTime,
  }), [
    templates,
    loading,
    error,
    totalCount,
    hasMore,
    currentPage,
    categories,
    popularTags,
    fetchTemplates,
    refreshTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    cloneTemplate,
    publishTemplate,
    unpublishTemplate,
    createFromProject,
    clearError,
    isRefreshing,
    lastFetchTime,
  ]);

  return memoizedReturn;
};

// 模板详情Hook
interface UseTemplateDetailReturn {
  template: any;
  loading: boolean;
  error: string | null;
  fetchTemplate: () => Promise<void>;
  refreshTemplate: () => Promise<void>;
  permissions: any;
  usage: any;
  reviews: any[];
  versions: any[];
}

export const useTemplateDetail = (templateId: string): UseTemplateDetailReturn => {
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplate = useCallback(async () => {
    if (!templateId) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await templateApi.getTemplateDetail(templateId);
      setTemplate(response);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取模板详情失败';
      setError(errorMessage);
      console.error('Failed to fetch template detail:', err);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  const refreshTemplate = useCallback(() => {
    return fetchTemplate();
  }, [fetchTemplate]);

  const permissions = useMemo(() => {
    return template?.permissions || {};
  }, [template?.permissions]);

  const usage = useMemo(() => {
    return template?.usage || {};
  }, [template?.usage]);

  const reviews = useMemo(() => {
    return template?.reviews || [];
  }, [template?.reviews]);

  const versions = useMemo(() => {
    return template?.versions || [];
  }, [template?.versions]);

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId, fetchTemplate]);

  return {
    template,
    loading,
    error,
    fetchTemplate,
    refreshTemplate,
    permissions,
    usage,
    reviews,
    versions,
  };
};

// 模板统计Hook
interface UseTemplateStatsReturn {
  stats: any;
  loading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

export const useTemplateStats = (): UseTemplateStatsReturn => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await templateApi.getTemplateStats();
      setStats(response);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取模板统计失败';
      setError(errorMessage);
      console.error('Failed to fetch template stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStats = useCallback(() => {
    return fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    fetchStats,
    refreshStats,
  };
};

// 公共模板搜索Hook
interface UsePublicTemplatesReturn {
  templates: ProjectTemplate[];
  loading: boolean;
  error: string | null;
  searchTemplates: (query: string, filters?: any) => Promise<void>;
  clearSearch: () => void;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export const usePublicTemplates = (): UsePublicTemplatesReturn => {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentFilters, setCurrentFilters] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);

  const searchTemplates = useCallback(async (query: string, filters?: any) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentQuery(query);
      setCurrentFilters(filters || {});
      setCurrentPage(1);
      
      const response = await templateApi.searchPublicTemplates({
        query,
        ...filters,
        page: 1,
      });
      
      setTemplates(response.items);
      setHasMore(response.hasMore);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '搜索模板失败';
      setError(errorMessage);
      console.error('Failed to search templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    
    try {
      setLoading(true);
      const nextPage = currentPage + 1;
      
      const response = await templateApi.searchPublicTemplates({
        query: currentQuery,
        ...currentFilters,
        page: nextPage,
      });
      
      setTemplates(prev => [...prev, ...response.items]);
      setHasMore(response.hasMore);
      setCurrentPage(nextPage);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载更多模板失败';
      setError(errorMessage);
      console.error('Failed to load more templates:', err);
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, currentPage, currentQuery, currentFilters]);

  const clearSearch = useCallback(() => {
    setTemplates([]);
    setCurrentQuery('');
    setCurrentFilters({});
    setCurrentPage(1);
    setHasMore(false);
    setError(null);
  }, []);

  return {
    templates,
    loading,
    error,
    searchTemplates,
    clearSearch,
    hasMore,
    loadMore,
  };
};

// 模板分类Hook
interface UseTemplateCategoriesReturn {
  categories: any[];
  loading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
}

export const useTemplateCategories = (): UseTemplateCategoriesReturn => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await templateApi.getTemplateCategories();
      setCategories(response);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取模板分类失败';
      setError(errorMessage);
      console.error('Failed to fetch template categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    fetchCategories,
  };
};

// 模板标签Hook
interface UseTemplateTagsReturn {
  tags: any[];
  loading: boolean;
  error: string | null;
  fetchTags: () => Promise<void>;
}

export const useTemplateTags = (): UseTemplateTagsReturn => {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await templateApi.getTemplateTags();
      setTags(response);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取模板标签失败';
      setError(errorMessage);
      console.error('Failed to fetch template tags:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return {
    tags,
    loading,
    error,
    fetchTags,
  };
};

// 模板评价Hook
interface UseTemplateReviewsReturn {
  reviews: any[];
  loading: boolean;
  error: string | null;
  averageRating: number;
  ratingDistribution: any;
  fetchReviews: (params?: any) => Promise<void>;
  rateTemplate: (rating: number, comment?: string) => Promise<any>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export const useTemplateReviews = (templateId: string): UseTemplateReviewsReturn => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<any>({});
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentParams, setCurrentParams] = useState<any>({});

  const fetchReviews = useCallback(async (params?: any) => {
    if (!templateId) return;

    try {
      setLoading(true);
      setError(null);
      setCurrentParams(params || {});
      setCurrentPage(1);
      
      const response = await templateApi.getTemplateReviews(templateId, {
        ...params,
        page: 1,
      });
      
      setReviews(response.items);
      setAverageRating(response.averageRating);
      setRatingDistribution(response.ratingDistribution);
      setHasMore(response.page * response.limit < response.total);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取模板评价失败';
      setError(errorMessage);
      console.error('Failed to fetch template reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  const rateTemplate = useCallback(async (rating: number, comment?: string): Promise<any> => {
    if (!templateId) return null;

    try {
      setError(null);
      const result = await templateApi.rateTemplate(templateId, { rating, comment });
      
      // 刷新评价列表
      await fetchReviews(currentParams);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '评价模板失败';
      setError(errorMessage);
      console.error('Failed to rate template:', err);
      return null;
    }
  }, [templateId, fetchReviews, currentParams]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !templateId) return;

    try {
      setLoading(true);
      const nextPage = currentPage + 1;
      
      const response = await templateApi.getTemplateReviews(templateId, {
        ...currentParams,
        page: nextPage,
      });
      
      setReviews(prev => [...prev, ...response.items]);
      setHasMore(nextPage * response.limit < response.total);
      setCurrentPage(nextPage);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载更多评价失败';
      setError(errorMessage);
      console.error('Failed to load more reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, templateId, currentPage, currentParams]);

  useEffect(() => {
    if (templateId) {
      fetchReviews();
    }
  }, [templateId, fetchReviews]);

  return {
    reviews,
    loading,
    error,
    averageRating,
    ratingDistribution,
    fetchReviews,
    rateTemplate,
    hasMore,
    loadMore,
  };
};

export default useProjectTemplates;