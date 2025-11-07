// Admin 相关 hooks 统一导出

export { useAdminStats } from './useAdminStats';
export { useUserManagement } from './useUserManagement';
export { useSystemSettings } from './useSystemSettings';
export { useAuditLogs } from './useAuditLogs';
export { useSystemHealth } from './useSystemHealth';

export type {
  UseAdminStatsReturn,
} from './useAdminStats';

export type {
  UseUserManagementReturn,
} from './useUserManagement';

export type {
  UseSystemSettingsReturn,
} from './useSystemSettings';

export type {
  UseAuditLogsReturn,
} from './useAuditLogs';

export type {
  UseSystemHealthReturn,
} from './useSystemHealth';