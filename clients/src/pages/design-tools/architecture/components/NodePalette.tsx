import React, { useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { 
  ServerIcon,
  CircleStackIcon,
  CloudIcon,
  ComputerDesktopIcon,
  CogIcon,
  QueueListIcon,
  BoltIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  DocumentIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface NodeType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: string;
  defaultSize: { width: number; height: number };
  properties: Record<string, any>;
}

interface NodePaletteProps {
  onAddNode: (nodeType: string, position: { x: number; y: number }) => void;
}

const nodeTypes: NodeType[] = [
  // 基础设施
  {
    id: 'server',
    name: '服务器',
    description: '物理或虚拟服务器实例',
    icon: ServerIcon,
    category: 'infrastructure',
    defaultSize: { width: 120, height: 80 },
    properties: {
      cpu: 4,
      memory: '8GB',
      storage: '100GB',
      os: 'Linux'
    }
  },
  {
    id: 'database',
    name: '数据库',
    description: '数据存储和管理系统',
    icon: CircleStackIcon,
    category: 'infrastructure',
    defaultSize: { width: 120, height: 80 },
    properties: {
      type: 'PostgreSQL',
      version: '13.0',
      storage: '1TB',
      replicas: 2
    }
  },
  {
    id: 'cache',
    name: '缓存',
    description: '数据缓存系统',
    icon: BoltIcon,
    category: 'infrastructure',
    defaultSize: { width: 100, height: 60 },
    properties: {
      type: 'Redis',
      memory: '4GB',
      persistence: true
    }
  },
  {
    id: 'queue',
    name: '消息队列',
    description: '异步消息处理系统',
    icon: QueueListIcon,
    category: 'infrastructure',
    defaultSize: { width: 120, height: 80 },
    properties: {
      type: 'RabbitMQ',
      maxMessages: 10000,
      durability: true
    }
  },

  // 应用服务
  {
    id: 'api',
    name: 'API 服务',
    description: 'RESTful API 或 GraphQL 服务',
    icon: CloudIcon,
    category: 'application',
    defaultSize: { width: 120, height: 80 },
    properties: {
      framework: 'Node.js',
      port: 3000,
      protocol: 'HTTP/HTTPS'
    }
  },
  {
    id: 'service',
    name: '微服务',
    description: '独立部署的应用服务',
    icon: CogIcon,
    category: 'application',
    defaultSize: { width: 120, height: 80 },
    properties: {
      language: 'Java',
      framework: 'Spring Boot',
      port: 8080
    }
  },
  {
    id: 'client',
    name: '客户端',
    description: 'Web、移动或桌面客户端',
    icon: ComputerDesktopIcon,
    category: 'application',
    defaultSize: { width: 120, height: 80 },
    properties: {
      type: 'Web',
      framework: 'React',
      platform: 'Browser'
    }
  },

  // 网络组件
  {
    id: 'loadbalancer',
    name: '负载均衡器',
    description: '流量分发和负载均衡',
    icon: GlobeAltIcon,
    category: 'network',
    defaultSize: { width: 140, height: 80 },
    properties: {
      type: 'Nginx',
      algorithm: 'Round Robin',
      maxConnections: 1000
    }
  },
  {
    id: 'gateway',
    name: 'API 网关',
    description: 'API 请求路由和管理',
    icon: ShieldCheckIcon,
    category: 'network',
    defaultSize: { width: 140, height: 80 },
    properties: {
      type: 'Kong',
      authentication: true,
      rateLimit: 1000
    }
  },

  // 存储组件
  {
    id: 'storage',
    name: '对象存储',
    description: '文件和对象存储服务',
    icon: DocumentIcon,
    category: 'storage',
    defaultSize: { width: 120, height: 80 },
    properties: {
      type: 'S3',
      capacity: '10TB',
      redundancy: 'Multi-AZ'
    }
  }
];

const categories = [
  { id: 'all', name: '全部', icon: null },
  { id: 'infrastructure', name: '基础设施', icon: ServerIcon },
  { id: 'application', name: '应用服务', icon: CogIcon },
  { id: 'network', name: '网络组件', icon: GlobeAltIcon },
  { id: 'storage', name: '存储组件', icon: DocumentIcon }
];

const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [draggedNode, setDraggedNode] = useState<NodeType | null>(null);

  // 过滤节点类型
  const filteredNodes = nodeTypes.filter(node => {
    const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         node.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || node.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 处理拖拽开始
  const handleDragStart = (e: React.DragEvent, nodeType: NodeType) => {
    setDraggedNode(nodeType);
    e.dataTransfer.setData('application/json', JSON.stringify(nodeType));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // 处理拖拽结束
  const handleDragEnd = () => {
    setDraggedNode(null);
  };

  // 处理双击添加节点
  const handleDoubleClick = (nodeType: NodeType) => {
    // 在画布中心添加节点
    const centerPosition = { x: 400, y: 300 };
    onAddNode(nodeType.id, centerPosition);
  };

  // 渲染节点卡片
  const renderNodeCard = (nodeType: NodeType) => {
    const Icon = nodeType.icon;
    
    return (
      <div
        key={nodeType.id}
        className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-300 ${
          draggedNode?.id === nodeType.id ? 'opacity-50' : ''
        }`}
        draggable
        onDragStart={(e) => handleDragStart(e, nodeType)}
        onDragEnd={handleDragEnd}
        onDoubleClick={() => handleDoubleClick(nodeType)}
        title="拖拽到画布或双击添加"
      >
        <div className="flex items-center space-x-2 mb-2">
          <Icon className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-sm">{nodeType.name}</span>
        </div>
        <p className="text-xs text-gray-600 line-clamp-2">
          {nodeType.description}
        </p>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* 标题 */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-900">组件面板</h3>
        <p className="text-xs text-gray-500 mt-1">拖拽组件到画布或双击添加</p>
      </div>

      {/* 搜索框 */}
      <div className="p-4 border-b">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="搜索组件..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            size="sm"
          />
        </div>
      </div>

      {/* 分类过滤 */}
      <div className="p-4 border-b">
        <div className="space-y-1">
          {categories.map(category => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span>{category.name}</span>
                <span className="ml-auto text-xs text-gray-400">
                  {category.id === 'all' 
                    ? nodeTypes.length 
                    : nodeTypes.filter(n => n.category === category.id).length
                  }
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 组件列表 */}
      <div className="flex-1 p-4 overflow-y-auto">
        {filteredNodes.length > 0 ? (
          <div className="space-y-3">
            {filteredNodes.map(renderNodeCard)}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <ServerIcon className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-sm text-gray-500">未找到匹配的组件</p>
            <p className="text-xs text-gray-400 mt-1">尝试调整搜索条件</p>
          </div>
        )}
      </div>

      {/* 使用提示 */}
      <div className="p-4 border-t bg-gray-50">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>拖拽组件到画布</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>双击快速添加</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span>Ctrl+拖拽创建连接</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodePalette;