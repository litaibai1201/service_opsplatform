import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { 
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
  ViewfinderCircleIcon
} from '@heroicons/react/24/outline';

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitToScreen: () => void;
  className?: string;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  onZoomChange,
  onFitToScreen,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const zoomLevels = [25, 50, 75, 100, 125, 150, 200, 300, 400];
  const currentZoomIndex = zoomLevels.findIndex(level => level >= zoom);

  const handleZoomIn = () => {
    if (currentZoomIndex < zoomLevels.length - 1) {
      onZoomChange(zoomLevels[currentZoomIndex + 1] || zoom + 25);
    } else {
      onZoomChange(Math.min(400, zoom + 25));
    }
  };

  const handleZoomOut = () => {
    if (currentZoomIndex > 0) {
      onZoomChange(zoomLevels[currentZoomIndex - 1] || zoom - 25);
    } else {
      onZoomChange(Math.max(25, zoom - 25));
    }
  };

  const handleZoomToLevel = (level: number) => {
    onZoomChange(level);
    setIsExpanded(false);
  };

  const handleResetZoom = () => {
    onZoomChange(100);
  };

  return (
    <div className={`absolute bottom-4 right-4 z-10 ${className}`}>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        {/* 主要控制按钮 */}
        <div className="flex flex-col">
          {/* 放大按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 400}
            className="p-2 rounded-t-lg rounded-b-none border-b"
            title="放大 (Ctrl++)"
          >
            <MagnifyingGlassPlusIcon className="w-4 h-4" />
          </Button>

          {/* 缩放百分比显示 */}
          <div className="relative">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border-b"
              title="点击选择缩放级别"
            >
              {zoom}%
            </button>

            {/* 缩放级别下拉菜单 */}
            {isExpanded && (
              <div className="absolute bottom-full right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-20">
                <div className="py-1">
                  {zoomLevels.map(level => (
                    <button
                      key={level}
                      onClick={() => handleZoomToLevel(level)}
                      className={`w-full px-3 py-1 text-sm text-left hover:bg-gray-50 ${
                        Math.abs(zoom - level) < 5 ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      {level}%
                    </button>
                  ))}
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={() => {
                      onFitToScreen();
                      setIsExpanded(false);
                    }}
                    className="w-full px-3 py-1 text-sm text-left hover:bg-gray-50 text-gray-700"
                  >
                    适应屏幕
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 缩小按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 25}
            className="p-2 border-b"
            title="缩小 (Ctrl+-)"
          >
            <MagnifyingGlassMinusIcon className="w-4 h-4" />
          </Button>

          {/* 重置缩放按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetZoom}
            className="p-2 border-b"
            title="重置缩放 (Ctrl+0)"
          >
            <ViewfinderCircleIcon className="w-4 h-4" />
          </Button>

          {/* 适应屏幕按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onFitToScreen}
            className="p-2 rounded-b-lg rounded-t-none"
            title="适应屏幕 (Ctrl+Shift+0)"
          >
            <ArrowsPointingOutIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 快捷键提示 */}
      <div className="mt-2 text-center">
        <div className="inline-block bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity">
          <div className="space-y-1">
            <div>滚轮缩放</div>
            <div>Ctrl + +/- 缩放</div>
            <div>Ctrl + 0 重置</div>
            <div>Ctrl + Shift + 0 适应</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoomControls;