import React, { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { 
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  LockOpenIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface DiagramLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  nodeIds: string[];
}

interface LayerPanelProps {
  layers: DiagramLayer[];
  onLayerUpdate: (layerId: string, updates: Partial<DiagramLayer>) => void;
  onAddLayer: () => void;
  onLayerSelect: (layerId: string) => void;
}

const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  onLayerUpdate,
  onAddLayer,
  onLayerSelect,
}) => {
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // 开始编辑图层名称
  const startEditing = (layer: DiagramLayer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };

  // 保存图层名称
  const saveLayerName = () => {
    if (editingLayerId && editingName.trim()) {
      onLayerUpdate(editingLayerId, { name: editingName.trim() });
    }
    setEditingLayerId(null);
    setEditingName('');
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditingLayerId(null);
    setEditingName('');
  };

  // 切换图层可见性
  const toggleVisibility = (layerId: string, visible: boolean) => {
    onLayerUpdate(layerId, { visible: !visible });
  };

  // 切换图层锁定状态
  const toggleLock = (layerId: string, locked: boolean) => {
    onLayerUpdate(layerId, { locked: !locked });
  };

  // 调整图层不透明度
  const adjustOpacity = (layerId: string, opacity: number) => {
    onLayerUpdate(layerId, { opacity: Math.max(0, Math.min(1, opacity)) });
  };

  // 删除图层
  const deleteLayer = (layerId: string) => {
    if (layers.length > 1 && window.confirm('确定要删除此图层吗？')) {
      // TODO: 实现删除图层逻辑
      console.log('Delete layer:', layerId);
    }
  };

  // 移动图层顺序
  const moveLayer = (layerId: string, direction: 'up' | 'down') => {
    const currentIndex = layers.findIndex(l => l.id === layerId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= layers.length) return;

    // TODO: 实现图层顺序调整逻辑
    console.log('Move layer:', layerId, direction);
  };

  // 选择图层
  const selectLayer = (layerId: string) => {
    setSelectedLayerId(layerId);
    onLayerSelect(layerId);
  };

  return (
    <div className="h-64 flex flex-col border-t">
      {/* 标题栏 */}
      <div className="p-3 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm text-gray-900">图层</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddLayer}
            className="p-1"
          >
            <PlusIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 图层列表 */}
      <div className="flex-1 overflow-y-auto">
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            className={`p-2 border-b hover:bg-gray-50 cursor-pointer ${
              selectedLayerId === layer.id ? 'bg-blue-50 border-blue-200' : ''
            }`}
            onClick={() => selectLayer(layer.id)}
          >
            <div className="flex items-center space-x-2">
              {/* 图层顺序控制 */}
              <div className="flex flex-col">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayer(layer.id, 'up');
                  }}
                  disabled={index === 0}
                  className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronUpIcon className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayer(layer.id, 'down');
                  }}
                  disabled={index === layers.length - 1}
                  className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronDownIcon className="w-3 h-3" />
                </button>
              </div>

              {/* 图层名称 */}
              <div className="flex-1">
                {editingLayerId === layer.id ? (
                  <div className="flex items-center space-x-1">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveLayerName();
                        } else if (e.key === 'Escape') {
                          cancelEditing();
                        }
                      }}
                      className="h-6 text-xs"
                      autoFocus
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveLayerName();
                      }}
                      className="p-0.5 text-green-600 hover:text-green-800"
                    >
                      <CheckIcon className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelEditing();
                      }}
                      className="p-0.5 text-red-600 hover:text-red-800"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-medium text-gray-900">
                      {layer.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(layer);
                      }}
                      className="p-0.5 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
                    >
                      <PencilIcon className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  {layer.nodeIds.length} 个节点
                </div>
              </div>

              {/* 图层控制按钮 */}
              <div className="flex items-center space-x-1">
                {/* 可见性切换 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVisibility(layer.id, layer.visible);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title={layer.visible ? '隐藏图层' : '显示图层'}
                >
                  {layer.visible ? (
                    <EyeIcon className="w-4 h-4" />
                  ) : (
                    <EyeSlashIcon className="w-4 h-4" />
                  )}
                </button>

                {/* 锁定切换 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLock(layer.id, layer.locked);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title={layer.locked ? '解锁图层' : '锁定图层'}
                >
                  {layer.locked ? (
                    <LockClosedIcon className="w-4 h-4" />
                  ) : (
                    <LockOpenIcon className="w-4 h-4" />
                  )}
                </button>

                {/* 删除图层 */}
                {layers.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteLayer(layer.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="删除图层"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 不透明度滑块 */}
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-xs text-gray-500 w-8">
                {Math.round(layer.opacity * 100)}%
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={layer.opacity}
                onChange={(e) => {
                  e.stopPropagation();
                  adjustOpacity(layer.id, parseFloat(e.target.value));
                }}
                className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${layer.opacity * 100}%, #E5E7EB ${layer.opacity * 100}%, #E5E7EB 100%)`
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 图层操作提示 */}
      <div className="p-2 bg-gray-50 border-t">
        <div className="text-xs text-gray-600 space-y-1">
          <div>• 点击选择图层</div>
          <div>• 双击编辑名称</div>
          <div>• 拖拽调整顺序</div>
        </div>
      </div>
    </div>
  );
};

export default LayerPanel;