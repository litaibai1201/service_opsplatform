import React from 'react';
import { TeamMember } from '@/types/entities';
import MemberCard from './MemberCard';
import { EmptyState } from '@/components/ui';
import { UserIcon } from '@heroicons/react/24/outline';

export interface MemberListProps {
  members: TeamMember[];
  loading?: boolean;
  currentUserId?: string;
  onMemberClick?: (member: TeamMember) => void;
  onRoleChange?: (member: TeamMember, newRole: string) => void;
  onRemove?: (member: TeamMember) => void;
  showActions?: boolean;
  viewMode?: 'grid' | 'list';
  className?: string;
}

const MemberList: React.FC<MemberListProps> = ({
  members,
  loading = false,
  currentUserId,
  onMemberClick,
  onRoleChange,
  onRemove,
  showActions = true,
  viewMode = 'list',
  className = '',
}) => {
  if (loading) {
    return (
      <div className={className}>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 bg-white rounded-lg border animate-pulse"
            >
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="h-8 w-24 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          icon={<UserIcon className="w-12 h-12" />}
          title="暂无成员"
          description="团队中还没有成员"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        className={`
          ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}
        `}
      >
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            currentUserId={currentUserId}
            onClick={() => onMemberClick?.(member)}
            onRoleChange={(newRole) => onRoleChange?.(member, newRole)}
            onRemove={() => onRemove?.(member)}
            showActions={showActions}
            viewMode={viewMode}
          />
        ))}
      </div>
    </div>
  );
};

export default MemberList;
