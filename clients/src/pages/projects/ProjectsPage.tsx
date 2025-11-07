import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { Card, Button, Input, Select, Badge, Spinner } from '@/components/ui';
import { useProjects } from '@/hooks/data/useProjects';
import ProjectCard from './components/ProjectCard';
import CreateProjectModal from './components/CreateProjectModal';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  FolderIcon,
  AdjustmentsHorizontalIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';
import { Project } from '@/types/entities';

const ProjectsPage: React.FC = () => {
  const { user } = useAppSelector(state => state.auth);
  const { projects, isLoading, error, refreshProjects } = useProjects();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // 过滤项目
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesType = typeFilter === 'all' || project.type === typeFilter;
    const matchesTeam = teamFilter === 'all' || project.teamId === teamFilter;
    
    return matchesSearch && matchesStatus && matchesType && matchesTeam;
  });

  // 获取项目统计
  const getProjectStats = () => {
    const total = projects.length;
    const active = projects.filter(p => p.status === 'active').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const myProjects = projects.filter(p => p.createdBy === user?.id).length;
    
    return { total, active, completed, myProjects };
  };

  const stats = getProjectStats();

  if (isLoading && projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">加载项目数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">项目管理</h1>
          <p className="text-gray-600">管理您的项目和协作内容</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
            设置
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            新建项目
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">总项目数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FolderIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">进行中</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <RocketLaunchIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">已完成</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FolderIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">我创建的</p>
              <p className="text-2xl font-bold text-gray-900">{stats.myProjects}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <FolderIcon className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card className="p-6">
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
              <option value="completed">已完成</option>
              <option value="paused">已暂停</option>
              <option value="archived">已归档</option>
              <option value="planning">规划中</option>
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
          </div>
        </div>
      </Card>

      {/* 项目列表 */}
      {error && (
        <Card className="p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={refreshProjects}>重试</Button>
        </Card>
      )}

      {filteredProjects.length === 0 && !isLoading ? (
        <Card className="p-12 text-center">
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
              : '创建您的第一个项目开始工作'
            }
          </p>
          {(!searchTerm && statusFilter === 'all' && typeFilter === 'all') && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              新建项目
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              currentUserId={user?.id || ''}
            />
          ))}
        </div>
      )}

      {/* 分页 */}
      {filteredProjects.length > 12 && (
        <div className="flex justify-center">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>
              上一页
            </Button>
            <span className="px-3 py-1 text-sm text-gray-600">
              第 1 页，共 1 页
            </span>
            <Button variant="outline" size="sm" disabled>
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* 创建项目模态框 */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          refreshProjects();
        }}
      />
    </div>
  );
};

export default ProjectsPage;