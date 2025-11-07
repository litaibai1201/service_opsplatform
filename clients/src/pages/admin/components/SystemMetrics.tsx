import React, { useState, useEffect } from 'react';

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

interface SystemMetricsProps {
  stats: AdminStats;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'stable';
  };
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  subtitle?: string;
}

function MetricCard({ title, value, change, icon, color, subtitle }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return (
          <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        );
      case 'stable':
        return (
          <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        );
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <div className="flex items-baseline space-x-2 mt-2">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {change && (
              <div className={`flex items-center space-x-1 ${getTrendColor(change.trend)}`}>
                {getTrendIcon(change.trend)}
                <span className="text-sm font-medium">
                  {Math.abs(change.value)}%
                </span>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]} text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function SystemMetrics({ stats }: SystemMetricsProps) {
  const [realtimeStats, setRealtimeStats] = useState(stats);
  const [isLive, setIsLive] = useState(false);

  // 模拟实时数据更新
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setRealtimeStats(prev => ({
        ...prev,
        activeUsers: Math.max(0, prev.activeUsers + Math.floor(Math.random() * 10 - 5)),
        systemLoad: Math.max(0, Math.min(100, prev.systemLoad + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(0, Math.min(100, prev.memoryUsage + (Math.random() - 0.5) * 5)),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [isLive]);

  useEffect(() => {
    setRealtimeStats(stats);
  }, [stats]);

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">系统指标</h3>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">实时更新</span>
              <button
                onClick={() => setIsLive(!isLive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isLive ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isLive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {isLive && (
              <div className="flex items-center space-x-1 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium">LIVE</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 总用户数 */}
          <MetricCard
            title="总用户数"
            value={realtimeStats.totalUsers.toLocaleString()}
            change={{ value: 8.2, trend: 'up' }}
            color="blue"
            subtitle="较上月增长"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            }
          />

          {/* 活跃用户 */}
          <MetricCard
            title="活跃用户"
            value={realtimeStats.activeUsers.toLocaleString()}
            change={{ value: 3.1, trend: 'up' }}
            color="green"
            subtitle="当前在线"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            }
          />

          {/* 团队数量 */}
          <MetricCard
            title="团队数量"
            value={realtimeStats.totalTeams}
            change={{ value: 12.5, trend: 'up' }}
            color="purple"
            subtitle="活跃团队"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />

          {/* 项目数量 */}
          <MetricCard
            title="项目数量"
            value={realtimeStats.totalProjects}
            change={{ value: 5.7, trend: 'up' }}
            color="orange"
            subtitle="进行中项目"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />
        </div>

        {/* 性能指标图表 */}
        <div className="mt-8">
          <h4 className="text-lg font-medium text-gray-900 mb-4">性能指标</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 系统负载 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">系统负载</span>
                <span className="text-sm text-gray-500">{realtimeStats.systemLoad.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    realtimeStats.systemLoad > 80
                      ? 'bg-red-500'
                      : realtimeStats.systemLoad > 60
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, realtimeStats.systemLoad)}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {realtimeStats.systemLoad > 80 ? '负载偏高' : realtimeStats.systemLoad > 60 ? '负载正常' : '负载良好'}
              </div>
            </div>

            {/* 内存使用率 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">内存使用</span>
                <span className="text-sm text-gray-500">{realtimeStats.memoryUsage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    realtimeStats.memoryUsage > 85
                      ? 'bg-red-500'
                      : realtimeStats.memoryUsage > 70
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, realtimeStats.memoryUsage)}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {realtimeStats.memoryUsage > 85 ? '内存紧张' : realtimeStats.memoryUsage > 70 ? '内存正常' : '内存充足'}
              </div>
            </div>

            {/* 磁盘使用率 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">磁盘使用</span>
                <span className="text-sm text-gray-500">{realtimeStats.diskUsage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    realtimeStats.diskUsage > 90
                      ? 'bg-red-500'
                      : realtimeStats.diskUsage > 75
                      ? 'bg-yellow-500'
                      : 'bg-purple-500'
                  }`}
                  style={{ width: `${Math.min(100, realtimeStats.diskUsage)}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {realtimeStats.diskUsage > 90 ? '存储紧张' : realtimeStats.diskUsage > 75 ? '存储正常' : '存储充足'}
              </div>
            </div>
          </div>
        </div>

        {/* 系统运行时间 */}
        <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">系统运行时间</p>
                <p className="text-xs text-gray-500">自上次重启以来</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{realtimeStats.uptime}</p>
              <p className="text-xs text-gray-500">稳定运行</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}