import React, { useState, useEffect } from 'react';

interface SystemHealthProps {
  systemLoad: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: string;
}

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'maintenance';
  responseTime: number;
  lastCheck: string;
  description: string;
}

interface HealthCheck {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

export default function SystemHealth({ systemLoad, memoryUsage, diskUsage, uptime }: SystemHealthProps) {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [overallHealth, setOverallHealth] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 模拟服务状态数据
  useEffect(() => {
    const loadSystemHealth = () => {
      const mockServices: ServiceStatus[] = [
        {
          name: 'Web服务器',
          status: 'healthy',
          responseTime: 45,
          lastCheck: new Date().toISOString(),
          description: 'Nginx Web服务器运行正常',
        },
        {
          name: '数据库',
          status: memoryUsage > 80 ? 'warning' : 'healthy',
          responseTime: 23,
          lastCheck: new Date().toISOString(),
          description: 'PostgreSQL数据库连接正常',
        },
        {
          name: '缓存服务',
          status: 'healthy',
          responseTime: 8,
          lastCheck: new Date().toISOString(),
          description: 'Redis缓存服务运行正常',
        },
        {
          name: 'API网关',
          status: systemLoad > 70 ? 'warning' : 'healthy',
          responseTime: 67,
          lastCheck: new Date().toISOString(),
          description: 'API Gateway运行正常',
        },
        {
          name: '文件存储',
          status: diskUsage > 85 ? 'error' : diskUsage > 70 ? 'warning' : 'healthy',
          responseTime: 156,
          lastCheck: new Date().toISOString(),
          description: '对象存储服务运行正常',
        },
        {
          name: '消息队列',
          status: 'healthy',
          responseTime: 34,
          lastCheck: new Date().toISOString(),
          description: 'RabbitMQ消息队列运行正常',
        },
      ];

      const mockHealthChecks: HealthCheck[] = [
        {
          id: '1',
          name: '数据库连接',
          status: 'pass',
          message: '所有数据库连接池正常',
          timestamp: new Date().toISOString(),
          details: {
            activeConnections: 12,
            maxConnections: 100,
            avgResponseTime: '23ms',
          },
        },
        {
          id: '2',
          name: '磁盘空间',
          status: diskUsage > 85 ? 'fail' : diskUsage > 70 ? 'warn' : 'pass',
          message: diskUsage > 85 ? '磁盘空间不足' : diskUsage > 70 ? '磁盘空间预警' : '磁盘空间充足',
          timestamp: new Date().toISOString(),
          details: {
            usage: `${diskUsage.toFixed(1)}%`,
            available: `${(100 - diskUsage).toFixed(1)}%`,
            total: '500GB',
          },
        },
        {
          id: '3',
          name: '内存使用率',
          status: memoryUsage > 85 ? 'fail' : memoryUsage > 70 ? 'warn' : 'pass',
          message: memoryUsage > 85 ? '内存使用率过高' : memoryUsage > 70 ? '内存使用率偏高' : '内存使用率正常',
          timestamp: new Date().toISOString(),
          details: {
            usage: `${memoryUsage.toFixed(1)}%`,
            used: '13.6GB',
            total: '20GB',
          },
        },
        {
          id: '4',
          name: '系统负载',
          status: systemLoad > 80 ? 'fail' : systemLoad > 60 ? 'warn' : 'pass',
          message: systemLoad > 80 ? '系统负载过高' : systemLoad > 60 ? '系统负载偏高' : '系统负载正常',
          timestamp: new Date().toISOString(),
          details: {
            load1m: systemLoad.toFixed(2),
            load5m: (systemLoad * 0.8).toFixed(2),
            load15m: (systemLoad * 0.6).toFixed(2),
          },
        },
        {
          id: '5',
          name: '网络连通性',
          status: 'pass',
          message: '外部API连通性正常',
          timestamp: new Date().toISOString(),
          details: {
            externalAPIs: 'All reachable',
            averageLatency: '45ms',
            failedRequests: 0,
          },
        },
      ];

      setServices(mockServices);
      setHealthChecks(mockHealthChecks);

      // 计算整体健康状态
      const hasErrors = mockServices.some(s => s.status === 'error') || mockHealthChecks.some(h => h.status === 'fail');
      const hasWarnings = mockServices.some(s => s.status === 'warning') || mockHealthChecks.some(h => h.status === 'warn');
      
      if (hasErrors) {
        setOverallHealth('critical');
      } else if (hasWarnings) {
        setOverallHealth('warning');
      } else {
        setOverallHealth('healthy');
      }
    };

    loadSystemHealth();
  }, [systemLoad, memoryUsage, diskUsage]);

  // 刷新健康检查
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 重新加载数据
    setHealthChecks(prev => prev.map(check => ({
      ...check,
      timestamp: new Date().toISOString(),
    })));
    
    setServices(prev => prev.map(service => ({
      ...service,
      lastCheck: new Date().toISOString(),
      responseTime: Math.floor(Math.random() * 200) + 10,
    })));
    
    setIsRefreshing(false);
  };

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
      case 'warn':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
      case 'critical':
      case 'fail':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'warning':
      case 'warn':
        return (
          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'error':
      case 'critical':
      case 'fail':
        return (
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'maintenance':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // 获取整体健康状态样式
  const getOverallHealthStyle = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">系统健康</h3>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRefreshing ? '刷新中...' : '刷新'}</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* 整体状态 */}
        <div className={`p-4 rounded-lg border mb-6 ${getOverallHealthStyle(overallHealth)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {getStatusIcon(overallHealth)}
                <h4 className="text-lg font-semibold text-gray-900">
                  系统状态: {overallHealth === 'healthy' ? '健康' : overallHealth === 'warning' ? '警告' : '严重'}
                </h4>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">运行时间</p>
              <p className="text-lg font-semibold text-gray-900">{uptime}</p>
            </div>
          </div>
        </div>

        {/* 服务状态 */}
        <div className="mb-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">服务状态</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{service.name}</h5>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyle(service.status)}`}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(service.status)}
                      <span>
                        {service.status === 'healthy' ? '正常' :
                         service.status === 'warning' ? '警告' :
                         service.status === 'error' ? '错误' : '维护中'}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>响应时间: {service.responseTime}ms</span>
                  <span>最后检查: {new Date(service.lastCheck).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 健康检查详情 */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">健康检查</h4>
          <div className="space-y-3">
            {healthChecks.map((check) => (
              <div key={check.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {getStatusIcon(check.status)}
                      <h5 className="font-medium text-gray-900">{check.name}</h5>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyle(check.status)}`}>
                        {check.status === 'pass' ? '通过' : check.status === 'warn' ? '警告' : '失败'}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{check.message}</p>
                    
                    {/* 详细信息 */}
                    {check.details && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                        {Object.entries(check.details).map(([key, value]) => (
                          <div key={key} className="text-xs">
                            <span className="text-gray-500">{key}: </span>
                            <span className="font-medium text-gray-700">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {new Date(check.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}