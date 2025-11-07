import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/helpers';
import Button from './Button';
import Select from './Select';

interface PaginationProps {
  current: number;
  total: number;
  pageSize?: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean | ((total: number, range: [number, number]) => React.ReactNode);
  size?: 'sm' | 'md' | 'lg';
  simple?: boolean;
  disabled?: boolean;
  onChange?: (page: number, pageSize: number) => void;
  onShowSizeChange?: (current: number, size: number) => void;
  className?: string;
  pageSizeOptions?: number[];
}

const Pagination: React.FC<PaginationProps> = ({
  current,
  total,
  pageSize = 10,
  showSizeChanger = false,
  showQuickJumper = false,
  showTotal = false,
  size = 'md',
  simple = false,
  disabled = false,
  onChange,
  onShowSizeChange,
  className,
  pageSizeOptions = [10, 20, 50, 100],
}) => {
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (current - 1) * pageSize + 1;
  const endIndex = Math.min(current * pageSize, total);

  const handlePageChange = (page: number) => {
    if (page !== current && !disabled) {
      onChange?.(page, pageSize);
    }
  };

  const handleSizeChange = (newSize: number) => {
    const newPage = Math.ceil((current - 1) * pageSize / newSize) + 1;
    onShowSizeChange?.(newPage, newSize);
    onChange?.(newPage, newSize);
  };

  const handleQuickJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = parseInt((e.target as HTMLInputElement).value);
      if (value >= 1 && value <= totalPages) {
        handlePageChange(value);
        (e.target as HTMLInputElement).value = '';
      }
    }
  };

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const buttonSizeMap = {
    sm: 'sm' as const,
    md: 'md' as const,
    lg: 'lg' as const,
  };

  // 生成页码数组
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = simple ? 0 : 5; // 简单模式不显示页码

    if (totalPages <= showPages + 2) {
      // 总页数较少，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 总页数较多，显示部分页码
      pages.push(1);

      if (current <= 3) {
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
      } else if (current >= totalPages - 2) {
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages - 1; i++) {
          pages.push(i);
        }
      } else {
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
      }

      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const renderTotal = () => {
    if (!showTotal) return null;

    if (typeof showTotal === 'function') {
      return showTotal(total, [startIndex, endIndex]);
    }

    return (
      <span className={cn('text-gray-600', sizeClasses[size])}>
        共 {total} 条，第 {startIndex}-{endIndex} 条
      </span>
    );
  };

  if (totalPages <= 1 && !showSizeChanger) {
    return null;
  }

  return (
    <div className={cn(
      'flex items-center justify-between flex-wrap gap-4',
      sizeClasses[size],
      className
    )}>
      {/* 总数显示 */}
      <div className="flex-shrink-0">
        {renderTotal()}
      </div>

      {/* 分页控件 */}
      <div className="flex items-center space-x-2">
        {/* 页面大小选择器 */}
        {showSizeChanger && (
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">每页</span>
            <Select
              value={pageSize}
              onChange={(value) => handleSizeChange(value as number)}
              options={pageSizeOptions.map(size => ({
                value: size,
                label: `${size} 条`,
              }))}
              size={size}
              disabled={disabled}
              className="w-20"
            />
          </div>
        )}

        {/* 上一页 */}
        <Button
          variant="outline"
          size={buttonSizeMap[size]}
          onClick={() => handlePageChange(current - 1)}
          disabled={disabled || current <= 1}
          icon={<ChevronLeftIcon className="h-4 w-4" />}
        >
          {!simple && '上一页'}
        </Button>

        {/* 页码 */}
        {!simple && (
          <div className="flex items-center space-x-1">
            {getPageNumbers().map((page, index) => {
              if (page === '...') {
                return (
                  <span key={index} className="px-2">
                    <EllipsisHorizontalIcon className="h-4 w-4 text-gray-400" />
                  </span>
                );
              }

              return (
                <Button
                  key={page}
                  variant={current === page ? 'primary' : 'ghost'}
                  size={buttonSizeMap[size]}
                  onClick={() => handlePageChange(page as number)}
                  disabled={disabled}
                  className="min-w-8"
                >
                  {page}
                </Button>
              );
            })}
          </div>
        )}

        {/* 简单模式的页码显示 */}
        {simple && (
          <span className="text-gray-600">
            {current} / {totalPages}
          </span>
        )}

        {/* 下一页 */}
        <Button
          variant="outline"
          size={buttonSizeMap[size]}
          onClick={() => handlePageChange(current + 1)}
          disabled={disabled || current >= totalPages}
          icon={<ChevronRightIcon className="h-4 w-4" />}
          iconPosition="right"
        >
          {!simple && '下一页'}
        </Button>

        {/* 快速跳转 */}
        {showQuickJumper && !simple && (
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">跳至</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              onKeyDown={handleQuickJump}
              disabled={disabled}
              className={cn(
                'w-12 px-2 py-1 border border-gray-300 rounded text-center',
                'focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                sizeClasses[size]
              )}
            />
            <span className="text-gray-600">页</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pagination;