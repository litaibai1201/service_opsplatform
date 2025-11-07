import React, { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  FolderIcon,
  ChevronRightIcon,
  ChevronDownIcon
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

interface EndpointListProps {
  endpoints: ApiEndpoint[];
  selectedEndpoint: ApiEndpoint | null;
  onEndpointSelect: (endpoint: ApiEndpoint) => void;
  onEndpointUpdate: (endpointId: string, updates: Partial<ApiEndpoint>) => void;
  onEndpointDelete: (endpointId: string) => void;
  onAddEndpoint: () => void;
}

const EndpointList: React.FC<EndpointListProps> = ({
  endpoints,
  selectedEndpoint,
  onEndpointSelect,
  onEndpointUpdate,
  onEndpointDelete,
  onAddEndpoint,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // 获取所有标签
  const allTags = Array.from(
    new Set(endpoints.flatMap(endpoint => endpoint.tags))
  ).filter(Boolean);

  // 过滤端点
  const filteredEndpoints = endpoints.filter(endpoint => {
    const matchesSearch = 
      endpoint.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpoint.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpoint.method.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = !selectedTag || endpoint.tags.includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  // 按标签分组端点
  const groupedEndpoints = React.useMemo(() => {
    const groups: Record<string, ApiEndpoint[]> = {};
    
    filteredEndpoints.forEach(endpoint => {
      if (endpoint.tags.length === 0) {
        if (!groups['未分类']) groups['未分类'] = [];
        groups['未分类'].push(endpoint);
      } else {
        endpoint.tags.forEach(tag => {
          if (!groups[tag]) groups[tag] = [];
          groups[tag].push(endpoint);
        });
      }
    });
    
    return groups;
  }, [filteredEndpoints]);

  // 切换分组展开状态
  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  // 获取方法颜色
  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'POST':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DELETE':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'PATCH':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // 复制端点
  const duplicateEndpoint = (endpoint: ApiEndpoint) => {
    const newEndpoint = {
      ...endpoint,
      id: `endpoint_${Date.now()}`,
      path: `${endpoint.path}_copy`,
      summary: `${endpoint.summary} (副本)`
    };
    
    // 这里应该调用父组件的添加方法
    onAddEndpoint();
  };

  // 渲染端点项
  const renderEndpoint = (endpoint: ApiEndpoint) => (
    <div
      key={endpoint.id}
      className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm ${
        selectedEndpoint?.id === endpoint.id
          ? 'border-blue-300 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={() => onEndpointSelect(endpoint)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className={`px-2 py-1 text-xs font-medium rounded border ${getMethodColor(endpoint.method)}`}>
              {endpoint.method}
            </span>
            <span className="text-xs text-gray-500 font-mono truncate">
              {endpoint.path}
            </span>
          </div>
          
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {endpoint.summary}
          </h4>
          
          {endpoint.description && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
              {endpoint.description}
            </p>
          )}
          
          {endpoint.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {endpoint.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1 ml-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              duplicateEndpoint(endpoint);
            }}
            className="p-1"
            title="复制端点"
          >
            <DocumentDuplicateIcon className="w-3 h-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEndpointDelete(endpoint.id);
            }}
            className="p-1 text-red-600 hover:text-red-800"
            title="删除端点"
          >
            <TrashIcon className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );

  // 渲染分组
  const renderGroup = (groupName: string, groupEndpoints: ApiEndpoint[]) => {
    const isExpanded = expandedGroups.has(groupName);
    
    return (
      <div key={groupName} className="mb-4">
        <button
          onClick={() => toggleGroup(groupName)}
          className="w-full flex items-center justify-between p-2 text-left hover:bg-gray-50 rounded"
        >
          <div className="flex items-center space-x-2">
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            )}
            <FolderIcon className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-sm text-gray-900">{groupName}</span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {groupEndpoints.length}
            </span>
          </div>
        </button>
        
        {isExpanded && (
          <div className="ml-6 mt-2 space-y-2">
            {groupEndpoints.map(renderEndpoint)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* 标题 */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">API 端点</h3>
          <Button
            variant="primary"
            size="sm"
            onClick={onAddEndpoint}
          >
            <PlusIcon className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {endpoints.length} 个端点
        </p>
      </div>

      {/* 搜索和过滤 */}
      <div className="p-4 border-b space-y-3">
        {/* 搜索框 */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="搜索端点..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            size="sm"
          />
        </div>

        {/* 标签过滤 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            按标签过滤
          </label>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedTag === null
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedTag === tag
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 端点列表 */}
      <div className="flex-1 p-4 overflow-y-auto">
        {Object.keys(groupedEndpoints).length > 0 ? (
          <div>
            {Object.entries(groupedEndpoints).map(([groupName, groupEndpoints]) =>
              renderGroup(groupName, groupEndpoints)
            )}
          </div>
        ) : endpoints.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-3">
              <FolderIcon className="w-12 h-12 mx-auto" />
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">暂无端点</h4>
            <p className="text-xs text-gray-500 mb-4">创建第一个 API 端点开始设计</p>
            <Button
              variant="primary"
              size="sm"
              onClick={onAddEndpoint}
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              创建端点
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <MagnifyingGlassIcon className="w-8 h-8 mx-auto" />
            </div>
            <p className="text-sm text-gray-500">未找到匹配的端点</p>
            <p className="text-xs text-gray-400 mt-1">尝试调整搜索条件</p>
          </div>
        )}
      </div>

      {/* 快捷操作提示 */}
      <div className="p-4 border-t bg-gray-50">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="font-medium">快捷操作：</div>
          <div>• 点击选择端点进行编辑</div>
          <div>• 复制按钮快速复制端点</div>
          <div>• 按标签分组管理端点</div>
        </div>
      </div>
    </div>
  );
};

export default EndpointList;