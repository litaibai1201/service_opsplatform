import React, { useState } from 'react';
import { Input } from '@/components/ui';
import { 
  PlayIcon,
  StopIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  EllipsisHorizontalCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface FlowNodeType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: string;
  shape: 'ellipse' | 'rectangle' | 'diamond' | 'parallelogram' | 'circle';
  color: string;
  defaultSize: { width: number; height: number };
}

interface FlowNodeTypesProps {
  onAddNode: (nodeType: string, position: { x: number; y: number }) => void;
}

const nodeTypes: FlowNodeType[] = [
  // 开始/结束节点
  {
    id: 'start',
    name: '开始',
    description: '流程的起始点',
    icon: PlayIcon,
    category: 'control',
    shape: 'ellipse',
    color: '#10B981',
    defaultSize: { width: 100, height: 60 }
  },
  {
    id: 'end',
    name: '结束',
    description: '流程的终止点',
    icon: StopIcon,
    category: 'control',
    shape: 'ellipse',
    color: '#EF4444',
    defaultSize: { width: 100, height: 60 }
  },

  // 处理节点
  {
    id: 'process',
    name: '处理',
    description: '执行具体的处理步骤',
    icon: CogIcon,
    category: 'process',
    shape: 'rectangle',
    color: '#3B82F6',
    defaultSize: { width: 120, height: 80 }
  },

  // 判断节点
  {
    id: 'decision',
    name: '判断',
    description: '根据条件进行分支选择',
    icon: QuestionMarkCircleIcon,
    category: 'control',
    shape: 'diamond',
    color: '#F59E0B',
    defaultSize: { width: 140, height: 80 }
  },

  // 输入/输出节点
  {
    id: 'input',
    name: '输入',
    description: '数据或信息的输入',
    icon: ArrowDownTrayIcon,
    category: 'io',
    shape: 'parallelogram',
    color: '#8B5CF6',
    defaultSize: { width: 120, height: 60 }
  },
  {
    id: 'output',
    name: '输出',
    description: '数据或信息的输出',
    icon: ArrowUpTrayIcon,
    category: 'io',
    shape: 'parallelogram',
    color: '#06B6D4',
    defaultSize: { width: 120, height: 60 }
  },

  // 连接点
  {
    id: 'connector',
    name: '连接点',
    description: '连接不同部分的流程',
    icon: EllipsisHorizontalCircleIcon,
    category: 'utility',
    shape: 'circle',
    color: '#6B7280',
    defaultSize: { width: 20, height: 20 }
  }
];

const categories = [
  { id: 'all', name: '全部', icon: null },
  { id: 'control', name: '控制', icon: PlayIcon },
  { id: 'process', name: '处理', icon: CogIcon },
  { id: 'io', name: '输入输出', icon: ArrowDownTrayIcon },
  { id: 'utility', name: '工具', icon: EllipsisHorizontalCircleIcon }
];

const FlowNodeTypes: React.FC<FlowNodeTypesProps> = ({ onAddNode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [draggedNode, setDraggedNode] = useState<FlowNodeType | null>(null);

  // 过滤节点类型
  const filteredNodes = nodeTypes.filter(node => {
    const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         node.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || node.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 处理拖拽开始
  const handleDragStart = (e: React.DragEvent, nodeType: FlowNodeType) => {
    setDraggedNode(nodeType);
    e.dataTransfer.setData('application/json', JSON.stringify(nodeType));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // 处理拖拽结束
  const handleDragEnd = () => {
    setDraggedNode(null);
  };

  // 处理双击添加节点
  const handleDoubleClick = (nodeType: FlowNodeType) => {
    // 在画布中心添加节点
    const centerPosition = { x: 400, y: 300 };
    onAddNode(nodeType.id, centerPosition);
  };

  // 获取形状预览
  const getShapePreview = (nodeType: FlowNodeType) => {
    const size = 24;
    const centerX = size / 2;
    const centerY = size / 2;

    switch (nodeType.shape) {
      case 'ellipse':
        return (
          <ellipse
            cx={centerX}
            cy={centerY}
            rx={centerX - 2}
            ry={centerY - 4}
            fill={nodeType.color}
            opacity={0.7}
          />
        );
      case 'rectangle':
        return (
          <rect
            x={2}
            y={4}
            width={size - 4}
            height={size - 8}
            rx={2}
            fill={nodeType.color}
            opacity={0.7}
          />
        );
      case 'diamond':
        return (
          <polygon
            points={`${centerX},2 ${size - 2},${centerY} ${centerX},${size - 2} 2,${centerY}`}
            fill={nodeType.color}
            opacity={0.7}
          />
        );
      case 'parallelogram':
        return (
          <polygon
            points={`6,4 ${size - 2},4 ${size - 6},${size - 4} 2,${size - 4}`}
            fill={nodeType.color}
            opacity={0.7}
          />
        );
      case 'circle':
        return (
          <circle
            cx={centerX}
            cy={centerY}
            r={centerX - 4}
            fill={nodeType.color}
            opacity={0.7}
          />
        );
      default:
        return null;
    }
  };

  // 渲染节点卡片
  const renderNodeCard = (nodeType: FlowNodeType) => {
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
        <div className="flex items-center space-x-3 mb-2">
          {/* 形状预览 */}
          <div className="relative">
            <svg width="24" height="24" viewBox="0 0 24 24">
              {getShapePreview(nodeType)}
            </svg>
            <Icon 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white" 
            />
          </div>
          <span className="font-medium text-sm">{nodeType.name}</span>
        </div>
        <p className="text-xs text-gray-600 line-clamp-2">
          {nodeType.description}
        </p>
        
        {/* 节点信息 */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>{nodeType.shape}</span>
          <span>{nodeType.defaultSize.width}×{nodeType.defaultSize.height}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* 标题 */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-900">流程节点</h3>
        <p className="text-xs text-gray-500 mt-1">拖拽节点到画布或双击添加</p>
      </div>

      {/* 搜索框 */}
      <div className="p-4 border-b">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="搜索节点..."
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

      {/* 节点列表 */}
      <div className="flex-1 p-4 overflow-y-auto">
        {filteredNodes.length > 0 ? (
          <div className="space-y-3">
            {filteredNodes.map(renderNodeCard)}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <QuestionMarkCircleIcon className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-sm text-gray-500">未找到匹配的节点</p>
            <p className="text-xs text-gray-400 mt-1">尝试调整搜索条件</p>
          </div>
        )}
      </div>

      {/* 节点说明 */}
      <div className="p-4 border-t bg-gray-50">
        <div className="text-xs text-gray-600 space-y-2">
          <div className="font-medium">节点形状说明：</div>
          <div className="grid grid-cols-2 gap-1">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-2 bg-green-500 rounded-full opacity-70"></div>
              <span>椭圆 - 开始/结束</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-2 bg-blue-500 opacity-70"></div>
              <span>矩形 - 处理</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-2 bg-yellow-500 transform rotate-45 opacity-70"></div>
              <span>菱形 - 判断</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-2 bg-purple-500 transform skew-x-12 opacity-70"></div>
              <span>平行四边形 - 输入输出</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlowNodeTypes;