// 导出所有类型定义
export * from './entities';
export * from './api';

// 全局类型定义
export interface AppConfig {
  apiBaseUrl: string;
  wsBaseUrl: string;
  appName: string;
  version: string;
  features: {
    collaboration: boolean;
    versionControl: boolean;
    realTimeUpdates: boolean;
    fileUpload: boolean;
    export: boolean;
    analytics: boolean;
  };
  limits: {
    maxFileSize: number;
    maxProjectsPerTeam: number;
    maxMembersPerTeam: number;
    maxDiagramNodes: number;
  };
}

export interface AppState {
  user: User | null;
  currentTeam: Team | null;
  currentProject: Project | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface RouteParams {
  teamId?: string;
  projectId?: string;
  diagramId?: string;
  apiSpecId?: string;
  dbDesignId?: string;
  featureMapId?: string;
  [key: string]: string | undefined;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
  href?: string;
  children?: NavigationItem[];
  badge?: string | number;
  disabled?: boolean;
  requiredPermission?: string;
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
}

export interface UserPreferences {
  theme: ThemeConfig;
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
    types: {
      mentions: boolean;
      updates: boolean;
      invitations: boolean;
      reviews: boolean;
    };
  };
  editor: {
    autoSave: boolean;
    autoSaveInterval: number;
    showGrid: boolean;
    snapToGrid: boolean;
    minimap: boolean;
    lineNumbers: boolean;
    wordWrap: boolean;
  };
  collaboration: {
    showCursors: boolean;
    showSelections: boolean;
    conflictResolution: 'auto' | 'manual';
  };
}

// React 组件相关类型
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface PageProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
}

export interface FormProps {
  onSubmit: (data: any) => void | Promise<void>;
  isSubmitting?: boolean;
  disabled?: boolean;
  initialValues?: any;
}

export interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  selection?: {
    selectedKeys: string[];
    onChange: (keys: string[]) => void;
  };
  sorting?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    onChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  };
}

export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  fixed?: 'left' | 'right';
}

// 编辑器相关类型
export interface EditorConfig {
  readOnly?: boolean;
  theme?: 'light' | 'dark';
  language?: string;
  fontSize?: number;
  minimap?: boolean;
  lineNumbers?: boolean;
  wordWrap?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

export interface EditorPosition {
  line: number;
  column: number;
}

export interface EditorSelection {
  start: EditorPosition;
  end: EditorPosition;
}

export interface EditorChange {
  type: 'insert' | 'delete' | 'replace';
  position: EditorPosition;
  content: string;
  length?: number;
}

// 图表相关类型
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    legend?: {
      display?: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    tooltip?: {
      enabled?: boolean;
    };
  };
  scales?: {
    x?: {
      display?: boolean;
      title?: {
        display?: boolean;
        text?: string;
      };
    };
    y?: {
      display?: boolean;
      title?: {
        display?: boolean;
        text?: string;
      };
    };
  };
}

// 错误处理相关类型
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  stack?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface FormErrors {
  [field: string]: string | string[];
}

// 状态管理相关类型
export interface AsyncState<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated?: string;
}

export interface ListState<T = any> extends AsyncState<T[]> {
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  filters: Record<string, any>;
  sorting: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

export interface CacheState<T = any> {
  [key: string]: {
    data: T;
    timestamp: number;
    ttl: number;
  };
}

// 工具函数相关类型
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

export type ValueOf<T> = T[keyof T];

export type ArrayElement<T> = T extends (infer U)[] ? U : never;