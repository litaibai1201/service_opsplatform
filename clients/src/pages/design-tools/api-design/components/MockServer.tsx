import React, { useState, useCallback } from 'react';
import { Card, Button, Input, Select } from '@/components/ui';
import { 
  PlayIcon,
  StopIcon,
  ServerIcon,
  ClipboardDocumentIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface ApiEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  summary: string;
  description?: string;
  tags: string[];
  parameters: any[];
  requestBody?: any;
  responses: Record<string, any>;
  security?: string[];
}

interface MockConfig {
  port: number;
  host: string;
  delay: number;
  cors: boolean;
  logging: boolean;
  baseUrl: string;
}

interface MockRequest {
  id: string;
  timestamp: Date;
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body?: any;
  response: {
    status: number;
    data: any;
    headers: Record<string, string>;
  };
  duration: number;
}

interface MockServerProps {
  endpoints: ApiEndpoint[];
  isRunning: boolean;
  onToggle: () => void;
}

const MockServer: React.FC<MockServerProps> = ({
  endpoints,
  isRunning,
  onToggle,
}) => {
  const [config, setConfig] = useState<MockConfig>({
    port: 3001,
    host: 'localhost',
    delay: 0,
    cors: true,
    logging: true,
    baseUrl: ''
  });

  const [requests, setRequests] = useState<MockRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<MockRequest | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'requests' | 'logs'>('config');

  // 模拟请求数据（实际应该从后端获取）
  const mockRequests: MockRequest[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      method: 'GET',
      path: '/api/users',
      query: { page: '1', limit: '10' },
      headers: { 'Content-Type': 'application/json' },
      response: {
        status: 200,
        data: { users: [], total: 0 },
        headers: { 'Content-Type': 'application/json' }
      },
      duration: 120
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000 * 60 * 3),
      method: 'POST',
      path: '/api/users',
      query: {},
      headers: { 'Content-Type': 'application/json' },
      body: { name: 'John Doe', email: 'john@example.com' },
      response: {
        status: 201,
        data: { id: 1, name: 'John Doe', email: 'john@example.com' },
        headers: { 'Content-Type': 'application/json' }
      },
      duration: 200
    }
  ];

  // 更新配置
  const updateConfig = useCallback((key: keyof MockConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  // 复制Mock服务器URL
  const copyMockUrl = useCallback(() => {
    const url = `http://${config.host}:${config.port}${config.baseUrl}`;
    navigator.clipboard.writeText(url).then(() => {
      // TODO: 显示成功提示
      console.log('Mock URL已复制到剪贴板');
    });
  }, [config]);

  // 获取方法颜色
  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-blue-100 text-blue-800';
      case 'POST':
        return 'bg-green-100 text-green-800';
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'PATCH':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取状态码颜色
  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) {
      return 'text-green-600';
    } else if (status >= 400 && status < 500) {
      return 'text-yellow-600';
    } else if (status >= 500) {
      return 'text-red-600';
    }
    return 'text-gray-600';
  };

  // 渲染配置面板
  const renderConfigPanel = () => (
    <div className="space-y-6">
      {/* 服务器配置 */}
      <Card className="p-6">
        <h3 className="font-medium text-gray-900 mb-4">服务器配置</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              主机地址
            </label>
            <Input
              value={config.host}
              onChange={(e) => updateConfig('host', e.target.value)}
              placeholder="localhost"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              端口号
            </label>
            <Input
              type="number"
              value={config.port}
              onChange={(e) => updateConfig('port', parseInt(e.target.value))}
              placeholder="3001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              基础路径
            </label>
            <Input
              value={config.baseUrl}
              onChange={(e) => updateConfig('baseUrl', e.target.value)}
              placeholder="/api"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              响应延迟 (ms)
            </label>
            <Input
              type="number"
              value={config.delay}
              onChange={(e) => updateConfig('delay', parseInt(e.target.value))}
              placeholder="0"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={config.cors}
              onChange={(e) => updateConfig('cors', e.target.checked)}
              className="rounded border-gray-300"
            />
            <label className="ml-2 text-sm text-gray-700">启用 CORS 支持</label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={config.logging}
              onChange={(e) => updateConfig('logging', e.target.checked)}
              className="rounded border-gray-300"
            />
            <label className="ml-2 text-sm text-gray-700">启用请求日志</label>
          </div>
        </div>

        {/* Mock URL */}
        <div className="mt-4 p-3 bg-gray-50 rounded border">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Mock 服务器地址
              </label>
              <p className="font-mono text-sm text-gray-900">
                http://{config.host}:{config.port}{config.baseUrl}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyMockUrl}
            >
              <ClipboardDocumentIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* 端点列表 */}
      <Card className="p-6">
        <h3 className="font-medium text-gray-900 mb-4">Mock 端点</h3>
        {endpoints.length > 0 ? (
          <div className="space-y-2">
            {endpoints.map(endpoint => (
              <div key={endpoint.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getMethodColor(endpoint.method)}`}>
                    {endpoint.method}
                  </span>
                  <span className="font-mono text-sm text-gray-900">
                    {config.baseUrl}{endpoint.path}
                  </span>
                  <span className="text-sm text-gray-600">{endpoint.summary}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {isRunning ? (
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  ) : (
                    <ExclamationTriangleIcon className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <ServerIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">暂无可Mock的端点</p>
            <p className="text-xs text-gray-400 mt-1">请先在设计页面添加API端点</p>
          </div>
        )}
      </Card>
    </div>
  );

  // 渲染请求列表
  const renderRequestsPanel = () => (
    <div className="space-y-4">
      {mockRequests.length > 0 ? (
        <div className="space-y-2">
          {mockRequests.map(request => (
            <Card
              key={request.id}
              className={`p-4 cursor-pointer transition-colors ${
                selectedRequest?.id === request.id
                  ? 'border-blue-300 bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedRequest(request)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getMethodColor(request.method)}`}>
                    {request.method}
                  </span>
                  <span className="font-mono text-sm text-gray-900">{request.path}</span>
                  <span className={`text-sm font-medium ${getStatusColor(request.response.status)}`}>
                    {request.response.status}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <ClockIcon className="w-3 h-3" />
                  <span>{request.duration}ms</span>
                  <span>{request.timestamp.toLocaleTimeString()}</span>
                </div>
              </div>
              
              {Object.keys(request.query).length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  查询参数: {Object.entries(request.query).map(([key, value]) => `${key}=${value}`).join(', ')}
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <ClockIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">暂无请求记录</p>
          <p className="text-xs text-gray-400 mt-1">启动Mock服务器后将显示请求</p>
        </div>
      )}

      {/* 请求详情 */}
      {selectedRequest && (
        <Card className="p-6">
          <h3 className="font-medium text-gray-900 mb-4">请求详情</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">请求信息</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="text-gray-600">方法:</span> {selectedRequest.method}</div>
                  <div><span className="text-gray-600">路径:</span> {selectedRequest.path}</div>
                  <div><span className="text-gray-600">时间:</span> {selectedRequest.timestamp.toLocaleString()}</div>
                  <div><span className="text-gray-600">耗时:</span> {selectedRequest.duration}ms</div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">响应信息</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="text-gray-600">状态码:</span> {selectedRequest.response.status}</div>
                  <div><span className="text-gray-600">内容类型:</span> {selectedRequest.response.headers['Content-Type']}</div>
                </div>
              </div>
            </div>

            {selectedRequest.body && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">请求体</h4>
                <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto">
                  {JSON.stringify(selectedRequest.body, null, 2)}
                </pre>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">响应体</h4>
              <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto">
                {JSON.stringify(selectedRequest.response.data, null, 2)}
              </pre>
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  // 渲染日志面板
  const renderLogsPanel = () => (
    <Card className="p-6">
      <h3 className="font-medium text-gray-900 mb-4">服务器日志</h3>
      <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
        {isRunning ? (
          <div className="space-y-1">
            <div>[{new Date().toLocaleTimeString()}] Mock server started on http://{config.host}:{config.port}</div>
            <div>[{new Date().toLocaleTimeString()}] CORS enabled: {config.cors ? 'true' : 'false'}</div>
            <div>[{new Date().toLocaleTimeString()}] Request logging: {config.logging ? 'enabled' : 'disabled'}</div>
            <div>[{new Date().toLocaleTimeString()}] Response delay: {config.delay}ms</div>
            <div>[{new Date().toLocaleTimeString()}] Loaded {endpoints.length} endpoints</div>
            {mockRequests.map(request => (
              <div key={request.id}>
                [{request.timestamp.toLocaleTimeString()}] {request.method} {request.path} → {request.response.status} ({request.duration}ms)
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">Mock server is not running...</div>
        )}
      </div>
    </Card>
  );

  const tabs = [
    { id: 'config', label: '配置' },
    { id: 'requests', label: '请求' },
    { id: 'logs', label: '日志' }
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* 顶部控制栏 */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="font-medium text-gray-900">
                Mock 服务器 {isRunning ? '运行中' : '已停止'}
              </span>
            </div>
            {isRunning && (
              <span className="text-sm text-gray-600">
                http://{config.host}:{config.port}{config.baseUrl}
              </span>
            )}
          </div>

          <Button
            variant={isRunning ? 'outline' : 'primary'}
            onClick={onToggle}
          >
            {isRunning ? (
              <>
                <StopIcon className="w-4 h-4 mr-2" />
                停止服务器
              </>
            ) : (
              <>
                <PlayIcon className="w-4 h-4 mr-2" />
                启动服务器
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 标签页 */}
      <div className="border-b bg-white">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
        {activeTab === 'config' && renderConfigPanel()}
        {activeTab === 'requests' && renderRequestsPanel()}
        {activeTab === 'logs' && renderLogsPanel()}
      </div>
    </div>
  );
};

export default MockServer;