import React, { useState, useCallback } from 'react';
import { Card, Button, Input, Select, Textarea, Tabs } from '@/components/ui';
import { 
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';

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
  };
  servers: Array<{
    url: string;
    description?: string;
  }>;
  components: {
    schemas: Record<string, ApiSchema>;
    securitySchemes: Record<string, any>;
  };
  tags: Array<{
    name: string;
    description?: string;
  }>;
}

interface ApiEditorProps {
  endpoint: ApiEndpoint | null;
  apiSpec: ApiSpec;
  onEndpointUpdate: (endpointId: string, updates: Partial<ApiEndpoint>) => void;
  onSpecUpdate: (spec: ApiSpec) => void;
}

const ApiEditor: React.FC<ApiEditorProps> = ({
  endpoint,
  apiSpec,
  onEndpointUpdate,
  onSpecUpdate,
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));

  // 切换展开状态
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // 更新端点字段
  const updateField = useCallback((field: string, value: any) => {
    if (!endpoint) return;
    onEndpointUpdate(endpoint.id, { [field]: value });
  }, [endpoint, onEndpointUpdate]);

  // 添加参数
  const addParameter = useCallback(() => {
    if (!endpoint) return;
    
    const newParameter: ApiParameter = {
      name: 'newParam',
      in: 'query',
      description: '',
      required: false,
      schema: {
        type: 'string'
      }
    };
    
    onEndpointUpdate(endpoint.id, {
      parameters: [...endpoint.parameters, newParameter]
    });
  }, [endpoint, onEndpointUpdate]);

  // 更新参数
  const updateParameter = useCallback((index: number, updates: Partial<ApiParameter>) => {
    if (!endpoint) return;
    
    const newParameters = [...endpoint.parameters];
    newParameters[index] = { ...newParameters[index], ...updates };
    
    onEndpointUpdate(endpoint.id, { parameters: newParameters });
  }, [endpoint, onEndpointUpdate]);

  // 删除参数
  const deleteParameter = useCallback((index: number) => {
    if (!endpoint) return;
    
    const newParameters = endpoint.parameters.filter((_, i) => i !== index);
    onEndpointUpdate(endpoint.id, { parameters: newParameters });
  }, [endpoint, onEndpointUpdate]);

  // 添加响应
  const addResponse = useCallback((statusCode: string) => {
    if (!endpoint) return;
    
    const newResponse: ApiResponse = {
      description: '响应描述',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Success'
              }
            }
          }
        }
      }
    };
    
    onEndpointUpdate(endpoint.id, {
      responses: {
        ...endpoint.responses,
        [statusCode]: newResponse
      }
    });
  }, [endpoint, onEndpointUpdate]);

  // 渲染基础信息
  const renderBasicInfo = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            HTTP 方法
          </label>
          <Select
            value={endpoint?.method || 'GET'}
            onChange={(value) => updateField('method', value)}
            options={[
              { value: 'GET', label: 'GET' },
              { value: 'POST', label: 'POST' },
              { value: 'PUT', label: 'PUT' },
              { value: 'DELETE', label: 'DELETE' },
              { value: 'PATCH', label: 'PATCH' }
            ]}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            路径
          </label>
          <Input
            value={endpoint?.path || ''}
            onChange={(e) => updateField('path', e.target.value)}
            placeholder="/api/resource"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          摘要
        </label>
        <Input
          value={endpoint?.summary || ''}
          onChange={(e) => updateField('summary', e.target.value)}
          placeholder="端点简短描述"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          描述
        </label>
        <Textarea
          value={endpoint?.description || ''}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="端点详细描述"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          标签
        </label>
        <Input
          value={endpoint?.tags.join(', ') || ''}
          onChange={(e) => updateField('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
          placeholder="标签1, 标签2"
        />
      </div>
    </div>
  );

  // 渲染参数编辑器
  const renderParameters = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">请求参数</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={addParameter}
        >
          <PlusIcon className="w-4 h-4 mr-1" />
          添加参数
        </Button>
      </div>

      {endpoint?.parameters.map((param, index) => (
        <Card key={index} className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-3 gap-3 flex-1">
                <Input
                  value={param.name}
                  onChange={(e) => updateParameter(index, { name: e.target.value })}
                  placeholder="参数名"
                />
                <Select
                  value={param.in}
                  onChange={(value) => updateParameter(index, { in: value as any })}
                  options={[
                    { value: 'query', label: 'Query' },
                    { value: 'path', label: 'Path' },
                    { value: 'header', label: 'Header' },
                    { value: 'cookie', label: 'Cookie' }
                  ]}
                />
                <Select
                  value={param.schema.type}
                  onChange={(value) => updateParameter(index, { 
                    schema: { ...param.schema, type: value as any }
                  })}
                  options={[
                    { value: 'string', label: 'String' },
                    { value: 'number', label: 'Number' },
                    { value: 'integer', label: 'Integer' },
                    { value: 'boolean', label: 'Boolean' },
                    { value: 'array', label: 'Array' }
                  ]}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteParameter(index)}
                className="text-red-600 hover:text-red-800"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                value={param.description || ''}
                onChange={(e) => updateParameter(index, { description: e.target.value })}
                placeholder="参数描述"
              />
              <Input
                value={param.example || ''}
                onChange={(e) => updateParameter(index, { example: e.target.value })}
                placeholder="示例值"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={param.required}
                onChange={(e) => updateParameter(index, { required: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-600">必需参数</span>
            </div>
          </div>
        </Card>
      )) || (
        <div className="text-center py-8 text-gray-500">
          <ClipboardDocumentIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">暂无参数</p>
          <p className="text-xs text-gray-400">点击添加参数按钮开始</p>
        </div>
      )}
    </div>
  );

  // 渲染请求体编辑器
  const renderRequestBody = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900">请求体</h3>
      
      {endpoint?.method !== 'GET' && endpoint?.method !== 'DELETE' ? (
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={!!endpoint?.requestBody}
              onChange={(e) => {
                if (e.target.checked) {
                  updateField('requestBody', {
                    description: '请求体',
                    required: true,
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {}
                        }
                      }
                    }
                  });
                } else {
                  updateField('requestBody', undefined);
                }
              }}
              className="rounded border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-600">包含请求体</span>
          </div>

          {endpoint?.requestBody && (
            <Card className="p-4">
              <div className="space-y-3">
                <Input
                  value={endpoint.requestBody.description || ''}
                  onChange={(e) => updateField('requestBody', {
                    ...endpoint.requestBody,
                    description: e.target.value
                  })}
                  placeholder="请求体描述"
                />

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={endpoint.requestBody.required}
                    onChange={(e) => updateField('requestBody', {
                      ...endpoint.requestBody,
                      required: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-600">必需请求体</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    JSON Schema
                  </label>
                  <Textarea
                    value={JSON.stringify(
                      endpoint.requestBody.content?.['application/json']?.schema || {},
                      null,
                      2
                    )}
                    onChange={(e) => {
                      try {
                        const schema = JSON.parse(e.target.value);
                        updateField('requestBody', {
                          ...endpoint.requestBody,
                          content: {
                            'application/json': {
                              schema,
                              example: endpoint.requestBody?.content?.['application/json']?.example
                            }
                          }
                        });
                      } catch (error) {
                        // 忽略JSON解析错误
                      }
                    }}
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">{endpoint?.method} 请求通常不包含请求体</p>
        </div>
      )}
    </div>
  );

  // 渲染响应编辑器
  const renderResponses = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">响应</h3>
        <Select
          placeholder="添加响应状态码"
          onChange={(value) => {
            addResponse(value);
          }}
          options={[
            { value: '200', label: '200 - 成功' },
            { value: '201', label: '201 - 已创建' },
            { value: '400', label: '400 - 请求错误' },
            { value: '401', label: '401 - 未授权' },
            { value: '403', label: '403 - 禁止访问' },
            { value: '404', label: '404 - 未找到' },
            { value: '500', label: '500 - 服务器错误' }
          ]}
        />
      </div>

      {Object.entries(endpoint?.responses || {}).map(([statusCode, response]) => (
        <Card key={statusCode} className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">状态码: {statusCode}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newResponses = { ...endpoint?.responses };
                  delete newResponses[statusCode];
                  updateField('responses', newResponses);
                }}
                className="text-red-600 hover:text-red-800"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </div>

            <Input
              value={response.description}
              onChange={(e) => {
                const newResponses = {
                  ...endpoint?.responses,
                  [statusCode]: {
                    ...response,
                    description: e.target.value
                  }
                };
                updateField('responses', newResponses);
              }}
              placeholder="响应描述"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                响应 Schema
              </label>
              <Textarea
                value={JSON.stringify(
                  response.content?.['application/json']?.schema || {},
                  null,
                  2
                )}
                onChange={(e) => {
                  try {
                    const schema = JSON.parse(e.target.value);
                    const newResponses = {
                      ...endpoint?.responses,
                      [statusCode]: {
                        ...response,
                        content: {
                          'application/json': {
                            schema,
                            example: response.content?.['application/json']?.example
                          }
                        }
                      }
                    };
                    updateField('responses', newResponses);
                  } catch (error) {
                    // 忽略JSON解析错误
                  }
                }}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  if (!endpoint) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <ClipboardDocumentIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">选择端点进行编辑</h3>
          <p className="text-sm text-gray-600">从左侧列表选择一个端点或创建新端点</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'basic', label: '基础信息' },
    { id: 'parameters', label: '参数' },
    { id: 'body', label: '请求体' },
    { id: 'responses', label: '响应' }
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* 端点标题 */}
      <div className="border-b bg-white p-4">
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
          <span className="font-mono text-sm text-gray-700">{endpoint.path}</span>
          <span className="text-sm text-gray-500">-</span>
          <span className="text-sm font-medium">{endpoint.summary}</span>
        </div>
      </div>

      {/* 标签页 */}
      <div className="border-b bg-white">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="underline"
        />
      </div>

      {/* 编辑内容 */}
      <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
        {activeTab === 'basic' && renderBasicInfo()}
        {activeTab === 'parameters' && renderParameters()}
        {activeTab === 'body' && renderRequestBody()}
        {activeTab === 'responses' && renderResponses()}
      </div>
    </div>
  );
};

export default ApiEditor;