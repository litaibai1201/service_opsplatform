import React, { useState, useMemo, useCallback } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { 
  PlusIcon,
  TrashIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShareIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface Feature {
  id: string;
  name: string;
  description?: string;
  type: 'epic' | 'feature' | 'story' | 'task' | 'bug';
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;
  parent?: string;
  children: string[];
  dependencies: string[];
  tags: string[];
  assignee?: string;
  startDate?: Date;
  endDate?: Date;
  progress: number;
  attachments: string[];
  comments: Comment[];
}

interface Connection {
  id: string;
  fromFeature: string;
  toFeature: string;
  type: 'dependency' | 'parent-child' | 'related' | 'blocks';
  label?: string;
}

interface DependencyGraphProps {
  features: Feature[];
  connections: Connection[];
  selectedFeature: Feature | null;
  onFeatureSelect: (feature: Feature | null) => void;
  onConnectionAdd: (connection: Omit<Connection, 'id'>) => void;
  onConnectionUpdate: (connectionId: string, updates: Partial<Connection>) => void;
  onConnectionDelete: (connectionId: string) => void;
}

interface DependencyIssue {
  type: 'circular' | 'orphaned' | 'blocked' | 'missing';
  severity: 'error' | 'warning' | 'info';
  message: string;
  features: string[];
  suggestions?: string[];
}

const DependencyGraph: React.FC<DependencyGraphProps> = ({
  features,
  connections,
  selectedFeature,
  onFeatureSelect,
  onConnectionAdd,
  onConnectionUpdate,
  onConnectionDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showIssues, setShowIssues] = useState(true);
  const [isAddingDependency, setIsAddingDependency] = useState(false);
  const [newDependency, setNewDependency] = useState({
    fromFeature: '',
    toFeature: '',
    type: 'dependency' as Connection['type'],
    label: ''
  });

  // 分析依赖关系问题
  const dependencyIssues = useMemo(() => {
    const issues: DependencyIssue[] = [];

    // 检测循环依赖
    const detectCircularDependencies = () => {
      const visited = new Set<string>();
      const recursionStack = new Set<string>();
      const cycles: string[][] = [];

      const dfs = (featureId: string, path: string[]): boolean => {
        if (recursionStack.has(featureId)) {
          // 发现循环
          const cycleStart = path.indexOf(featureId);
          cycles.push(path.slice(cycleStart));
          return true;
        }

        if (visited.has(featureId)) {
          return false;
        }

        visited.add(featureId);
        recursionStack.add(featureId);

        const feature = features.find(f => f.id === featureId);
        if (feature) {
          for (const depId of feature.dependencies) {
            if (dfs(depId, [...path, featureId])) {
              return true;
            }
          }
        }

        recursionStack.delete(featureId);
        return false;
      };

      features.forEach(feature => {
        if (!visited.has(feature.id)) {
          dfs(feature.id, []);
        }
      });

      cycles.forEach(cycle => {
        issues.push({
          type: 'circular',
          severity: 'error',
          message: '检测到循环依赖',
          features: cycle,
          suggestions: ['移除其中一个依赖关系', '重新设计功能架构']
        });
      });
    };

    // 检测孤立的功能
    const detectOrphanedFeatures = () => {
      features.forEach(feature => {
        const hasIncoming = features.some(f => f.dependencies.includes(feature.id));
        const hasOutgoing = feature.dependencies.length > 0;
        const hasParent = feature.parent;
        const hasChildren = feature.children.length > 0;

        if (!hasIncoming && !hasOutgoing && !hasParent && !hasChildren) {
          issues.push({
            type: 'orphaned',
            severity: 'warning',
            message: '功能没有任何关联',
            features: [feature.id],
            suggestions: ['建立与其他功能的关系', '确认是否为独立功能']
          });
        }
      });
    };

    // 检测阻塞的功能
    const detectBlockedFeatures = () => {
      features.forEach(feature => {
        if (feature.status === 'planned') {
          const uncompletedDeps = feature.dependencies.filter(depId => {
            const dep = features.find(f => f.id === depId);
            return dep && dep.status !== 'completed';
          });

          if (uncompletedDeps.length > 0) {
            issues.push({
              type: 'blocked',
              severity: 'warning',
              message: '功能被未完成的依赖阻塞',
              features: [feature.id, ...uncompletedDeps],
              suggestions: ['先完成依赖功能', '调整功能优先级']
            });
          }
        }
      });
    };

    // 检测缺失的依赖
    const detectMissingDependencies = () => {
      connections.forEach(connection => {
        if (connection.type === 'dependency') {
          const fromFeature = features.find(f => f.id === connection.fromFeature);
          const toFeature = features.find(f => f.id === connection.toFeature);
          
          if (!fromFeature || !toFeature) {
            issues.push({
              type: 'missing',
              severity: 'error',
              message: '依赖引用了不存在的功能',
              features: [connection.fromFeature, connection.toFeature].filter(Boolean),
              suggestions: ['删除无效依赖', '创建缺失的功能']
            });
          }
        }
      });
    };

    detectCircularDependencies();
    detectOrphanedFeatures();
    detectBlockedFeatures();
    detectMissingDependencies();

    return issues;
  }, [features, connections]);

  // 过滤功能
  const filteredFeatures = useMemo(() => {
    return features.filter(feature => {
      const matchesSearch = feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           feature.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || feature.type === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [features, searchTerm, filterType]);

  // 获取功能的依赖信息
  const getFeatureDependencyInfo = useCallback((feature: Feature) => {
    const dependencies = feature.dependencies.map(depId => 
      features.find(f => f.id === depId)
    ).filter(Boolean);
    
    const dependents = features.filter(f => f.dependencies.includes(feature.id));
    
    const blockedBy = dependencies.filter(dep => dep!.status !== 'completed');
    const blocking = dependents.filter(dep => dep.status === 'planned');
    
    return {
      dependencies,
      dependents,
      blockedBy,
      blocking
    };
  }, [features]);

  // 添加依赖关系
  const handleAddDependency = useCallback(() => {
    if (newDependency.fromFeature && newDependency.toFeature && 
        newDependency.fromFeature !== newDependency.toFeature) {
      
      onConnectionAdd({
        fromFeature: newDependency.fromFeature,
        toFeature: newDependency.toFeature,
        type: newDependency.type,
        label: newDependency.label
      });
      
      setNewDependency({
        fromFeature: '',
        toFeature: '',
        type: 'dependency',
        label: ''
      });
      setIsAddingDependency(false);
    }
  }, [newDependency, onConnectionAdd]);

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'in-progress':
        return 'text-blue-600 bg-blue-50';
      case 'planned':
        return 'text-gray-600 bg-gray-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">依赖关系图</h3>
            <p className="text-sm text-gray-600">
              管理功能之间的依赖关系 ({connections.filter(c => c.type === 'dependency').length} 个依赖)
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIssues(!showIssues)}
            >
              {showIssues ? '隐藏' : '显示'}问题
            </Button>
            
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddingDependency(true)}
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              添加依赖
            </Button>
          </div>
        </div>

        {/* 过滤器 */}
        <div className="flex items-center space-x-4 mt-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索功能..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              size="sm"
            />
          </div>
          
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            size="sm"
          >
            <option value="all">所有类型</option>
            <option value="epic">史诗</option>
            <option value="feature">功能</option>
            <option value="story">用户故事</option>
            <option value="task">任务</option>
            <option value="bug">缺陷</option>
          </Select>
        </div>

        {/* 依赖问题警告 */}
        {showIssues && dependencyIssues.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-800">发现 {dependencyIssues.length} 个依赖问题</h4>
                <div className="mt-1 space-y-1">
                  {dependencyIssues.slice(0, 3).map((issue, index) => (
                    <div key={index} className="text-sm text-yellow-700">
                      • {issue.message} ({issue.features.map(id => features.find(f => f.id === id)?.name).join(', ')})
                    </div>
                  ))}
                  {dependencyIssues.length > 3 && (
                    <div className="text-sm text-yellow-600">
                      还有 {dependencyIssues.length - 3} 个问题...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧功能列表 */}
        <div className="w-96 border-r bg-white overflow-y-auto">
          <div className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">功能列表</h4>
            
            <div className="space-y-2">
              {filteredFeatures.map(feature => {
                const depInfo = getFeatureDependencyInfo(feature);
                const isSelected = selectedFeature?.id === feature.id;
                
                return (
                  <div
                    key={feature.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => onFeatureSelect(feature)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <div
                            className={`w-2 h-2 rounded-full ${getPriorityColor(feature.priority)}`}
                            title={`优先级: ${feature.priority}`}
                          />
                          <span className="font-medium text-gray-900 truncate">
                            {feature.name}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${getStatusColor(feature.status)}`}>
                            {feature.status}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          {feature.type} • {feature.effort}d
                          {feature.assignee && ` • ${feature.assignee}`}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>依赖: {depInfo.dependencies.length}</span>
                          <span>被依赖: {depInfo.dependents.length}</span>
                          {depInfo.blockedBy.length > 0 && (
                            <span className="text-red-600">
                              阻塞: {depInfo.blockedBy.length}
                            </span>
                          )}
                          {depInfo.blocking.length > 0 && (
                            <span className="text-orange-600">
                              阻塞中: {depInfo.blocking.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右侧依赖详情 */}
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          {selectedFeature ? (
            <div className="p-6">
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {selectedFeature.name}
                    </h4>
                    <p className="text-sm text-gray-600">{selectedFeature.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(selectedFeature.status)}`}>
                      {selectedFeature.status}
                    </span>
                    <span className="text-sm text-gray-600">{selectedFeature.type}</span>
                  </div>
                </div>

                {(() => {
                  const depInfo = getFeatureDependencyInfo(selectedFeature);
                  
                  return (
                    <div className="space-y-6">
                      {/* 依赖的功能 */}
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">
                          依赖的功能 ({depInfo.dependencies.length})
                        </h5>
                        {depInfo.dependencies.length > 0 ? (
                          <div className="space-y-2">
                            {depInfo.dependencies.map(dep => (
                              <div key={dep!.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div
                                    className={`w-2 h-2 rounded-full ${getPriorityColor(dep!.priority)}`}
                                  />
                                  <div>
                                    <div className="font-medium text-gray-900">{dep!.name}</div>
                                    <div className="text-sm text-gray-600">
                                      {dep!.type} • {dep!.status}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {dep!.status !== 'completed' && (
                                    <ExclamationTriangleIcon className="w-4 h-4 text-orange-500" title="未完成" />
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onFeatureSelect(dep!)}
                                  >
                                    查看
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">没有依赖的功能</p>
                        )}
                      </div>

                      {/* 依赖此功能的功能 */}
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">
                          依赖此功能的功能 ({depInfo.dependents.length})
                        </h5>
                        {depInfo.dependents.length > 0 ? (
                          <div className="space-y-2">
                            {depInfo.dependents.map(dep => (
                              <div key={dep.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div
                                    className={`w-2 h-2 rounded-full ${getPriorityColor(dep.priority)}`}
                                  />
                                  <div>
                                    <div className="font-medium text-gray-900">{dep.name}</div>
                                    <div className="text-sm text-gray-600">
                                      {dep.type} • {dep.status}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onFeatureSelect(dep)}
                                >
                                  查看
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">没有功能依赖此功能</p>
                        )}
                      </div>

                      {/* 阻塞信息 */}
                      {(depInfo.blockedBy.length > 0 || depInfo.blocking.length > 0) && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h5 className="font-medium text-yellow-800 mb-2">阻塞情况</h5>
                          {depInfo.blockedBy.length > 0 && (
                            <div className="mb-2">
                              <div className="text-sm text-yellow-700">
                                被以下功能阻塞: {depInfo.blockedBy.map(f => f!.name).join(', ')}
                              </div>
                            </div>
                          )}
                          {depInfo.blocking.length > 0 && (
                            <div>
                              <div className="text-sm text-yellow-700">
                                正在阻塞: {depInfo.blocking.map(f => f.name).join(', ')}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : isAddingDependency ? (
            /* 添加依赖表单 */
            <div className="p-6">
              <div className="bg-white rounded-lg border p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">添加依赖关系</h4>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        依赖方（需要等待的功能）
                      </label>
                      <Select
                        value={newDependency.toFeature}
                        onChange={(e) => setNewDependency(prev => ({ ...prev, toFeature: e.target.value }))}
                        size="sm"
                      >
                        <option value="">选择功能</option>
                        {features.map(feature => (
                          <option key={feature.id} value={feature.id}>
                            {feature.name} ({feature.type})
                          </option>
                        ))}
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        被依赖方（需要先完成的功能）
                      </label>
                      <Select
                        value={newDependency.fromFeature}
                        onChange={(e) => setNewDependency(prev => ({ ...prev, fromFeature: e.target.value }))}
                        size="sm"
                      >
                        <option value="">选择功能</option>
                        {features.filter(f => f.id !== newDependency.toFeature).map(feature => (
                          <option key={feature.id} value={feature.id}>
                            {feature.name} ({feature.type})
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      依赖类型
                    </label>
                    <Select
                      value={newDependency.type}
                      onChange={(e) => setNewDependency(prev => ({ ...prev, type: e.target.value as any }))}
                      size="sm"
                    >
                      <option value="dependency">依赖 (需要先完成)</option>
                      <option value="blocks">阻塞 (阻止开始)</option>
                      <option value="related">相关 (逻辑关联)</option>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      描述（可选）
                    </label>
                    <Input
                      value={newDependency.label}
                      onChange={(e) => setNewDependency(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="描述依赖关系..."
                      size="sm"
                    />
                  </div>

                  {/* 预览 */}
                  {newDependency.fromFeature && newDependency.toFeature && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">依赖关系预览</h5>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-medium">
                          {features.find(f => f.id === newDependency.toFeature)?.name}
                        </span>
                        <span className="text-gray-500">依赖于</span>
                        <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">
                          {features.find(f => f.id === newDependency.fromFeature)?.name}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddingDependency(false)}
                    >
                      取消
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleAddDependency}
                      disabled={!newDependency.fromFeature || !newDependency.toFeature}
                    >
                      添加依赖
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 空状态 */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ShareIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">选择功能查看依赖</h3>
                <p className="text-gray-600 mb-4">
                  从左侧列表中选择功能查看其依赖关系
                </p>
                <Button
                  variant="primary"
                  onClick={() => setIsAddingDependency(true)}
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  添加依赖
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DependencyGraph;