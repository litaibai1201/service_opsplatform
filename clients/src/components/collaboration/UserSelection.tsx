import React, { useEffect, useState, useRef } from 'react';
import { useCollaboration } from '../../contexts/CollaborationProvider';
import { UserPresence } from '../../services/collaboration/WebSocketClient';

interface SelectionData {
  elementId: string;
  range?: {
    start: number;
    end: number;
  };
  bounds?: DOMRect;
}

interface UserSelectionProps {
  userId: string;
  selection: SelectionData;
  user: UserPresence;
  containerRef?: React.RefObject<HTMLElement>;
  showLabel?: boolean;
  selectionColor?: string;
}

interface SelectionOverlayProps {
  bounds: DOMRect;
  color: string;
  user: UserPresence;
  showLabel?: boolean;
  opacity?: number;
}

// 单个用户选择覆盖层
function SelectionOverlay({ 
  bounds, 
  color, 
  user, 
  showLabel = true,
  opacity = 0.2 
}: SelectionOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 延迟显示动画
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`absolute pointer-events-none transition-all duration-200 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
      style={{
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
        backgroundColor: color,
        opacity: opacity,
        border: `2px solid ${color}`,
        borderRadius: '4px',
        zIndex: 30,
      }}
    >
      {/* 选择标签 */}
      {showLabel && (
        <div
          className="absolute -top-8 left-0 px-2 py-1 rounded text-white text-xs font-medium whitespace-nowrap shadow-lg"
          style={{ backgroundColor: color }}
        >
          <div className="flex items-center space-x-1">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-3 h-3 rounded-full"
              />
            ) : (
              <div className="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            <span>{user.username} 已选择</span>
          </div>
          
          {/* 箭头 */}
          <div
            className="absolute top-full left-2 w-0 h-0"
            style={{
              borderStyle: 'solid',
              borderWidth: '4px 4px 0 4px',
              borderColor: `${color} transparent transparent transparent`,
            }}
          />
        </div>
      )}
    </div>
  );
}

// 文本选择覆盖层
function TextSelectionOverlay({
  elementId,
  range,
  color,
  user,
  showLabel = true,
}: {
  elementId: string;
  range: { start: number; end: number };
  color: string;
  user: UserPresence;
  showLabel?: boolean;
}) {
  const [overlayBounds, setOverlayBounds] = useState<DOMRect[]>([]);

  useEffect(() => {
    const element = document.getElementById(elementId) || 
                   document.querySelector(`[data-element-id="${elementId}"]`);
    
    if (!element) return;

    try {
      // 处理文本节点选择
      if (element.nodeType === Node.TEXT_NODE || element.textContent) {
        const textContent = element.textContent || '';
        const selectedText = textContent.slice(range.start, range.end);
        
        if (selectedText) {
          // 创建临时范围对象来获取边界
          const selection = window.getSelection();
          const originalRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
          
          const tempRange = document.createRange();
          
          // 查找文本节点
          const textNode = element.nodeType === Node.TEXT_NODE ? 
            element : 
            findTextNode(element, range.start);
          
          if (textNode) {
            tempRange.setStart(textNode, Math.max(0, range.start));
            tempRange.setEnd(textNode, Math.min(textNode.textContent?.length || 0, range.end));
            
            const rects = Array.from(tempRange.getClientRects());
            setOverlayBounds(rects);
          }
          
          // 恢复原始选择
          if (originalRange && selection) {
            selection.removeAllRanges();
            selection.addRange(originalRange);
          }
        }
      } else {
        // 处理元素选择
        const rect = element.getBoundingClientRect();
        setOverlayBounds([rect]);
      }
    } catch (error) {
      console.error('Error creating text selection overlay:', error);
      // 回退到元素边界
      const rect = element.getBoundingClientRect();
      setOverlayBounds([rect]);
    }
  }, [elementId, range]);

  // 查找包含指定位置的文本节点
  const findTextNode = (element: Element, position: number): Text | null => {
    let currentPosition = 0;
    
    function traverse(node: Node): Text | null {
      if (node.nodeType === Node.TEXT_NODE) {
        const textLength = node.textContent?.length || 0;
        if (currentPosition <= position && position < currentPosition + textLength) {
          return node as Text;
        }
        currentPosition += textLength;
      } else {
        for (const child of Array.from(node.childNodes)) {
          const result = traverse(child);
          if (result) return result;
        }
      }
      return null;
    }
    
    return traverse(element);
  };

  return (
    <>
      {overlayBounds.map((bounds, index) => (
        <SelectionOverlay
          key={index}
          bounds={bounds}
          color={color}
          user={user}
          showLabel={showLabel && index === 0} // 只在第一个矩形显示标签
          opacity={0.3}
        />
      ))}
    </>
  );
}

// 单个用户选择组件
export function UserSelection({
  userId,
  selection,
  user,
  containerRef,
  showLabel = true,
  selectionColor,
}: UserSelectionProps) {
  const [elementBounds, setElementBounds] = useState<DOMRect | null>(null);

  // 获取用户颜色
  const getUserColor = (userId: string): string => {
    if (selectionColor) return selectionColor;
    
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
      '#8b5cf6', '#f97316', '#06b6d4', '#84cc16',
      '#ec4899', '#6b7280'
    ];
    
    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  // 获取元素边界
  useEffect(() => {
    const element = document.getElementById(selection.elementId) || 
                   document.querySelector(`[data-element-id="${selection.elementId}"]`);
    
    if (element) {
      const updateBounds = () => {
        const rect = element.getBoundingClientRect();
        const container = containerRef?.current;
        
        if (container) {
          const containerRect = container.getBoundingClientRect();
          // 转换为容器内坐标
          const relativeRect = new DOMRect(
            rect.left - containerRect.left,
            rect.top - containerRect.top,
            rect.width,
            rect.height
          );
          setElementBounds(relativeRect);
        } else {
          setElementBounds(rect);
        }
      };

      updateBounds();

      // 监听元素大小变化
      const resizeObserver = new ResizeObserver(updateBounds);
      resizeObserver.observe(element);

      // 监听滚动
      const handleScroll = () => updateBounds();
      window.addEventListener('scroll', handleScroll, true);

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [selection.elementId, containerRef]);

  if (!elementBounds) return null;

  const color = getUserColor(userId);

  // 如果有文本范围选择
  if (selection.range) {
    return (
      <TextSelectionOverlay
        elementId={selection.elementId}
        range={selection.range}
        color={color}
        user={user}
        showLabel={showLabel}
      />
    );
  }

  // 元素选择
  return (
    <SelectionOverlay
      bounds={elementBounds}
      color={color}
      user={user}
      showLabel={showLabel}
    />
  );
}

// 所有用户选择管理器
export function UserSelections({ 
  containerRef, 
  showOwnSelection = false 
}: { 
  containerRef?: React.RefObject<HTMLElement>;
  showOwnSelection?: boolean;
}) {
  const { state } = useCollaboration();

  // 过滤有选择的用户
  const usersWithSelections = state.roomUsers.filter(user => 
    user.selection && 
    user.status === 'online' &&
    (showOwnSelection || user.userId !== state.currentUser?.userId)
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {usersWithSelections.map(user => (
        user.selection && (
          <UserSelection
            key={user.userId}
            userId={user.userId}
            selection={user.selection}
            user={user}
            containerRef={containerRef}
          />
        )
      ))}
    </div>
  );
}

// 选择高亮工具
export function SelectionHighlighter({
  onSelectionChange,
  containerRef,
}: {
  onSelectionChange?: (selection: SelectionData | null) => void;
  containerRef?: React.RefObject<HTMLElement>;
}) {
  const { updateSelection } = useCollaboration();
  const [currentSelection, setCurrentSelection] = useState<SelectionData | null>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      
      if (!selection || selection.rangeCount === 0) {
        setCurrentSelection(null);
        updateSelection('', undefined);
        onSelectionChange?.(null);
        return;
      }

      const range = selection.getRangeAt(0);
      
      if (range.collapsed) {
        setCurrentSelection(null);
        updateSelection('', undefined);
        onSelectionChange?.(null);
        return;
      }

      // 查找包含选择的元素
      let container = range.commonAncestorContainer;
      while (container && container.nodeType !== Node.ELEMENT_NODE) {
        container = container.parentNode;
      }

      if (!container) return;

      const element = container as Element;
      let elementId = element.id;
      
      if (!elementId) {
        elementId = element.getAttribute('data-element-id') || '';
      }

      if (!elementId) {
        // 生成临时ID
        elementId = `temp-${Date.now()}`;
        element.setAttribute('data-element-id', elementId);
      }

      // 计算选择范围
      const textContent = element.textContent || '';
      const selectedText = selection.toString();
      const startOffset = textContent.indexOf(selectedText);
      
      if (startOffset !== -1) {
        const selectionData: SelectionData = {
          elementId,
          range: {
            start: startOffset,
            end: startOffset + selectedText.length,
          },
        };

        setCurrentSelection(selectionData);
        updateSelection(elementId, selectionData.range);
        onSelectionChange?.(selectionData);
      }
    };

    // 监听选择变化
    document.addEventListener('selectionchange', handleSelectionChange);
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [updateSelection, onSelectionChange]);

  return null; // 这是一个功能组件，不渲染任何内容
}

// 协作选择增强器 - 为现有组件添加选择功能
export function withCollaborativeSelection<T extends Record<string, any>>(
  Component: React.ComponentType<T>
) {
  return React.forwardRef<any, T>((props, ref) => {
    const { updateSelection } = useCollaboration();
    const elementRef = useRef<HTMLElement>(null);

    const handleMouseUp = () => {
      const selection = window.getSelection();
      const element = elementRef.current;
      
      if (!selection || !element || selection.rangeCount === 0) {
        updateSelection('', undefined);
        return;
      }

      const range = selection.getRangeAt(0);
      if (range.collapsed) {
        updateSelection('', undefined);
        return;
      }

      // 检查选择是否在当前元素内
      if (!element.contains(range.commonAncestorContainer)) {
        return;
      }

      const elementId = element.id || element.getAttribute('data-element-id') || '';
      if (elementId) {
        const textContent = element.textContent || '';
        const selectedText = selection.toString();
        const startOffset = textContent.indexOf(selectedText);
        
        if (startOffset !== -1) {
          updateSelection(elementId, {
            start: startOffset,
            end: startOffset + selectedText.length,
          });
        }
      }
    };

    return (
      <Component
        {...props}
        ref={ref}
        onMouseUp={handleMouseUp}
        data-collaborative-selection="true"
      />
    );
  });
}