import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { Card, Button, Input, Select, Badge, Spinner } from '@/components/ui';
import { useTeams } from '@/hooks/data/useTeams';
import TeamCard from './components/TeamCard';
import CreateTeamModal from './components/CreateTeamModal';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  UserGroupIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { Team, TeamRole } from '@/types/entities';

const TeamsPage: React.FC = () => {
  const { user } = useAppSelector(state => state.auth);
  const { teams, isLoading, error, refreshTeams } = useTeams();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  useEffect(() => {
    refreshTeams();
  }, [refreshTeams]);

  // 过滤团队
  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || team.status === statusFilter;
    
    const matchesRole = roleFilter === 'all' || 
                       team.members?.some(member => 
                         member.userId === user?.id && member.role === roleFilter
                       );
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  if (isLoading && teams.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">加载团队数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">团队管理</h1>
          <p className="text-gray-600">管理您参与的团队和成员</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
            设置
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            创建团队
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">总团队数</p>
              <p className="text-2xl font-bold text-gray-900">{teams.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">我管理的</p>
              <p className="text-2xl font-bold text-gray-900">
                {teams.filter(team => 
                  team.members?.some(member => 
                    member.userId === user?.id && 
                    (member.role === 'owner' || member.role === 'admin')
                  )
                ).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">活跃团队</p>
              <p className="text-2xl font-bold text-gray-900">
                {teams.filter(team => team.status === 'active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">总成员数</p>
              <p className="text-2xl font-bold text-gray-900">
                {teams.reduce((total, team) => total + (team.memberCount || 0), 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="h-6 w-6 text-orange-600" />
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
                placeholder="搜索团队名称或描述..."
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
              <option value="active">活跃</option>
              <option value="archived">已归档</option>
              <option value="pending">待处理</option>
            </Select>
            
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-32"
            >
              <option value="all">所有角色</option>
              <option value="owner">所有者</option>
              <option value="admin">管理员</option>
              <option value="member">成员</option>
            </Select>
            
            <Button variant="outline" size="sm">
              <FunnelIcon className="h-4 w-4 mr-2" />
              筛选
            </Button>
          </div>
        </div>
      </Card>

      {/* 团队列表 */}
      {error && (
        <Card className="p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={refreshTeams}>重试</Button>
        </Card>
      )}

      {filteredTeams.length === 0 && !isLoading ? (
        <Card className="p-12 text-center">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || statusFilter !== 'all' || roleFilter !== 'all' 
              ? '没有找到匹配的团队' 
              : '还没有团队'
            }
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
              ? '尝试调整搜索条件或筛选器'
              : '创建您的第一个团队开始协作'
            }
          </p>
          {(!searchTerm && statusFilter === 'all' && roleFilter === 'all') && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              创建团队
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <TeamCard 
              key={team.id} 
              team={team} 
              currentUserId={user?.id || ''}
            />
          ))}
        </div>
      )}

      {/* 分页 */}
      {filteredTeams.length > 12 && (
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

      {/* 创建团队模态框 */}
      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          refreshTeams();
        }}
      />
    </div>
  );
};

export default TeamsPage;