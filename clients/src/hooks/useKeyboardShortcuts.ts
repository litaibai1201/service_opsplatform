import { useEffect, useRef, useCallback } from 'react';

// 键盘修饰键
export interface KeyModifiers {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Command key on Mac, Windows key on PC
}

// 快捷键配置
export interface ShortcutConfig {
  key: string;
  modifiers?: KeyModifiers;
  description?: string;
  global?: boolean; // 是否全局快捷键（即使在输入框中也生效）
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

// 快捷键处理函数类型
export type ShortcutHandler = (event: KeyboardEvent) => void;

// 快捷键映射
export interface ShortcutMapping {
  [shortcutId: string]: {
    config: ShortcutConfig;
    handler: ShortcutHandler;
  };
}

// 检查是否在可输入元素中
const isInputElement = (element: Element): boolean => {
  const tagName = element.tagName.toLowerCase();
  const isInput = ['input', 'textarea', 'select'].includes(tagName);
  const isContentEditable = element.getAttribute('contenteditable') === 'true';
  return isInput || isContentEditable;
};

// 规范化快捷键字符串
const normalizeKey = (key: string): string => {
  // 处理特殊键名映射
  const keyMap: { [key: string]: string } = {
    ' ': 'Space',
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
    'Escape': 'Esc',
  };

  return keyMap[key] || key.toLowerCase();
};

// 生成快捷键字符串标识
const getShortcutId = (config: ShortcutConfig): string => {
  const modifiers = [];
  
  if (config.modifiers?.ctrl) modifiers.push('ctrl');
  if (config.modifiers?.shift) modifiers.push('shift');
  if (config.modifiers?.alt) modifiers.push('alt');
  if (config.modifiers?.meta) modifiers.push('meta');
  
  modifiers.push(normalizeKey(config.key));
  
  return modifiers.join('+');
};

// 检查事件是否匹配快捷键配置
const matchesShortcut = (event: KeyboardEvent, config: ShortcutConfig): boolean => {
  const eventKey = normalizeKey(event.key);
  const configKey = normalizeKey(config.key);
  
  if (eventKey !== configKey) return false;
  
  const modifiers = config.modifiers || {};
  
  return (
    !!event.ctrlKey === !!modifiers.ctrl &&
    !!event.shiftKey === !!modifiers.shift &&
    !!event.altKey === !!modifiers.alt &&
    !!event.metaKey === !!modifiers.meta
  );
};

// 快捷键管理器类
class ShortcutManager {
  private shortcuts: ShortcutMapping = {};
  private isEnabled = true;

  // 注册快捷键
  register(id: string, config: ShortcutConfig, handler: ShortcutHandler): () => void {
    this.shortcuts[id] = { config, handler };
    
    // 返回取消注册函数
    return () => {
      delete this.shortcuts[id];
    };
  }

  // 处理键盘事件
  handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isEnabled) return;

    const target = event.target as Element;
    const inInputElement = isInputElement(target);

    for (const [id, { config, handler }] of Object.entries(this.shortcuts)) {
      // 如果在输入元素中且快捷键不是全局的，则跳过
      if (inInputElement && !config.global) continue;

      if (matchesShortcut(event, config)) {
        if (config.preventDefault) {
          event.preventDefault();
        }
        if (config.stopPropagation) {
          event.stopPropagation();
        }
        
        handler(event);
        break; // 只执行第一个匹配的快捷键
      }
    }
  };

  // 启用/禁用快捷键
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // 获取所有已注册的快捷键
  getShortcuts(): Array<{ id: string; config: ShortcutConfig; shortcut: string }> {
    return Object.entries(this.shortcuts).map(([id, { config }]) => ({
      id,
      config,
      shortcut: getShortcutId(config),
    }));
  }

  // 清空所有快捷键
  clear(): void {
    this.shortcuts = {};
  }
}

// 全局快捷键管理器实例
const globalShortcutManager = new ShortcutManager();

// 初始化全局事件监听器
if (typeof window !== 'undefined') {
  document.addEventListener('keydown', globalShortcutManager.handleKeyDown);
}

// 主要的快捷键Hook
export function useKeyboardShortcuts(
  shortcuts: Array<{
    id: string;
    config: ShortcutConfig;
    handler: ShortcutHandler;
    enabled?: boolean;
  }>,
  deps: React.DependencyList = []
): void {
  const unregisterFunctions = useRef<Array<() => void>>([]);

  const registerShortcuts = useCallback(() => {
    // 清理之前的快捷键
    unregisterFunctions.current.forEach(unregister => unregister());
    unregisterFunctions.current = [];

    // 注册新的快捷键
    shortcuts.forEach(({ id, config, handler, enabled = true }) => {
      if (enabled) {
        const unregister = globalShortcutManager.register(id, config, handler);
        unregisterFunctions.current.push(unregister);
      }
    });
  }, [shortcuts, ...deps]);

  useEffect(() => {
    registerShortcuts();

    // 清理函数
    return () => {
      unregisterFunctions.current.forEach(unregister => unregister());
      unregisterFunctions.current = [];
    };
  }, [registerShortcuts]);
}

// 单个快捷键Hook
export function useKeyboardShortcut(
  config: ShortcutConfig,
  handler: ShortcutHandler,
  enabled: boolean = true
): void {
  useKeyboardShortcuts([
    {
      id: getShortcutId(config),
      config,
      handler,
      enabled,
    }
  ], [config.key, enabled]);
}

