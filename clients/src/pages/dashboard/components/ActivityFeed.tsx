import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Avatar, Badge } from '@/components/ui';
import { 
  PlusIcon,
  PencilIcon,
  UserPlusIcon,
  ChatBubbleLeftIcon,
  DocumentIcon,
  FolderIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');
export interface Activity {
  id: string;
  type: 'project_created' | 'design_created' | 'design_updated' | 'member_joined' | 'comment_added' | 'team_created';
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  target: {
    id: string;
    name: string;
    type: 'project' | 'design' | 'team' | 'comment';
    url?: string;
  };
  timestamp: string;
  description?: string;
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  activities?: Activity[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  if (!activities) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">最近活动</h3>
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="animate-pulse flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <div className="p-6 text-center">
          <ChatBubbleLeftIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无活动</h3>
          <p className="text-gray-600">开始创建项目和设计，活动动态将显示在这里</p>
        </div>
      </Card>
    );
  }

  const getActivityIcon = (type: Activity['type']) => {
    const iconConfig = {
      project_created: { icon: FolderIcon, color: 'text-blue-600', bgColor: 'bg-blue-100' },
      design_created: { icon: PlusIcon, color: 'text-green-600', bgColor: 'bg-green-100' },
      design_updated: { icon: PencilIcon, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
      member_joined: { icon: UserPlusIcon, color: 'text-purple-600', bgColor: 'bg-purple-100' },
      comment_added: { icon: ChatBubbleLeftIcon, color: 'text-orange-600', bgColor: 'bg-orange-100' },
      team_created: { icon: UserGroupIcon, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
    };

    const config = iconConfig[type];
    return (
      <div className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center`}>
        <config.icon className={`h-4 w-4 ${config.color}`} />
      </div>
    );
  };

  const getActivityDescription = (activity: Activity) => {
    const actionMap = {
      project_created: '创建了项目',
      design_created: '创建了设计',
      design_updated: '更新了设计',
      member_joined: '加入了团队',
      comment_added: '添加了评论',
      team_created: '创建了团队',
    };

    const action = actionMap[activity.type] || '执行了操作';
    const targetName = activity.target.name;
    const targetUrl = activity.target.url;

    return (
      <span>
        {action} {' '}
        {targetUrl ? (
          <Link 
            to={targetUrl} 
            className="font-medium text-blue-600 hover:text-blue-800"
          >
            {targetName}
          </Link>
        ) : (
          <span className="font-medium text-gray-900">{targetName}</span>
        )}
        {activity.description && (
          <span className="text-gray-600"> - {activity.description}</span>
        )}
      </span>
    );
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">最近活动</h3>
          <Link 
            to="/activities" 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            查看全部
          </Link>
        </div>

        <div className="flow-root">
          <ul className="-mb-8">
            {activities.map((activity, index) => (
              <li key={activity.id}>
                <div className="relative pb-8">
                  {index !== activities.length - 1 && (
                    <span 
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" 
                      aria-hidden="true" 
                    />
                  )}
                  
                  <div className="relative flex items-start space-x-3">
                    {/* 活动图标 */}
                    <div className="relative">
                      {getActivityIcon(activity.type)}
                    </div>

                    {/* 活动内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <Avatar 
                          src={activity.user.avatar} 
                          alt={activity.user.name}
                          size="xs"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {activity.user.name}
                        </span>
                      </div>
                      
                      <div className="mt-1">
                        <p className="text-sm text-gray-600">
                          {getActivityDescription(activity)}
                        </p>
                      </div>
                      
                      <div className="mt-2 flex items-center space-x-3">
                        <span className="text-xs text-gray-500">
                          {dayjs(activity.timestamp).fromNow()}
                        </span>
                        
                        {activity.metadata?.tags && (
                          <div className="flex items-center space-x-1">
                            {activity.metadata.tags.slice(0, 2).map((tag: string, tagIndex: number) => (
                              <Badge key={tagIndex} variant="secondary" size="xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default ActivityFeed;