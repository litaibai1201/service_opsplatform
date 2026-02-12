import React, { useState } from 'react';
import { Badge, Input, Button } from '@/components/ui';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface ProjectTagsProps {
  tags: Tag[];
  onAddTag?: (tag: Omit<Tag, 'id'>) => void;
  onRemoveTag?: (tagId: string) => void;
  editable?: boolean;
  maxTags?: number;
  availableColors?: string[];
  className?: string;
}

const defaultColors = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

const ProjectTags: React.FC<ProjectTagsProps> = ({
  tags,
  onAddTag,
  onRemoveTag,
  editable = false,
  maxTags = 10,
  availableColors = defaultColors,
  className = '',
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(availableColors[0]);

  // 处理添加标签
  const handleAddTag = () => {
    if (!newTagName.trim()) return;

    if (tags.length >= maxTags) {
      return;
    }

    onAddTag?.({
      name: newTagName.trim(),
      color: selectedColor,
    });

    // 重置
    setNewTagName('');
    setSelectedColor(availableColors[0]);
    setIsAdding(false);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewTagName('');
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 标签列表 */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{
              backgroundColor: `${tag.color}20`,
              color: tag.color,
              border: `1px solid ${tag.color}40`,
            }}
          >
            <span>{tag.name}</span>
            {editable && onRemoveTag && (
              <button
                onClick={() => onRemoveTag(tag.id)}
                className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

        {/* 添加按钮 */}
        {editable && !isAdding && tags.length < maxTags && (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            添加标签
          </button>
        )}
      </div>

      {/* 添加标签表单 */}
      {isAdding && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标签名称
            </label>
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入标签名称"
              maxLength={20}
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">{newTagName.length}/20</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择颜色
            </label>
            <div className="flex gap-2">
              {availableColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    selectedColor === color
                      ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* 预览 */}
          {newTagName && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                预览
              </label>
              <div
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${selectedColor}20`,
                  color: selectedColor,
                  border: `1px solid ${selectedColor}40`,
                }}
              >
                {newTagName}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsAdding(false);
                setNewTagName('');
              }}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleAddTag}
              disabled={!newTagName.trim()}
              className="flex-1"
            >
              添加
            </Button>
          </div>
        </div>
      )}

      {/* 提示信息 */}
      {editable && tags.length >= maxTags && (
        <p className="text-xs text-gray-500">
          已达到标签数量上限 ({maxTags}个)
        </p>
      )}
    </div>
  );
};

export default ProjectTags;
