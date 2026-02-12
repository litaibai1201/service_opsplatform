import React from 'react';
import { TeamMember } from '@/types/entities';
import { Avatar, Badge, Dropdown } from '@/components/ui';
import {
  EllipsisVerticalIcon,
  EnvelopeIcon,
  UserMinusIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

export interface MemberCardProps {
  member: TeamMember;
  currentUserId?: string;
  onClick?: () => void;
  onRoleChange?: (newRole: string) => void;
  onRemove?: () => void;
  showActions?: boolean;
  viewMode?: 'grid' | 'list';
  className?: string;
}

const roleLabels: Record<string, string> = {
  owner: '所有者',
  admin: '管理员',
  member: '成员',
};

const roleBadgeColors: Record<string, 'primary' | 'success' | 'default'> = {
  owner: 'primary',
  admin: 'success',
  member: 'default',
};

const MemberCard: React.FC<MemberCardProps> = ({
  member,
  currentUserId,
  onClick,
  onRoleChange,
  onRemove,
  showActions = true,
  viewMode = 'list',
  className = '',
}) => {
  const isCurrentUser = member.userId === currentUserId;
  const canManage = showActions && !isCurrentUser;

  const menuItems = [
    {
      label: '更改角色',
      icon: <ShieldCheckIcon className="w-4 h-4" />,
      onClick: () => {}, // 打开角色选择器
      disabled: member.role === 'owner',
    },
    {
      label: '发送消息',
      icon: <EnvelopeIcon className="w-4 h-4" />,
      onClick: () => {},
    },
    {
      label: '移除成员',
      icon: <UserMinusIcon className="w-4 h-4" />,
      onClick: onRemove,
      disabled: member.role === 'owner',
      danger: true,
    },
  ];

  return (
    <div
      className={`
        bg-white rounded-lg border border-gray-200 hover:border-gray-300
        transition-all duration-200 ${className}
        ${viewMode === 'grid' ? 'p-4' : 'p-3 flex items-center gap-4'}
      `}
    >
      {/* 头像和基本信息 */}
      <div
        className={`flex items-center gap-3 ${viewMode === 'grid' ? 'mb-3' : 'flex-1'}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
      >
        <Avatar src={member.user?.avatar} alt={member.user?.username} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 truncate">
              {member.user?.username}
              {isCurrentUser && (
                <span className="ml-1 text-xs text-gray-500">(你)</span>
              )}
            </h4>
          </div>
          <p className="text-sm text-gray-500 truncate">{member.user?.email}</p>
        </div>
      </div>

      {/* 角色和操作 */}
      <div
        className={`flex items-center ${viewMode === 'grid' ? 'justify-between' : 'gap-3'}`}
      >
        <Badge variant={roleBadgeColors[member.role] || 'default'}>
          {roleLabels[member.role] || member.role}
        </Badge>

        {canManage && (
          <Dropdown items={menuItems} placement="bottom-end">
            <button className="p-1 hover:bg-gray-100 rounded">
              <EllipsisVerticalIcon className="w-5 h-5 text-gray-400" />
            </button>
          </Dropdown>
        )}
      </div>

      {/* 加入时间 */}
      {viewMode === 'grid' && member.joinedAt && (
        <p className="text-xs text-gray-400 mt-2">
          加入于 {new Date(member.joinedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};

export default MemberCard;
