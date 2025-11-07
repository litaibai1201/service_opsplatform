import React, { useState, useCallback } from 'react';
import { Card, Button, Input, Select, Textarea, Tabs } from '@/components/ui';
import { 
  CubeIcon, 
  LinkIcon, 
  PaintBrushIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
  TagIcon
} from '@heroicons/react/24/outline';

interface DiagramNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  data: {
    label: string;
    description?: string;
    properties?: Record<string, any>;
  };
  style?: Record<string, any>;
}

interface DiagramConnection {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  label?: string;
  style?: Record<string, any>;
}

interface PropertyPanelProps {
  selectedNode: DiagramNode | null;
  selectedConnection: DiagramConnection | null;
  onNodeUpdate: (nodeId: string, updates: Partial<DiagramNode>) => void;
  onConnectionUpdate: (connectionId: string, updates: Partial<DiagramConnection>) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedNode,
  selectedConnection,
  onNodeUpdate,
  onConnectionUpdate,
}) => {
  const [activeTab, setActiveTab] = useState('basic');

  // 节点基础属性更新
  const handleNodeBasicUpdate = useCallback((field: string, value: any) => {
    if (!selectedNode) return;

    if (field === 'label' || field === 'description') {
      onNodeUpdate(selectedNode.id, {
        data: {
          ...selectedNode.data,
          [field]: value
        }
      });
    } else if (field === 'width' || field === 'height') {
      onNodeUpdate(selectedNode.id, {
        size: {
          ...selectedNode.size,
          [field]: Number(value)
        }
      });
    } else if (field === 'x' || field === 'y') {
      onNodeUpdate(selectedNode.id, {
        position: {
          ...selectedNode.position,
          [field]: Number(value)
        }
      });
    }
  }, [selectedNode, onNodeUpdate]);

  // 节点属性更新
  const handleNodePropertyUpdate = useCallback((property: string, value: any) => {
    if (!selectedNode) return;

    onNodeUpdate(selectedNode.id, {
      data: {
        ...selectedNode.data,
        properties: {
          ...selectedNode.data.properties,
          [property]: value
        }
      }
    });
  }, [selectedNode, onNodeUpdate]);

  // 节点样式更新
  const handleNodeStyleUpdate = useCallback((styleProperty: string, value: any) => {
    if (!selectedNode) return;

    onNodeUpdate(selectedNode.id, {
      style: {
        ...selectedNode.style,
        [styleProperty]: value
      }
    });
  }, [selectedNode, onNodeUpdate]);

  // 连接属性更新
  const handleConnectionUpdate = useCallback((field: string, value: any) => {
    if (!selectedConnection) return;

    if (field === 'label' || field === 'type') {
      onConnectionUpdate(selectedConnection.id, {
        [field]: value
      });
    }
  }, [selectedConnection, onConnectionUpdate]);

  // 连接样式更新
  const handleConnectionStyleUpdate = useCallback((styleProperty: string, value: any) => {
    if (!selectedConnection) return;

    onConnectionUpdate(selectedConnection.id, {
      style: {
        ...selectedConnection.style,
        [styleProperty]: value
      }
    });
  }, [selectedConnection, onConnectionUpdate]);

  // 渲染节点基础属性
  const renderNodeBasicProperties = () => {
    if (!selectedNode) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            节点名称
          </label>
          <Input
            value={selectedNode.data.label}
            onChange={(e) => handleNodeBasicUpdate('label', e.target.value)}
            placeholder="输入节点名称"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            节点描述
          </label>
          <Textarea
            value={selectedNode.data.description || ''}
            onChange={(e) => handleNodeBasicUpdate('description', e.target.value)}
            placeholder="输入节点描述"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              X 坐标
            </label>
            <Input
              type="number"
              value={selectedNode.position.x}
              onChange={(e) => handleNodeBasicUpdate('x', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Y 坐标
            </label>
            <Input
              type="number"
              value={selectedNode.position.y}
              onChange={(e) => handleNodeBasicUpdate('y', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              宽度
            </label>
            <Input
              type="number"
              value={selectedNode.size.width}
              onChange={(e) => handleNodeBasicUpdate('width', e.target.value)}
              min="50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              高度
            </label>
            <Input
              type="number"
              value={selectedNode.size.height}
              onChange={(e) => handleNodeBasicUpdate('height', e.target.value)}
              min="30"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            节点类型
          </label>
          <Select
            value={selectedNode.type}
            onChange={(value) => onNodeUpdate(selectedNode.id, { type: value })}
            options={[
              { value: 'server', label: '服务器' },
              { value: 'database', label: '数据库' },
              { value: 'api', label: 'API 服务' },
              { value: 'client', label: '客户端' },
              { value: 'service', label: '微服务' },
              { value: 'queue', label: '消息队列' },
              { value: 'cache', label: '缓存' },
              { value: 'loadbalancer', label: '负载均衡器' },
              { value: 'gateway', label: 'API 网关' },
              { value: 'storage', label: '对象存储' }
            ]}
          />
        </div>
      </div>
    );
  };

  // 渲染节点自定义属性
  const renderNodeCustomProperties = () => {
    if (!selectedNode) return null;

    const properties = selectedNode.data.properties || {};
    const commonProperties = getCommonPropertiesByType(selectedNode.type);

    return (
      <div className="space-y-4">
        {commonProperties.map(prop => (
          <div key={prop.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {prop.label}
            </label>
            {prop.type === 'select' ? (
              <Select
                value={properties[prop.key] || prop.defaultValue}
                onChange={(value) => handleNodePropertyUpdate(prop.key, value)}
                options={prop.options || []}
              />
            ) : prop.type === 'number' ? (
              <Input
                type="number"
                value={properties[prop.key] || prop.defaultValue}
                onChange={(e) => handleNodePropertyUpdate(prop.key, e.target.value)}
                placeholder={prop.placeholder}
              />
            ) : prop.type === 'boolean' ? (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={properties[prop.key] || prop.defaultValue}
                  onChange={(e) => handleNodePropertyUpdate(prop.key, e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-600">{prop.description}</span>
              </div>
            ) : (
              <Input
                value={properties[prop.key] || prop.defaultValue}
                onChange={(e) => handleNodePropertyUpdate(prop.key, e.target.value)}
                placeholder={prop.placeholder}
              />
            )}
          </div>
        ))}

        {/* 添加自定义属性 */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const key = prompt('属性名称:');
              if (key && !properties[key]) {
                handleNodePropertyUpdate(key, '');
              }
            }}
          >
            <TagIcon className="w-4 h-4 mr-1" />
            添加自定义属性
          </Button>
        </div>

        {/* 显示自定义属性 */}
        {Object.entries(properties).map(([key, value]) => {
          const isCommon = commonProperties.some(p => p.key === key);
          if (isCommon) return null;

          return (
            <div key={key} className="flex items-center space-x-2">
              <div className="flex-1">
                <Input
                  value={String(value)}
                  onChange={(e) => handleNodePropertyUpdate(key, e.target.value)}
                  placeholder={`${key} 值`}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newProperties = { ...properties };
                  delete newProperties[key];
                  onNodeUpdate(selectedNode.id, {
                    data: {
                      ...selectedNode.data,
                      properties: newProperties
                    }
                  });
                }}
              >
                删除
              </Button>
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染节点样式属性
  const renderNodeStyleProperties = () => {
    if (!selectedNode) return null;

    const style = selectedNode.style || {};

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            填充颜色
          </label>
          <Input
            type="color"
            value={style.fill || '#3B82F6'}
            onChange={(e) => handleNodeStyleUpdate('fill', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            边框颜色
          </label>
          <Input
            type="color"
            value={style.stroke || '#1E40AF'}
            onChange={(e) => handleNodeStyleUpdate('stroke', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            边框宽度
          </label>
          <Input
            type="number"
            value={style.strokeWidth || 1}
            onChange={(e) => handleNodeStyleUpdate('strokeWidth', e.target.value)}
            min="0"
            max="10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            圆角半径
          </label>
          <Input
            type="number"
            value={style.borderRadius || 8}
            onChange={(e) => handleNodeStyleUpdate('borderRadius', e.target.value)}
            min="0"
            max="50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            透明度
          </label>
          <Input
            type="range"
            value={style.opacity || 1}
            onChange={(e) => handleNodeStyleUpdate('opacity', e.target.value)}
            min="0"
            max="1"
            step="0.1"
          />
          <span className="text-xs text-gray-500">
            {Math.round((style.opacity || 1) * 100)}%
          </span>
        </div>
      </div>
    );
  };

  // 渲染连接属性
  const renderConnectionProperties = () => {
    if (!selectedConnection) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            连接标签
          </label>
          <Input
            value={selectedConnection.label || ''}
            onChange={(e) => handleConnectionUpdate('label', e.target.value)}
            placeholder="输入连接标签"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            连接类型
          </label>
          <Select
            value={selectedConnection.type}
            onChange={(value) => handleConnectionUpdate('type', value)}
            options={[
              { value: 'sync', label: '同步调用' },
              { value: 'async', label: '异步调用' },
              { value: 'request', label: 'HTTP 请求' },
              { value: 'response', label: 'HTTP 响应' },
              { value: 'data', label: '数据流' },
              { value: 'dependency', label: '依赖关系' }
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            线条颜色
          </label>
          <Input
            type="color"
            value={selectedConnection.style?.stroke || '#3B82F6'}
            onChange={(e) => handleConnectionStyleUpdate('stroke', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            线条宽度
          </label>
          <Input
            type="number"
            value={selectedConnection.style?.strokeWidth || 2}
            onChange={(e) => handleConnectionStyleUpdate('strokeWidth', e.target.value)}
            min="1"
            max="10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            线条样式
          </label>
          <Select
            value={selectedConnection.style?.strokeDasharray || 'none'}
            onChange={(value) => handleConnectionStyleUpdate('strokeDasharray', value === 'none' ? 'none' : value)}
            options={[
              { value: 'none', label: '实线' },
              { value: '5,5', label: '虚线' },
              { value: '10,5', label: '点划线' },
              { value: '2,2', label: '点线' }
            ]}
          />
        </div>
      </div>
    );
  };

  // 获取节点类型对应的通用属性
  const getCommonPropertiesByType = (nodeType: string) => {
    const propertyMap: Record<string, any[]> = {
      server: [
        { key: 'cpu', label: 'CPU 核心数', type: 'number', defaultValue: 4, placeholder: '4' },
        { key: 'memory', label: '内存大小', type: 'text', defaultValue: '8GB', placeholder: '8GB' },
        { key: 'storage', label: '存储容量', type: 'text', defaultValue: '100GB', placeholder: '100GB' },
        { key: 'os', label: '操作系统', type: 'select', defaultValue: 'Linux', options: [
          { value: 'Linux', label: 'Linux' },
          { value: 'Windows', label: 'Windows' },
          { value: 'macOS', label: 'macOS' }
        ]}
      ],
      database: [
        { key: 'type', label: '数据库类型', type: 'select', defaultValue: 'PostgreSQL', options: [
          { value: 'PostgreSQL', label: 'PostgreSQL' },
          { value: 'MySQL', label: 'MySQL' },
          { value: 'MongoDB', label: 'MongoDB' },
          { value: 'Redis', label: 'Redis' }
        ]},
        { key: 'version', label: '版本', type: 'text', defaultValue: '13.0', placeholder: '13.0' },
        { key: 'storage', label: '存储容量', type: 'text', defaultValue: '1TB', placeholder: '1TB' },
        { key: 'replicas', label: '副本数量', type: 'number', defaultValue: 2, placeholder: '2' }
      ],
      api: [
        { key: 'framework', label: '框架', type: 'text', defaultValue: 'Node.js', placeholder: 'Node.js' },
        { key: 'port', label: '端口', type: 'number', defaultValue: 3000, placeholder: '3000' },
        { key: 'protocol', label: '协议', type: 'select', defaultValue: 'HTTP/HTTPS', options: [
          { value: 'HTTP', label: 'HTTP' },
          { value: 'HTTPS', label: 'HTTPS' },
          { value: 'WebSocket', label: 'WebSocket' },
          { value: 'gRPC', label: 'gRPC' }
        ]}
      ]
    };

    return propertyMap[nodeType] || [];
  };

  const tabs = [
    { id: 'basic', label: '基础', icon: InformationCircleIcon },
    { id: 'properties', label: '属性', icon: Cog6ToothIcon },
    { id: 'style', label: '样式', icon: PaintBrushIcon }
  ];

  if (!selectedNode && !selectedConnection) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">属性面板</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <CubeIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">选择节点或连接线</p>
            <p className="text-xs text-gray-400 mt-1">查看和编辑属性</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center space-x-2">
          {selectedNode ? (
            <CubeIcon className="w-5 h-5 text-blue-600" />
          ) : (
            <LinkIcon className="w-5 h-5 text-green-600" />
          )}
          <h3 className="font-semibold text-gray-900">
            {selectedNode ? '节点属性' : '连接属性'}
          </h3>
        </div>
        {selectedNode && (
          <p className="text-xs text-gray-500 mt-1">
            {selectedNode.data.label} ({selectedNode.type})
          </p>
        )}
      </div>

      {selectedNode ? (
        <>
          <div className="border-b">
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={setActiveTab}
              variant="underline"
            />
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === 'basic' && renderNodeBasicProperties()}
            {activeTab === 'properties' && renderNodeCustomProperties()}
            {activeTab === 'style' && renderNodeStyleProperties()}
          </div>
        </>
      ) : (
        <div className="flex-1 p-4 overflow-y-auto">
          {renderConnectionProperties()}
        </div>
      )}
    </div>
  );
};

export default PropertyPanel;