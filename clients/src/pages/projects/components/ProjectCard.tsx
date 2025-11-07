import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge, Avatar, Button, Dropdown } from '@/components/ui';
import { 
  FolderIcon, 
  CalendarIcon, 
  UserGroupIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  Cog6ToothIcon,
  ArchiveBoxIcon,
  TrashIcon,
  RocketLaunchIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Project } from '@/types/entities';

interface ProjectCardProps {
  project: Project;
  currentUserId: string;
  onArchive?: (projectId: string) => void;
  onDelete?: (projectId: string) => void;
  onDeploy?: (projectId: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  currentUserId, 
  onArchive, 
  onDelete,
  onDeploy 
}) => {
  const isOwner = project.createdBy === currentUserId;

  const getStatusBadge = () => {
    const statusConfig = {
      active: { label: '进行中', variant: 'success' as const },
      completed: { label: '已完成', variant: 'primary' as const },
      paused: { label: '已暂停', variant: 'warning' as const },
      archived: { label: '已归档', variant: 'secondary' as const },
      planning: { label: '规划中', variant: 'info' as const },
    };
    
    const config = statusConfig[project.status as keyof typeof statusConfig];
    return config ? <Badge variant={config.variant} size="sm">{config.label}</Badge> : null;
  };

  const getTypeBadge = () => {
    const typeConfig = {
      web: { label: 'Web应用', color: 'bg-blue-100 text-blue-800' },
      mobile: { label: '移动应用', color: 'bg-green-100 text-green-800' },
      api: { label: 'API服务', color: 'bg-purple-100 text-purple-800' },
      desktop: { label: '桌面应用', color: 'bg-orange-100 text-orange-800' },
      library: { label: '代码库', color: 'bg-gray-100 text-gray-800' },
    };
    
    const config = typeConfig[project.type as keyof typeof typeConfig];
    return config ? (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    ) : null;
  };

  const getPriorityColor = () => {
    const colors = {
      high: 'text-red-600',
      medium: 'text-yellow-600',
      low: 'text-green-600',
    };
    return colors[project.priority as keyof typeof colors] || 'text-gray-600';
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          {/* 项目图标 */}
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <FolderIcon className="h-6 w-6 text-white" />
          </div>
          
          {/* 项目信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Link 
                to={`/projects/${project.id}`}
                className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate"
              >
                {project.name}
              </Link>
              {getTypeBadge()}
            </div>
            
            <div className="flex items-center space-x-2 mb-2">
              {getStatusBadge()}
              {project.priority && (
                <Badge 
                  variant={
                    project.priority === 'high' ? 'danger' : 
                    project.priority === 'medium' ? 'warning' : 'secondary'
                  } 
                  size="xs"
                >
                  {project.priority === 'high' ? '高优先级' : 
                   project.priority === 'medium' ? '中优先级' : '低优先级'}
                </Badge>
              )}
            </div>
            
            {project.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* 操作菜单 */}
        <Dropdown
          trigger={
            <Button 
              variant="ghost" 
              size="sm" 
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <EllipsisVerticalIcon className="h-4 w-4" />
            </Button>
          }
          items={[
            {
              label: '查看详情',
              icon: EyeIcon,
              href: `/projects/${project.id}`,
            },
            {
              label: '项目设置',
              icon: Cog6ToothIcon,
              href: `/projects/${project.id}/settings`,
              disabled: !isOwner,
            },
            {
              type: 'divider',
            },
            {
              label: '部署项目',
              icon: RocketLaunchIcon,
              onClick: () => onDeploy?.(project.id),
              disabled: project.status !== 'active',
            },
            ...(isOwner ? [
              {
                type: 'divider' as const,
              },
              {
                label: '归档项目',
                icon: ArchiveBoxIcon,
                onClick: () => onArchive?.(project.id),
                disabled: project.status === 'archived',
              },
              {
                label: '删除项目',
                icon: TrashIcon,
                onClick: () => onDelete?.(project.id),
                className: 'text-red-600',
              },
            ] : []),
            {
              type: 'divider',
            },
            {
              label: '在新窗口打开',
              icon: ArrowTopRightOnSquareIcon,
              onClick: () => window.open(`/projects/${project.id}`, '_blank'),
            },
          ]}
        />
      </div>

      {/* 项目统计 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-sm text-gray-500 mb-1">
            <UserGroupIcon className="h-4 w-4" />
            <span>成员</span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {project.memberCount || 0}
          </div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-sm text-gray-500 mb-1">
            <FolderIcon className="h-4 w-4" />
            <span>文档</span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {project.documentCount || 0}
          </div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-sm text-gray-500 mb-1">
            <ClockIcon className="h-4 w-4" />
            <span>进度</span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {project.progress || 0}%
          </div>
        </div>
      </div>

      {/* 进度条 */}
      {project.progress !== undefined && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 项目成员头像 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-2">
            {project.maintainers?.slice(0, 3).map((maintainer, index) => (
              <Avatar
                key={maintainer.id || index}
                src={maintainer.user?.avatarUrl}
                alt={maintainer.user?.displayName}
                size="sm"
                className="border-2 border-white"
                title={maintainer.user?.displayName}
              />
            ))}
            {(project.memberCount || 0) > 3 && (
              <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  +{(project.memberCount || 0) - 3}
                </span>
              </div>
            )}
          </div>
          
          {project.maintainers && project.maintainers.length > 0 && (
            <span className="text-xs text-gray-500">
              {project.maintainers.slice(0, 2).map(m => m.user?.displayName).join(', ')}
              {project.maintainers.length > 2 && ` 等 ${project.maintainers.length} 人`}
            </span>
          )}
        </div>

        {/* 团队信息 */}
        {project.team && (
          <span className="text-xs text-gray-500">
            {project.team.name}
          </span>
        )}
      </div>

      {/* 底部信息 */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <CalendarIcon className="h-4 w-4" />
          <span>
            创建于 {formatDistanceToNow(new Date(project.createdAt), { 
              addSuffix: true, 
              locale: zhCN 
            })}
          </span>
        </div>
        
        {project.lastActivityAt && (
          <span>
            最后活动: {formatDistanceToNow(new Date(project.lastActivityAt), { 
              addSuffix: true, 
              locale: zhCN 
            })}
          </span>
        )}
      </div>

      {/* 快捷操作按钮 */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex space-x-2">
        <Link to={`/projects/${project.id}`} className="flex-1">
          <Button variant="outline" size="sm" fullWidth>
            <EyeIcon className="h-4 w-4 mr-2" />
            查看详情
          </Button>
        </Link>
        
        {isOwner && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(`/projects/${project.id}/settings`, '_self')}
          >
            <Cog6ToothIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
};

export default ProjectCard;