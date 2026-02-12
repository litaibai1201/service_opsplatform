// 协作相关Hooks统一导出
export { default as useWebSocket } from './useWebSocket';
export { default as usePresence } from './usePresence';

// 导出类型
export type { UseWebSocketOptions, UseWebSocketReturn } from './useWebSocket';
export type { UsePresenceOptions, UsePresenceReturn, PresenceUser } from './usePresence';
