// Design Tools API Services
export { diagramApi } from './diagramApi';
export { flowApi } from './flowApi';
export { apiSpecApi } from './apiSpecApi';
export { databaseApi } from './databaseApi';
export { featureMapApi } from './featureMapApi';

// Types exports for convenience
export type {
  // Diagram API types
  DiagramNode,
  DiagramConnection,
  Diagram,
  CreateDiagramRequest,
  UpdateDiagramRequest,
  DiagramTemplate
} from './diagramApi';

export type {
  // Flow API types
  FlowNode,
  FlowConnection,
  FlowDiagram,
  CreateFlowRequest,
  UpdateFlowRequest,
  FlowExecution,
  FlowValidationResult
} from './flowApi';

export type {
  // API Spec types
  ApiParameter,
  ApiRequestBody,
  ApiResponse,
  ApiEndpoint,
  ApiSpec,
  CreateApiSpecRequest,
  UpdateApiSpecRequest,
  MockServer,
  ApiTest,
  TestResult
} from './apiSpecApi';

export type {
  // Database API types
  DatabaseColumn,
  DatabaseIndex,
  DatabaseConstraint,
  DatabaseTable,
  DatabaseView,
  DatabaseProcedure,
  DatabaseTrigger,
  DatabaseSchema,
  CreateDatabaseSchemaRequest,
  UpdateDatabaseSchemaRequest,
  SchemaValidationResult,
  SqlGenerationOptions
} from './databaseApi';

export type {
  // Feature Map types
  Feature,
  Connection,
  Milestone,
  FeatureMap,
  CreateFeatureMapRequest,
  UpdateFeatureMapRequest,
  FeatureAnalytics,
  RoadmapView,
  FeatureTemplate
} from './featureMapApi';

// Common design tools utilities
export const designToolsUtils = {
  // 生成唯一ID
  generateId: (prefix: string = 'item') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  // 颜色工具
  colors: {
    // 预定义颜色palette
    palette: [
      '#3b82f6', // blue
      '#ef4444', // red
      '#10b981', // green
      '#f59e0b', // yellow
      '#8b5cf6', // purple
      '#f97316', // orange
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#ec4899', // pink
      '#6b7280', // gray
    ],
    
    // 根据类型获取颜色
    getTypeColor: (type: string) => {
      const colorMap: Record<string, string> = {
        epic: '#8b5cf6',
        feature: '#3b82f6',
        story: '#10b981',
        task: '#f59e0b',
        bug: '#ef4444',
        process: '#06b6d4',
        decision: '#f97316',
        start: '#10b981',
        end: '#ef4444',
        table: '#3b82f6',
        view: '#8b5cf6',
        procedure: '#f59e0b',
      };
      return colorMap[type] || '#6b7280';
    },

    // 根据状态获取颜色
    getStatusColor: (status: string) => {
      const colorMap: Record<string, string> = {
        planned: '#6b7280',
        'in-progress': '#3b82f6',
        completed: '#10b981',
        cancelled: '#ef4444',
        'on-hold': '#f59e0b',
        running: '#3b82f6',
        stopped: '#6b7280',
        error: '#ef4444',
      };
      return colorMap[status] || '#6b7280';
    },

    // 根据优先级获取颜色
    getPriorityColor: (priority: string) => {
      const colorMap: Record<string, string> = {
        critical: '#ef4444',
        high: '#f97316',
        medium: '#f59e0b',
        low: '#10b981',
      };
      return colorMap[priority] || '#6b7280';
    },
  },

  // 位置和布局工具
  layout: {
    // 自动布局算法 - 层次布局
    hierarchical: (nodes: Array<{ id: string; parent?: string }>) => {
      const positions: Record<string, { x: number; y: number }> = {};
      const levels: Record<string, number> = {};
      
      // 计算层级
      const calculateLevel = (nodeId: string, level: number = 0): void => {
        if (levels[nodeId] !== undefined) return;
        levels[nodeId] = level;
        
        const children = nodes.filter(n => n.parent === nodeId);
        children.forEach(child => calculateLevel(child.id, level + 1));
      };

      // 找到根节点
      const roots = nodes.filter(n => !n.parent);
      roots.forEach(root => calculateLevel(root.id));

      // 按层级分组
      const maxLevel = Math.max(...Object.values(levels));
      for (let level = 0; level <= maxLevel; level++) {
        const nodesInLevel = Object.entries(levels)
          .filter(([, l]) => l === level)
          .map(([id]) => id);
        
        nodesInLevel.forEach((nodeId, index) => {
          positions[nodeId] = {
            x: 50 + index * 200,
            y: 50 + level * 150
          };
        });
      }

      return positions;
    },

    // 网格布局
    grid: (nodes: Array<{ id: string }>, columns: number = 3) => {
      const positions: Record<string, { x: number; y: number }> = {};
      
      nodes.forEach((node, index) => {
        const row = Math.floor(index / columns);
        const col = index % columns;
        positions[node.id] = {
          x: 50 + col * 200,
          y: 50 + row * 150
        };
      });

      return positions;
    },

    // 圆形布局
    circular: (nodes: Array<{ id: string }>, centerX: number = 400, centerY: number = 300, radius: number = 200) => {
      const positions: Record<string, { x: number; y: number }> = {};
      const angleStep = (2 * Math.PI) / nodes.length;
      
      nodes.forEach((node, index) => {
        const angle = index * angleStep;
        positions[node.id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      });

      return positions;
    },
  },

  // 导出工具
  export: {
    // 导出为JSON
    toJson: (data: any) => {
      return JSON.stringify(data, null, 2);
    },

    // 导出为CSV
    toCsv: (data: any[], headers: string[]) => {
      const csvHeaders = headers.join(',');
      const csvRows = data.map(item => 
        headers.map(header => {
          const value = item[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      );
      return [csvHeaders, ...csvRows].join('\n');
    },

    // 创建下载链接
    download: (content: string | Blob, filename: string) => {
      const blob = typeof content === 'string' 
        ? new Blob([content], { type: 'text/plain' })
        : content;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
  },

  // 验证工具
  validation: {
    // 验证ID格式
    isValidId: (id: string) => /^[a-zA-Z0-9_-]+$/.test(id),

    // 验证名称
    isValidName: (name: string) => name.trim().length > 0 && name.length <= 100,

    // 验证颜色
    isValidColor: (color: string) => /^#[0-9A-F]{6}$/i.test(color),

    // 验证邮箱
    isValidEmail: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),

    // 验证URL
    isValidUrl: (url: string) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    },
  },

  // 搜索和过滤工具
  search: {
    // 模糊搜索
    fuzzyMatch: (query: string, text: string) => {
      const queryLower = query.toLowerCase();
      const textLower = text.toLowerCase();
      
      let queryIndex = 0;
      for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
        if (textLower[i] === queryLower[queryIndex]) {
          queryIndex++;
        }
      }
      
      return queryIndex === queryLower.length;
    },

    // 高亮搜索结果
    highlight: (text: string, query: string) => {
      if (!query) return text;
      
      const regex = new RegExp(`(${query})`, 'gi');
      return text.replace(regex, '<mark>$1</mark>');
    },

    // 过滤数组
    filter: <T>(items: T[], filters: Record<string, any>) => {
      return items.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
          if (value === undefined || value === '' || value === 'all') return true;
          
          const itemValue = (item as any)[key];
          
          if (Array.isArray(value)) {
            return Array.isArray(itemValue) 
              ? value.some(v => itemValue.includes(v))
              : value.includes(itemValue);
          }
          
          if (Array.isArray(itemValue)) {
            return itemValue.includes(value);
          }
          
          return itemValue === value;
        });
      });
    },
  },

  // 时间工具
  time: {
    // 格式化日期
    formatDate: (date: Date | string, format: 'short' | 'medium' | 'long' = 'medium') => {
      const d = typeof date === 'string' ? new Date(date) : date;
      
      switch (format) {
        case 'short':
          return d.toLocaleDateString();
        case 'long':
          return d.toLocaleDateString('zh-CN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
          });
        default:
          return d.toLocaleDateString('zh-CN', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
      }
    },

    // 计算持续时间
    duration: (start: Date | string, end: Date | string) => {
      const startDate = typeof start === 'string' ? new Date(start) : start;
      const endDate = typeof end === 'string' ? new Date(end) : end;
      
      const diffMs = endDate.getTime() - startDate.getTime();
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      if (days < 7) return `${days} 天`;
      if (days < 30) return `${Math.ceil(days / 7)} 周`;
      if (days < 365) return `${Math.ceil(days / 30)} 月`;
      return `${Math.ceil(days / 365)} 年`;
    },

    // 相对时间
    relative: (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return '今天';
      if (diffDays === 1) return '昨天';
      if (diffDays < 7) return `${diffDays} 天前`;
      if (diffDays < 30) return `${Math.ceil(diffDays / 7)} 周前`;
      if (diffDays < 365) return `${Math.ceil(diffDays / 30)} 月前`;
      return `${Math.ceil(diffDays / 365)} 年前`;
    },
  },
};