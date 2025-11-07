import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { 
  DocumentTextIcon,
  DocumentArrowDownIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  EyeIcon,
  Cog6ToothIcon,
  ShareIcon
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

interface DocumentationTheme {
  name: string;
  primary: string;
  secondary: string;
  background: string;
  text: string;
}

interface DocumentationGeneratorProps {
  spec: ApiSpec;
}

const DocumentationGenerator: React.FC<DocumentationGeneratorProps> = ({ spec }) => {
  const [selectedFormat, setSelectedFormat] = useState<'html' | 'markdown' | 'pdf' | 'redoc' | 'swagger-ui'>('html');
  const [selectedTheme, setSelectedTheme] = useState<string>('default');
  const [includeExamples, setIncludeExamples] = useState(true);
  const [includeTryIt, setIncludeTryIt] = useState(true);
  const [customCss, setCustomCss] = useState('');
  const [customLogo, setCustomLogo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const themes: DocumentationTheme[] = [
    {
      name: 'default',
      primary: '#2563eb',
      secondary: '#64748b',
      background: '#ffffff',
      text: '#1e293b'
    },
    {
      name: 'dark',
      primary: '#3b82f6',
      secondary: '#94a3b8',
      background: '#0f172a',
      text: '#f1f5f9'
    },
    {
      name: 'green',
      primary: '#059669',
      secondary: '#6b7280',
      background: '#ffffff',
      text: '#374151'
    },
    {
      name: 'purple',
      primary: '#7c3aed',
      secondary: '#6b7280',
      background: '#ffffff',
      text: '#374151'
    }
  ];

  const formats = [
    { value: 'html', label: 'HTML 静态站点', icon: GlobeAltIcon },
    { value: 'markdown', label: 'Markdown 文档', icon: DocumentTextIcon },
    { value: 'pdf', label: 'PDF 文档', icon: DocumentArrowDownIcon },
    { value: 'redoc', label: 'ReDoc 风格', icon: CodeBracketIcon },
    { value: 'swagger-ui', label: 'Swagger UI', icon: EyeIcon }
  ];

  // 生成文档
  const generateDocumentation = async () => {
    setIsGenerating(true);
    
    try {
      // 模拟生成过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const filename = `${spec.info.title.replace(/\s+/g, '-').toLowerCase()}-docs`;
      
      switch (selectedFormat) {
        case 'html':
          generateHtmlDocumentation(filename);
          break;
        case 'markdown':
          generateMarkdownDocumentation(filename);
          break;
        case 'pdf':
          generatePdfDocumentation(filename);
          break;
        case 'redoc':
          generateRedocDocumentation(filename);
          break;
        case 'swagger-ui':
          generateSwaggerUIDocumentation(filename);
          break;
      }
    } catch (error) {
      console.error('生成文档失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 生成HTML文档
  const generateHtmlDocumentation = (filename: string) => {
    const theme = themes.find(t => t.name === selectedTheme) || themes[0];
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${spec.info.title} - API 文档</title>
    <style>
        :root {
            --primary-color: ${theme.primary};
            --secondary-color: ${theme.secondary};
            --background-color: ${theme.background};
            --text-color: ${theme.text};
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--background-color);
            margin: 0;
            padding: 0;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .header {
            text-align: center;
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 2px solid var(--primary-color);
        }
        
        .api-title {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            color: var(--primary-color);
        }
        
        .api-version {
            color: var(--secondary-color);
            font-size: 1.1rem;
        }
        
        .endpoint {
            margin-bottom: 2rem;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .method {
            padding: 0.5rem 1rem;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.8rem;
        }
        
        .get { background-color: #dbeafe; color: #1e40af; }
        .post { background-color: #dcfce7; color: #166534; }
        .put { background-color: #fef3c7; color: #92400e; }
        .delete { background-color: #fecaca; color: #991b1b; }
        .patch { background-color: #e9d5ff; color: #6b21a8; }
        
        ${customCss}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${customLogo ? `<img src="${customLogo}" alt="Logo" style="max-height: 60px; margin-bottom: 1rem;">` : ''}
            <h1 class="api-title">${spec.info.title}</h1>
            <p class="api-version">版本 ${spec.info.version}</p>
            ${spec.info.description ? `<p>${spec.info.description}</p>` : ''}
        </div>
        
        <div class="content">
            ${generateEndpointsHtml()}
        </div>
    </div>
</body>
</html>`;

    downloadFile(htmlContent, `${filename}.html`, 'text/html');
  };

  // 生成端点HTML
  const generateEndpointsHtml = () => {
    return Object.entries(spec.paths).map(([path, methods]) => {
      return Object.entries(methods).map(([method, operation]) => `
        <div class="endpoint">
            <div class="method ${method.toLowerCase()}">${method.toUpperCase()}</div>
            <div style="padding: 1rem;">
                <h3>${operation.summary || path}</h3>
                <p><strong>路径:</strong> <code>${path}</code></p>
                ${operation.description ? `<p>${operation.description}</p>` : ''}
                ${operation.parameters ? generateParametersHtml(operation.parameters) : ''}
                ${operation.responses ? generateResponsesHtml(operation.responses) : ''}
            </div>
        </div>
      `).join('');
    }).join('');
  };

  // 生成参数HTML
  const generateParametersHtml = (parameters: any[]) => {
    if (!parameters.length) return '';
    
    return `
      <h4>参数</h4>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 0.5rem; text-align: left; border: 1px solid #e5e7eb;">名称</th>
            <th style="padding: 0.5rem; text-align: left; border: 1px solid #e5e7eb;">类型</th>
            <th style="padding: 0.5rem; text-align: left; border: 1px solid #e5e7eb;">位置</th>
            <th style="padding: 0.5rem; text-align: left; border: 1px solid #e5e7eb;">必需</th>
            <th style="padding: 0.5rem; text-align: left; border: 1px solid #e5e7eb;">描述</th>
          </tr>
        </thead>
        <tbody>
          ${parameters.map(param => `
            <tr>
              <td style="padding: 0.5rem; border: 1px solid #e5e7eb;"><code>${param.name}</code></td>
              <td style="padding: 0.5rem; border: 1px solid #e5e7eb;">${param.schema?.type || 'string'}</td>
              <td style="padding: 0.5rem; border: 1px solid #e5e7eb;">${param.in}</td>
              <td style="padding: 0.5rem; border: 1px solid #e5e7eb;">${param.required ? '是' : '否'}</td>
              <td style="padding: 0.5rem; border: 1px solid #e5e7eb;">${param.description || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  // 生成响应HTML
  const generateResponsesHtml = (responses: Record<string, any>) => {
    return `
      <h4>响应</h4>
      <div>
        ${Object.entries(responses).map(([statusCode, response]) => `
          <div style="margin-bottom: 1rem;">
            <span style="display: inline-block; padding: 0.25rem 0.5rem; background-color: ${
              statusCode.startsWith('2') ? '#dcfce7' : statusCode.startsWith('4') ? '#fecaca' : '#fef3c7'
            }; border-radius: 4px; font-weight: bold; margin-right: 0.5rem;">${statusCode}</span>
            <span>${response.description}</span>
          </div>
        `).join('')}
      </div>
    `;
  };

  // 生成Markdown文档
  const generateMarkdownDocumentation = (filename: string) => {
    const markdownContent = `# ${spec.info.title}

版本: ${spec.info.version}  
OpenAPI: ${spec.openapi}

${spec.info.description ? `## 描述\n\n${spec.info.description}\n\n` : ''}

## 服务器

${spec.servers.map(server => `- **${server.url}**${server.description ? ` - ${server.description}` : ''}`).join('\n')}

## API 端点

${Object.entries(spec.paths).map(([path, methods]) => {
  return Object.entries(methods).map(([method, operation]) => `
### ${method.toUpperCase()} ${path}

${operation.summary ? `**摘要:** ${operation.summary}\n` : ''}
${operation.description ? `**描述:** ${operation.description}\n` : ''}

${operation.parameters && operation.parameters.length > 0 ? `
#### 参数

| 名称 | 类型 | 位置 | 必需 | 描述 |
|------|------|------|------|------|
${operation.parameters.map((param: any) => 
  `| \`${param.name}\` | ${param.schema?.type || 'string'} | ${param.in} | ${param.required ? '是' : '否'} | ${param.description || '-'} |`
).join('\n')}
` : ''}

${operation.responses ? `
#### 响应

${Object.entries(operation.responses).map(([statusCode, response]: [string, any]) => 
  `- **${statusCode}**: ${response.description}`
).join('\n')}
` : ''}
  `).join('\n');
}).join('\n')}

---

*文档生成时间: ${new Date().toLocaleString('zh-CN')}*
`;

    downloadFile(markdownContent, `${filename}.md`, 'text/markdown');
  };

  // 生成其他格式文档
  const generatePdfDocumentation = (filename: string) => {
    // PDF生成逻辑
    console.log('生成PDF文档:', filename);
  };

  const generateRedocDocumentation = (filename: string) => {
    // ReDoc生成逻辑
    console.log('生成ReDoc文档:', filename);
  };

  const generateSwaggerUIDocumentation = (filename: string) => {
    // Swagger UI生成逻辑
    console.log('生成Swagger UI文档:', filename);
  };

  // 下载文件
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 预览文档
  const previewDocumentation = () => {
    // 打开预览窗口
    const previewWindow = window.open('', '_blank', 'width=1200,height=800');
    if (previewWindow) {
      previewWindow.document.write(`
        <html>
          <head>
            <title>文档预览</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 2rem; }
              .preview-header { text-align: center; margin-bottom: 2rem; }
            </style>
          </head>
          <body>
            <div class="preview-header">
              <h1>${spec.info.title} - 文档预览</h1>
              <p>格式: ${formats.find(f => f.value === selectedFormat)?.label}</p>
            </div>
            <div id="content">
              正在生成预览...
            </div>
          </body>
        </html>
      `);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* 顶部工具栏 */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">文档生成器</h2>
            <div className="flex items-center space-x-2">
              {formats.map(format => {
                const Icon = format.icon;
                return (
                  <button
                    key={format.value}
                    onClick={() => setSelectedFormat(format.value as any)}
                    className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                      selectedFormat === format.value
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    title={format.label}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={previewDocumentation}
            >
              <EyeIcon className="w-4 h-4 mr-1" />
              预览
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={generateDocumentation}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>生成中...</>
              ) : (
                <>
                  <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                  生成文档
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 配置面板 */}
      <div className="flex-1 bg-gray-50 overflow-hidden">
        <div className="h-full flex">
          {/* 左侧配置 */}
          <div className="w-80 bg-white border-r overflow-y-auto">
            <div className="p-4 space-y-6">
              {/* 基本设置 */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">基本设置</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      输出格式
                    </label>
                    <Select
                      value={selectedFormat}
                      onChange={(e) => setSelectedFormat(e.target.value as any)}
                      size="sm"
                    >
                      {formats.map(format => (
                        <option key={format.value} value={format.value}>
                          {format.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      主题
                    </label>
                    <Select
                      value={selectedTheme}
                      onChange={(e) => setSelectedTheme(e.target.value)}
                      size="sm"
                    >
                      {themes.map(theme => (
                        <option key={theme.name} value={theme.name}>
                          {theme.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      自定义Logo URL
                    </label>
                    <Input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={customLogo}
                      onChange={(e) => setCustomLogo(e.target.value)}
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              {/* 功能设置 */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">功能设置</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={includeExamples}
                      onChange={(e) => setIncludeExamples(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">包含示例</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={includeTryIt}
                      onChange={(e) => setIncludeTryIt(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">启用 Try It 功能</span>
                  </label>
                </div>
              </div>

              {/* 自定义样式 */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">自定义样式</h3>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    自定义CSS
                  </label>
                  <Textarea
                    placeholder="/* 自定义CSS样式 */"
                    value={customCss}
                    onChange={(e) => setCustomCss(e.target.value)}
                    rows={6}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              {/* 预览设备 */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">预览设备</h3>
                
                <div className="flex space-x-1">
                  {[
                    { value: 'desktop', label: '桌面', width: 'w-6' },
                    { value: 'tablet', label: '平板', width: 'w-4' },
                    { value: 'mobile', label: '手机', width: 'w-3' }
                  ].map(device => (
                    <button
                      key={device.value}
                      onClick={() => setPreviewMode(device.value as any)}
                      className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                        previewMode === device.value
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className={`h-4 ${device.width} bg-current mx-auto mb-1`}></div>
                      {device.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 右侧预览 */}
          <div className="flex-1 p-4">
            <div className="h-full bg-white border rounded-lg overflow-hidden">
              <div className="border-b p-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">文档预览</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {formats.find(f => f.value === selectedFormat)?.label}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open('#', '_blank')}
                    >
                      <ShareIcon className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="p-4 h-full overflow-y-auto">
                <div className={`mx-auto transition-all duration-200 ${
                  previewMode === 'desktop' ? 'max-w-full' :
                  previewMode === 'tablet' ? 'max-w-2xl' :
                  'max-w-sm'
                }`}>
                  {/* 模拟文档预览 */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 text-center">
                      <h1 className="text-2xl font-bold">{spec.info.title}</h1>
                      <p className="text-blue-100 mt-1">版本 {spec.info.version}</p>
                      {spec.info.description && (
                        <p className="text-blue-100 text-sm mt-2">{spec.info.description}</p>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <h2 className="text-lg font-semibold mb-4">API 端点</h2>
                      <div className="space-y-3">
                        {Object.entries(spec.paths).slice(0, 3).map(([path, methods]) => (
                          <div key={path} className="border rounded p-3">
                            <div className="flex items-center space-x-2 mb-2">
                              {Object.keys(methods).map(method => (
                                <span
                                  key={method}
                                  className={`px-2 py-1 text-xs font-medium rounded ${{
                                    'GET': 'bg-blue-100 text-blue-800',
                                    'POST': 'bg-green-100 text-green-800',
                                    'PUT': 'bg-yellow-100 text-yellow-800',
                                    'DELETE': 'bg-red-100 text-red-800',
                                    'PATCH': 'bg-purple-100 text-purple-800'
                                  }[method.toUpperCase()] || 'bg-gray-100 text-gray-800'}`}
                                >
                                  {method.toUpperCase()}
                                </span>
                              ))}
                            </div>
                            <div className="font-mono text-sm text-gray-700">{path}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentationGenerator;