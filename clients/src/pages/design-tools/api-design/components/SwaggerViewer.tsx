import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { 
  DocumentArrowDownIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  CodeBracketIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

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
  paths: Record<string, Record<string, any>>;
  components: {
    schemas: Record<string, any>;
    securitySchemes: Record<string, any>;
  };
  tags: Array<{
    name: string;
    description?: string;
  }>;
}

interface SwaggerViewerProps {
  spec: ApiSpec;
}

const SwaggerViewer: React.FC<SwaggerViewerProps> = ({ spec }) => {
  const [viewMode, setViewMode] = useState<'ui' | 'json' | 'yaml'>('ui');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // 切换路径展开状态
  const togglePath = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // TODO: 显示成功提示
      console.log('已复制到剪贴板');
    });
  };

  // 下载文件
  const downloadSpec = (format: 'json' | 'yaml') => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(spec, null, 2);
      filename = 'openapi.json';
      mimeType = 'application/json';
    } else {
      // TODO: 实现YAML序列化
      content = JSON.stringify(spec, null, 2);
      filename = 'openapi.yaml';
      mimeType = 'text/yaml';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 获取方法颜色
  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'POST':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'DELETE':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'PATCH':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // 渲染API信息
  const renderApiInfo = () => (
    <div className="bg-white border rounded-lg p-6 mb-6">
      <div className="border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{spec.info.title}</h1>
        <div className="flex items-center space-x-4 mt-2">
          <span className="text-sm text-gray-600">版本: {spec.info.version}</span>
          <span className="text-sm text-gray-600">OpenAPI: {spec.openapi}</span>
        </div>
      </div>

      {spec.info.description && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">描述</h3>
          <p className="text-sm text-gray-700">{spec.info.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {spec.info.contact && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">联系信息</h3>
            <div className="space-y-1">
              {spec.info.contact.name && (
                <p className="text-sm text-gray-700">姓名: {spec.info.contact.name}</p>
              )}
              {spec.info.contact.email && (
                <p className="text-sm text-gray-700">邮箱: {spec.info.contact.email}</p>
              )}
              {spec.info.contact.url && (
                <p className="text-sm text-gray-700">
                  网址: <a href={spec.info.contact.url} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{spec.info.contact.url}</a>
                </p>
              )}
            </div>
          </div>
        )}

        {spec.info.license && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">许可证</h3>
            <div className="space-y-1">
              <p className="text-sm text-gray-700">名称: {spec.info.license.name}</p>
              {spec.info.license.url && (
                <p className="text-sm text-gray-700">
                  链接: <a href={spec.info.license.url} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{spec.info.license.url}</a>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {spec.servers.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">服务器</h3>
          <div className="space-y-2">
            {spec.servers.map((server, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded border">
                <p className="font-mono text-sm text-gray-900">{server.url}</p>
                {server.description && (
                  <p className="text-xs text-gray-600 mt-1">{server.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // 渲染标签
  const renderTags = () => {
    if (!spec.tags || spec.tags.length === 0) return null;

    return (
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">标签</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {spec.tags.map((tag, index) => (
            <div key={index} className="p-3 border rounded">
              <h3 className="font-medium text-gray-900">{tag.name}</h3>
              {tag.description && (
                <p className="text-sm text-gray-600 mt-1">{tag.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染路径
  const renderPaths = () => (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">API 端点</h2>
      <div className="space-y-4">
        {Object.entries(spec.paths).map(([path, methods]) => (
          <div key={path} className="border rounded-lg">
            <button
              onClick={() => togglePath(path)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
            >
              <span className="font-mono text-sm font-medium text-gray-900">{path}</span>
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  {Object.keys(methods).map(method => (
                    <span
                      key={method}
                      className={`px-2 py-1 text-xs font-medium rounded border ${getMethodColor(method)}`}
                    >
                      {method.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </button>

            {expandedPaths.has(path) && (
              <div className="border-t">
                {Object.entries(methods).map(([method, operation]) => (
                  <div key={method} className="p-4 border-b last:border-b-0">
                    <div className="flex items-start space-x-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getMethodColor(method)}`}>
                        {method.toUpperCase()}
                      </span>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{operation.summary}</h4>
                        {operation.description && (
                          <p className="text-sm text-gray-600 mt-1">{operation.description}</p>
                        )}
                        
                        {operation.tags && operation.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {operation.tags.map((tag: string) => (
                              <span
                                key={tag}
                                className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {operation.parameters && operation.parameters.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-sm font-medium text-gray-900 mb-2">参数</h5>
                            <div className="space-y-1">
                              {operation.parameters.map((param: any, index: number) => (
                                <div key={index} className="text-sm">
                                  <span className="font-mono text-gray-900">{param.name}</span>
                                  <span className="text-gray-500 mx-2">({param.in})</span>
                                  <span className="text-gray-600">{param.schema?.type}</span>
                                  {param.required && (
                                    <span className="text-red-600 ml-1">*</span>
                                  )}
                                  {param.description && (
                                    <p className="text-gray-600 text-xs mt-1 ml-4">{param.description}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {operation.responses && (
                          <div className="mt-3">
                            <h5 className="text-sm font-medium text-gray-900 mb-2">响应</h5>
                            <div className="space-y-1">
                              {Object.entries(operation.responses).map(([statusCode, response]: [string, any]) => (
                                <div key={statusCode} className="text-sm">
                                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                                    statusCode.startsWith('2') ? 'bg-green-100 text-green-800' :
                                    statusCode.startsWith('4') ? 'bg-red-100 text-red-800' :
                                    statusCode.startsWith('5') ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {statusCode}
                                  </span>
                                  <span className="ml-2 text-gray-700">{response.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // 渲染JSON视图
  const renderJsonView = () => (
    <div className="bg-white border rounded-lg">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">OpenAPI JSON</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(JSON.stringify(spec, null, 2))}
          >
            <ClipboardDocumentIcon className="w-4 h-4 mr-1" />
            复制
          </Button>
        </div>
      </div>
      <div className="p-4">
        <pre className="text-sm bg-gray-50 p-4 rounded border overflow-auto max-h-96">
          <code>{JSON.stringify(spec, null, 2)}</code>
        </pre>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col">
      {/* 顶部工具栏 */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('ui')}
              className={`px-3 py-1 text-sm font-medium rounded ${
                viewMode === 'ui'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <EyeIcon className="w-4 h-4 mr-1 inline" />
              UI 视图
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`px-3 py-1 text-sm font-medium rounded ${
                viewMode === 'json'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CodeBracketIcon className="w-4 h-4 mr-1 inline" />
              JSON
            </button>
            <button
              onClick={() => setViewMode('yaml')}
              className={`px-3 py-1 text-sm font-medium rounded ${
                viewMode === 'yaml'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <DocumentTextIcon className="w-4 h-4 mr-1 inline" />
              YAML
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadSpec('json')}
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
              下载 JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadSpec('yaml')}
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
              下载 YAML
            </Button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
        {viewMode === 'ui' && (
          <div>
            {renderApiInfo()}
            {renderTags()}
            {renderPaths()}
          </div>
        )}
        
        {viewMode === 'json' && renderJsonView()}
        
        {viewMode === 'yaml' && (
          <div className="bg-white border rounded-lg">
            <div className="border-b p-4">
              <h2 className="text-lg font-semibold text-gray-900">OpenAPI YAML</h2>
              <p className="text-sm text-gray-600 mt-1">YAML 格式支持即将推出</p>
            </div>
            <div className="p-4">
              <div className="text-center py-8 text-gray-500">
                <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">YAML 视图正在开发中</p>
                <p className="text-xs text-gray-400 mt-1">请使用 JSON 视图查看规范</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwaggerViewer;