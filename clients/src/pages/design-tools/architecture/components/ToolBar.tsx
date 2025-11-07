import React from 'react';
import { Button } from '@/components/ui';
import { 
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  DocumentDuplicateIcon,
  ScissorsIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  ViewfinderCircleIcon
} from '@heroicons/react/24/outline';

interface ToolBarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
}

const ToolBar: React.FC<ToolBarProps> = ({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToScreen,
  onUndo,
  onRedo,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onSelectAll,
}) => {
  const toolGroups = [
    // 编辑操作
    {
      name: 'edit',
      tools: [
        {
          id: 'undo',
          icon: ArrowUturnLeftIcon,
          tooltip: '撤销 (Ctrl+Z)',
          onClick: onUndo,
          shortcut: 'Ctrl+Z'
        },
        {
          id: 'redo',
          icon: ArrowUturnRightIcon,
          tooltip: '重做 (Ctrl+Y)',
          onClick: onRedo,
          shortcut: 'Ctrl+Y'
        }
      ]
    },
    // 剪贴板操作
    {
      name: 'clipboard',
      tools: [
        {
          id: 'copy',
          icon: DocumentDuplicateIcon,
          tooltip: '复制 (Ctrl+C)',
          onClick: onCopy,
          shortcut: 'Ctrl+C',
          disabled: !onCopy
        },
        {
          id: 'cut',
          icon: ScissorsIcon,
          tooltip: '剪切 (Ctrl+X)',
          onClick: onCut,
          shortcut: 'Ctrl+X',
          disabled: !onCut
        },
        {
          id: 'paste',
          icon: ClipboardDocumentIcon,
          tooltip: '粘贴 (Ctrl+V)',
          onClick: onPaste,
          shortcut: 'Ctrl+V',
          disabled: !onPaste
        },
        {
          id: 'delete',
          icon: TrashIcon,
          tooltip: '删除 (Delete)',
          onClick: onDelete,
          shortcut: 'Delete',
          disabled: !onDelete
        }
      ]
    },
    // 视图操作
    {
      name: 'view',
      tools: [
        {
          id: 'zoom-in',
          icon: MagnifyingGlassPlusIcon,
          tooltip: '放大 (Ctrl++)',
          onClick: onZoomIn,
          shortcut: 'Ctrl++'
        },
        {
          id: 'zoom-out',
          icon: MagnifyingGlassMinusIcon,
          tooltip: '缩小 (Ctrl+-)',
          onClick: onZoomOut,
          shortcut: 'Ctrl+-'
        },
        {
          id: 'reset-zoom',
          icon: ViewfinderCircleIcon,
          tooltip: '重置缩放 (Ctrl+0)',
          onClick: onResetZoom,
          shortcut: 'Ctrl+0'
        },
        {
          id: 'fit-screen',
          icon: ArrowsPointingOutIcon,
          tooltip: '适应屏幕 (Ctrl+Shift+0)',
          onClick: onFitToScreen,
          shortcut: 'Ctrl+Shift+0'
        }
      ]
    },
    // 选择操作
    {
      name: 'select',
      tools: [
        {
          id: 'select-all',
          icon: ViewfinderCircleIcon,
          tooltip: '全选 (Ctrl+A)',
          onClick: onSelectAll,
          shortcut: 'Ctrl+A',
          disabled: !onSelectAll
        }
      ]
    }
  ];

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2">
        <div className="flex items-center space-x-1">
          {toolGroups.map((group, groupIndex) => (
            <React.Fragment key={group.name}>
              {groupIndex > 0 && (
                <div className="w-px h-6 bg-gray-300 mx-1" />
              )}
              <div className="flex items-center space-x-1">
                {group.tools.map(tool => {
                  const Icon = tool.icon;
                  return (
                    <Button
                      key={tool.id}
                      variant="ghost"
                      size="sm"
                      onClick={tool.onClick}
                      disabled={tool.disabled}
                      className="p-1.5 h-8 w-8"
                      title={tool.tooltip}
                    >
                      <Icon className="w-4 h-4" />
                    </Button>
                  );
                })}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 快捷键提示 */}
      <div className="mt-2 text-center">
        <div className="inline-block bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity">
          <div className="space-y-1">
            <div>按住 Ctrl 拖拽节点创建连接</div>
            <div>双击空白区域创建节点</div>
            <div>右键节点或连接查看菜单</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolBar;