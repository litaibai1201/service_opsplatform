import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SystemMetrics from './components/SystemMetrics';
import SystemHealth from './components/SystemHealth';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTeams: number;
  totalProjects: number;
  systemLoad: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: string;
}

interface RecentActivity {
  id: string;
  type: 'user_created' | 'user_deleted' | 'team_created' | 'project_created' | 'system_alert';
  message: string;
  timestamp: string;
  userId?: string;
  userName?: string;
}

interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTeams: 0,
    totalProjects: 0,
    systemLoad: 0,
    memoryUsage: 0,
    diskUsage: 0,
    uptime: '0d 0h 0m',
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // 模拟数据加载
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setStats({
          totalUsers: 1247,
          activeUsers: 234,
          totalTeams: 89,
          totalProjects: 156,
          systemLoad: 45.2,
          memoryUsage: 67.8,
          diskUsage: 23.4,
          uptime: '15d 8h 32m',
        });

        setRecentActivity([
          {
            id: '1',
            type: 'user_created',
            message: '新用户 "张三" 注册成功',
            timestamp: '5分钟前',
            userId: 'user-123',
            userName: '张三',
          },
          {
            id: '2',
            type: 'team_created',
            message: '团队 "前端开发组" 已创建',
            timestamp: '15分钟前',
            userId: 'user-456',
            userName: '李四',
          },
          {
            id: '3',
            type: 'project_created',
            message: '项目 "移动端应用" 已创建',
            timestamp: '1小时前',
            userId: 'user-789',
            userName: '王五',
          },
          {
            id: '4',
            type: 'system_alert',
            message: '数据库连接池使用率达到80%',
            timestamp: '2小时前',
          },
          {
            id: '5',
            type: 'user_deleted',
            message: '用户 "赵六" 账号已删除',
            timestamp: '3小时前',
            userId: 'user-999',
            userName: '管理员',
          },
        ]);

        setSystemAlerts([
          {
            id: '1',
            type: 'warning',
            title: '内存使用率偏高',
            message: '系统内存使用率达到67.8%，建议进行优化',
            timestamp: '30分钟前',
            resolved: false,
          },
          {
            id: '2',
            type: 'info',
            title: '系统维护通知',
            message: '系统将于今晚23:00进行例行维护，预计耗时2小时',
            timestamp: '2小时前',
            resolved: false,
          },
          {
            id: '3',
            type: 'success',
            title: '备份任务完成',
            message: '数据库备份任务已成功完成',
            timestamp: '4小时前',
            resolved: true,
          },
        ]);

      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // 获取活动类型图标
  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'user_created':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        );
      case 'user_deleted':
        return (
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        );
      case 'team_created':
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        );
      case 'project_created':
        return (
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        );
      case 'system_alert':
        return (
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  // 获取告警类型样式
  const getAlertStyle = (type: SystemAlert['type']) => {
    switch (type) {
      case 'error':
        return 'border-l-red-500 bg-red-50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'success':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">管理员仪表板</h1>
        <p className="text-gray-600 mt-2">系统概览和管理工具</p>
      </div>

      {/* 快捷操作 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Link
          to="/admin/users"
          className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">用户管理</h3>
              <p className="text-sm text-gray-500">{stats.totalUsers} 个用户</p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/teams"
          className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">团队管理</h3>
              <p className="text-sm text-gray-500">{stats.totalTeams} 个团队</p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/settings"
          className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">系统设置</h3>
              <p className="text-sm text-gray-500">配置管理</p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/logs"
          className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">审计日志</h3>
              <p className="text-sm text-gray-500">操作记录</p>
            </div>
          </div>
        </Link>
      </div>

      {/* 系统指标 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <SystemMetrics stats={stats} />
        <SystemHealth 
          systemLoad={stats.systemLoad}
          memoryUsage={stats.memoryUsage}
          diskUsage={stats.diskUsage}
          uptime={stats.uptime}
        />
      </div>

      {/* 最近活动和系统告警 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 最近活动 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">最近活动</h3>
              <Link to="/admin/logs" className="text-blue-600 hover:text-blue-800 text-sm">
                查看全部
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 系统告警 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">系统告警</h3>
              <span className="text-sm text-gray-500">
                {systemAlerts.filter(alert => !alert.resolved).length} 条未处理
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {systemAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border-l-4 p-4 rounded-r-md ${getAlertStyle(alert.type)} ${
                    alert.resolved ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {alert.title}
                        {alert.resolved && (
                          <span className="ml-2 text-xs text-green-600">(已解决)</span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-2">{alert.timestamp}</p>
                    </div>
                    {!alert.resolved && (
                      <button
                        className="text-xs text-blue-600 hover:text-blue-800"
                        onClick={() => {
                          setSystemAlerts(alerts =>
                            alerts.map(a =>
                              a.id === alert.id ? { ...a, resolved: true } : a
                            )
                          );
                        }}
                      >
                        标记已解决
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}