import React, { useState, useMemo } from 'react';
import { Button, Select, Input } from '@/components/ui';
import { 
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
  FlagIcon
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

interface RoadmapPlannerProps {
  features: Feature[];
  onFeatureUpdate: (featureId: string, updates: Partial<Feature>) => void;
}

interface Milestone {
  id: string;
  name: string;
  date: Date;
  description?: string;
  features: string[];
}

const RoadmapPlanner: React.FC<RoadmapPlannerProps> = ({
  features,
  onFeatureUpdate,
}) => {
  const [viewType, setViewType] = useState<'timeline' | 'gantt' | 'milestone'>('timeline');
  const [timeRange, setTimeRange] = useState<'quarter' | 'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  // 生成里程碑
  const milestones = useMemo((): Milestone[] => {
    const milestoneMap = new Map<string, Milestone>();
    
    features.forEach(feature => {
      if (feature.endDate && (feature.type === 'epic' || feature.type === 'feature')) {
        const monthKey = `${feature.endDate.getFullYear()}-${feature.endDate.getMonth()}`;
        
        if (!milestoneMap.has(monthKey)) {
          milestoneMap.set(monthKey, {
            id: monthKey,
            name: `${feature.endDate.getFullYear()}年${feature.endDate.getMonth() + 1}月里程碑`,
            date: new Date(feature.endDate.getFullYear(), feature.endDate.getMonth(), feature.endDate.getDate()),
            features: []
          });
        }
        
        milestoneMap.get(monthKey)!.features.push(feature.id);
      }
    });
    
    return Array.from(milestoneMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [features]);

  // 获取时间范围内的功能
  const featuresInTimeRange = useMemo(() => {
    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
    
    switch (timeRange) {
      case 'week':
        startDate.setDate(startDate.getDate() - startDate.getDay());
        endDate.setDate(startDate.getDate() + 6);
        break;
      case 'month':
        startDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(startDate.getMonth() / 3);
        startDate.setMonth(quarter * 3, 1);
        endDate.setMonth(quarter * 3 + 3, 0);
        break;
    }

    return features.filter(feature => {
      if (!feature.startDate && !feature.endDate) return false;
      
      const featureStart = feature.startDate || feature.endDate;
      const featureEnd = feature.endDate || feature.startDate;
      
      if (!featureStart || !featureEnd) return false;
      
      const matchesAssignee = filterAssignee === 'all' || feature.assignee === filterAssignee;
      const inTimeRange = featureEnd >= startDate && featureStart <= endDate;
      
      return matchesAssignee && inTimeRange;
    });
  }, [features, currentDate, timeRange, filterAssignee]);

  // 获取所有负责人
  const allAssignees = useMemo(() => {
    const assignees = new Set(features.map(f => f.assignee).filter(Boolean));
    return Array.from(assignees);
  }, [features]);

  // 生成时间轴
  const generateTimeAxis = useMemo(() => {
    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
    const dates: Date[] = [];
    
    switch (timeRange) {
      case 'week':
        startDate.setDate(startDate.getDate() - startDate.getDay());
        endDate.setDate(startDate.getDate() + 6);
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          dates.push(new Date(d));
        }
        break;
      case 'month':
        startDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1, 0);
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          dates.push(new Date(d));
        }
        break;
      case 'quarter':
        const quarter = Math.floor(startDate.getMonth() / 3);
        startDate.setMonth(quarter * 3, 1);
        endDate.setMonth(quarter * 3 + 3, 0);
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
          dates.push(new Date(d));
        }
        break;
    }
    
    return dates;
  }, [currentDate, timeRange]);

  // 导航时间
  const navigateTime = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (timeRange) {
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'quarter':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 3 : -3));
        break;
    }
    
    setCurrentDate(newDate);
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'planned':
        return 'bg-gray-400';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-red-500';
      case 'high':
        return 'border-orange-500';
      case 'medium':
        return 'border-yellow-500';
      case 'low':
        return 'border-green-500';
      default:
        return 'border-gray-500';
    }
  };

  // 计算功能在时间轴上的位置
  const getFeaturePosition = (feature: Feature) => {
    const startDate = generateTimeAxis[0];
    const endDate = generateTimeAxis[generateTimeAxis.length - 1];
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (!feature.startDate || !feature.endDate) return null;
    
    const featureStartDays = Math.ceil((feature.startDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const featureDurationDays = Math.ceil((feature.endDate.getTime() - feature.startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const leftPercent = Math.max(0, (featureStartDays / totalDays) * 100);
    const widthPercent = Math.min(100 - leftPercent, (featureDurationDays / totalDays) * 100);
    
    return {
      left: `${leftPercent}%`,
      width: `${Math.max(2, widthPercent)}%`
    };
  };

  // 渲染时间轴视图
  const renderTimelineView = () => (
    <div className="space-y-4">
      {/* 时间轴标题 */}
      <div className="bg-gray-100 p-3 rounded-lg">
        <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-gray-700">
          {generateTimeAxis.slice(0, 7).map((date, index) => (
            <div key={index}>
              {timeRange === 'week' 
                ? date.toLocaleDateString('zh-CN', { weekday: 'short', month: 'short', day: 'numeric' })
                : timeRange === 'month'
                ? date.getDate()
                : `第${Math.ceil(date.getDate() / 7)}周`
              }
            </div>
          ))}
        </div>
      </div>

      {/* 功能时间轴 */}
      <div className="space-y-3">
        {featuresInTimeRange.map(feature => {
          const position = getFeaturePosition(feature);
          if (!position) return null;
          
          return (
            <div key={feature.id} className="relative">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-40 text-sm">
                  <div className="font-medium text-gray-900 truncate">{feature.name}</div>
                  <div className="text-xs text-gray-600">
                    {feature.type} • {feature.assignee}
                  </div>
                </div>
              </div>
              
              <div className="relative h-8 bg-gray-100 rounded">
                <div
                  className={`absolute top-1 bottom-1 rounded ${getStatusColor(feature.status)} ${getPriorityColor(feature.priority)} border-l-4`}
                  style={position}
                >
                  <div className="flex items-center justify-center h-full text-white text-xs font-medium px-2">
                    {feature.progress}%
                  </div>
                  {feature.progress > 0 && feature.progress < 100 && (
                    <div 
                      className="absolute top-0 bottom-0 bg-white bg-opacity-30 rounded-r"
                      style={{ left: `${feature.progress}%` }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // 渲染甘特图视图
  const renderGanttView = () => (
    <div className="space-y-2">
      <div className="sticky top-0 bg-white border-b z-10">
        <div className="flex">
          <div className="w-60 p-3 border-r bg-gray-50">
            <div className="font-medium text-gray-900">功能</div>
          </div>
          <div className="flex-1 flex">
            {generateTimeAxis.map((date, index) => (
              <div key={index} className="flex-1 p-2 text-center text-xs border-r border-gray-200">
                {date.toLocaleDateString('zh-CN', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {featuresInTimeRange.map(feature => {
        const position = getFeaturePosition(feature);
        
        return (
          <div key={feature.id} className="flex border-b border-gray-100">
            <div className="w-60 p-3 border-r">
              <div className="font-medium text-sm text-gray-900 truncate">
                {feature.name}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {feature.assignee} • {feature.effort}d
              </div>
            </div>
            
            <div className="flex-1 relative">
              {position && (
                <div
                  className={`absolute top-2 bottom-2 rounded ${getStatusColor(feature.status)} flex items-center justify-center text-white text-xs`}
                  style={position}
                >
                  {feature.progress}%
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // 渲染里程碑视图
  const renderMilestoneView = () => (
    <div className="space-y-6">
      {milestones.map(milestone => {
        const milestoneFeatures = features.filter(f => milestone.features.includes(f.id));
        
        return (
          <div key={milestone.id} className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <FlagIcon className="w-6 h-6 text-blue-500" />
                <div>
                  <h3 className="font-semibold text-gray-900">{milestone.name}</h3>
                  <p className="text-sm text-gray-600">
                    {milestone.date.toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                {milestoneFeatures.length} 个功能
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {milestoneFeatures.map(feature => (
                <div key={feature.id} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {feature.name}
                    </span>
                    <span className={`w-3 h-3 rounded-full ${getStatusColor(feature.status)}`} />
                  </div>
                  
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-center space-x-1">
                      <UserIcon className="w-3 h-3" />
                      <span>{feature.assignee || '未分配'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-3 h-3" />
                      <span>{feature.effort}天</span>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>进度</span>
                      <span>{feature.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${getStatusColor(feature.status)}`}
                        style={{ width: `${feature.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      
      {milestones.length === 0 && (
        <div className="text-center py-12">
          <FlagIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无里程碑</h3>
          <p className="text-gray-600">为功能设置结束时间以生成里程碑</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">路线图规划</h3>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateTime('prev')}
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </Button>
              
              <span className="text-sm font-medium min-w-32 text-center">
                {timeRange === 'week' 
                  ? `${currentDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} 周`
                  : timeRange === 'month'
                  ? currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
                  : `${currentDate.getFullYear()}年 Q${Math.floor(currentDate.getMonth() / 3) + 1}`
                }
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateTime('next')}
              >
                <ChevronRightIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
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

            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              size="sm"
            >
              <option value="week">周视图</option>
              <option value="month">月视图</option>
              <option value="quarter">季度视图</option>
            </Select>

            <div className="flex items-center space-x-1 border rounded">
              {[
                { id: 'timeline', label: '时间轴', icon: CalendarIcon },
                { id: 'gantt', label: '甘特图', icon: ClockIcon },
                { id: 'milestone', label: '里程碑', icon: FlagIcon }
              ].map(view => {
                const Icon = view.icon;
                return (
                  <button
                    key={view.id}
                    onClick={() => setViewType(view.id as any)}
                    className={`px-3 py-1 text-sm font-medium transition-colors ${
                      viewType === view.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-1 inline" />
                    {view.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="flex items-center space-x-6 mt-4 text-sm text-gray-600">
          <span>显示 {featuresInTimeRange.length} 个功能</span>
          <span>完成率: {Math.round((featuresInTimeRange.filter(f => f.status === 'completed').length / Math.max(1, featuresInTimeRange.length)) * 100)}%</span>
          <span>总工作量: {featuresInTimeRange.reduce((sum, f) => sum + f.effort, 0)} 天</span>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 bg-gray-50 p-4 overflow-auto">
        {viewType === 'timeline' && renderTimelineView()}
        {viewType === 'gantt' && renderGanttView()}
        {viewType === 'milestone' && renderMilestoneView()}
      </div>
    </div>
  );
};

export default RoadmapPlanner;