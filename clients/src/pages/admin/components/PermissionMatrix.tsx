import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'editor' | 'viewer';
  permissions: string[];
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  isSystemLevel: boolean;
}

interface PermissionCategory {
  name: string;
  permissions: Permission[];
}

interface PermissionMatrixProps {
  user: User;
  onClose: () => void;
  onSubmit: (permissions: string[]) => void;
}

export default function PermissionMatrix({ user, onClose, onSubmit }: PermissionMatrixProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set(user.permissions));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 权限定义
  const permissionCategories: PermissionCategory[] = [
    {
      name: '用户管理',
      permissions: [
        { id: 'users.read', name: '查看用户', description: '查看用户列表和详情', category: '用户管理', isSystemLevel: false },
        { id: 'users.create', name: '创建用户', description: '创建新用户账户', category: '用户管理', isSystemLevel: true },
        { id: 'users.update', name: '编辑用户', description: '编辑用户信息', category: '用户管理', isSystemLevel: true },
        { id: 'users.delete', name: '删除用户', description: '删除用户账户', category: '用户管理', isSystemLevel: true },
        { id: 'users.manage_roles', name: '管理角色', description: '分配和修改用户角色', category: '用户管理', isSystemLevel: true },
        { id: 'users.manage_permissions', name: '管理权限', description: '分配和修改用户权限', category: '用户管理', isSystemLevel: true },
      ]
    },
    {
      name: '团队管理',
      permissions: [
        { id: 'teams.read', name: '查看团队', description: '查看团队列表和详情', category: '团队管理', isSystemLevel: false },
        { id: 'teams.create', name: '创建团队', description: '创建新团队', category: '团队管理', isSystemLevel: false },
        { id: 'teams.update', name: '编辑团队', description: '编辑团队信息', category: '团队管理', isSystemLevel: false },
        { id: 'teams.delete', name: '删除团队', description: '删除团队', category: '团队管理', isSystemLevel: true },
        { id: 'teams.manage_members', name: '管理成员', description: '添加、移除团队成员', category: '团队管理', isSystemLevel: false },
        { id: 'teams.manage_settings', name: '管理设置', description: '修改团队设置', category: '团队管理', isSystemLevel: false },
      ]
    },
    {
      name: '项目管理',
      permissions: [
        { id: 'projects.read', name: '查看项目', description: '查看项目列表和详情', category: '项目管理', isSystemLevel: false },
        { id: 'projects.create', name: '创建项目', description: '创建新项目', category: '项目管理', isSystemLevel: false },
        { id: 'projects.update', name: '编辑项目', description: '编辑项目信息', category: '项目管理', isSystemLevel: false },
        { id: 'projects.delete', name: '删除项目', description: '删除项目', category: '项目管理', isSystemLevel: true },
        { id: 'projects.manage_access', name: '管理访问权限', description: '管理项目访问权限', category: '项目管理', isSystemLevel: false },
        { id: 'projects.manage_files', name: '管理文件', description: '上传、删除项目文件', category: '项目管理', isSystemLevel: false },
      ]
    },
    {
      name: '设计工具',
      permissions: [
        { id: 'design_tools.use', name: '使用设计工具', description: '访问和使用设计工具', category: '设计工具', isSystemLevel: false },
        { id: 'design_tools.export', name: '导出设计', description: '导出设计文件和图表', category: '设计工具', isSystemLevel: false },
        { id: 'design_tools.share', name: '分享设计', description: '分享设计给其他用户', category: '设计工具', isSystemLevel: false },
        { id: 'design_tools.collaborate', name: '协作编辑', description: '实时协作编辑设计', category: '设计工具', isSystemLevel: false },
        { id: 'design_tools.templates', name: '管理模板', description: '创建和管理设计模板', category: '设计工具', isSystemLevel: false },
        { id: 'design_tools.advanced', name: '高级功能', description: '使用高级设计功能', category: '设计工具', isSystemLevel: false },
      ]
    },
    {
      name: '系统管理',
      permissions: [
        { id: 'system.settings', name: '系统设置', description: '管理系统配置', category: '系统管理', isSystemLevel: true },
        { id: 'system.monitoring', name: '系统监控', description: '查看系统监控数据', category: '系统管理', isSystemLevel: true },
        { id: 'system.logs', name: '审计日志', description: '查看系统审计日志', category: '系统管理', isSystemLevel: true },
        { id: 'system.backup', name: '数据备份', description: '执行和管理数据备份', category: '系统管理', isSystemLevel: true },
        { id: 'system.maintenance', name: '系统维护', description: '执行系统维护任务', category: '系统管理', isSystemLevel: true },
        { id: 'system.security', name: '安全管理', description: '管理系统安全设置', category: '系统管理', isSystemLevel: true },
      ]
    },
  ];

  // 获取所有权限
  const allPermissions = permissionCategories.flatMap(cat => cat.permissions);

  // 根据角色获取默认权限
  const getRoleDefaultPermissions = (role: string): string[] => {
    switch (role) {
      case 'admin':
        return allPermissions.map(p => p.id);
      case 'manager':
        return allPermissions.filter(p => !p.isSystemLevel || ['system.monitoring', 'system.logs'].includes(p.id)).map(p => p.id);
      case 'editor':
        return allPermissions.filter(p => 
          !p.isSystemLevel && 
          !p.id.includes('delete') && 
          !p.id.includes('manage_roles') && 
          !p.id.includes('manage_permissions')
        ).map(p => p.id);
      case 'viewer':
        return allPermissions.filter(p => p.id.includes('read') || p.id === 'design_tools.use').map(p => p.id);
      default:
        return [];
    }
  };

  // 过滤权限
  const filteredCategories = permissionCategories.map(category => ({
    ...category,
    permissions: category.permissions.filter(permission => {
      const matchesSearch = permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          permission.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || category.name === selectedCategory;
      return matchesSearch && matchesCategory;
    })
  })).filter(category => category.permissions.length > 0);

  // 切换权限
  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId);
      } else {
        newSet.add(permissionId);
      }
      return newSet;
    });
  };

  // 切换整个分类
  const toggleCategory = (categoryName: string) => {
    const categoryPermissions = permissionCategories.find(cat => cat.name === categoryName)?.permissions || [];
    const categoryPermissionIds = categoryPermissions.map(p => p.id);
    
    const allSelected = categoryPermissionIds.every(id => selectedPermissions.has(id));
    
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        categoryPermissionIds.forEach(id => newSet.delete(id));
      } else {
        categoryPermissionIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  };

  // 应用角色默认权限
  const applyRoleDefaults = () => {
    const defaultPermissions = getRoleDefaultPermissions(user.role);
    setSelectedPermissions(new Set(defaultPermissions));
  };

  // 提交权限修改
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(Array.from(selectedPermissions));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取权限级别样式
  const getPermissionLevelStyle = (isSystemLevel: boolean) => {
    return isSystemLevel ? 'text-red-600 text-xs' : 'text-gray-500 text-xs';
  };

  const getPermissionLevelText = (isSystemLevel: boolean) => {
    return isSystemLevel ? '系统级' : '普通';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">权限管理</h3>
              <p className="text-sm text-gray-600 mt-1">
                为用户 <span className="font-medium">{user.fullName}</span> ({user.role}) 配置权限
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 操作栏 */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              {/* 搜索 */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索权限..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* 分类过滤 */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">所有分类</option>
                {permissionCategories.map(category => (
                  <option key={category.name} value={category.name}>{category.name}</option>
                ))}
              </select>
            </div>

            {/* 快捷操作 */}
            <div className="flex space-x-3">
              <button
                onClick={applyRoleDefaults}
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
              >
                应用角色默认权限
              </button>
              <button
                onClick={() => setSelectedPermissions(new Set())}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                清除所有
              </button>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="mt-4 text-sm text-gray-600">
            已选择 {selectedPermissions.size} / {allPermissions.length} 个权限
          </div>
        </div>

        {/* 权限列表 */}
        <div className="p-6">
          <div className="space-y-6">
            {filteredCategories.map((category) => {
              const categoryPermissions = category.permissions;
              const selectedCount = categoryPermissions.filter(p => selectedPermissions.has(p.id)).length;
              const totalCount = categoryPermissions.length;
              const allSelected = selectedCount === totalCount;
              const partialSelected = selectedCount > 0 && selectedCount < totalCount;

              return (
                <div key={category.name} className="border rounded-lg">
                  {/* 分类头部 */}
                  <div className="p-4 bg-gray-50 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = partialSelected;
                          }}
                          onChange={() => toggleCategory(category.name)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <h4 className="text-lg font-medium text-gray-900">{category.name}</h4>
                      </div>
                      <span className="text-sm text-gray-500">
                        {selectedCount} / {totalCount} 已选择
                      </span>
                    </div>
                  </div>

                  {/* 权限列表 */}
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categoryPermissions.map((permission) => (
                        <div
                          key={permission.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedPermissions.has(permission.id)
                              ? 'bg-blue-50 border-blue-200'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => togglePermission(permission.id)}
                        >
                          <div className="flex items-start space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.has(permission.id)}
                              onChange={() => togglePermission(permission.id)}
                              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h5 className="font-medium text-gray-900">{permission.name}</h5>
                                <span className={getPermissionLevelStyle(permission.isSystemLevel)}>
                                  {getPermissionLevelText(permission.isSystemLevel)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{permission.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">没有找到权限</h3>
              <p className="mt-1 text-sm text-gray-500">请尝试调整搜索条件。</p>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            系统级权限需要管理员角色才能使用
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? '保存中...' : '保存权限'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}