import { useState, useEffect, useCallback } from 'react';
import { 
  adminApi, 
  AuditLog, 
  AuditLogParams, 
  AuditLogResponse 
} from '@/services/api';

export interface UseAuditLogsReturn {
  logs: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  isExporting: boolean;
  error: string | null;
  searchLogs: (params: AuditLogParams) => Promise<void>;
  exportLogs: (params?: AuditLogParams) => Promise<void>;
  refreshLogs: () => Promise<void>;
}

export const useAuditLogs = (initialParams: AuditLogParams = {}): UseAuditLogsReturn => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentParams, setCurrentParams] = useState<AuditLogParams>(initialParams);

  const searchLogs = useCallback(async (params: AuditLogParams) => {
    try {
      setIsLoading(true);
      setError(null);
      setCurrentParams(params);

      const response: AuditLogResponse = await adminApi.getAuditLogs(params);
      
      setLogs(response.logs);
      setTotal(response.total);
      setPage(response.page);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取审计日志失败');
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exportLogs = useCallback(async (params: AuditLogParams = currentParams) => {
    try {
      setIsExporting(true);
      await adminApi.exportAuditLogs(params);
    } catch (err) {
      console.error('Failed to export audit logs:', err);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, [currentParams]);

  const refreshLogs = useCallback(async () => {
    await searchLogs(currentParams);
  }, [currentParams, searchLogs]);

  // 初始化加载
  useEffect(() => {
    searchLogs(initialParams);
  }, [searchLogs, initialParams]);

  return {
    logs,
    total,
    page,
    totalPages,
    isLoading,
    isExporting,
    error,
    searchLogs,
    exportLogs,
    refreshLogs,
  };
};