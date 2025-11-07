import React, { useState } from 'react';
import { 
  ChevronUpIcon, 
  ChevronDownIcon,
  ChevronUpDownIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/helpers';
import Checkbox from './Checkbox';
import Badge from './Badge';
import Spinner from './Spinner';

export interface Column<T = any> {
  key: string;
  title: string;
  dataIndex?: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sorter?: boolean | ((a: T, b: T) => number);
  sortOrder?: 'asc' | 'desc' | null;
  width?: string | number;
  fixed?: 'left' | 'right';
  align?: 'left' | 'center' | 'right';
  ellipsis?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  filters?: Array<{ text: string; value: any }>;
  className?: string;
}

interface TableProps<T = any> {
  columns: Column<T>[];
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
  onSelectionChange?: (keys: string[]) => void;
  onRowClick?: (record: T, index: number) => void;
  pagination?: boolean | {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  expandable?: {
    expandedRowRender: (record: T, index: number) => React.ReactNode;
    expandedRowKeys?: string[];
    onExpandedRowsChange?: (keys: string[]) => void;
  };
  className?: string;
  emptyText?: React.ReactNode;
}

const Table = <T extends Record<string, any>>({
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
}: TableProps<T>) => {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [searchText, setSearchText] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  // 获取行的key
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || index.toString();
  };

  // 排序处理
  const handleSort = (column: Column<T>) => {
    if (!column.sorter) return;

    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === column.key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    setSortConfig({ key: column.key, direction });
  };

  // 数据处理（排序、搜索、筛选）
  const processedData = React.useMemo(() => {
    let result = [...data];

    // 搜索
    if (searchText) {
      result = result.filter(record =>
        Object.values(record).some(value =>
          String(value).toLowerCase().includes(searchText.toLowerCase())
        )
      );
    }

    // 排序
    if (sortConfig) {
      const column = columns.find(col => col.key === sortConfig.key);
      if (column?.sorter) {
        result.sort((a, b) => {
          if (typeof column.sorter === 'function') {
            const compareResult = column.sorter(a, b);
            return sortConfig.direction === 'desc' ? -compareResult : compareResult;
          } else {
            const aVal = column.dataIndex ? a[column.dataIndex] : a[column.key];
            const bVal = column.dataIndex ? b[column.dataIndex] : b[column.key];
            
            if (aVal < bVal) return sortConfig.direction === 'desc' ? 1 : -1;
            if (aVal > bVal) return sortConfig.direction === 'desc' ? -1 : 1;
            return 0;
          }
        });
      }
    }

    return result;
  }, [data, sortConfig, searchText, columns]);

  // 选择处理
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;

    if (checked) {
      const allKeys = processedData.map((record, index) => getRowKey(record, index));
      onSelectionChange(allKeys);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (key: string, checked: boolean) => {
    if (!onSelectionChange) return;

    if (checked) {
      onSelectionChange([...selectedKeys, key]);
    } else {
      onSelectionChange(selectedKeys.filter(k => k !== key));
    }
  };

  // 展开处理
  const handleExpand = (key: string) => {
    const newExpandedKeys = expandedKeys.includes(key)
      ? expandedKeys.filter(k => k !== key)
      : [...expandedKeys, key];
    
    setExpandedKeys(newExpandedKeys);
    expandable?.onExpandedRowsChange?.(newExpandedKeys);
  };

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const cellPaddingClasses = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
  };

  const isAllSelected = processedData.length > 0 && 
    processedData.every((record, index) => 
      selectedKeys.includes(getRowKey(record, index))
    );
  const isIndeterminate = selectedKeys.length > 0 && !isAllSelected;

  return (
    <div className={cn('overflow-hidden', className)}>
      {/* 搜索栏 */}
      {columns.some(col => col.searchable) && (
        <div className="mb-4">
          <div className="relative max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      )}

      <div className={cn(
        'overflow-x-auto',
        sticky && 'max-h-96 overflow-y-auto'
      )}>
        <table className={cn(
          'min-w-full divide-y divide-gray-200',
          sizeClasses[size]
        )}>
          <thead className={cn(
            'bg-gray-50',
            sticky && 'sticky top-0 z-10'
          )}>
            <tr>
              {selectable && (
                <th className={cn(
                  'w-12 text-center',
                  cellPaddingClasses[size],
                  bordered && 'border border-gray-200'
                )}>
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isIndeterminate}
                    onChange={handleSelectAll}
                    size="sm"
                  />
                </th>
              )}

              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    cellPaddingClasses[size],
                    {
                      'text-center': column.align === 'center',
                      'text-right': column.align === 'right',
                      'cursor-pointer hover:bg-gray-100': column.sorter,
                      'border border-gray-200': bordered,
                    },
                    column.className
                  )}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center space-x-1">
                    <span className={cn({ 'truncate': column.ellipsis })}>
                      {column.title}
                    </span>
                    {column.sorter && (
                      <span className="ml-1">
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUpIcon className="h-4 w-4" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4" />
                          )\n                        ) : (\n                          <ChevronUpDownIcon className=\"h-4 w-4 text-gray-400\" />\n                        )}\n                      </span>\n                    )}\n                  </div>\n                </th>\n              ))}\n            </tr>\n          </thead>\n\n          <tbody className=\"bg-white divide-y divide-gray-200\">\n            {loading ? (\n              <tr>\n                <td\n                  colSpan={columns.length + (selectable ? 1 : 0)}\n                  className=\"text-center py-12\"\n                >\n                  <Spinner size=\"lg\" label=\"加载中...\" />\n                </td>\n              </tr>\n            ) : processedData.length === 0 ? (\n              <tr>\n                <td\n                  colSpan={columns.length + (selectable ? 1 : 0)}\n                  className=\"text-center py-12 text-gray-500\"\n                >\n                  {emptyText}\n                </td>\n              </tr>\n            ) : (\n              processedData.map((record, index) => {\n                const key = getRowKey(record, index);\n                const isSelected = selectedKeys.includes(key);\n                const isExpanded = expandedKeys.includes(key);\n\n                return (\n                  <React.Fragment key={key}>\n                    <tr\n                      className={cn(\n                        {\n                          'bg-gray-50': striped && index % 2 === 1,\n                          'hover:bg-gray-50': hoverable && !isSelected,\n                          'bg-primary-50': isSelected,\n                          'cursor-pointer': onRowClick,\n                        }\n                      )}\n                      onClick={() => onRowClick?.(record, index)}\n                    >\n                      {selectable && (\n                        <td className={cn(\n                          'text-center',\n                          cellPaddingClasses[size],\n                          bordered && 'border border-gray-200'\n                        )}>\n                          <Checkbox\n                            checked={isSelected}\n                            onChange={(checked) => handleSelectRow(key, checked)}\n                            size=\"sm\"\n                          />\n                        </td>\n                      )}\n\n                      {columns.map((column) => {\n                        const value = column.dataIndex ? record[column.dataIndex] : record[column.key];\n                        const cellContent = column.render\n                          ? column.render(value, record, index)\n                          : value;\n\n                        return (\n                          <td\n                            key={column.key}\n                            className={cn(\n                              'text-gray-900',\n                              cellPaddingClasses[size],\n                              {\n                                'text-center': column.align === 'center',\n                                'text-right': column.align === 'right',\n                                'border border-gray-200': bordered,\n                              }\n                            )}\n                          >\n                            <div className={cn({\n                              'truncate': column.ellipsis,\n                            })}>\n                              {cellContent}\n                            </div>\n                          </td>\n                        );\n                      })}\n                    </tr>\n\n                    {/* 展开行 */}\n                    {expandable && isExpanded && (\n                      <tr>\n                        <td\n                          colSpan={columns.length + (selectable ? 1 : 0)}\n                          className={cn(\n                            'bg-gray-50',\n                            cellPaddingClasses[size],\n                            bordered && 'border border-gray-200'\n                          )}\n                        >\n                          {expandable.expandedRowRender(record, index)}\n                        </td>\n                      </tr>\n                    )}\n                  </React.Fragment>\n                );\n              })\n            )}\n          </tbody>\n        </table>\n      </div>\n    </div>\n  );\n};\n\nexport default Table;"