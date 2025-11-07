import React, { useState, useEffect } from 'react';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface LogFilters {
  search: string;
  userId: string;
  action: string;
  resource: string;
  severity: string;
  success: string;
  dateRange: {
    start: string;
    end: string;
  };
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LogFilters>({
    search: '',
    userId: '',
    action: '',
    resource: '',
    severity: '',
    success: '',
    dateRange: {
      start: '',
      end: '',
    },
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const itemsPerPage = 20;

  // 模拟数据加载
  useEffect(() => {
    const loadAuditLogs = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockLogs: AuditLog[] = Array.from({ length: 500 }, (_, i) => {
          const actions = ['login', 'logout', 'create_user', 'delete_user', 'update_user', 'create_team', 'delete_team', 'create_project', 'delete_project', 'access_admin', 'change_settings'];
          const resources = ['user', 'team', 'project', 'system', 'settings', 'admin'];
          const severities: AuditLog['severity'][] = ['low', 'medium', 'high', 'critical'];
          
          return {
            id: `log-${i + 1}`,
            timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            userId: `user-${Math.floor(i / 10) + 1}`,
            userName: `用户${Math.floor(i / 10) + 1}`,
            action: actions[i % actions.length],
            resource: resources[i % resources.length],
            resourceId: `resource-${Math.floor(i / 5) + 1}`,
            details: {
              changes: i % 3 === 0 ? { name: '旧值', newName: '新值' } : {},
              metadata: { source: 'web', version: '1.0.0' },
            },
            ipAddress: `192.168.1.${(i % 254) + 1}`,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            success: i % 10 !== 0, // 90% 成功率
            severity: severities[i % severities.length],
          };
        });

        // 应用过滤器
        let filteredLogs = mockLogs;
        
        if (filters.search) {
          const search = filters.search.toLowerCase();
          filteredLogs = filteredLogs.filter(log =>
            log.userName.toLowerCase().includes(search) ||
            log.action.toLowerCase().includes(search) ||
            log.resource.toLowerCase().includes(search) ||
            log.ipAddress.includes(search)
          );
        }

        if (filters.action) {
          filteredLogs = filteredLogs.filter(log => log.action === filters.action);
        }

        if (filters.resource) {
          filteredLogs = filteredLogs.filter(log => log.resource === filters.resource);
        }

        if (filters.severity) {
          filteredLogs = filteredLogs.filter(log => log.severity === filters.severity);
        }

        if (filters.success) {
          const success = filters.success === 'true';
          filteredLogs = filteredLogs.filter(log => log.success === success);
        }

        if (filters.dateRange.start) {
          filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.dateRange.start);
        }

        if (filters.dateRange.end) {
          filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.dateRange.end);
        }

        // 排序
        filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // 分页
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

        setLogs(paginatedLogs);
        setTotalLogs(filteredLogs.length);
        setTotalPages(Math.ceil(filteredLogs.length / itemsPerPage));
      } catch (error) {
        console.error('Failed to load audit logs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAuditLogs();
  }, [filters, currentPage]);

  // 获取动作中文名
  const getActionText = (action: string) => {
    const actionMap: Record<string, string> = {
      login: '登录',
      logout: '登出',
      create_user: '创建用户',
      delete_user: '删除用户',
      update_user: '更新用户',
      create_team: '创建团队',
      delete_team: '删除团队',
      create_project: '创建项目',
      delete_project: '删除项目',
      access_admin: '访问管理后台',
      change_settings: '修改设置',
    };
    return actionMap[action] || action;
  };

  // 获取资源中文名
  const getResourceText = (resource: string) => {
    const resourceMap: Record<string, string> = {
      user: '用户',
      team: '团队',
      project: '项目',
      system: '系统',
      settings: '设置',
      admin: '管理后台',
    };
    return resourceMap[resource] || resource;
  };

  // 获取严重程度样式
  const getSeverityStyle = (severity: AuditLog['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // 获取严重程度文本
  const getSeverityText = (severity: AuditLog['severity']) => {
    const severityMap: Record<AuditLog['severity'], string> = {
      critical: '严重',
      high: '高',
      medium: '中',
      low: '低',
    };
    return severityMap[severity];
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // 导出日志
  const handleExport = () => {
    // 实现导出功能
    const csvContent = [
      ['时间', '用户', '动作', '资源', 'IP地址', '状态', '严重程度'].join(','),
      ...logs.map(log => [
        formatTime(log.timestamp),
        log.userName,
        getActionText(log.action),
        getResourceText(log.resource),
        log.ipAddress,
        log.success ? '成功' : '失败',
        getSeverityText(log.severity),
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">审计日志</h1>
        <p className="text-gray-600 mt-2">系统操作和用户活动记录</p>
      </div>

      {/* 过滤器 */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* 搜索 */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="用户名、动作、资源、IP..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* 动作类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">动作</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">所有动作</option>
                <option value="login">登录</option>
                <option value="logout">登出</option>
                <option value="create_user">创建用户</option>
                <option value="delete_user">删除用户</option>
                <option value="create_team">创建团队</option>
                <option value="delete_team">删除团队</option>
              </select>
            </div>

            {/* 资源类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">资源</label>
              <select
                value={filters.resource}
                onChange={(e) => setFilters(prev => ({ ...prev, resource: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">所有资源</option>
                <option value="user">用户</option>
                <option value="team">团队</option>
                <option value="project">项目</option>
                <option value="system">系统</option>
                <option value="settings">设置</option>
              </select>
            </div>

            {/* 严重程度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">严重程度</label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">所有级别</option>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="critical">严重</option>
              </select>
            </div>

            {/* 状态 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select
                value={filters.success}
                onChange={(e) => setFilters(prev => ({ ...prev, success: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">所有状态</option>
                <option value="true">成功</option>
                <option value="false">失败</option>
              </select>
            </div>
          </div>

          {/* 日期范围 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, start: e.target.value }
                }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, end: e.target.value }
                }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleExport}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>导出</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 日志表格 */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">加载中...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用户
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      动作
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      资源
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP地址
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      严重程度
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(log.timestamp)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                        <div className="text-xs text-gray-500">{log.userId}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getActionText(log.action)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getResourceText(log.resource)}</div>
                        <div className="text-xs text-gray-500">{log.resourceId}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ipAddress}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          log.success 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.success ? '成功' : '失败'}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getSeverityStyle(log.severity)}`}>
                          {getSeverityText(log.severity)}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="text-blue-600 hover:text-blue-800">
                          详情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  显示第 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalLogs)} 条，共 {totalLogs} 条记录
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    上一页
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 7) {
                        pageNum = i + 1;
                      } else {
                        if (currentPage <= 4) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 3) {
                          pageNum = totalPages - 6 + i;
                        } else {
                          pageNum = currentPage - 3 + i;
                        }
                      }
                      
                      return (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 rounded-md ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}