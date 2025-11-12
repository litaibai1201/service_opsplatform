import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge, Avatar, Button } from '@/components/ui';
import { 
  FolderIcon, 
  CalendarIcon, 
  UserGroupIcon,
  EyeIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');
export interface RecentProject {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'draft';
  lastActivity: string;
  teamName: string;
  memberCount: number;
  designCount: number;
  tags: string[];
  thumbnail?: string;
  collaborators: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
}

interface RecentProjectsProps {
  projects?: RecentProject[];
}

const RecentProjects: React.FC<RecentProjectsProps> = ({ projects }) => {
  if (!projects) {
    return (
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">最近项目</h3>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <div className="p-6 text-center">
          <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">还没有项目</h3>
          <p className="text-gray-600 mb-6">创建您的第一个项目开始协作之旅</p>
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            创建项目
          </Button>
        </div>
      </Card>
    );
  }

  const getStatusBadge = (status: RecentProject['status']) => {
    const statusConfig = {
      active: { label: '活跃', variant: 'success' as const },
      archived: { label: '已归档', variant: 'secondary' as const },
      draft: { label: '草稿', variant: 'warning' as const },
    };
    
    const config = statusConfig[status];
    return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">最近项目</h3>
          <Link 
            to="/projects" 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            查看全部
          </Link>
        </div>

        <div className="space-y-4">
          {projects.map((project) => (
            <div 
              key={project.id}
              className="flex items-center space-x-4 p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              {/* 项目缩略图/图标 */}
              <div className="flex-shrink-0">
                {project.thumbnail ? (
                  <img 
                    src={project.thumbnail} 
                    alt={project.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FolderIcon className="h-6 w-6 text-blue-600" />
                  </div>
                )}
              </div>

              {/* 项目信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Link 
                    to={`/projects/${project.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate"
                  >
                    {project.name}
                  </Link>
                  {getStatusBadge(project.status)}
                </div>
                
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {project.description}
                </p>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <UserGroupIcon className="h-3 w-3" />
                    <span>{project.teamName}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <CalendarIcon className="h-3 w-3" />
                    <span>
                      {dayjs(project.lastActivity).fromNow()}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <EyeIcon className="h-3 w-3" />
                    <span>{project.designCount} 个设计</span>
                  </div>
                </div>

                {/* 标签 */}
                {project.tags.length > 0 && (
                  <div className="flex items-center space-x-1 mt-2">
                    {project.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" size="xs">
                        {tag}
                      </Badge>
                    ))}
                    {project.tags.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{project.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 协作者头像 */}
              <div className="flex-shrink-0">
                <div className="flex items-center space-x-1">
                  {project.collaborators.slice(0, 3).map((collaborator, index) => (
                    <Avatar
                      key={collaborator.id}
                      src={collaborator.avatar}
                      alt={collaborator.name}
                      size="sm"
                      className={index > 0 ? '-ml-2' : ''}
                    />
                  ))}
                  {project.collaborators.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center -ml-2">
                      <span className="text-xs text-gray-600">
                        +{project.collaborators.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <Link to="/projects">
            <Button variant="outline" fullWidth>
              查看所有项目
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};

export default RecentProjects;