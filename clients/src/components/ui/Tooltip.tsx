import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/helpers';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'focus';
  delay?: number;
  disabled?: boolean;
  className?: string;
  overlayClassName?: string;
  arrow?: boolean;
  color?: 'dark' | 'light';
  maxWidth?: string | number;
}

const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  placement = 'top',
  trigger = 'hover',
  delay = 100,
  disabled = false,
  className,
  overlayClassName,
  arrow = true,
  color = 'dark',
  maxWidth = 200,
}) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // 计算 tooltip 位置
  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    
    let top = 0;
    let left = 0;
    const gap = 8; // 间隙

    switch (placement) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - gap;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + gap;
        break;
    }

    // 边界检查和调整
    if (left < 0) {
      left = gap;
    } else if (left + tooltipRect.width > viewport.width) {
      left = viewport.width - tooltipRect.width - gap;
    }

    if (top < 0) {
      top = gap;
    } else if (top + tooltipRect.height > viewport.height) {
      top = viewport.height - tooltipRect.height - gap;
    }

    setPosition({ top, left });
  };

  const showTooltip = () => {
    if (disabled) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, 100);
  };

  const handleTriggerEvents = () => {
    const events: Record<string, () => void> = {};

    if (trigger === 'hover') {
      events.onMouseEnter = showTooltip;
      events.onMouseLeave = hideTooltip;
    } else if (trigger === 'click') {
      events.onClick = () => {
        if (visible) {
          hideTooltip();
        } else {
          showTooltip();
        }
      };
    } else if (trigger === 'focus') {
      events.onFocus = showTooltip;
      events.onBlur = hideTooltip;
    }

    return events;
  };

  // 更新位置
  useEffect(() => {
    if (visible) {
      calculatePosition();
      
      const handleResize = () => calculatePosition();
      const handleScroll = () => calculatePosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, [visible, placement]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const colorClasses = {
    dark: 'bg-gray-900 text-white border-gray-900',
    light: 'bg-white text-gray-900 border-gray-200 shadow-lg',
  };

  const arrowClasses = {
    top: {
      dark: 'border-t-gray-900 border-l-transparent border-r-transparent border-b-transparent',
      light: 'border-t-gray-200 border-l-transparent border-r-transparent border-b-transparent',
    },
    bottom: {
      dark: 'border-b-gray-900 border-l-transparent border-r-transparent border-t-transparent',
      light: 'border-b-gray-200 border-l-transparent border-r-transparent border-t-transparent',
    },
    left: {
      dark: 'border-l-gray-900 border-t-transparent border-b-transparent border-r-transparent',
      light: 'border-l-gray-200 border-t-transparent border-b-transparent border-r-transparent',
    },
    right: {
      dark: 'border-r-gray-900 border-t-transparent border-b-transparent border-l-transparent',
      light: 'border-r-gray-200 border-t-transparent border-b-transparent border-l-transparent',
    },
  };

  const getArrowPosition = () => {
    const arrowSize = 6;
    switch (placement) {
      case 'top':
        return {
          bottom: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'bottom':
        return {
          top: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          right: -arrowSize,
          top: '50%',
          transform: 'translateY(-50%)',
        };
      case 'right':
        return {
          left: -arrowSize,
          top: '50%',
          transform: 'translateY(-50%)',
        };
    }
  };

  const tooltipElement = visible && (
    <div
      ref={tooltipRef}
      className={cn(
        'fixed z-50 px-3 py-2 text-sm rounded-md border transition-opacity duration-200',
        colorClasses[color],
        overlayClassName
      )}
      style={{
        top: position.top,
        left: position.left,
        maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
        opacity: visible ? 1 : 0,
      }}
      onMouseEnter={() => {
        if (trigger === 'hover' && timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }}
      onMouseLeave={() => {
        if (trigger === 'hover') {
          hideTooltip();
        }
      }}
    >
      {content}
      
      {arrow && (
        <div
          className={cn(
            'absolute w-0 h-0 border-4',
            arrowClasses[placement][color]
          )}
          style={getArrowPosition()}
        />
      )}
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className={cn('inline-block', className)}
        {...handleTriggerEvents()}
      >
        {children}
      </div>
      
      {typeof document !== 'undefined' && createPortal(
        tooltipElement,
        document.body
      )}
    </>
  );
};

export default Tooltip;