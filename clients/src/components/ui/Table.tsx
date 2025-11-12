import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { ChevronUpIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

export interface TableColumn<T> {
  key: string;
  title: React.ReactNode;
  dataIndex?: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  fixed?: 'left' | 'right';
  className?: string;
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  rowKey?: string | ((record: T) => string);
  size?: 'sm' | 'md' | 'lg';
  bordered?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  sticky?: boolean;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (selectedKeys: string[], selectedRows: T[]) => void;
  onRowClick?: (record: T, index: number) => void;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    onChange: (page: number, pageSize?: number) => void;
  };
  expandable?: {
    expandedRowRender: (record: T) => React.ReactNode;
    rowExpandable?: (record: T) => boolean;
  };
  className?: string;
  emptyText?: React.ReactNode;
}

const Table = <T extends Record<string, any>>(props: TableProps<T>) => {
  const {
    columns,
    data,
    loading = false,
    rowKey = 'id',
    size = 'md',
    bordered = false,
    striped = false,
    hoverable = true,
    sticky = false,
    selectable = false,
    selectedKeys = [],
    onSelectionChange,
    onRowClick,
    pagination,
    expandable,
    className,
    emptyText = '暂无数据',
  } = props;

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  // 获取行的 key
  const getRowKey = (record: T, index: number) => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || index.toString();
  };

  // 排序处理
  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable) return;
    
    const newDirection = 
      sortConfig?.key === column.key && sortConfig?.direction === 'asc'
        ? 'desc'
        : 'asc';
    
    setSortConfig({
      key: column.key,
      direction: newDirection,
    });
  };

  // 排序后的数据
  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  // 展开功能
  const isRowExpanded = (record: T) => {
    const key = getRowKey(record, 0);
    return expandedKeys.includes(key);
  };

  // 全选处理
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      const allKeys = sortedData.map((record, index) => getRowKey(record, index));
      onSelectionChange(allKeys, sortedData);
    } else {
      onSelectionChange([], []);
    }
  };

  // 单行选择处理
  const handleSelectRow = (record: T, index: number, checked: boolean) => {
    if (!onSelectionChange) return;
    
    const key = getRowKey(record, index);
    
    if (checked) {
      onSelectionChange([...selectedKeys, key], [...sortedData.filter((r, i) => selectedKeys.includes(getRowKey(r, i))), record]);
    } else {
      onSelectionChange(selectedKeys.filter(k => k !== key), sortedData.filter((r, i) => selectedKeys.includes(getRowKey(r, i)) && getRowKey(r, i) !== key));
    }
  };

  // 展开处理
  const handleExpand = (record: T, index: number) => {
    const key = getRowKey(record, index);
    if (expandedKeys.includes(key)) {
      setExpandedKeys(expandedKeys.filter(k => k !== key));
    } else {
      setExpandedKeys([...expandedKeys, key]);
    }
  };

  // 样式类
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const cellPaddingClasses = {
    sm: 'px-2 py-1',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
  };

  // 全选状态
  const isAllSelected = selectedKeys.length > 0 && selectedKeys.length === sortedData.length;
  const isIndeterminate = selectedKeys.length > 0 && selectedKeys.length < sortedData.length;

  return (
    <div className={clsx(
      'w-full overflow-hidden',
      {
        'border border-gray-300 dark:border-gray-600 rounded-lg': bordered,
      },
      className
    )}>
      {/* 表格容器 */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          {/* 表头 */}
          <thead className={clsx(
            'bg-gray-50 dark:bg-gray-800',
            {
              'sticky top-0 z-10': sticky,
            }
          )}>
            <tr>
              {/* 选择列 */}
              {selectable && (
                <th className={clsx(
                  'w-12',
                  cellPaddingClasses[size],
                  'text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
                )}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
              )}
              
              {/* 展开列 */}
              {expandable && (
                <th className={clsx(
                  'w-12',
                  cellPaddingClasses[size],
                  'text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
                )}>
                  {/* 空列 */}
                </th>
              )}

              {/* 数据列 */}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={clsx(
                    cellPaddingClasses[size],
                    'text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
                    {
                      'text-left': column.align === 'left' || !column.align,
                      'text-center': column.align === 'center',
                      'text-right': column.align === 'right',
                      'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700': column.sortable,
                      'sticky left-0 bg-gray-50 dark:bg-gray-800': column.fixed === 'left',
                      'sticky right-0 bg-gray-50 dark:bg-gray-800': column.fixed === 'right',
                    },
                    column.className
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && (
                      <span className="flex-shrink-0">
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUpIcon className="h-4 w-4" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4" />
                          )
                        ) : (
                          <div className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* 表体 */}
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0)}
                  className={clsx(cellPaddingClasses[size], 'text-center text-gray-500 dark:text-gray-400')}
                >
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    <span className="ml-2">加载中...</span>
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0)}
                  className={clsx(cellPaddingClasses[size], 'text-center text-gray-500 dark:text-gray-400')}
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              <>
                {sortedData.map((record, index) => {
                  const key = getRowKey(record, index);
                  const isSelected = selectedKeys.includes(key);
                  const isExpanded = isRowExpanded(record);
                  
                  return (
                    <React.Fragment key={key}>
                      <tr
                        className={clsx(
                          {
                            'bg-gray-50 dark:bg-gray-800': striped && index % 2 === 1,
                            'hover:bg-gray-50 dark:hover:bg-gray-800': hoverable,
                            'bg-indigo-50 dark:bg-indigo-900/20': isSelected,
                            'cursor-pointer': onRowClick,
                          }
                        )}
                        onClick={() => onRowClick?.(record, index)}
                      >
                        {/* 选择列 */}
                        {selectable && (
                          <td className={clsx(cellPaddingClasses[size])}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectRow(record, index, e.target.checked);
                              }}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                        )}
                        
                        {/* 展开列 */}
                        {expandable && (
                          <td className={clsx(cellPaddingClasses[size])}>
                            {(!expandable.rowExpandable || expandable.rowExpandable(record)) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExpand(record, index);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                <ChevronRightIcon 
                                  className={clsx(
                                    'h-4 w-4 transition-transform',
                                    { 'rotate-90': isExpanded }
                                  )}
                                />
                              </button>
                            )}
                          </td>
                        )}

                        {/* 数据列 */}
                        {columns.map((column) => {
                          let value = record;
                          if (column.dataIndex) {
                            value = record[column.dataIndex];
                          }
                          
                          const cellContent = column.render 
                            ? column.render(value, record, index)
                            : (typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''));

                          return (
                            <td
                              key={column.key}
                              className={clsx(
                                cellPaddingClasses[size],
                                sizeClasses[size],
                                'text-gray-900 dark:text-gray-100',
                                {
                                  'text-left': column.align === 'left' || !column.align,
                                  'text-center': column.align === 'center',
                                  'text-right': column.align === 'right',
                                  'sticky left-0 bg-white dark:bg-gray-900': column.fixed === 'left',
                                  'sticky right-0 bg-white dark:bg-gray-900': column.fixed === 'right',
                                },
                                column.className
                              )}
                              style={{ width: column.width }}
                            >
                              {cellContent}
                            </td>
                          );
                        })}
                      </tr>

                      {/* 展开内容 */}
                      {expandable && isExpanded && (
                        <tr>
                          <td 
                            colSpan={columns.length + (selectable ? 1 : 0) + 1}
                            className="p-0"
                          >
                            <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                              {expandable.expandedRowRender(record)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页器 */}
      {pagination && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              共 {pagination.total} 条记录
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => pagination.onChange(pagination.current - 1)}
                disabled={pagination.current <= 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                第 {pagination.current} 页，共 {Math.ceil(pagination.total / pagination.pageSize)} 页
              </span>
              <button
                onClick={() => pagination.onChange(pagination.current + 1)}
                disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;