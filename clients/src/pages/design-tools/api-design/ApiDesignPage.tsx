import React, { useState, useCallback } from 'react';
import { Card, Button, Tabs } from '@/components/ui';
import { 
  PlusIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  PlayIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  EyeIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import ApiEditor from './components/ApiEditor';
import SwaggerViewer from './components/SwaggerViewer';
import EndpointList from './components/EndpointList';
import MockServer from './components/MockServer';
import ApiTester from './components/ApiTester';
import DocumentationGenerator from './components/DocumentationGenerator';

interface ApiEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  summary: string;
  description?: string;
  tags: string[];
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: Record<string, ApiResponse>;
  security?: string[];
}

interface ApiParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  description?: string;
  required: boolean;
  schema: ApiSchema;
  example?: any;
}

interface ApiRequestBody {
  description?: string;
  required: boolean;
  content: Record<string, {
    schema: ApiSchema;
    example?: any;
  }>;
}

interface ApiResponse {
  description: string;
  headers?: Record<string, ApiHeader>;
  content?: Record<string, {
    schema: ApiSchema;
    example?: any;
  }>;
}

interface ApiHeader {
  description?: string;
  schema: ApiSchema;
}

interface ApiSchema {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  format?: string;
  enum?: any[];
  items?: ApiSchema;
  properties?: Record<string, ApiSchema>;
  required?: string[];
  example?: any;
  description?: string;
}

interface ApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      url?: string;
      email?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, Record<string, ApiEndpoint>>;
  components: {
    schemas: Record<string, ApiSchema>;
    securitySchemes: Record<string, any>;
  };
  tags: Array<{
    name: string;
    description?: string;
  }>;
}

