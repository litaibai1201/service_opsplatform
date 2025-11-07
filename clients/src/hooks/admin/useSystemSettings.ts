import { useState, useEffect, useCallback } from 'react';
import { adminApi, SystemSettings } from '@/services/api';

export interface UseSystemSettingsReturn {
  settings: SystemSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  saveError: string | null;
  updateSettings: (settings: Partial<SystemSettings>) => Promise<void>;
  testEmailSettings: (emailSettings: any) => Promise<{ success: boolean; message: string }>;
  refreshSettings: () => Promise<void>;
}

export const useSystemSettings = (): UseSystemSettingsReturn => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const refreshSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const settingsData = await adminApi.getSystemSettings();
      setSettings(settingsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取系统设置失败');
      console.error('Failed to fetch system settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<SystemSettings>) => {
    try {
      setIsSaving(true);
      setSaveError(null);

      const updatedSettings = await adminApi.updateSystemSettings(newSettings);
      setSettings(updatedSettings);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存设置失败');
      console.error('Failed to update system settings:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const testEmailSettings = useCallback(async (emailSettings: any): Promise<{ success: boolean; message: string }> => {
    try {
      return await adminApi.testEmailSettings(emailSettings);
    } catch (err) {
      console.error('Failed to test email settings:', err);
      throw err;
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  return {
    settings,
    isLoading,
    isSaving,
    error,
    saveError,
    updateSettings,
    testEmailSettings,
    refreshSettings,
  };
};