import React, { useState } from 'react';
import { Card, Button, Input, Select, Badge, Avatar, Dropdown, Spinner } from '@/components/ui';
import { useTeamMembers } from '@/hooks/data/useTeams';
import { usePermissions } from '@/components/layout/PermissionGuard';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserPlusIcon,
  EllipsisVerticalIcon,
  ShieldCheckIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  UserMinusIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { TeamMember } from '@/types/entities';

interface TeamMembersProps {
  teamId: string;
}

const TeamMembers: React.FC<TeamMembersProps> = ({ teamId }) => {
  const { members, isLoading, error, updateMemberRole, removeMember, refreshMembers } = useTeamMembers(teamId);
  const { canManageTeam } = usePermissions();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const canManage = canManageTeam(teamId);

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await updateMemberRole(memberId, newRole as 'owner' | 'admin' | 'member');
      refreshMembers();
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  };

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

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      owner: { label: '所有者', variant: 'primary' as const },
      admin: { label: '管理员', variant: 'success' as const },
      member: { label: '成员', variant: 'secondary' as const },
    };
    
    const config = roleConfig[role as keyof typeof roleConfig];
    return config ? <Badge variant={config.variant} size="sm">{config.label}</Badge> : null;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: '活跃', variant: 'success' as const },
      pending: { label: '待激活', variant: 'warning' as const },
      inactive: { label: '未激活', variant: 'secondary' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return config ? <Badge variant={config.variant} size="xs">{config.label}</Badge> : null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">加载成员信息...</p>
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
        <Button onClick={refreshMembers}>重试</Button>
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
                placeholder="搜索成员名称或邮箱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
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
            
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-32"
            >
              <option value="all">所有状态</option>
              <option value="active">活跃</option>
              <option value="pending">待激活</option>
              <option value="inactive">未激活</option>
            </Select>
            
            <Button variant="outline" size="sm">
              <FunnelIcon className="h-4 w-4 mr-2" />
              筛选
            </Button>
          </div>
        </div>
      </Card>

      {/* 成员统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{members.length}</div>
          <div className="text-sm text-gray-600">总成员数</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {members.filter(m => m.status === 'active').length}
          </div>
          <div className="text-sm text-gray-600">活跃成员</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {members.filter(m => m.role === 'admin' || m.role === 'owner').length}
          </div>
          <div className="text-sm text-gray-600">管理人员</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {members.filter(m => m.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-600">待激活</div>
        </Card>
      </div>

      {/* 成员列表 */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              团队成员 ({filteredMembers.length})
            </h3>
            {canManage && (
              <Button size="sm">
                <UserPlusIcon className="h-4 w-4 mr-2" />
                邀请成员
              </Button>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredMembers.length === 0 ? (
            <div className="p-12 text-center">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
                  ? '没有找到匹配的成员' 
                  : '还没有成员'
                }
              </h3>
              <p className="text-gray-600">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                  ? '尝试调整搜索条件或筛选器'
                  : '邀请成员加入团队开始协作'
                }
              </p>
            </div>
          ) : (
            filteredMembers.map((member) => (
              <div key={member.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <Avatar
                      src={member.avatar}
                      alt={member.name}
                      size="lg"
                      className="flex-shrink-0"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-lg font-medium text-gray-900 truncate">
                          {member.name}
                        </h4>
                        {getRoleBadge(member.role)}
                        {getStatusBadge(member.status)}
                      </div>
                      
                      <div className="space-y-1">
                        {member.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <EnvelopeIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </div>
                        )}
                        
                        {member.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <PhoneIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center text-sm text-gray-500">
                          <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>
                            加入于 {formatDistanceToNow(new Date(member.joinedAt), { 
                              addSuffix: true, 
                              locale: zhCN 
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 操作菜单 */}
                  {canManage && member.role !== 'owner' && (
                    <Dropdown
                      trigger={
                        <Button variant="ghost" size="sm">
                          <EllipsisVerticalIcon className="h-4 w-4" />
                        </Button>
                      }
                      items={[
                        {
                          label: '设为管理员',
                          icon: ShieldCheckIcon,
                          onClick: () => handleRoleChange(member.id, 'admin'),
                          disabled: member.role === 'admin',
                        },
                        {
                          label: '设为成员',
                          icon: UserIcon,
                          onClick: () => handleRoleChange(member.id, 'member'),
                          disabled: member.role === 'member',
                        },
                        {
                          type: 'divider',
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
                          onClick: () => handleRemoveMember(member.id, member.name),
                          className: 'text-red-600',
                        },
                      ]}
                    />
                  )}
                  
                  {member.role === 'owner' && (
                    <Badge variant="primary" size="sm">
                      团队所有者
                    </Badge>
                  )}
                </div>

                {/* 成员详细信息 */}
                {member.bio && (
                  <div className="mt-3 ml-16">
                    <p className="text-sm text-gray-600">{member.bio}</p>
                  </div>
                )}

                {/* 成员活动信息 */}
                <div className="mt-3 ml-16 flex items-center space-x-6 text-xs text-gray-500">
                  <span>最后活动: {
                    member.lastActiveAt 
                      ? formatDistanceToNow(new Date(member.lastActiveAt), { 
                          addSuffix: true, 
                          locale: zhCN 
                        })
                      : '从未活动'
                  }</span>
                  {member.projectCount !== undefined && (
                    <span>参与项目: {member.projectCount} 个</span>
                  )}
                  {member.contributionScore !== undefined && (
                    <span>贡献度: {member.contributionScore}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default TeamMembers;