const ApiDesignPage: React.FC = () => {
  const [apiSpec, setApiSpec] = useState<ApiSpec>({
    openapi: '3.0.3',
    info: {
      title: 'API 设计',
      version: '1.0.0',
      description: '使用设计工具创建的 API 规范'
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: '开发服务器'
      }
    ],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {}
    },
    tags: []
  });

  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [activeTab, setActiveTab] = useState('design');
  const [mockServerRunning, setMockServerRunning] = useState(false);

  // 添加端点
  const handleAddEndpoint = useCallback(() => {
    const newEndpoint: ApiEndpoint = {
      id: `endpoint_${Date.now()}`,
      path: '/new-endpoint',
      method: 'GET',
      summary: '新端点',
      description: '',
      tags: [],
      parameters: [],
      responses: {
        '200': {
          description: '成功响应',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Hello World'
                  }
                }
              }
            }
          }
        }
      }
    };

    setEndpoints(prev => [...prev, newEndpoint]);
    setSelectedEndpoint(newEndpoint);
  }, []);

  // 更新端点
  const handleUpdateEndpoint = useCallback((endpointId: string, updates: Partial<ApiEndpoint>) => {
    setEndpoints(prev => prev.map(endpoint => 
      endpoint.id === endpointId ? { ...endpoint, ...updates } : endpoint
    ));
    
    if (selectedEndpoint?.id === endpointId) {
      setSelectedEndpoint(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedEndpoint]);

  // 删除端点
  const handleDeleteEndpoint = useCallback((endpointId: string) => {
    setEndpoints(prev => prev.filter(endpoint => endpoint.id !== endpointId));
    
    if (selectedEndpoint?.id === endpointId) {
      setSelectedEndpoint(null);
    }
  }, [selectedEndpoint]);

  // 导出API规范
  const handleExport = useCallback((format: 'json' | 'yaml') => {
    // 构建完整的API规范
    const fullSpec = {
      ...apiSpec,
      paths: buildPathsFromEndpoints(endpoints)
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(fullSpec, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'api-spec.json';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // TODO: 实现YAML导出
      console.log('导出YAML格式');
    }
  }, [apiSpec, endpoints]);

  // 导入API规范
  const handleImport = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const spec = JSON.parse(e.target?.result as string);
        setApiSpec(spec);
        setEndpoints(extractEndpointsFromSpec(spec));
      } catch (error) {
        console.error('导入文件失败:', error);
      }
    };
    reader.readAsText(file);
  }, []);

  // 启动Mock服务器
  const handleToggleMockServer = useCallback(() => {
    setMockServerRunning(prev => !prev);
    // TODO: 实现Mock服务器启动/停止逻辑
  }, []);

  // 从端点构建路径对象
  const buildPathsFromEndpoints = (endpoints: ApiEndpoint[]) => {
    const paths: Record<string, Record<string, any>> = {};
    
    endpoints.forEach(endpoint => {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }
      
      paths[endpoint.path][endpoint.method.toLowerCase()] = {
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags,
        parameters: endpoint.parameters,
        requestBody: endpoint.requestBody,
        responses: endpoint.responses,
        security: endpoint.security
      };
    });
    
    return paths;
  };

  // 从规范提取端点
  const extractEndpointsFromSpec = (spec: ApiSpec): ApiEndpoint[] => {
    const extractedEndpoints: ApiEndpoint[] = [];
    
    Object.entries(spec.paths || {}).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, endpoint]) => {
        extractedEndpoints.push({
          id: `${method}_${path}_${Date.now()}`,
          path,
          method: method.toUpperCase() as any,
          summary: endpoint.summary || '',
          description: endpoint.description,
          tags: endpoint.tags || [],
          parameters: endpoint.parameters || [],
          requestBody: endpoint.requestBody,
          responses: endpoint.responses || {},
          security: endpoint.security
        });
      });
    });
    
    return extractedEndpoints;
  };

  const tabs = [
    { id: 'design', label: '设计', icon: CodeBracketIcon },
    { id: 'swagger', label: 'Swagger', icon: DocumentTextIcon },
    { id: 'mock', label: 'Mock', icon: PlayIcon },
    { id: 'test', label: '测试', icon: Cog6ToothIcon },
    { id: 'docs', label: '文档', icon: ClipboardDocumentListIcon }
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部工具栏 */}
      <div className="border-b bg-white px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold">API 设计工具</h1>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('import-file')?.click()}
              >
                <DocumentArrowUpIcon className="w-4 h-4 mr-1" />
                导入
              </Button>
              <input
                id="import-file"
                type="file"
                accept=".json,.yaml,.yml"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('json')}
              >
                <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                导出
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddEndpoint}
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                新端点
              </Button>
            </div>
          </div>

          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <div className="flex items-center space-x-2">
            <Button
              variant={mockServerRunning ? 'primary' : 'outline'}
              size="sm"
              onClick={handleToggleMockServer}
            >
              {mockServerRunning ? (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                  Mock 运行中
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4 mr-1" />
                  启动 Mock
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧端点列表 */}
        {activeTab === 'design' && (
          <div className="w-80 border-r bg-white">
            <EndpointList
              endpoints={endpoints}
              selectedEndpoint={selectedEndpoint}
              onEndpointSelect={setSelectedEndpoint}
              onEndpointUpdate={handleUpdateEndpoint}
              onEndpointDelete={handleDeleteEndpoint}
              onAddEndpoint={handleAddEndpoint}
            />
          </div>
        )}

        {/* 中央编辑区域 */}
        <div className="flex-1 flex flex-col">
          {activeTab === 'design' && (
            <ApiEditor
              endpoint={selectedEndpoint}
              apiSpec={apiSpec}
              onEndpointUpdate={handleUpdateEndpoint}
              onSpecUpdate={setApiSpec}
            />
          )}
          
          {activeTab === 'swagger' && (
            <SwaggerViewer
              spec={{
                ...apiSpec,
                paths: buildPathsFromEndpoints(endpoints)
              }}
            />
          )}
          
          {activeTab === 'mock' && (
            <MockServer
              endpoints={endpoints}
              isRunning={mockServerRunning}
              onToggle={handleToggleMockServer}
            />
          )}
          
          {activeTab === 'test' && (
            <ApiTester
              endpoints={endpoints}
              baseUrl={apiSpec.servers[0]?.url || 'http://localhost:3000'}
            />
          )}
          
          {activeTab === 'docs' && (
            <DocumentationGenerator
              spec={{
                ...apiSpec,
                paths: buildPathsFromEndpoints(endpoints)
              }}
            />
          )}
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="border-t bg-white px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>端点数: {endpoints.length}</span>
            <span>版本: {apiSpec.info.version}</span>
            <span>服务器: {apiSpec.servers.length}</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {mockServerRunning && (
              <span className="flex items-center space-x-1 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Mock服务器运行中</span>
              </span>
            )}
            <span>OpenAPI: {apiSpec.openapi}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDesignPage;