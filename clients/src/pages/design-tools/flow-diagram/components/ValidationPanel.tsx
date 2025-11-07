import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

interface ValidationResult {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;
  connectionId?: string;
  suggestion?: string;
}

interface ValidationPanelProps {
  validationResults: ValidationResult[];
  onValidate: () => void;
  onNodeSelect: (node: any) => void;
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({
  validationResults,
  onValidate,
  onNodeSelect,
}) => {
  const [selectedType, setSelectedType] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // 按类型统计
  const stats = {
    total: validationResults.length,
    errors: validationResults.filter(r => r.type === 'error').length,
    warnings: validationResults.filter(r => r.type === 'warning').length,
    info: validationResults.filter(r => r.type === 'info').length,
  };

  // 过滤结果
  const filteredResults = validationResults.filter(result => 
    selectedType === 'all' || result.type === selectedType
  );

  // 切换展开状态
  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // 获取图标
  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  // 获取颜色类
  const getColorClass = (type: string) => {
    switch (type) {
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  // 处理节点定位
  const handleLocateNode = (nodeId?: string, connectionId?: string) => {
    if (nodeId) {
      // TODO: 实现节点定位和高亮
      console.log('定位节点:', nodeId);
      onNodeSelect({ id: nodeId });
    } else if (connectionId) {
      // TODO: 实现连接线定位和高亮
      console.log('定位连接线:', connectionId);
    }
  };

  // 渲染验证结果项
  const renderValidationItem = (result: ValidationResult) => {
    const isExpanded = expandedItems.has(result.id);
    
    return (
      <div
        key={result.id}
        className={`border rounded-lg p-3 ${getColorClass(result.type)}`}
      >
        <div className="flex items-start space-x-2">
          {getIcon(result.type)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">
                {result.message}
              </p>
              {(result.nodeId || result.connectionId) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLocateNode(result.nodeId, result.connectionId)}
                  className="text-xs"
                >
                  <MagnifyingGlassIcon className="w-3 h-3 mr-1" />
                  定位
                </Button>
              )}
            </div>
            
            {result.nodeId && (
              <p className="text-xs text-gray-600 mt-1">
                节点: {result.nodeId}
              </p>
            )}
            
            {result.connectionId && (
              <p className="text-xs text-gray-600 mt-1">
                连接: {result.connectionId}
              </p>
            )}
            
            {result.suggestion && (
              <div className="mt-2">
                <button
                  onClick={() => toggleExpanded(result.id)}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  {isExpanded ? '隐藏建议' : '查看建议'}
                </button>
                {isExpanded && (
                  <div className="mt-2 p-2 bg-white rounded border">
                    <p className="text-xs text-gray-700">{result.suggestion}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* 标题 */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-900">流程验证</h3>
        <p className="text-xs text-gray-500 mt-1">检查流程图的完整性和正确性</p>
      </div>

      {/* 验证控制 */}
      <div className="p-4 border-b">
        <Button
          onClick={onValidate}
          className="w-full"
          size="sm"
        >
          <ClipboardDocumentCheckIcon className="w-4 h-4 mr-2" />
          重新验证
        </Button>
      </div>

      {/* 统计信息 */}
      <div className="p-4 border-b">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600">总问题</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <div className="text-lg font-bold text-red-600">{stats.errors}</div>
            <div className="text-xs text-red-800">错误</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2 bg-yellow-50 rounded">
            <div className="text-lg font-bold text-yellow-600">{stats.warnings}</div>
            <div className="text-xs text-yellow-800">警告</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="text-lg font-bold text-blue-600">{stats.info}</div>
            <div className="text-xs text-blue-800">建议</div>
          </div>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="p-4 border-b">
        <div className="flex space-x-1">
          {[
            { id: 'all', label: '全部', count: stats.total },
            { id: 'error', label: '错误', count: stats.errors },
            { id: 'warning', label: '警告', count: stats.warnings },
            { id: 'info', label: '建议', count: stats.info },
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setSelectedType(filter.id as any)}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                selectedType === filter.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{filter.label}</span>
              <span className="bg-white px-1 rounded">{filter.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 验证结果列表 */}
      <div className="flex-1 p-4 overflow-y-auto">
        {filteredResults.length > 0 ? (
          <div className="space-y-3">
            {filteredResults.map(renderValidationItem)}
          </div>
        ) : validationResults.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="text-sm font-medium text-gray-900">尚未验证</p>
            <p className="text-xs text-gray-500 mt-1">点击上方按钮开始验证流程图</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircleIcon className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="text-sm font-medium text-gray-900">
              {selectedType === 'all' ? '没有发现问题' : `没有${
                selectedType === 'error' ? '错误' : 
                selectedType === 'warning' ? '警告' : '建议'
              }`}
            </p>
            <p className="text-xs text-gray-500 mt-1">流程图结构良好</p>
          </div>
        )}
      </div>

      {/* 验证规则说明 */}
      <div className="p-4 border-t bg-gray-50">
        <details className="text-xs text-gray-600">
          <summary className="cursor-pointer font-medium mb-2">验证规则说明</summary>
          <div className="space-y-1 mt-2">
            <div>• 检查是否存在开始节点</div>
            <div>• 检查是否存在结束节点</div>
            <div>• 检查孤立节点（无输入或输出）</div>
            <div>• 检查决策节点的分支完整性</div>
            <div>• 检查流程的连通性</div>
            <div>• 检查循环路径的合理性</div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default ValidationPanel;