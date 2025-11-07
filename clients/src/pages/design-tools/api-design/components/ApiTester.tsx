import React, { useState, useCallback } from 'react';
import { Card, Button, Input, Select, Textarea } from '@/components/ui';
import { 
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  BookmarkIcon
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

interface TestRequest {
  id: string;
  endpoint: ApiEndpoint;
  url: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: string;
  response?: TestResponse;
  timestamp?: Date;
  duration?: number;
}

interface TestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  size: number;
  time: number;
}

interface ApiTesterProps {
  endpoints: ApiEndpoint[];
  baseUrl: string;
}

const ApiTester: React.FC<ApiTesterProps> = ({ endpoints, baseUrl }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [currentRequest, setCurrentRequest] = useState<TestRequest | null>(null);
  const [testHistory, setTestHistory] = useState<TestRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'request' | 'response' | 'history'>('request');

  // 创建新测试请求
  const createRequest = useCallback((endpoint: ApiEndpoint) => {
    const request: TestRequest = {
      id: `test_${Date.now()}`,
      endpoint,
      url: `${baseUrl}${endpoint.path}`,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      query: {},
      body: endpoint.requestBody ? JSON.stringify({}, null, 2) : undefined
    };

    setCurrentRequest(request);
    setSelectedEndpoint(endpoint);
  }, [baseUrl]);

  // 更新请求
  const updateRequest = useCallback((updates: Partial<TestRequest>) => {
    if (!currentRequest) return;
    setCurrentRequest(prev => prev ? { ...prev, ...updates } : null);
  }, [currentRequest]);

  // 执行请求
  const executeRequest = useCallback(async () => {
    if (!currentRequest) return;

    setIsLoading(true);
    const startTime = Date.now();

    try {
      // 构建URL
      const url = new URL(currentRequest.url);
      Object.entries(currentRequest.query).forEach(([key, value]) => {
        if (value) {
          url.searchParams.append(key, value);
        }
      });

      // 构建请求配置
      const config: RequestInit = {
        method: currentRequest.method,
        headers: currentRequest.headers
      };

      // 添加请求体
      if (currentRequest.body && ['POST', 'PUT', 'PATCH'].includes(currentRequest.method)) {
        config.body = currentRequest.body;
      }

      // 发送请求
      const response = await fetch(url.toString(), config);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 解析响应
      let responseData;
      const contentType = response.headers.get('Content-Type') || '';
      
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // 构建响应对象
      const testResponse: TestResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        size: JSON.stringify(responseData).length,
        time: duration
      };

      // 更新请求记录
      const completedRequest: TestRequest = {
        ...currentRequest,
        response: testResponse,
        timestamp: new Date(),
        duration
      };

      setCurrentRequest(completedRequest);
      setTestHistory(prev => [completedRequest, ...prev.slice(0, 49)]); // 保留最近50次测试

    } catch (error) {
      const errorResponse: TestResponse = {
        status: 0,
        statusText: 'Network Error',
        headers: {},
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        size: 0,
        time: Date.now() - startTime
      };

      const failedRequest: TestRequest = {
        ...currentRequest,
        response: errorResponse,
        timestamp: new Date(),
        duration: Date.now() - startTime
      };

      setCurrentRequest(failedRequest);
      setTestHistory(prev => [failedRequest, ...prev.slice(0, 49)]);
    } finally {
      setIsLoading(false);
    }
  }, [currentRequest]);

  // 复制响应
  const copyResponse = useCallback(() => {
    if (currentRequest?.response) {
      navigator.clipboard.writeText(JSON.stringify(currentRequest.response.data, null, 2));
    }
  }, [currentRequest]);

  // 保存请求
  const saveRequest = useCallback(() => {
    if (currentRequest) {
      // TODO: 实现保存到收藏夹功能
      console.log('保存请求:', currentRequest);
    }
  }, [currentRequest]);

  // 获取状态码颜色
  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) {
      return 'text-green-600 bg-green-50';
    } else if (status >= 400 && status < 500) {
      return 'text-yellow-600 bg-yellow-50';
    } else if (status >= 500) {
      return 'text-red-600 bg-red-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  // 渲染端点选择器
  const renderEndpointSelector = () => (
    <Card className="p-4 mb-4">
      <h3 className="font-medium text-gray-900 mb-3">选择端点进行测试</h3>
      <div className="space-y-2">
        {endpoints.map(endpoint => (
          <button
            key={endpoint.id}
            onClick={() => createRequest(endpoint)}
            className="w-full flex items-center justify-between p-3 border rounded hover:bg-gray-50 text-left"
          >
            <div className="flex items-center space-x-3">
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                endpoint.method === 'POST' ? 'bg-green-100 text-green-800' :
                endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {endpoint.method}
              </span>
              <span className="font-mono text-sm text-gray-900">{endpoint.path}</span>
              <span className="text-sm text-gray-600">{endpoint.summary}</span>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );

  // 渲染请求编辑器
  const renderRequestEditor = () => {
    if (!currentRequest) return null;

    return (
      <div className="space-y-4">
        {/* URL和方法 */}
        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Select
              value={currentRequest.method}
              onChange={(value) => updateRequest({ method: value })}
              options={[
                { value: 'GET', label: 'GET' },
                { value: 'POST', label: 'POST' },
                { value: 'PUT', label: 'PUT' },
                { value: 'DELETE', label: 'DELETE' },
                { value: 'PATCH', label: 'PATCH' }
              ]}
              className="w-32"
            />
            <Input
              value={currentRequest.url}
              onChange={(e) => updateRequest({ url: e.target.value })}
              placeholder="请求URL"
              className="flex-1"
            />
            <Button
              variant="primary"
              onClick={executeRequest}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                  发送中
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4 mr-2" />
                  发送
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* 请求参数 */}
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">查询参数</h4>
          <div className="space-y-2">
            {Object.entries(currentRequest.query).map(([key, value], index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  value={key}
                  onChange={(e) => {
                    const newQuery = { ...currentRequest.query };
                    delete newQuery[key];
                    newQuery[e.target.value] = value;
                    updateRequest({ query: newQuery });
                  }}
                  placeholder="参数名"
                  className="flex-1"
                />
                <Input
                  value={value}
                  onChange={(e) => {
                    updateRequest({
                      query: { ...currentRequest.query, [key]: e.target.value }
                    });
                  }}
                  placeholder="参数值"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newQuery = { ...currentRequest.query };
                    delete newQuery[key];
                    updateRequest({ query: newQuery });
                  }}
                  className="text-red-600"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateRequest({
                  query: { ...currentRequest.query, '': '' }
                });
              }}
            >
              添加参数
            </Button>
          </div>
        </Card>

        {/* 请求头 */}
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">请求头</h4>
          <div className="space-y-2">
            {Object.entries(currentRequest.headers).map(([key, value], index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  value={key}
                  onChange={(e) => {
                    const newHeaders = { ...currentRequest.headers };
                    delete newHeaders[key];
                    newHeaders[e.target.value] = value;
                    updateRequest({ headers: newHeaders });
                  }}
                  placeholder="头名称"
                  className="flex-1"
                />
                <Input
                  value={value}
                  onChange={(e) => {
                    updateRequest({
                      headers: { ...currentRequest.headers, [key]: e.target.value }
                    });
                  }}
                  placeholder="头值"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newHeaders = { ...currentRequest.headers };
                    delete newHeaders[key];
                    updateRequest({ headers: newHeaders });
                  }}
                  className="text-red-600"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateRequest({
                  headers: { ...currentRequest.headers, '': '' }
                });
              }}
            >
              添加请求头
            </Button>
          </div>
        </Card>

        {/* 请求体 */}
        {['POST', 'PUT', 'PATCH'].includes(currentRequest.method) && (
          <Card className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">请求体</h4>
            <Textarea
              value={currentRequest.body || ''}
              onChange={(e) => updateRequest({ body: e.target.value })}
              placeholder="请求体内容 (JSON)"
              rows={8}
              className="font-mono text-sm"
            />
          </Card>
        )}
      </div>
    );
  };

  // 渲染响应面板
  const renderResponsePanel = () => {
    if (!currentRequest?.response) {
      return (
        <div className="text-center py-8 text-gray-500">
          <PlayIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">发送请求查看响应</p>
        </div>
      );
    }

    const { response } = currentRequest;

    return (
      <div className="space-y-4">
        {/* 响应状态 */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded font-medium ${getStatusColor(response.status)}`}>
                {response.status} {response.statusText}
              </span>
              <span className="text-sm text-gray-600">
                <ClockIcon className="w-4 h-4 inline mr-1" />
                {response.time}ms
              </span>
              <span className="text-sm text-gray-600">
                大小: {response.size} bytes
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyResponse}
              >
                <ClipboardDocumentIcon className="w-4 h-4 mr-1" />
                复制
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={saveRequest}
              >
                <BookmarkIcon className="w-4 h-4 mr-1" />
                保存
              </Button>
            </div>
          </div>
        </Card>

        {/* 响应头 */}
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">响应头</h4>
          <div className="space-y-1">
            {Object.entries(response.headers).map(([key, value]) => (
              <div key={key} className="flex text-sm">
                <span className="font-medium text-gray-700 w-48">{key}:</span>
                <span className="text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 响应体 */}
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">响应体</h4>
          <pre className="bg-gray-50 p-4 rounded border text-sm overflow-auto max-h-96">
            {typeof response.data === 'string' 
              ? response.data 
              : JSON.stringify(response.data, null, 2)
            }
          </pre>
        </Card>
      </div>
    );
  };

  // 渲染历史记录
  const renderHistoryPanel = () => (
    <div className="space-y-2">
      {testHistory.length > 0 ? (
        testHistory.map(request => (
          <Card
            key={request.id}
            className="p-4 cursor-pointer hover:bg-gray-50"
            onClick={() => setCurrentRequest(request)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  request.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                  request.method === 'POST' ? 'bg-green-100 text-green-800' :
                  request.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                  request.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {request.method}
                </span>
                <span className="font-mono text-sm text-gray-900">{request.endpoint.path}</span>
                {request.response && (
                  <span className={`text-sm font-medium ${
                    request.response.status >= 200 && request.response.status < 300
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {request.response.status}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                {request.timestamp && (
                  <span>{request.timestamp.toLocaleTimeString()}</span>
                )}
                {request.duration && (
                  <span>{request.duration}ms</span>
                )}
              </div>
            </div>
          </Card>
        ))
      ) : (
        <div className="text-center py-8 text-gray-500">
          <ClockIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">暂无测试历史</p>
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: 'request', label: '请求' },
    { id: 'response', label: '响应' },
    { id: 'history', label: '历史' }
  ];

  return (
    <div className="flex-1 flex flex-col">
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
        {!currentRequest && activeTab === 'request' && renderEndpointSelector()}
        {activeTab === 'request' && renderRequestEditor()}
        {activeTab === 'response' && renderResponsePanel()}
        {activeTab === 'history' && renderHistoryPanel()}
      </div>
    </div>
  );
};

export default ApiTester;