import React from 'react';
import { Button, Card } from '@/components/ui';
import {
  RocketLaunchIcon,
  CodeBracketIcon,
  ChartBarIcon,
  CubeIcon,
  DocumentTextIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  features: string[];
  popular?: boolean;
}

export interface ProjectTemplateProps {
  onSelectTemplate: (template: Template) => void;
  onSkip?: () => void;
  className?: string;
}

const templates: Template[] = [
  {
    id: 'blank',
    name: '空白项目',
    description: '从零开始，自由创建项目结构',
    icon: <DocumentTextIcon className="w-8 h-8" />,
    category: 'general',
    features: ['完全自定义', '灵活配置', '适合所有场景'],
  },
  {
    id: 'microservices',
    name: '微服务架构',
    description: '适合微服务系统的架构设计模板',
    icon: <CubeIcon className="w-8 h-8" />,
    category: 'architecture',
    features: ['服务拆分', 'API设计', '数据库设计', '部署配置'],
    popular: true,
  },
  {
    id: 'web-app',
    name: 'Web应用',
    description: '前后端分离的Web应用开发模板',
    icon: <CodeBracketIcon className="w-8 h-8" />,
    category: 'development',
    features: ['前端设计', '后端API', '数据库', '用户认证'],
    popular: true,
  },
  {
    id: 'data-platform',
    name: '数据平台',
    description: '数据处理和分析平台设计模板',
    icon: <ChartBarIcon className="w-8 h-8" />,
    category: 'data',
    features: ['数据流设计', 'ETL流程', '数据仓库', '可视化'],
  },
  {
    id: 'api-gateway',
    name: 'API网关',
    description: 'API网关和服务治理设计模板',
    icon: <RocketLaunchIcon className="w-8 h-8" />,
    category: 'architecture',
    features: ['路由配置', '限流熔断', '鉴权', '监控'],
  },
  {
    id: 'innovation',
    name: '创新项目',
    description: '适合快速原型和创新项目',
    icon: <LightBulbIcon className="w-8 h-8" />,
    category: 'general',
    features: ['快速迭代', '敏捷开发', 'MVP设计'],
  },
];

const ProjectTemplate: React.FC<ProjectTemplateProps> = ({
  onSelectTemplate,
  onSkip,
  className = '',
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* 标题 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          选择项目模板
        </h2>
        <p className="text-gray-600">
          使用预设模板快速开始，或创建空白项目自由配置
        </p>
      </div>

      {/* 模板网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="relative group hover:shadow-lg transition-all duration-200 cursor-pointer"
            onClick={() => onSelectTemplate(template)}
          >
            {/* 热门标签 */}
            {template.popular && (
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                热门
              </div>
            )}

            <div className="p-6">
              {/* 图标 */}
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-lg text-blue-600 mb-4 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                {template.icon}
              </div>

              {/* 名称和描述 */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {template.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>

              {/* 特性列表 */}
              <ul className="space-y-1 mb-4">
                {template.features.map((feature, index) => (
                  <li
                    key={index}
                    className="text-xs text-gray-500 flex items-center gap-2"
                  >
                    <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* 选择按钮 */}
              <Button
                variant="outline"
                size="sm"
                className="w-full group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500"
              >
                使用此模板
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* 跳过按钮 */}
      {onSkip && (
        <div className="text-center pt-4">
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            跳过，稍后选择
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectTemplate;
