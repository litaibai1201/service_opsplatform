import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge, Avatar, Button, Dropdown } from '@/components/ui';
import { 
  UserGroupIcon, 
  FolderIcon, 
  CalendarIcon,
  EllipsisVerticalIcon,
  Cog6ToothIcon,
  UserPlusIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Team, TeamMember } from '@/types/entities';

interface TeamCardProps {
  team: Team;
  currentUserId: string;
  onInvite?: (teamId: string) => void;
  onSettings?: (teamId: string) => void;
}

const TeamCard: React.FC<TeamCardProps> = ({ 
  team, 
  currentUserId, 
  onInvite, 
  onSettings 
}) => {
  const currentUserMember = team.members?.find(member => member.userId === currentUserId);
  const isManager = currentUserMember && (
    currentUserMember.role === 'owner' || 
    currentUserMember.role === 'admin'
  );

  const getStatusBadge = () => {
    const statusConfig = {
      active: { label: '活跃', variant: 'success' as const },
      archived: { label: '已归档', variant: 'secondary' as const },
      pending: { label: '待处理', variant: 'warning' as const },
    };
    
    const config = statusConfig[team.status as keyof typeof statusConfig];
    return config ? <Badge variant={config.variant} size="sm">{config.label}</Badge> : null;
  };

  const getRoleBadge = () => {
    if (!currentUserMember) return null;
    
    const roleConfig = {
      owner: { label: '所有者', variant: 'primary' as const },
      admin: { label: '管理员', variant: 'success' as const },
      member: { label: '成员', variant: 'secondary' as const },
    };
    
    const config = roleConfig[currentUserMember.role as keyof typeof roleConfig];
    return config ? <Badge variant={config.variant} size="xs">{config.label}</Badge> : null;
  };

  const getVisibilityIcon = () => {
    switch (team.visibility) {
      case 'public':
        return <div className="w-2 h-2 bg-green-500 rounded-full" title="公开团队" />;
      case 'internal':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" title="内部团队" />;
      case 'private':
        return <div className="w-2 h-2 bg-gray-500 rounded-full" title="私有团队" />;
      default:
        return null;
    }
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          {/* 团队图标 */}
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <UserGroupIcon className="h-6 w-6 text-white" />
          </div>
          
          {/* 团队信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Link 
                to={`/teams/${team.id}`}
                className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate"
              >
                {team.name}
              </Link>
              {getVisibilityIcon()}
            </div>
            
            <div className="flex items-center space-x-2 mb-2">
              {getStatusBadge()}
              {getRoleBadge()}
            </div>
            
            {team.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {team.description}
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
              href: `/teams/${team.id}`,
            },
            {
              label: '邀请成员',
              icon: UserPlusIcon,
              onClick: () => onInvite?.(team.id),
            },
            ...(isManager ? [
              {
                type: 'divider' as const,
              },
              {
                label: '团队设置',
                icon: Cog6ToothIcon,
                onClick: () => onSettings?.(team.id),
              },
            ] : []),
            {
              type: 'divider' as const,
            },
            {
              label: '在新窗口打开',
              icon: ArrowTopRightOnSquareIcon,
              onClick: () => window.open(`/teams/${team.id}`, '_blank'),
            },
          ]}
        />
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-sm text-gray-500 mb-1">
            <UserGroupIcon className="h-4 w-4" />
            <span>成员</span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {team.memberCount || 0}
          </div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-sm text-gray-500 mb-1">
            <FolderIcon className="h-4 w-4" />
            <span>项目</span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {team.projectCount || 0}
          </div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-sm text-gray-500 mb-1">
            <CalendarIcon className="h-4 w-4" />
            <span>活跃度</span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {team.activityScore || 0}
          </div>
        </div>
      </div>

      {/* 成员头像列表 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-2">
            {team.members?.slice(0, 4).map((member, index) => (
              <Avatar
                key={member.id}
                src={member.avatar}
                alt={member.name}
                size="sm"
                className="border-2 border-white"
                title={member.name}
              />
            ))}
            {(team.memberCount || 0) > 4 && (
              <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  +{(team.memberCount || 0) - 4}
                </span>
              </div>
            )}
          </div>
          
          {team.members && team.members.length > 0 && (
            <span className="text-xs text-gray-500">
              {team.members.slice(0, 2).map(m => m.name).join(', ')}
              {team.members.length > 2 && ` 等 ${team.members.length} 人`}
            </span>
          )}
        </div>

        {/* 最后活动时间 */}
        <span className="text-xs text-gray-500">
          {team.lastActivityAt 
            ? formatDistanceToNow(new Date(team.lastActivityAt), { 
                addSuffix: true, 
                locale: zhCN 
              })
            : '暂无活动'
          }
        </span>
      </div>

      {/* 快捷操作按钮 */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex space-x-2">
        <Link to={`/teams/${team.id}`} className="flex-1">
          <Button variant="outline" size="sm" fullWidth>
            <EyeIcon className="h-4 w-4 mr-2" />
            查看详情
          </Button>
        </Link>
        
        {isManager && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onSettings?.(team.id)}
          >
            <Cog6ToothIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
};

export default TeamCard;