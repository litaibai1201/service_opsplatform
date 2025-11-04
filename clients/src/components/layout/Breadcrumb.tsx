import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/helpers';
import { useAppSelector } from '@/store';

interface BreadcrumbItem {
  name: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  const location = useLocation();
  const { breadcrumbs } = useAppSelector(state => state.ui);

  // 如果没有传入 items，则根据当前路径生成面包屑
  const breadcrumbItems = items || breadcrumbs || generateBreadcrumbs(location.pathname);

  return (
    <nav className={cn('flex py-3', className)} aria-label="面包屑导航">
      <ol className="flex items-center space-x-2">
        {/* 首页链接 */}
        <li>
          <Link
            to="/dashboard"
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <HomeIcon className="h-4 w-4" />
            <span className="sr-only">首页</span>
          </Link>
        </li>

        {/* 面包屑项目 */}
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-2" />
            {item.href && !item.current ? (
              <Link
                to={item.href}
                className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                {item.name}
              </Link>
            ) : (
              <span
                className={cn(
                  'text-sm font-medium',
                  item.current ? 'text-gray-900' : 'text-gray-500'
                )}
                aria-current={item.current ? 'page' : undefined}
              >
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

// 根据路径生成面包屑导航
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const pathSegments = pathname.split('/').filter(segment => segment !== '');
  const breadcrumbs: BreadcrumbItem[] = [];

  let currentPath = '';

  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    currentPath += `/${segment}`;
    
    const isLast = i === pathSegments.length - 1;
    const name = getSegmentName(segment, pathSegments, i);

    if (name) {
      breadcrumbs.push({
        name,
        href: isLast ? undefined : currentPath,
        current: isLast,
      });
    }
  }

  return breadcrumbs;
}

// 将路径段转换为可读的名称
function getSegmentName(segment: string, pathSegments: string[], index: number): string {
  const segmentMap: Record<string, string> = {
    dashboard: '仪表板',
    teams: '团队管理',
    projects: '项目管理',
    'design-tools': '设计工具',
    architecture: '架构设计',
    'flow-diagram': '流程图设计',
    'api-design': 'API 设计',
    'database-design': '数据库设计',
    'feature-map': '功能导图',
    collaboration: '协作功能',
    settings: '系统设置',
    profile: '个人资料',
    help: '帮助支持',
    admin: '管理员功能',
    users: '用户管理',
    audit: '审计日志',
    // 动态路径
    create: '创建',
    edit: '编辑',
    view: '查看',
    members: '成员',
    invitations: '邀请',
    permissions: '权限',
  };

  // 如果是已知的段，直接返回映射名称
  if (segmentMap[segment]) {
    return segmentMap[segment];
  }

  // 如果是 UUID 格式，可能是资源 ID，尝试获取资源名称
  if (isUUID(segment)) {
    // 这里可以根据前一个路径段来确定资源类型
    const previousSegment = pathSegments[index - 1];
    if (previousSegment === 'teams') {
      // 这里可以通过 API 获取团队名称，暂时返回简化名称
      return '团队详情';
    } else if (previousSegment === 'projects') {
      return '项目详情';
    } else {
      return '详情';
    }
  }

  // 如果是数字，可能是分页或 ID
  if (/^\d+$/.test(segment)) {
    const previousSegment = pathSegments[index - 1];
    if (previousSegment === 'page') {
      return `第 ${segment} 页`;
    }
    return segment;
  }

  // 将 kebab-case 转换为标题格式
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// 检查字符串是否为 UUID 格式
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export default Breadcrumb;