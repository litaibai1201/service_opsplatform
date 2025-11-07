import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { 
  TrashIcon,
  PlusIcon,
  LinkIcon,
  PencilIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  PlayIcon,
  XMarkIcon
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

interface FeatureNodeProps {
  feature: Feature;
  isSelected: boolean;
  isHovered: boolean;
  isConnectingTarget: boolean;
  showProgress: boolean;
  showAssignee: boolean;
  showPriority: boolean;
  onStartConnection: () => void;
  onUpdate: (updates: Partial<Feature>) => void;
  onDelete: () => void;
}

const FeatureNode: React.FC<FeatureNodeProps> = ({
  feature,
  isSelected,
  isHovered,
  isConnectingTarget,
  showProgress,
  showAssignee,
  showPriority,
  onStartConnection,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(feature.name);

  // 获取状态颜色和图标
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'planned':
        return { color: 'text-gray-500', bg: 'bg-gray-100', icon: ClockIcon };
      case 'in-progress':
        return { color: 'text-blue-500', bg: 'bg-blue-100', icon: PlayIcon };
      case 'completed':
        return { color: 'text-green-500', bg: 'bg-green-100', icon: CheckCircleIcon };
      case 'cancelled':
        return { color: 'text-red-500', bg: 'bg-red-100', icon: XMarkIcon };
      default:
        return { color: 'text-gray-500', bg: 'bg-gray-100', icon: ClockIcon };
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

  // 获取类型样式
  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'epic':
        return {
          borderWidth: '3px',
          borderStyle: 'solid',
          minHeight: '80px',
          fontSize: '14px',
          fontWeight: '600'
        };
      case 'feature':
        return {
          borderWidth: '2px',
          borderStyle: 'solid',
          minHeight: '60px',
          fontSize: '13px',
          fontWeight: '500'
        };
      case 'story':
        return {
          borderWidth: '1px',
          borderStyle: 'solid',
          minHeight: '50px',
          fontSize: '12px',
          fontWeight: '400'
        };
      case 'task':
        return {
          borderWidth: '1px',
          borderStyle: 'dashed',
          minHeight: '40px',
          fontSize: '12px',
          fontWeight: '400'
        };
      case 'bug':
        return {
          borderWidth: '2px',
          borderStyle: 'dotted',
          minHeight: '50px',
          fontSize: '12px',
          fontWeight: '400'
        };
      default:
        return {
          borderWidth: '1px',
          borderStyle: 'solid',
          minHeight: '50px',
          fontSize: '12px',
          fontWeight: '400'
        };
    }
  };

  const statusConfig = getStatusConfig(feature.status);
  const typeStyle = getTypeStyle(feature.type);
  const StatusIcon = statusConfig.icon;

  // 保存编辑
  const handleSaveEdit = () => {
    if (editName.trim() && editName !== feature.name) {
      onUpdate({ name: editName.trim() });
    }
    setIsEditing(false);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditName(feature.name);
    setIsEditing(false);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div
      className={`relative bg-white rounded-lg shadow-sm transition-all duration-200 ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
      } ${isHovered ? 'shadow-md' : ''} ${
        isConnectingTarget ? 'ring-2 ring-green-500 ring-opacity-50' : ''
      }`}
      style={{
        width: feature.size.width,
        minHeight: typeStyle.minHeight,
        borderColor: feature.color,
        borderWidth: typeStyle.borderWidth,
        borderStyle: typeStyle.borderStyle as any,
        backgroundColor: feature.status === 'completed' ? '#f0fdf4' : 'white'
      }}
    >
      {/* 优先级指示器 */}
      {showPriority && (
        <div
          className={`absolute -top-1 -left-1 w-3 h-3 rounded-full ${getPriorityColor(feature.priority)}`}
          title={`优先级: ${feature.priority}`}
        />
      )}

      {/* 类型标签 */}
      <div className="absolute -top-2 left-2 bg-white px-2 py-0.5 rounded text-xs font-medium text-gray-600 border">
        {feature.type.toUpperCase()}
      </div>

      {/* 主内容区域 */}
      <div className="p-3 pt-4">
        {/* 标题编辑 */}
        {isEditing ? (
          <div className="mb-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyDown}
              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ fontSize: typeStyle.fontSize, fontWeight: typeStyle.fontWeight }}
              autoFocus
            />
          </div>
        ) : (
          <div
            className="mb-2 cursor-pointer"
            onDoubleClick={() => setIsEditing(true)}
            style={{ fontSize: typeStyle.fontSize, fontWeight: typeStyle.fontWeight }}
          >
            <h3 className="text-gray-900 leading-tight">{feature.name}</h3>
          </div>
        )}

        {/* 描述 */}
        {feature.description && (
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {feature.description}
          </p>
        )}

        {/* 进度条 */}
        {showProgress && feature.progress > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>进度</span>
              <span>{feature.progress}%</span>
            </div>
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

        {/* 底部信息 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {/* 状态图标 */}
            <div className={`p-1 rounded ${statusConfig.bg}`}>
              <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
            </div>

            {/* 负责人 */}
            {showAssignee && feature.assignee && (
              <div className="flex items-center space-x-1 text-xs text-gray-600">
                <UserIcon className="w-3 h-3" />
                <span>{feature.assignee}</span>
              </div>
            )}

            {/* 时间信息 */}
            {feature.endDate && (
              <div className="flex items-center space-x-1 text-xs text-gray-600">
                <CalendarIcon className="w-3 h-3" />
                <span>{feature.endDate.toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* 工作量 */}
          {feature.effort > 0 && (
            <div className="text-xs text-gray-500">
              {feature.effort}d
            </div>
          )}
        </div>

        {/* 标签 */}
        {feature.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {feature.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="inline-block px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
              >
                {tag}
              </span>
            ))}
            {feature.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{feature.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* 依赖指示器 */}
        {feature.dependencies.length > 0 && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full" 
               title={`依赖 ${feature.dependencies.length} 个功能`} />
        )}

        {/* 子功能指示器 */}
        {feature.children.length > 0 && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-500">
            {feature.children.length}
          </div>
        )}
      </div>

      {/* 悬停操作按钮 */}
      {(isHovered || isSelected) && !isEditing && (
        <div className="absolute -top-2 -right-2 flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1 w-6 h-6 bg-white shadow-sm"
            title="编辑"
          >
            <PencilIcon className="w-3 h-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnection();
            }}
            className="p-1 w-6 h-6 bg-white shadow-sm"
            title="创建连接"
          >
            <LinkIcon className="w-3 h-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 w-6 h-6 bg-white shadow-sm text-red-600 hover:text-red-800"
            title="删除"
          >
            <TrashIcon className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* 连接点 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 上连接点 */}
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-2 border-gray-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* 右连接点 */}
        <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-white border-2 border-gray-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* 下连接点 */}
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-2 border-gray-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* 左连接点 */}
        <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-white border-2 border-gray-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};

export default FeatureNode;