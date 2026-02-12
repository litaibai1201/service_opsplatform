import React from 'react';
import { Team } from '@/types/entities';
import TeamCard from './TeamCard';
import { EmptyState } from '@/components/ui';
import { UserGroupIcon } from '@heroicons/react/24/outline';

export interface TeamListProps {
  teams: Team[];
  loading?: boolean;
  onTeamClick?: (team: Team) => void;
  onTeamEdit?: (team: Team) => void;
  onTeamDelete?: (team: Team) => void;
  currentUserId?: string;
  viewMode?: 'grid' | 'list';
  className?: string;
}

const TeamList: React.FC<TeamListProps> = ({
  teams,
  loading = false,
  onTeamClick,
  onTeamEdit,
  onTeamDelete,
  currentUserId,
  viewMode = 'grid',
  className = '',
}) => {
  // 加载状态
  if (loading) {
    return (
      <div className={`${className}`}>
        <div
          className={`
          ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}
        `}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-8 bg-gray-200 rounded flex-1"></div>
                <div className="h-8 bg-gray-200 rounded flex-1"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 空状态
  if (!teams || teams.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          icon={<UserGroupIcon className="w-12 h-12" />}
          title="暂无团队"
          description="您还没有加入任何团队，创建一个团队开始协作吧"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        className={`
          ${
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        `}
      >
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            onClick={() => onTeamClick?.(team)}
            onEdit={() => onTeamEdit?.(team)}
            onDelete={() => onTeamDelete?.(team)}
            currentUserId={currentUserId}
            viewMode={viewMode}
          />
        ))}
      </div>
    </div>
  );
};

export default TeamList;
