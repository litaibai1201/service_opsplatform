import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Input, Select, Badge, Dropdown, Spinner } from '@/components/ui';
import { useTeamProjects } from '@/hooks/data';
import { usePermissions } from '@/components/layout/PermissionGuard';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  FolderIcon,
  CalendarIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  Cog6ToothIcon,
  ArchiveBoxIcon,
  TrashIcon,
  RocketLaunchIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Project } from '@/types/entities';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');
interface TeamProjectsProps {
  teamId: string;
}

const TeamProjects: React.FC<TeamProjectsProps> = ({ teamId }) => {
  const { projects, isLoading, error, refreshProjects } = useTeamProjects(teamId);
  const { canManageTeam } = usePermissions();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const canManage = canManageTeam(teamId);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesType = typeFilter === 'all' || project.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: '进行中', variant: 'success' as const },
      completed: { label: '已完成', variant: 'primary' as const },
      paused: { label: '已暂停', variant: 'warning' as const },
      archived: { label: '已归档', variant: 'secondary' as const },
      planning: { label: '规划中', variant: 'info' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return config ? <Badge variant={config.variant} size="sm">{config.label}</Badge> : null;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      web: { label: 'Web应用', color: 'bg-blue-100 text-blue-800' },
      mobile: { label: '移动应用', color: 'bg-green-100 text-green-800' },
      api: { label: 'API服务', color: 'bg-purple-100 text-purple-800' },
      desktop: { label: '桌面应用', color: 'bg-orange-100 text-orange-800' },
      library: { label: '代码库', color: 'bg-gray-100 text-gray-800' },
    };
    
    const config = typeConfig[type as keyof typeof typeConfig];
    return config ? (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    ) : null;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'text-red-600',
      medium: 'text-yellow-600',
      low: 'text-green-600',
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">加载项目信息...</p>
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
        <Button onClick={refreshProjects}>重试</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 搜索和筛选 */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 w-full">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="搜索项目名称或描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-32"
            >
              <option value="all">所有状态</option>
              <option value="active">进行中</option>
              <option value="planning">规划中</option>
              <option value="completed">已完成</option>
              <option value="paused">已暂停</option>
              <option value="archived">已归档</option>
            </Select>
            
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-32"
            >
              <option value="all">所有类型</option>
              <option value="web">Web应用</option>
              <option value="mobile">移动应用</option>
              <option value="api">API服务</option>
              <option value="desktop">桌面应用</option>
              <option value="library">代码库</option>
            </Select>
            
            <Button variant="outline" size="sm">
              <FunnelIcon className="h-4 w-4 mr-2" />
              筛选
            </Button>
            
            {canManage && (
              <Button size="sm">
                <PlusIcon className="h-4 w-4 mr-2" />
                新建项目
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 项目统计 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{projects.length}</div>
          <div className="text-sm text-gray-600">总项目数</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {projects.filter(p => p.status === 'active').length}
          </div>
          <div className="text-sm text-gray-600">进行中</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {projects.filter(p => p.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-600">已完成</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {projects.filter(p => p.status === 'planning').length}
          </div>
          <div className="text-sm text-gray-600">规划中</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">
            {projects.filter(p => p.status === 'archived').length}
          </div>
          <div className="text-sm text-gray-600">已归档</div>
        </Card>
      </div>

      {/* 项目列表 */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            团队项目 ({filteredProjects.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredProjects.length === 0 ? (
            <div className="p-12 text-center">
              <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                  ? '没有找到匹配的项目' 
                  : '还没有项目'
                }
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? '尝试调整搜索条件或筛选器'
                  : '创建第一个项目开始工作'
                }
              </p>
              {(!searchTerm && statusFilter === 'all' && typeFilter === 'all') && canManage && (
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  新建项目
                </Button>
              )}
            </div>
          ) : (
            filteredProjects.map((project) => (
              <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FolderIcon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Link 
                            to={`/projects/${project.id}`}
                            className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate"
                          >
                            {project.name}
                          </Link>
                          {getStatusBadge(project.status)}
                          {getTypeBadge(project.type)}
                        </div>
                        
                        {project.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 项目信息 */}
                    <div className="ml-13 space-y-2">
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <UserGroupIcon className="h-4 w-4" />
                          <span>{project.memberCount || 0} 名成员</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            创建于 {dayjs(project.createdAt).fromNow()}
                          </span>
                        </div>
                        
                        {project.dueDate && (
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="h-4 w-4" />
                            <span>
                              截止 {dayjs(project.dueDate).fromNow()}
                            </span>
                          </div>
                        )}

                        {project.priority && (
                          <span className={`font-medium ${getPriorityColor(project.priority)}`}>
                            {project.priority === 'high' ? '高优先级' : 
                             project.priority === 'medium' ? '中优先级' : '低优先级'}
                          </span>
                        )}
                      </div>

                      {/* 进度条 */}
                      {project.progress !== undefined && (
                        <div className="ml-0">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">项目进度</span>
                            <span className="font-medium text-gray-900">{project.progress}%</span>
                          </div>
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* 最近活动 */}
                      {project.lastActivityAt && (
                        <div className="text-xs text-gray-500">
                          最后活动: {dayjs(project.lastActivityAt).fromNow()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 操作菜单 */}
                  <div className="flex items-center space-x-2 ml-4">
                    <Link to={`/projects/${project.id}`}>
                      <Button variant="outline" size="sm">
                        <EyeIcon className="h-4 w-4 mr-2" />
                        查看
                      </Button>
                    </Link>
                    
                    {canManage && (
                      <Dropdown
                        trigger={
                          <Button variant="ghost" size="sm">
                            <EllipsisVerticalIcon className="h-4 w-4" />
                          </Button>
                        }
                        items={[
                          {
                            label: '项目详情',
                            icon: EyeIcon,
                            href: `/projects/${project.id}`,
                          },
                          {
                            label: '项目设置',
                            icon: Cog6ToothIcon,
                            href: `/projects/${project.id}/settings`,
                          },
                          {
                            type: 'divider',
                          },
                          {
                            label: '启动部署',
                            icon: RocketLaunchIcon,
                            onClick: () => console.log('Deploy project', project.id),
                            disabled: project.status !== 'active',
                          },
                          {
                            type: 'divider',
                          },
                          {
                            label: '归档项目',
                            icon: ArchiveBoxIcon,
                            onClick: () => console.log('Archive project', project.id),
                            disabled: project.status === 'archived',
                          },
                          {
                            label: '删除项目',
                            icon: TrashIcon,
                            onClick: () => console.log('Delete project', project.id),
                            className: 'text-red-600',
                          },
                        ]}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default TeamProjects;