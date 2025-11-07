import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '@/components/ui';
import { 
  PlusIcon,
  FolderPlusIcon,
  UserGroupIcon,
  PresentationChartBarIcon,
  DocumentPlusIcon,
  CircleStackIcon,
  MapIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
  bgColor: string;
}

const QuickActions: React.FC = () => {
  const quickActions: QuickAction[] = [
    {
      id: 'create-project',
      label: '创建项目',
      description: '开始新的协作项目',
      icon: FolderPlusIcon,
      href: '/projects/create',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
    },
    {
      id: 'join-team',
      label: '加入团队',
      description: '通过邀请码加入团队',
      icon: UserGroupIcon,
      href: '/teams/join',
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100',
    },
    {
      id: 'architecture-design',
      label: '架构设计',
      description: '创建系统架构图',
      icon: Squares2X2Icon,
      href: '/design-tools/architecture',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
    },
    {
      id: 'api-design',
      label: 'API 设计',
      description: '设计和文档化API',
      icon: DocumentPlusIcon,
      href: '/design-tools/api-design',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
    },
    {
      id: 'database-design',
      label: '数据库设计',
      description: '设计数据库结构',
      icon: CircleStackIcon,
      href: '/design-tools/database-design',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100',
    },
    {
      id: 'feature-map',
      label: '功能导图',
      description: '梳理产品功能',
      icon: MapIcon,
      href: '/design-tools/feature-map',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50 hover:bg-pink-100',
    },
  ];

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">快捷操作</h3>
          <PlusIcon className="h-5 w-5 text-gray-400" />
        </div>

        <div className="grid grid-cols-1 gap-3">
          {quickActions.map((action) => (
            <Link 
              key={action.id}
              to={action.href}
              className={`group block p-4 rounded-lg border-2 border-gray-100 ${action.bgColor} transition-all duration-200 hover:border-gray-200`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                    {action.label}
                  </p>
                  <p className="text-xs text-gray-500 group-hover:text-gray-400">
                    {action.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            <Link to="/projects">
              <Button variant="outline" size="sm" fullWidth>
                我的项目
              </Button>
            </Link>
            <Link to="/teams">
              <Button variant="outline" size="sm" fullWidth>
                我的团队
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default QuickActions;