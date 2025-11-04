import React from 'react';
import { 
  DocumentIcon,
  FolderIcon,
  UserGroupIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  InboxIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/helpers';
import Button from './Button';

interface EmptyStateProps {
  type?: 'default' | 'search' | 'error' | 'maintenance' | 'no-data' | 'no-access';
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'default',
  title,
  description,
  icon,
  action,
  secondaryAction,
  children,
  className,
}) => {
  const getDefaultIcon = () => {
    switch (type) {
      case 'search':
        return <MagnifyingGlassIcon className="h-12 w-12 text-gray-400" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-12 w-12 text-red-400" />;
      case 'maintenance':
        return <CubeIcon className="h-12 w-12 text-yellow-400" />;
      case 'no-data':
        return <InboxIcon className="h-12 w-12 text-gray-400" />;
      case 'no-access':
        return <ExclamationTriangleIcon className="h-12 w-12 text-orange-400" />;
      default:
        return <DocumentIcon className="h-12 w-12 text-gray-400" />;
    }
  };

  const getIllustration = () => {
    if (type === 'maintenance') {
      return (
        <div className="relative">
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-yellow-100">
            <CubeIcon className="h-12 w-12 text-yellow-600" />
          </div>
          <div className="absolute -top-1 -right-1">
            <div className="h-6 w-6 rounded-full bg-yellow-500 flex items-center justify-center">
              <ExclamationTriangleIcon className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-gray-100">
        {icon || getDefaultIcon()}
      </div>
    );
  };

  const getColorScheme = () => {
    switch (type) {
      case 'error':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          titleColor: 'text-red-900',
        };
      case 'maintenance':
        return {
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          titleColor: 'text-yellow-900',
        };
      case 'no-access':
        return {
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          titleColor: 'text-orange-900',
        };
      default:
        return {
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          titleColor: 'text-gray-900',
        };
    }
  };

  const colorScheme = getColorScheme();

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center py-12 px-4',
      className
    )}>
      {/* 图标/插图 */}
      <div className="mb-6">
        {getIllustration()}
      </div>

      {/* 标题 */}
      <h3 className={cn(
        'text-lg font-semibold mb-2',
        colorScheme.titleColor
      )}>
        {title}
      </h3>

      {/* 描述 */}
      {description && (
        <p className="text-gray-600 mb-6 max-w-md text-sm leading-relaxed">
          {description}
        </p>
      )}

      {/* 自定义内容 */}
      {children && (
        <div className="mb-6">
          {children}
        </div>
      )}

      {/* 操作按钮 */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'primary'}
              icon={action.variant !== 'outline' ? <PlusIcon className="h-4 w-4" /> : undefined}
            >
              {action.label}
            </Button>
          )}
          
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// 预设的常用空状态组件
export const EmptyProjects: React.FC<{ onCreateProject?: () => void }> = ({ onCreateProject }) => (
  <EmptyState
    icon={<FolderIcon className="h-12 w-12 text-gray-400" />}
    title="暂无项目"
    description="创建您的第一个项目，开始管理您的服务和协作设计。"
    action={onCreateProject ? {
      label: '创建项目',
      onClick: onCreateProject,
    } : undefined}
  />
);

export const EmptyTeams: React.FC<{ onCreateTeam?: () => void }> = ({ onCreateTeam }) => (
  <EmptyState
    icon={<UserGroupIcon className="h-12 w-12 text-gray-400" />}
    title="暂无团队"
    description="创建团队来邀请成员协作，共同管理项目和设计工作。"
    action={onCreateTeam ? {
      label: '创建团队',
      onClick: onCreateTeam,
    } : undefined}
  />
);

export const EmptySearchResults: React.FC<{ query: string; onClearSearch?: () => void }> = ({ 
  query, 
  onClearSearch 
}) => (
  <EmptyState
    type="search"
    title="未找到搜索结果"
    description={`没有找到与 "${query}" 相关的内容，请尝试其他关键词。`}
    secondaryAction={onClearSearch ? {
      label: '清除搜索',
      onClick: onClearSearch,
    } : undefined}
  />
);

export const ErrorState: React.FC<{ error: string; onRetry?: () => void }> = ({ 
  error, 
  onRetry 
}) => (
  <EmptyState
    type="error"
    title="加载失败"
    description={error || '数据加载失败，请稍后重试。'}
    action={onRetry ? {
      label: '重新加载',
      onClick: onRetry,
      variant: 'outline',
    } : undefined}
  />
);

export const MaintenanceState: React.FC = () => (
  <EmptyState
    type="maintenance"
    title="系统维护中"
    description="系统正在进行维护升级，预计将在 30 分钟内恢复正常。感谢您的耐心等待。"
  />
);

export const NoAccessState: React.FC<{ onRequestAccess?: () => void }> = ({ onRequestAccess }) => (
  <EmptyState
    type="no-access"
    title="无访问权限"
    description="您没有权限访问此内容，请联系管理员获取相应权限。"
    action={onRequestAccess ? {
      label: '申请权限',
      onClick: onRequestAccess,
      variant: 'outline',
    } : undefined}
  />
);

export default EmptyState;