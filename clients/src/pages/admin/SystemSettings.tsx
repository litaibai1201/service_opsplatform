import React, { useState, useEffect } from 'react';

interface SystemSettings {
  general: {
    siteName: string;
    siteUrl: string;
    description: string;
    logo?: string;
    timezone: string;
    language: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
  authentication: {
    enableRegistration: boolean;
    requireEmailVerification: boolean;
    enableTwoFactor: boolean;
    passwordMinLength: number;
    passwordRequireSpecial: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    smtpSecure: boolean;
    fromEmail: string;
    fromName: string;
  };
  storage: {
    provider: 'local' | 's3' | 'oss';
    maxFileSize: number;
    allowedTypes: string[];
    s3Config?: {
      bucket: string;
      region: string;
      accessKey: string;
      secretKey: string;
    };
  };
  collaboration: {
    maxRoomUsers: number;
    enableRealTimeSync: boolean;
    enableComments: boolean;
    enableChat: boolean;
    autoSaveInterval: number;
  };
  security: {
    enableHttps: boolean;
    enableCors: boolean;
    corsOrigins: string[];
    enableRateLimit: boolean;
    rateLimitRequests: number;
    rateLimitWindow: number;
  };
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      siteName: 'Service Ops Platform',
      siteUrl: 'https://ops.example.com',
      description: '企业服务运营管理平台',
      timezone: 'Asia/Shanghai',
      language: 'zh-CN',
      maintenanceMode: false,
      maintenanceMessage: '系统正在维护中，请稍后访问。',
    },
    authentication: {
      enableRegistration: true,
      requireEmailVerification: true,
      enableTwoFactor: false,
      passwordMinLength: 8,
      passwordRequireSpecial: true,
      sessionTimeout: 24,
      maxLoginAttempts: 5,
    },
    email: {
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      smtpSecure: true,
      fromEmail: 'noreply@example.com',
      fromName: 'Service Ops Platform',
    },
    storage: {
      provider: 'local',
      maxFileSize: 10,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'],
    },
    collaboration: {
      maxRoomUsers: 50,
      enableRealTimeSync: true,
      enableComments: true,
      enableChat: true,
      autoSaveInterval: 30,
    },
    security: {
      enableHttps: true,
      enableCors: true,
      corsOrigins: ['http://localhost:3000'],
      enableRateLimit: true,
      rateLimitRequests: 100,
      rateLimitWindow: 15,
    },
  });

  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const tabs = [
    { id: 'general', name: '常规设置', icon: '⚙️' },
    { id: 'authentication', name: '认证设置', icon: '🔐' },
    { id: 'email', name: '邮箱配置', icon: '📧' },
    { id: 'storage', name: '存储配置', icon: '💾' },
    { id: 'collaboration', name: '协作功能', icon: '🤝' },
    { id: 'security', name: '安全设置', icon: '🛡️' },
  ];

  // 保存设置
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveMessage({ type: 'success', text: '设置保存成功' });
    } catch (error) {
      setSaveMessage({ type: 'error', text: '设置保存失败' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // 测试邮箱配置
  const testEmailConfig = async () => {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveMessage({ type: 'success', text: '测试邮件发送成功' });
    } catch (error) {
      setSaveMessage({ type: 'error', text: '测试邮件发送失败' });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">系统设置</h1>
        <p className="text-gray-600 mt-2">配置系统参数和功能选项</p>
      </div>

      {/* 保存消息 */}
      {saveMessage && (
        <div className={`mb-6 p-4 rounded-lg ${
          saveMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {saveMessage.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="flex">
          {/* 侧边栏 */}
          <div className="w-64 bg-gray-50 border-r">
            <nav className="p-4 space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span>{tab.icon}</span>
                    <span className="font-medium">{tab.name}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* 主内容区 */}
          <div className="flex-1">
            <div className="p-6">
              {/* 常规设置 */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">常规设置</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        站点名称
                      </label>
                      <input
                        type="text"
                        value={settings.general.siteName}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          general: { ...prev.general, siteName: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        站点URL
                      </label>
                      <input
                        type="url"
                        value={settings.general.siteUrl}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          general: { ...prev.general, siteUrl: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        站点描述
                      </label>
                      <textarea
                        value={settings.general.description}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          general: { ...prev.general, description: e.target.value }
                        }))}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        时区
                      </label>
                      <select
                        value={settings.general.timezone}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          general: { ...prev.general, timezone: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Asia/Shanghai">北京时间 (UTC+8)</option>
                        <option value="UTC">协调世界时 (UTC)</option>
                        <option value="America/New_York">美东时间</option>
                        <option value="Europe/London">伦敦时间</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        语言
                      </label>
                      <select
                        value={settings.general.language}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          general: { ...prev.general, language: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="zh-CN">简体中文</option>
                        <option value="en-US">English</option>
                        <option value="ja-JP">日本語</option>
                        <option value="ko-KR">한국어</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">维护模式</h4>
                        <p className="text-sm text-gray-500">启用后，普通用户无法访问系统</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.general.maintenanceMode}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          general: { ...prev.general, maintenanceMode: e.target.checked }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>

                    {settings.general.maintenanceMode && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          维护提示信息
                        </label>
                        <textarea
                          value={settings.general.maintenanceMessage}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            general: { ...prev.general, maintenanceMessage: e.target.value }
                          }))}
                          rows={2}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 认证设置 */}
              {activeTab === 'authentication' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">认证设置</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">允许用户注册</h4>
                        <p className="text-sm text-gray-500">是否允许新用户自行注册</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.authentication.enableRegistration}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          authentication: { ...prev.authentication, enableRegistration: e.target.checked }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">邮箱验证</h4>
                        <p className="text-sm text-gray-500">注册后需要验证邮箱</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.authentication.requireEmailVerification}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          authentication: { ...prev.authentication, requireEmailVerification: e.target.checked }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">两步验证</h4>
                        <p className="text-sm text-gray-500">启用双因子认证</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.authentication.enableTwoFactor}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          authentication: { ...prev.authentication, enableTwoFactor: e.target.checked }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        最小密码长度
                      </label>
                      <input
                        type="number"
                        min="6"
                        max="32"
                        value={settings.authentication.passwordMinLength}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          authentication: { ...prev.authentication, passwordMinLength: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        会话超时 (小时)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={settings.authentication.sessionTimeout}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          authentication: { ...prev.authentication, sessionTimeout: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        最大登录失败次数
                      </label>
                      <input
                        type="number"
                        min="3"
                        max="20"
                        value={settings.authentication.maxLoginAttempts}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          authentication: { ...prev.authentication, maxLoginAttempts: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 邮箱配置 */}
              {activeTab === 'email' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">邮箱配置</h3>
                    <button
                      onClick={testEmailConfig}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      测试邮件发送
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SMTP 服务器
                      </label>
                      <input
                        type="text"
                        value={settings.email.smtpHost}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          email: { ...prev.email, smtpHost: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="smtp.gmail.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SMTP 端口
                      </label>
                      <input
                        type="number"
                        value={settings.email.smtpPort}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          email: { ...prev.email, smtpPort: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        用户名
                      </label>
                      <input
                        type="text"
                        value={settings.email.smtpUser}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          email: { ...prev.email, smtpUser: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        密码
                      </label>
                      <input
                        type="password"
                        value={settings.email.smtpPassword}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          email: { ...prev.email, smtpPassword: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        发件人邮箱
                      </label>
                      <input
                        type="email"
                        value={settings.email.fromEmail}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          email: { ...prev.email, fromEmail: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        发件人名称
                      </label>
                      <input
                        type="text"
                        value={settings.email.fromName}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          email: { ...prev.email, fromName: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">启用 SSL/TLS</h4>
                      <p className="text-sm text-gray-500">使用加密连接发送邮件</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.email.smtpSecure}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        email: { ...prev.email, smtpSecure: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* 其他标签页内容... */}
              {/* 为了节省空间，这里简化了其他标签页的实现 */}
              
              {activeTab !== 'general' && activeTab !== 'authentication' && activeTab !== 'email' && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🚧</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">功能开发中</h3>
                  <p className="text-gray-500">{tabs.find(t => t.id === activeTab)?.name} 配置界面正在开发中...</p>
                </div>
              )}
            </div>

            {/* 底部操作栏 */}
            <div className="border-t p-6 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  * 修改某些设置可能需要重启系统才能生效
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? '保存中...' : '保存设置'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}