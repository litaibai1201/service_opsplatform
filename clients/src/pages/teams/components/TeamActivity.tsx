import React, { useState } from 'react';
import { Card, Button, Select, Badge, Avatar, Spinner } from '@/components/ui';
import { useTeamActivity } from '@/hooks/data/useTeams';
import {
  ClockIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  UserPlusIcon,
  UserMinusIcon,
  FolderIcon,
  Cog6ToothIcon,
  DocumentIcon,
  ChatBubbleLeftIcon,
  CodeBracketIcon,
  RocketLaunchIcon,
  ArchiveBoxIcon,
  ShieldCheckIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { TeamActivity as ActivityType } from '@/types/entities';

interface TeamActivityProps {
  teamId: string;
}

const TeamActivity: React.FC<TeamActivityProps> = ({ teamId }) => {
  const { activities, isLoading, error, refreshActivities } = useTeamActivity(teamId);
  
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');

  const filteredActivities = activities.filter(activity => {
    const matchesType = typeFilter === 'all' || activity.type === typeFilter;
    
    let matchesTime = true;
    if (timeFilter !== 'all') {
      const now = new Date();
      const activityDate = new Date(activity.createdAt);
      const diffDays = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (timeFilter) {
        case 'today':
          matchesTime = diffDays === 0;
          break;
        case 'week':
          matchesTime = diffDays <= 7;
          break;
        case 'month':
          matchesTime = diffDays <= 30;
          break;
      }
    }
    
    return matchesType && matchesTime;
  });

  const getActivityIcon = (type: string) => {
    const iconMap = {
      member_joined: UserPlusIcon,
      member_left: UserMinusIcon,
      member_role_changed: ShieldCheckIcon,
      project_created: FolderIcon,
      project_updated: DocumentIcon,
      project_deployed: RocketLaunchIcon,
      project_archived: ArchiveBoxIcon,
      team_settings_updated: Cog6ToothIcon,
      team_created: UserPlusIcon,
      comment_added: ChatBubbleLeftIcon,
      code_pushed: CodeBracketIcon,
    };
    
    const IconComponent = iconMap[type as keyof typeof iconMap] || ClockIcon;
    return IconComponent;
  };

  const getActivityColor = (type: string) => {
    const colorMap = {
      member_joined: 'text-green-600 bg-green-100',
      member_left: 'text-red-600 bg-red-100',
      member_role_changed: 'text-blue-600 bg-blue-100',
      project_created: 'text-purple-600 bg-purple-100',
      project_updated: 'text-yellow-600 bg-yellow-100',
      project_deployed: 'text-green-600 bg-green-100',
      project_archived: 'text-gray-600 bg-gray-100',
      team_settings_updated: 'text-blue-600 bg-blue-100',
      team_created: 'text-green-600 bg-green-100',
      comment_added: 'text-orange-600 bg-orange-100',
      code_pushed: 'text-purple-600 bg-purple-100',
    };
    
    return colorMap[type as keyof typeof colorMap] || 'text-gray-600 bg-gray-100';
  };

  const getActivityDescription = (activity: ActivityType) => {
    const descriptions = {
      member_joined: `${activity.actor.name} 加入了团队`,
      member_left: `${activity.actor.name} 离开了团队`,
      member_role_changed: `${activity.actor.name} 的角色被更改为 ${activity.metadata?.newRole}`,
      project_created: `${activity.actor.name} 创建了项目 "${activity.metadata?.projectName}"`,
      project_updated: `${activity.actor.name} 更新了项目 "${activity.metadata?.projectName}"`,
      project_deployed: `${activity.actor.name} 部署了项目 "${activity.metadata?.projectName}"`,
      project_archived: `${activity.actor.name} 归档了项目 "${activity.metadata?.projectName}"`,
      team_settings_updated: `${activity.actor.name} 更新了团队设置`,
      team_created: `${activity.actor.name} 创建了团队`,
      comment_added: `${activity.actor.name} 在 "${activity.metadata?.target}" 添加了评论`,
      code_pushed: `${activity.actor.name} 向 "${activity.metadata?.repository}" 推送了代码`,
    };
    
    return descriptions[activity.type as keyof typeof descriptions] || activity.description;
  };

  const groupActivitiesByDate = (activities: ActivityType[]) => {
    const groups = activities.reduce((acc, activity) => {
      const date = new Date(activity.createdAt).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(activity);
      return acc;
    }, {} as Record<string, ActivityType[]>);

    return Object.entries(groups).sort((a, b) => 
      new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  };

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-CN', { 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">加载活动记录...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={refreshActivities}>重试</Button>
      </Card>
    );
  }

  const groupedActivities = groupActivitiesByDate(filteredActivities);

  return (
    <div className="space-y-6">
      {/* 筛选器 */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">活动记录</h3>
          
          <div className="flex items-center space-x-3">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-40"
            >
              <option value="all">所有类型</option>
              <option value="member_joined">成员加入</option>
              <option value="member_left">成员离开</option>
              <option value="member_role_changed">角色变更</option>
              <option value="project_created">项目创建</option>
              <option value="project_updated">项目更新</option>
              <option value="project_deployed">项目部署</option>
              <option value="team_settings_updated">设置更新</option>
            </Select>
            
            <Select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-32"
            >
              <option value="all">所有时间</option>
              <option value="today">今天</option>
              <option value="week">本周</option>
              <option value="month">本月</option>
            </Select>
            
            <Button variant="outline" size="sm">
              <FunnelIcon className="h-4 w-4 mr-2" />
              筛选
            </Button>
          </div>
        </div>
      </Card>

      {/* 活动统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{activities.length}</div>
          <div className="text-sm text-gray-600">总活动数</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {activities.filter(a => a.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).length}
          </div>
          <div className="text-sm text-gray-600">本周活动</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {activities.filter(a => a.type.includes('project')).length}
          </div>
          <div className="text-sm text-gray-600">项目活动</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {activities.filter(a => a.type.includes('member')).length}
          </div>
          <div className="text-sm text-gray-600">成员活动</div>
        </Card>
      </div>

      {/* 活动时间线 */}
      <Card>
        {groupedActivities.length === 0 ? (
          <div className="p-12 text-center">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {typeFilter !== 'all' || timeFilter !== 'all' 
                ? '没有找到匹配的活动' 
                : '还没有活动记录'
              }
            </h3>
            <p className="text-gray-600">
              {typeFilter !== 'all' || timeFilter !== 'all'
                ? '尝试调整筛选条件查看更多活动'
                : '团队活动将在这里显示'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {groupedActivities.map(([date, dayActivities]) => (
              <div key={date} className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <h4 className="text-sm font-medium text-gray-900">
                    {getDateLabel(date)}
                  </h4>
                  <div className="flex-1 border-t border-gray-200" />
                  <Badge variant="secondary" size="sm">
                    {dayActivities.length} 个活动
                  </Badge>
                </div>

                <div className="space-y-4">
                  {dayActivities.map((activity, index) => {
                    const IconComponent = getActivityIcon(activity.type);
                    const colorClass = getActivityColor(activity.type);
                    
                    return (
                      <div key={activity.id || index} className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Avatar
                              src={activity.actor.avatar}
                              alt={activity.actor.name}
                              size="xs"
                              className="flex-shrink-0"
                            />
                            <p className="text-sm text-gray-900">
                              {getActivityDescription(activity)}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>
                              {formatDistanceToNow(new Date(activity.createdAt), { 
                                addSuffix: true, 
                                locale: zhCN 
                              })}
                            </span>
                            
                            {activity.metadata?.location && (
                              <>
                                <span>•</span>
                                <span>{activity.metadata.location}</span>
                              </>
                            )}
                          </div>

                          {/* 额外信息 */}
                          {activity.metadata?.details && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                              {activity.metadata.details}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 加载更多 */}
      {groupedActivities.length > 0 && (
        <div className="text-center">
          <Button variant="outline" onClick={refreshActivities}>
            加载更多活动
          </Button>
        </div>
      )}
    </div>
  );
};

export default TeamActivity;