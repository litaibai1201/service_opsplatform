import React from 'react';
import { Project } from '@/types/entities';
import ProjectCard from './ProjectCard';
import { EmptyState } from '@/components/ui';
import { FolderIcon } from '@heroicons/react/24/outline';

export interface ProjectListProps {
  projects: Project[];
  loading?: boolean;
  onProjectClick?: (project: Project) => void;
  onProjectEdit?: (project: Project) => void;
  onProjectDelete?: (project: Project) => void;
  currentUserId?: string;
  viewMode?: 'grid' | 'list';
  showTeamName?: boolean;
  className?: string;
}

const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  loading = false,
  onProjectClick,
  onProjectEdit,
  onProjectDelete,
  currentUserId,
  viewMode = 'grid',
  showTeamName = false,
  className = '',
}) => {
  // 加载状态
  if (loading) {
    return (
      <div className={className}>
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
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
              <div className="flex items-center gap-4 pt-4 border-t">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 空状态
  if (!projects || projects.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          icon={<FolderIcon className="w-12 h-12" />}
          title="暂无项目"
          description="还没有项目，创建一个项目开始吧"
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
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => onProjectClick?.(project)}
            onEdit={() => onProjectEdit?.(project)}
            onDelete={() => onProjectDelete?.(project)}
            currentUserId={currentUserId}
            viewMode={viewMode}
            showTeamName={showTeamName}
          />
        ))}
      </div>
    </div>
  );
};

export default ProjectList;
