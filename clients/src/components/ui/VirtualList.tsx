import React, { useState, useEffect, useRef, useMemo } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  className?: string;
}

export default function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  onScroll,
  className = '',
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 计算可见区域的项目
  const visibleRange = useMemo(() => {
    const visibleItemsCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + visibleItemsCount + overscan,
      items.length - 1
    );

    return {
      start: Math.max(0, startIndex - overscan),
      end: endIndex,
    };
  }, [scrollTop, containerHeight, itemHeight, overscan, items.length]);

  // 可见项目
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange]);

  // 总高度
  const totalHeight = items.length * itemHeight;

  // 上方偏移量
  const offsetY = visibleRange.start * itemHeight;

  // 处理滚动事件
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  };

  // 滚动到指定项目
  const scrollToItem = (index: number, behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      const targetScrollTop = index * itemHeight;
      scrollRef.current.scrollTo({
        top: targetScrollTop,
        behavior,
      });
    }
  };

  // 滚动到顶部
  const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
    scrollToItem(0, behavior);
  };

  // 滚动到底部
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    scrollToItem(items.length - 1, behavior);
  };

  // 暴露滚动方法
  useEffect(() => {
    if (scrollRef.current) {
      (scrollRef.current as any).scrollToItem = scrollToItem;
      (scrollRef.current as any).scrollToTop = scrollToTop;
      (scrollRef.current as any).scrollToBottom = scrollToBottom;
    }
  }, []);

  return (
    <div
      ref={scrollRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={visibleRange.start + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, visibleRange.start + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hook for easy usage
export const useVirtualList = <T,>(
  items: T[],
  options: {
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
  }
) => {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const visibleItemsCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + visibleItemsCount + overscan,
      items.length - 1
    );

    return {
      start: Math.max(0, startIndex - overscan),
      end: endIndex,
    };
  }, [scrollTop, containerHeight, itemHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    visibleRange,
    setScrollTop,
  };
};

// Grid virtual list component
interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  gap?: number;
  className?: string;
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  renderItem,
  gap = 0,
  className = '',
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 计算每行可以放多少个项目
  const itemsPerRow = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const rowCount = Math.ceil(items.length / itemsPerRow);
  const rowHeight = itemHeight + gap;

  // 计算可见的行范围
  const visibleRowRange = useMemo(() => {
    const visibleRowsCount = Math.ceil(containerHeight / rowHeight);
    const startRow = Math.floor(scrollTop / rowHeight);
    const endRow = Math.min(startRow + visibleRowsCount + 1, rowCount - 1);

    return {
      start: Math.max(0, startRow - 1),
      end: endRow,
    };
  }, [scrollTop, containerHeight, rowHeight, rowCount]);

  // 可见项目
  const visibleItems = useMemo(() => {
    const startIndex = visibleRowRange.start * itemsPerRow;
    const endIndex = Math.min(
      (visibleRowRange.end + 1) * itemsPerRow - 1,
      items.length - 1
    );
    return items.slice(startIndex, endIndex + 1);
  }, [items, visibleRowRange, itemsPerRow]);

  const totalHeight = rowCount * rowHeight;
  const offsetY = visibleRowRange.start * rowHeight;

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  };

  return (
    <div
      ref={scrollRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            display: 'flex',
            flexWrap: 'wrap',
            gap: gap,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRowRange.start * itemsPerRow + index;
            return (
              <div
                key={actualIndex}
                style={{
                  width: itemWidth,
                  height: itemHeight,
                  flexShrink: 0,
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}