import React, { useState, useMemo } from 'react';
import { Button, Input, Select, Textarea, Checkbox } from '@/components/ui';
import { 
  PlusIcon,
  TrashIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  Square3Stack3DIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  TagIcon
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

interface FeatureManagerProps {
  features: Feature[];
  connections: Connection[];
  selectedFeature: Feature | null;
  onFeatureSelect: (feature: Feature | null) => void;
  onFeatureUpdate: (featureId: string, updates: Partial<Feature>) => void;
  onFeatureDelete: (featureId: string) => void;
  onAddFeature: (parentId?: string) => void;
}

const FeatureManager: React.FC<FeatureManagerProps> = ({
  features,
  connections,
  selectedFeature,
  onFeatureSelect,
  onFeatureUpdate,
  onFeatureDelete,
  onAddFeature,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // 获取所有负责人
  const allAssignees = useMemo(() => {
    const assignees = new Set(features.map(f => f.assignee).filter(Boolean));
    return Array.from(assignees);
  }, [features]);

  // 过滤和排序功能
  const filteredAndSortedFeatures = useMemo(() => {
    let filtered = features.filter(feature => {
      const matchesSearch = feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           feature.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           feature.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = filterStatus === 'all' || feature.status === filterStatus;
      const matchesType = filterType === 'all' || feature.type === filterType;
      const matchesPriority = filterPriority === 'all' || feature.priority === filterPriority;
      const matchesAssignee = filterAssignee === 'all' || feature.assignee === filterAssignee;
      
      return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesAssignee;
    });

    // 排序
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'status':
          const statusOrder = { planned: 1, 'in-progress': 2, completed: 3, cancelled: 4 };
          aValue = statusOrder[a.status];
          bValue = statusOrder[b.status];
          break;
        case 'effort':
          aValue = a.effort;
          bValue = b.effort;
          break;
        case 'progress':
          aValue = a.progress;
          bValue = b.progress;
          break;
        case 'startDate':
          aValue = a.startDate?.getTime() || 0;
          bValue = b.startDate?.getTime() || 0;
          break;
        case 'endDate':
          aValue = a.endDate?.getTime() || 0;
          bValue = b.endDate?.getTime() || 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [features, searchTerm, filterStatus, filterType, filterPriority, filterAssignee, sortBy, sortOrder]);

  // 获取状态统计
  const statusStats = useMemo(() => {
    const stats = {
      planned: 0,
      'in-progress': 0,
      completed: 0,
      cancelled: 0
    };

    filteredAndSortedFeatures.forEach(feature => {
      stats[feature.status]++;
    });

    return stats;
  }, [filteredAndSortedFeatures]);

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'in-progress':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'planned':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
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

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'epic':
        return '📚';
      case 'feature':
        return '⭐';
      case 'story':
        return '📝';
      case 'task':
        return '✅';
      case 'bug':
        return '🐛';
      default:
        return '📄';
    }
  };

  // 重置过滤器
  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterType('all');
    setFilterPriority('all');
    setFilterAssignee('all');
    setSortBy('name');
    setSortOrder('asc');
  };

  return (
    <div className="h-full flex">
      {/* 左侧功能列表 */}
      <div className="w-2/3 border-r bg-white flex flex-col">
        {/* 搜索和过滤 */}
        <div className="border-b p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">功能管理</h3>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
              >
                重置过滤
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onAddFeature()}
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                新建功能
              </Button>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索功能名称、描述或标签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              size="sm"
            />
          </div>

          {/* 过滤器 */}
          <div className="grid grid-cols-4 gap-3">
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              size="sm"
            >
              <option value="all">所有状态</option>
              <option value="planned">计划中</option>
              <option value="in-progress">进行中</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </Select>

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

            <Select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              size="sm"
            >
              <option value="all">所有优先级</option>
              <option value="critical">关键</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </Select>

            <Select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              size="sm"
            >
              <option value="all">所有负责人</option>
              {allAssignees.map(assignee => (
                <option key={assignee} value={assignee}>{assignee}</option>
              ))}
            </Select>
          </div>

          {/* 排序 */}
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">排序:</span>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              size="sm"
            >
              <option value="name">名称</option>
              <option value="priority">优先级</option>
              <option value="status">状态</option>
              <option value="effort">工作量</option>
              <option value="progress">进度</option>
              <option value="startDate">开始时间</option>
              <option value="endDate">结束时间</option>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>

          {/* 统计信息 */}
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-gray-600">
              显示 {filteredAndSortedFeatures.length} / {features.length} 个功能
            </span>
            <div className="flex items-center space-x-3">
              <span className="text-green-600">已完成: {statusStats.completed}</span>
              <span className="text-blue-600">进行中: {statusStats['in-progress']}</span>
              <span className="text-gray-600">计划中: {statusStats.planned}</span>
              {statusStats.cancelled > 0 && (
                <span className="text-red-600">已取消: {statusStats.cancelled}</span>
              )}
            </div>
          </div>
        </div>

        {/* 功能列表 */}
        <div className="flex-1 overflow-y-auto">
          {filteredAndSortedFeatures.length > 0 ? (
            <div className="p-4 space-y-3">
              {filteredAndSortedFeatures.map(feature => (
                <div
                  key={feature.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedFeature?.id === feature.id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => onFeatureSelect(feature)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{getTypeIcon(feature.type)}</span>
                        <div
                          className={`w-2 h-2 rounded-full ${getPriorityColor(feature.priority)}`}
                          title={`优先级: ${feature.priority}`}
                        />
                        <h4 className="font-medium text-gray-900 truncate">
                          {feature.name}
                        </h4>
                        <span className={`px-2 py-1 text-xs border rounded ${getStatusColor(feature.status)}`}>
                          {feature.status}
                        </span>
                      </div>

                      {feature.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {feature.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{feature.type}</span>
                        <span>{feature.effort}d</span>
                        {feature.assignee && (
                          <div className="flex items-center space-x-1">
                            <UserIcon className="w-3 h-3" />
                            <span>{feature.assignee}</span>
                          </div>
                        )}
                        {feature.endDate && (
                          <div className="flex items-center space-x-1">
                            <CalendarIcon className="w-3 h-3" />
                            <span>{feature.endDate.toLocaleDateString()}</span>
                          </div>
                        )}
                        {feature.progress > 0 && (
                          <span>{feature.progress}%</span>
                        )}
                      </div>

                      {/* 标签 */}
                      {feature.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {feature.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {feature.tags.length > 3 && (
                            <span className="text-xs text-gray-500">+{feature.tags.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* 进度条 */}
                      {feature.progress > 0 && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                feature.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${feature.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddFeature(feature.id);
                        }}
                        className="p-1"
                        title="添加子功能"
                      >
                        <PlusIcon className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFeatureDelete(feature.id);
                        }}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="删除功能"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* 子功能指示 */}
                  {feature.children.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        {feature.children.length} 个子功能
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Square3Stack3DIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  {features.length === 0 ? '暂无功能' : '没有匹配的功能'}
                </h4>
                <p className="text-xs text-gray-500 mb-4">
                  {features.length === 0 ? '创建第一个功能开始规划' : '尝试调整过滤条件'}
                </p>
                {features.length === 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onAddFeature()}
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    创建功能
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧详细编辑 */}
      <div className="w-1/3 bg-gray-50">
        {selectedFeature ? (
          <FeatureDetailEditor
            feature={selectedFeature}
            allFeatures={features}
            onUpdate={(updates) => onFeatureUpdate(selectedFeature.id, updates)}
            onDelete={() => onFeatureDelete(selectedFeature.id)}
            onClose={() => onFeatureSelect(null)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <PencilIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">选择功能进行编辑</h3>
              <p className="text-gray-600">从左侧列表中选择功能查看和编辑详细信息</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 功能详细编辑器组件
interface FeatureDetailEditorProps {
  feature: Feature;
  allFeatures: Feature[];
  onUpdate: (updates: Partial<Feature>) => void;
  onDelete: () => void;
  onClose: () => void;
}

const FeatureDetailEditor: React.FC<FeatureDetailEditorProps> = ({
  feature,
  allFeatures,
  onUpdate,
  onDelete,
  onClose,
}) => {
  const [editingFeature, setEditingFeature] = useState<Feature>({ ...feature });

  // 同步外部变化
  React.useEffect(() => {
    setEditingFeature({ ...feature });
  }, [feature]);

  // 保存更改
  const handleSave = () => {
    onUpdate(editingFeature);
  };

  // 获取可选的父功能
  const availableParents = allFeatures.filter(f => 
    f.id !== feature.id && 
    !f.children.includes(feature.id) &&
    f.type !== 'task' && f.type !== 'story'
  );

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">编辑功能</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            ✕
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 基本信息 */}
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <h4 className="font-medium text-gray-900">基本信息</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">功能名称</label>
            <Input
              value={editingFeature.name}
              onChange={(e) => setEditingFeature(prev => ({ ...prev, name: e.target.value }))}
              size="sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <Textarea
              value={editingFeature.description || ''}
              onChange={(e) => setEditingFeature(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              size="sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
              <Select
                value={editingFeature.type}
                onChange={(e) => setEditingFeature(prev => ({ ...prev, type: e.target.value as any }))}
                size="sm"
              >
                <option value="epic">史诗</option>
                <option value="feature">功能</option>
                <option value="story">用户故事</option>
                <option value="task">任务</option>
                <option value="bug">缺陷</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <Select
                value={editingFeature.status}
                onChange={(e) => setEditingFeature(prev => ({ ...prev, status: e.target.value as any }))}
                size="sm"
              >
                <option value="planned">计划中</option>
                <option value="in-progress">进行中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
              <Select
                value={editingFeature.priority}
                onChange={(e) => setEditingFeature(prev => ({ ...prev, priority: e.target.value as any }))}
                size="sm"
              >
                <option value="critical">关键</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">工作量（天）</label>
              <Input
                type="number"
                value={editingFeature.effort}
                onChange={(e) => setEditingFeature(prev => ({ ...prev, effort: parseInt(e.target.value) || 0 }))}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* 分配和时间 */}
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <h4 className="font-medium text-gray-900">分配和时间</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">负责人</label>
            <Input
              value={editingFeature.assignee || ''}
              onChange={(e) => setEditingFeature(prev => ({ ...prev, assignee: e.target.value }))}
              size="sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
              <Input
                type="date"
                value={editingFeature.startDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setEditingFeature(prev => ({ 
                  ...prev, 
                  startDate: e.target.value ? new Date(e.target.value) : undefined 
                }))}
                size="sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
              <Input
                type="date"
                value={editingFeature.endDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setEditingFeature(prev => ({ 
                  ...prev, 
                  endDate: e.target.value ? new Date(e.target.value) : undefined 
                }))}
                size="sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              进度 ({editingFeature.progress}%)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={editingFeature.progress}
              onChange={(e) => setEditingFeature(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>
        </div>

        {/* 关系和标签 */}
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <h4 className="font-medium text-gray-900">关系和标签</h4>
          
          {availableParents.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">父功能</label>
              <Select
                value={editingFeature.parent || ''}
                onChange={(e) => setEditingFeature(prev => ({ ...prev, parent: e.target.value || undefined }))}
                size="sm"
              >
                <option value="">无父功能</option>
                {availableParents.map(parent => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name} ({parent.type})
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
            <Input
              value={editingFeature.tags.join(', ')}
              onChange={(e) => setEditingFeature(prev => ({ 
                ...prev, 
                tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
              }))}
              placeholder="用逗号分隔多个标签"
              size="sm"
            />
          </div>
        </div>

        {/* 子功能和依赖 */}
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <h4 className="font-medium text-gray-900">关系统计</h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">子功能:</span>
              <span className="ml-2 font-medium">{editingFeature.children.length}</span>
            </div>
            <div>
              <span className="text-gray-600">依赖:</span>
              <span className="ml-2 font-medium">{editingFeature.dependencies.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部操作 */}
      <div className="border-t bg-white p-4 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onDelete}
          className="text-red-600 hover:text-red-800"
        >
          <TrashIcon className="w-4 h-4 mr-1" />
          删除
        </Button>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
          >
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
          >
            保存
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FeatureManager;