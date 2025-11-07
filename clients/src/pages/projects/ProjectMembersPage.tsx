import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { Card, Button, Input, Select, Badge, Avatar, Dropdown, Spinner } from '@/components/ui';
import { useProjectMembers } from '@/hooks/data/useProjects';
import { usePermissions } from '@/components/layout/PermissionGuard';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserPlusIcon,
  EllipsisVerticalIcon,
  ShieldCheckIcon,
  UserIcon,
  EnvelopeIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  UserMinusIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ProjectMaintainer } from '@/types/entities';

interface MemberQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'assignedAt' | 'lastActivity';
  sortOrder?: 'asc' | 'desc';
}

const ProjectMembersPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector(state => state.auth);
  const { canManageProject } = usePermissions();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('assignedAt');
  const [sortOrder, setSortOrder] = useState<string>('desc');

  const params: MemberQueryParams = {
    search: searchTerm || undefined,
    sortBy: sortBy as any,
    sortOrder: sortOrder as any,
  };

  const { members, isLoading, error, refreshMembers, removeMember } = useProjectMembers(projectId!, params);

  const canManage = canManageProject(projectId!);

  const filteredMembers = members.filter(member => {
    if (!searchTerm) return true;
    return member.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           member.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (window.confirm(`确定要移除成员 ${memberName} 吗？`)) {
      try {
        await removeMember(memberId);
        refreshMembers();
      } catch (error) {
        console.error('Failed to remove member:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">加载成员信息...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={refreshMembers}>重试</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/projects/${projectId}`)}
          className="p-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">项目成员</h1>
          <p className="text-gray-600">管理项目的维护员和贡献者</p>
        </div>
        {canManage && (
          <Button>
            <UserPlusIcon className="h-4 w-4 mr-2" />
            添加成员
          </Button>
        )}
      </div>

      {/* 成员统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 text-center">
          <div className="text-2xl font-bold text-blue-600">{members.length}</div>
          <div className="text-sm text-gray-600">总成员数</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-2xl font-bold text-green-600">
            {members.filter(m => m.user?.status === 'active').length}
          </div>
          <div className="text-sm text-gray-600">活跃成员</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {members.filter(m => m.assignedBy === user?.id).length}
          </div>
          <div className="text-sm text-gray-600">我添加的</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {members.filter(m => {
              const assignedDate = new Date(m.assignedAt);
              const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              return assignedDate >= weekAgo;
            }).length}
          </div>
          <div className="text-sm text-gray-600">本周新增</div>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 w-full">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="搜索成员名称或邮箱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-32"
            >
              <option value="assignedAt">加入时间</option>
              <option value="name">姓名</option>
              <option value="lastActivity">最后活动</option>
            </Select>
            
            <Select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-32"
            >
              <option value="desc">降序</option>
              <option value="asc">升序</option>
            </Select>
            
            <Button variant="outline" size="sm">
              <FunnelIcon className="h-4 w-4 mr-2" />
              筛选
            </Button>
          </div>
        </div>
      </Card>

      {/* 成员列表 */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            项目成员 ({filteredMembers.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredMembers.length === 0 ? (
            <div className="p-12 text-center">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? '没有找到匹配的成员' : '还没有成员'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? '尝试调整搜索条件'
                  : '添加项目成员开始协作'
                }
              </p>
              {!searchTerm && canManage && (
                <Button>
                  <UserPlusIcon className="h-4 w-4 mr-2" />
                  添加成员
                </Button>
              )}
            </div>
          ) : (
            filteredMembers.map((member) => (
              <div key={member.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <Avatar
                      src={member.user?.avatarUrl}
                      alt={member.user?.displayName}
                      size="lg"
                      className="flex-shrink-0"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-lg font-medium text-gray-900 truncate">
                          {member.user?.displayName || member.user?.username}
                        </h4>
                        <Badge variant="secondary" size="sm">
                          维护员
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        {member.user?.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <EnvelopeIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{member.user.email}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center text-sm text-gray-500">
                          <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>
                            加入于 {formatDistanceToNow(new Date(member.assignedAt), { 
                              addSuffix: true, 
                              locale: zhCN 
                            })}
                          </span>
                        </div>
                        
                        {member.user?.lastLoginAt && (
                          <div className="flex items-center text-sm text-gray-500">
                            <UserIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>
                              最后活动: {formatDistanceToNow(new Date(member.user.lastLoginAt), { 
                                addSuffix: true, 
                                locale: zhCN 
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 操作菜单 */}
                  {canManage && member.user?.id !== user?.id && (
                    <Dropdown
                      trigger={
                        <Button variant="ghost" size="sm">
                          <EllipsisVerticalIcon className="h-4 w-4" />
                        </Button>
                      }
                      items={[
                        {
                          label: '查看详情',
                          icon: UserIcon,
                          onClick: () => console.log('View member details', member.id),
                        },
                        {
                          label: '成员设置',
                          icon: Cog6ToothIcon,
                          onClick: () => console.log('Member settings', member.id),
                        },
                        {
                          type: 'divider',
                        },
                        {
                          label: '移除成员',
                          icon: UserMinusIcon,
                          onClick: () => handleRemoveMember(
                            member.id, 
                            member.user?.displayName || member.user?.username || '未知用户'
                          ),
                          className: 'text-red-600',
                        },
                      ]}
                    />
                  )}
                  
                  {member.user?.id === user?.id && (
                    <Badge variant="primary" size="sm">
                      当前用户
                    </Badge>
                  )}
                </div>

                {/* 成员贡献信息 */}
                <div className="mt-3 ml-16 flex items-center space-x-6 text-xs text-gray-500">
                  <span>文档贡献: 0</span>
                  <span>评论数: 0</span>
                  <span>活跃度: 中等</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* 分页控制 */}
      {filteredMembers.length > 10 && (
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
    </div>
  );
};

export default ProjectMembersPage;