import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Theme types
export type Theme = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  border: string;
  shadow: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ThemeConfig {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  colors: ThemeColors;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  systemTheme: ResolvedTheme;
}

// Default theme colors
const lightTheme: ThemeColors = {
  primary: '#3b82f6',
  secondary: '#64748b',
  accent: '#06b6d4',
  background: '#ffffff',
  surface: '#f8fafc',
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#94a3b8',
  },
  border: '#e2e8f0',
  shadow: 'rgba(0, 0, 0, 0.1)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

const darkTheme: ThemeColors = {
  primary: '#60a5fa',
  secondary: '#94a3b8',
  accent: '#22d3ee',
  background: '#0f172a',
  surface: '#1e293b',
  text: {
    primary: '#f1f5f9',
    secondary: '#cbd5e1',
    muted: '#64748b',
  },
  border: '#334155',
  shadow: 'rgba(0, 0, 0, 0.5)',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
};

// Theme context
const ThemeContext = createContext<ThemeConfig | undefined>(undefined);

// Theme provider props
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableSystem?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = 'auto',
  storageKey = 'app-theme',
  enableSystem = true,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Get theme from localStorage or use default
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored && ['light', 'dark', 'auto'].includes(stored)) {
          return stored as Theme;
        }
      } catch {
        // localStorage not available
      }
    }
    return defaultTheme;
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Resolve theme based on current settings
  const resolvedTheme: ResolvedTheme = theme === 'auto' ? systemTheme : theme;

  // Get theme colors
  const colors = resolvedTheme === 'dark' ? darkTheme : lightTheme;

  // Listen for system theme changes
  useEffect(() => {
    if (!enableSystem || typeof window === 'undefined') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [enableSystem]);

  // Update document class and CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    body.classList.remove('light', 'dark');

    // Add current theme class
    root.classList.add(resolvedTheme);
    body.classList.add(resolvedTheme);

    // Update CSS custom properties
    const updateCSSVariables = () => {
      root.style.setProperty('--color-primary', colors.primary);
      root.style.setProperty('--color-secondary', colors.secondary);
      root.style.setProperty('--color-accent', colors.accent);
      root.style.setProperty('--color-background', colors.background);
      root.style.setProperty('--color-surface', colors.surface);
      root.style.setProperty('--color-text-primary', colors.text.primary);
      root.style.setProperty('--color-text-secondary', colors.text.secondary);
      root.style.setProperty('--color-text-muted', colors.text.muted);
      root.style.setProperty('--color-border', colors.border);
      root.style.setProperty('--color-shadow', colors.shadow);
      root.style.setProperty('--color-success', colors.success);
      root.style.setProperty('--color-warning', colors.warning);
      root.style.setProperty('--color-error', colors.error);
      root.style.setProperty('--color-info', colors.info);
    };

    updateCSSVariables();

    // Add transition for smooth theme changes
    const transition = 'color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease';
    root.style.setProperty('transition', transition);
    
    // Remove transition after animation completes
    const timer = setTimeout(() => {
      root.style.removeProperty('transition');
    }, 200);

    return () => clearTimeout(timer);
  }, [resolvedTheme, colors]);

  // Save theme to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      // localStorage not available
    }
  }, [theme, storageKey]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const toggleTheme = () => {
    if (theme === 'auto') {
      setTheme(systemTheme === 'dark' ? 'light' : 'dark');
    } else {
      setTheme(theme === 'light' ? 'dark' : 'light');
    }
  };

  const contextValue: ThemeConfig = {
    theme,
    resolvedTheme,
    colors,
    setTheme: handleSetTheme,
    toggleTheme,
    systemTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Theme hook
export function useTheme(): ThemeConfig {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Theme toggle component
export function ThemeToggle({ 
  className = '',
  size = 'md',
}: { 
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const iconClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className="relative">
      <button
        onClick={toggleTheme}
        className={`
          ${sizeClasses[size]}
          ${className}
          rounded-lg
          border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800
          text-gray-600 dark:text-gray-300
          hover:bg-gray-50 dark:hover:bg-gray-700
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-colors duration-200
          flex items-center justify-center
        `}
        title={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} theme`}
      >
        {resolvedTheme === 'light' ? (
          <svg className={iconClasses[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : (
          <svg className={iconClasses[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
        {theme === 'auto' && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full text-xs text-white flex items-center justify-center">
            A
          </span>
        )}
      </button>
    </div>
  );
}

// Theme selector component
export function ThemeSelector({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const options: Array<{ value: Theme; label: string; icon: React.ReactNode }> = [
    {
      value: 'light',
      label: '浅色模式',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      value: 'dark',
      label: '深色模式',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ),
    },
    {
      value: 'auto',
      label: '跟随系统',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        主题设置
      </label>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`
              p-3 rounded-lg border-2 transition-colors duration-200
              flex flex-col items-center space-y-2
              ${
                theme === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            {option.icon}
            <span className="text-xs font-medium">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// CSS-in-JS theme hook
export function useThemeStyles() {
  const { colors, resolvedTheme } = useTheme();

  return {
    theme: resolvedTheme,
    colors,
    getStyle: (styleObj: Record<string, any>) => {
      return Object.entries(styleObj).reduce((acc, [key, value]) => {
        if (typeof value === 'object' && value !== null) {
          acc[key] = value[resolvedTheme] || value.default || value;
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
    },
  };
}