// 快捷键显示组件Hook
export function useShortcutDisplay(shortcut: ShortcutConfig): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  const parts: string[] = [];
  
  if (shortcut.modifiers?.meta) {
    parts.push(isMac ? '⌘' : 'Win');
  }
  if (shortcut.modifiers?.ctrl) {
    parts.push(isMac ? '⌃' : 'Ctrl');
  }
  if (shortcut.modifiers?.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (shortcut.modifiers?.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  
  // 特殊键名显示
  const keyDisplayMap: { [key: string]: string } = {
    ' ': 'Space',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Escape': 'Esc',
    'Enter': '↵',
    'Backspace': '⌫',
    'Delete': '⌦',
    'Tab': '⇥',
  };
  
  const displayKey = keyDisplayMap[shortcut.key] || shortcut.key.toUpperCase();
  parts.push(displayKey);
  
  return parts.join(isMac ? '' : '+');
}

// 全局快捷键Hook（应用级别）
export function useGlobalShortcuts(): {
  shortcuts: Array<{ id: string; config: ShortcutConfig; shortcut: string }>;
  enable: () => void;
  disable: () => void;
  isEnabled: boolean;
} {
  const isEnabledRef = useRef(true);

  return {
    shortcuts: globalShortcutManager.getShortcuts(),
    enable: () => {
      globalShortcutManager.setEnabled(true);
      isEnabledRef.current = true;
    },
    disable: () => {
      globalShortcutManager.setEnabled(false);
      isEnabledRef.current = false;
    },
    isEnabled: isEnabledRef.current,
  };
}

// 预定义的应用快捷键
export const APP_SHORTCUTS = {
  // 全局快捷键
  SEARCH: {
    key: 'k',
    modifiers: { ctrl: true },
    description: '搜索',
    global: true,
  },
  HELP: {
    key: '?',
    modifiers: { shift: true },
    description: '显示帮助',
    global: true,
  },
  THEME_TOGGLE: {
    key: 'd',
    modifiers: { ctrl: true, shift: true },
    description: '切换主题',
    global: true,
  },
  
  // 导航快捷键
  GO_DASHBOARD: {
    key: '1',
    modifiers: { ctrl: true },
    description: '跳转到仪表板',
    global: true,
  },
  GO_TEAMS: {
    key: '2',
    modifiers: { ctrl: true },
    description: '跳转到团队',
    global: true,
  },
  GO_PROJECTS: {
    key: '3',
    modifiers: { ctrl: true },
    description: '跳转到项目',
    global: true,
  },
  GO_DESIGN_TOOLS: {
    key: '4',
    modifiers: { ctrl: true },
    description: '跳转到设计工具',
    global: true,
  },
  
  // 编辑快捷键
  SAVE: {
    key: 's',
    modifiers: { ctrl: true },
    description: '保存',
    global: false,
  },
  UNDO: {
    key: 'z',
    modifiers: { ctrl: true },
    description: '撤销',
    global: false,
  },
  REDO: {
    key: 'y',
    modifiers: { ctrl: true },
    description: '重做',
    global: false,
  },
  
  // 其他常用快捷键
  ESCAPE: {
    key: 'Escape',
    description: '取消/关闭',
    global: true,
  },
  ENTER: {
    key: 'Enter',
    description: '确认',
    global: false,
  },
} as const;

// 快捷键帮助组件的数据Hook
export function useShortcutHelp(): Array<{
  category: string;
  shortcuts: Array<{
    display: string;
    description: string;
    keys: ShortcutConfig;
  }>;
}> {
  return [
    {
      category: '全局快捷键',
      shortcuts: [
        {
          display: useShortcutDisplay(APP_SHORTCUTS.SEARCH),
          description: APP_SHORTCUTS.SEARCH.description!,
          keys: APP_SHORTCUTS.SEARCH,
        },
        {
          display: useShortcutDisplay(APP_SHORTCUTS.HELP),
          description: APP_SHORTCUTS.HELP.description!,
          keys: APP_SHORTCUTS.HELP,
        },
        {
          display: useShortcutDisplay(APP_SHORTCUTS.THEME_TOGGLE),
          description: APP_SHORTCUTS.THEME_TOGGLE.description!,
          keys: APP_SHORTCUTS.THEME_TOGGLE,
        },
      ],
    },
    {
      category: '导航',
      shortcuts: [
        {
          display: useShortcutDisplay(APP_SHORTCUTS.GO_DASHBOARD),
          description: APP_SHORTCUTS.GO_DASHBOARD.description!,
          keys: APP_SHORTCUTS.GO_DASHBOARD,
        },
        {
          display: useShortcutDisplay(APP_SHORTCUTS.GO_TEAMS),
          description: APP_SHORTCUTS.GO_TEAMS.description!,
          keys: APP_SHORTCUTS.GO_TEAMS,
        },
        {
          display: useShortcutDisplay(APP_SHORTCUTS.GO_PROJECTS),
          description: APP_SHORTCUTS.GO_PROJECTS.description!,
          keys: APP_SHORTCUTS.GO_PROJECTS,
        },
      ],
    },
    {
      category: '编辑',
      shortcuts: [
        {
          display: useShortcutDisplay(APP_SHORTCUTS.SAVE),
          description: APP_SHORTCUTS.SAVE.description!,
          keys: APP_SHORTCUTS.SAVE,
        },
        {
          display: useShortcutDisplay(APP_SHORTCUTS.UNDO),
          description: APP_SHORTCUTS.UNDO.description!,
          keys: APP_SHORTCUTS.UNDO,
        },
        {
          display: useShortcutDisplay(APP_SHORTCUTS.REDO),
          description: APP_SHORTCUTS.REDO.description!,
          keys: APP_SHORTCUTS.REDO,
        },
      ],
    },
  ];
}