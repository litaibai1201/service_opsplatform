import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { Card, Button, Badge, Tabs, TabPanel, Avatar, Dropdown } from '@/components/ui';
import { useProjectDetail } from '@/hooks/useProjectDetail';
import { RequireProjectManage, usePermissions } from '@/components/layout/PermissionGuard';
import ProjectSettings from './components/ProjectSettings';
import ProjectMembers from './components/ProjectMembers';
import ProjectDocuments from './components/ProjectDocuments';
import ProjectActivity from './components/ProjectActivity';
import AddMaintainerModal from './components/AddMaintainerModal';
import { 
  UserPlusIcon, 
  Cog6ToothIcon, 
  EllipsisVerticalIcon,
  ArrowLeftIcon,
  FolderIcon,
  UserGroupIcon,
  DocumentIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
  TrashIcon,
  RocketLaunchIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');
const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector(state => state.auth);
  const { canManageProject } = usePermissions();
  
  const { project, isLoading, error, refreshProject } = useProjectDetail(projectId!);
  const [activeTab, setActiveTab] = useState('overview');
  const [isAddMaintainerModalOpen, setIsAddMaintainerModalOpen] = useState(false);

  useEffect(() => {
    if (projectId) {
      refreshProject();
    }
  }, [projectId, refreshProject]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">加载项目信息...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-6">{error || '项目不存在或您没有访问权限'}</p>
          <div className="flex space-x-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/projects')}>
              返回项目列表
            </Button>
            <Button onClick={() => refreshProject()}>重试</Button>
          </div>
        </Card>
      </div>
    );
  }

  const canManage = canManageProject(projectId!);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: '进行中', variant: 'success' as const },
      completed: { label: '已完成', variant: 'primary' as const },
      paused: { label: '已暂停', variant: 'warning' as const },
      archived: { label: '已归档', variant: 'secondary' as const },
      planning: { label: '规划中', variant: 'info' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return config ? <Badge variant={config.variant}>{config.label}</Badge> : null;
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

  const tabs = [
    { id: 'overview', label: '概览', icon: FolderIcon },
    { id: 'members', label: '成员', icon: UserGroupIcon },
    { id: 'documents', label: '文档', icon: DocumentIcon },
    { id: 'activity', label: '活动', icon: ClockIcon },
    ...(canManage ? [{ id: 'settings', label: '设置', icon: Cog6ToothIcon }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/projects')}
          className="p-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li>
                <Link to="/projects" className="text-gray-500 hover:text-gray-700">
                  项目管理
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li className="text-gray-900 font-medium">{project.name}</li>
            </ol>
          </nav>
        </div>
      </div>

      {/* 项目信息头部 */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <FolderIcon className="h-8 w-8 text-white" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                {getStatusBadge(project.status)}
                {getTypeBadge(project.type)}
              </div>
              
              {project.description && (
                <p className="text-gray-600 mb-3">{project.description}</p>
              )}
              
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <UserGroupIcon className="h-4 w-4" />
                  <span>{project.memberCount || 0} 名成员</span>
                </div>
                <div className="flex items-center space-x-1">
                  <DocumentIcon className="h-4 w-4" />
                  <span>{project.documentCount || 0} 个文档</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ClockIcon className="h-4 w-4" />
                  <span>
                    创建于 {dayjs(project.createdAt).fromNow()}
                  </span>
                </div>
              </div>

              {/* 项目进度 */}
              {project.progress !== undefined && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">项目进度</span>
                    <span className="font-medium text-gray-900">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button onClick={() => setIsAddMaintainerModalOpen(true)}>
              <UserPlusIcon className="h-4 w-4 mr-2" />
              添加成员
            </Button>
            
            <RequireProjectManage projectId={projectId!}>
              <Dropdown
                trigger={
                  <Button variant="outline" size="sm">
                    <EllipsisVerticalIcon className="h-4 w-4" />
                  </Button>
                }
                items={[
                  {
                    label: '项目设置',
                    icon: Cog6ToothIcon,
                    onClick: () => setActiveTab('settings'),
                  },
                  {
                    label: '部署项目',
                    icon: RocketLaunchIcon,
                    onClick: () => console.log('Deploy project'),
                    disabled: project.status !== 'active',
                  },
                  {
                    label: '归档项目',
                    icon: ArchiveBoxIcon,
                    onClick: () => console.log('Archive project'),
                    disabled: project.status === 'archived',
                  },
                  {
                    type: 'divider',
                  },
                  {
                    label: '删除项目',
                    icon: TrashIcon,
                    onClick: () => console.log('Delete project'),
                    className: 'text-red-600',
                  },
                ]}
              />
            </RequireProjectManage>
          </div>
        </div>
      </Card>

      {/* 标签页导航 */}
      <Card>
        <Tabs value={activeTab} onChange={setActiveTab} className="w-full">
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            <TabPanel value="overview" currentValue={activeTab}>
              <ProjectOverview project={project} />
            </TabPanel>
            
            <TabPanel value="members" currentValue={activeTab}>
              <ProjectMembers projectId={projectId!} />
            </TabPanel>
            
            <TabPanel value="documents" currentValue={activeTab}>
              <ProjectDocuments projectId={projectId!} />
            </TabPanel>
            
            <TabPanel value="activity" currentValue={activeTab}>
              <ProjectActivity projectId={projectId!} />
            </TabPanel>
            
            {canManage && (
              <TabPanel value="settings" currentValue={activeTab}>
                <ProjectSettings project={project} onUpdate={refreshProject} />
              </TabPanel>
            )}
          </div>
        </Tabs>
      </Card>

      {/* 添加成员模态框 */}
      <AddMaintainerModal
        isOpen={isAddMaintainerModalOpen}
        onClose={() => setIsAddMaintainerModalOpen(false)}
        projectId={projectId!}
        projectName={project.name}
        onSuccess={() => {
          setIsAddMaintainerModalOpen(false);
          refreshProject();
        }}
      />
    </div>
  );
};

// 项目概览组件
const ProjectOverview: React.FC<{ project: any }> = ({ project }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* 最近活动 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">最近活动</h3>
          <Card className="p-4">
            <div className="text-center py-8">
              <ClockIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-gray-500">暂无活动记录</p>
            </div>
          </Card>
        </div>

        {/* 文档统计 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">文档统计</h3>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{project.documentCount || 0}</div>
              <div className="text-sm text-gray-600">总文档数</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">本周更新</div>
            </Card>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* 项目信息 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">项目信息</h3>
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">所属团队</span>
                <span className="font-medium">{project.team?.name || '未分配'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">项目类型</span>
                <span className="font-medium">{project.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">可见性</span>
                <Badge variant={project.visibility === 'public' ? 'success' : 'secondary'} size="sm">
                  {project.visibility === 'public' ? '公开' : '私有'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">优先级</span>
                <Badge 
                  variant={
                    project.priority === 'high' ? 'danger' : 
                    project.priority === 'medium' ? 'warning' : 'secondary'
                  } 
                  size="sm"
                >
                  {project.priority === 'high' ? '高' : 
                   project.priority === 'medium' ? '中' : '低'}
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* 项目成员 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">项目成员</h3>
          <Card className="p-4">
            <div className="space-y-3">
              {project.maintainers?.slice(0, 3).map((maintainer: any, index: number) => (
                <div key={maintainer.id || index} className="flex items-center space-x-3">
                  <Avatar src={maintainer.avatar} alt={maintainer.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {maintainer.name}
                    </p>
                    <p className="text-xs text-gray-500">维护员</p>
                  </div>
                </div>
              )) || (
                <div className="text-center py-4">
                  <UserGroupIcon className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">暂无成员</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;