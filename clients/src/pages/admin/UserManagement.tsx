import React, { useState, useEffect, useCallback } from 'react';
import UserTable from './components/UserTable';
import PermissionMatrix from './components/PermissionMatrix';

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'editor' | 'viewer';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  avatar?: string;
  lastLogin: string;
  createdAt: string;
  teams: string[];
  projects: string[];
  permissions: string[];
}

interface UserFilters {
  search: string;
  role: string;
  status: string;
  team: string;
}

interface CreateUserData {
  username: string;
  email: string;
  fullName: string;
  role: User['role'];
  password: string;
  sendInvite: boolean;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<User | null>(null);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: '',
    status: '',
    team: '',
  });

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const itemsPerPage = 20;

  // 模拟数据加载
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockUsers: User[] = Array.from({ length: 150 }, (_, i) => ({
          id: `user-${i + 1}`,
          username: `user${i + 1}`,
          email: `user${i + 1}@example.com`,
          fullName: `用户${i + 1}`,
          role: ['admin', 'manager', 'editor', 'viewer'][i % 4] as User['role'],
          status: ['active', 'inactive', 'suspended', 'pending'][i % 4] as User['status'],
          avatar: i % 3 === 0 ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}` : undefined,
          lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          teams: [`team-${Math.floor(i / 10) + 1}`],
          projects: [`project-${Math.floor(i / 5) + 1}`],
          permissions: ['read', 'write', i % 3 === 0 ? 'admin' : '', i % 2 === 0 ? 'manage_users' : ''].filter(Boolean),
        }));

        // 应用过滤
        let filteredUsers = mockUsers;
        
        if (filters.search) {
          const search = filters.search.toLowerCase();
          filteredUsers = filteredUsers.filter(user =>
            user.username.toLowerCase().includes(search) ||
            user.email.toLowerCase().includes(search) ||
            user.fullName.toLowerCase().includes(search)
          );
        }

        if (filters.role) {
          filteredUsers = filteredUsers.filter(user => user.role === filters.role);
        }

        if (filters.status) {
          filteredUsers = filteredUsers.filter(user => user.status === filters.status);
        }

        // 分页
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

        setUsers(paginatedUsers);
        setTotalUsers(filteredUsers.length);
        setTotalPages(Math.ceil(filteredUsers.length / itemsPerPage));
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [filters, currentPage]);

  // 创建用户
  const handleCreateUser = useCallback(async (userData: CreateUserData) => {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newUser: User = {
        id: `user-new-${Date.now()}`,
        username: userData.username,
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role,
        status: userData.sendInvite ? 'pending' : 'active',
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        teams: [],
        projects: [],
        permissions: ['read'],
      };

      setUsers(prev => [newUser, ...prev.slice(0, itemsPerPage - 1)]);
      setTotalUsers(prev => prev + 1);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  }, []);

  // 批量操作
  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedUsers.length === 0) return;

    try {
      setLoading(true);
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));

      switch (action) {
        case 'activate':
          setUsers(prev => prev.map(user =>
            selectedUsers.includes(user.id) ? { ...user, status: 'active' as const } : user
          ));
          break;
        case 'suspend':
          setUsers(prev => prev.map(user =>
            selectedUsers.includes(user.id) ? { ...user, status: 'suspended' as const } : user
          ));
          break;
        case 'delete':
          if (window.confirm(`确定要删除选中的 ${selectedUsers.length} 个用户吗？`)) {
            setUsers(prev => prev.filter(user => !selectedUsers.includes(user.id)));
            setTotalUsers(prev => prev - selectedUsers.length);
          }
          break;
      }

      setSelectedUsers([]);
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedUsers]);

  // 编辑用户权限
  const handleEditPermissions = useCallback((user: User) => {
    setSelectedUserForPermissions(user);
    setShowPermissionModal(true);
  }, []);

  // 更新用户权限
  const handleUpdatePermissions = useCallback(async (userId: string, permissions: string[]) => {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, permissions } : user
      ));
      setShowPermissionModal(false);
      setSelectedUserForPermissions(null);
    } catch (error) {
      console.error('Failed to update permissions:', error);
    }
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">用户管理</h1>
        <p className="text-gray-600 mt-2">管理系统用户和权限</p>
      </div>

      {/* 操作栏 */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {/* 搜索和过滤 */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索用户..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <select
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">所有角色</option>
                <option value="admin">管理员</option>
                <option value="manager">经理</option>
                <option value="editor">编辑者</option>
                <option value="viewer">查看者</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">所有状态</option>
                <option value="active">活跃</option>
                <option value="inactive">未激活</option>
                <option value="suspended">已暂停</option>
                <option value="pending">待处理</option>
              </select>
            </div>

            {/* 操作按钮 */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>添加用户</span>
              </button>

              {selectedUsers.length > 0 && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleBulkAction('activate')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    激活
                  </button>
                  <button
                    onClick={() => handleBulkAction('suspend')}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
                  >
                    暂停
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    删除
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 统计信息 */}
          {selectedUsers.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              已选择 {selectedUsers.length} 个用户
            </div>
          )}
        </div>
      </div>

      {/* 用户表格 */}
      <UserTable
        users={users}
        loading={loading}
        selectedUsers={selectedUsers}
        onSelectionChange={setSelectedUsers}
        onEditPermissions={handleEditPermissions}
        onUserUpdate={(userId, updates) => {
          setUsers(prev => prev.map(user =>
            user.id === userId ? { ...user, ...updates } : user
          ));
        }}
      />

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            显示第 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalUsers)} 条，共 {totalUsers} 条记录
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              上一页
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else {
                  if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }
                }
                
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 rounded-md ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 创建用户模态框 */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUser}
        />
      )}

      {/* 权限编辑模态框 */}
      {showPermissionModal && selectedUserForPermissions && (
        <PermissionMatrix
          user={selectedUserForPermissions}
          onClose={() => {
            setShowPermissionModal(false);
            setSelectedUserForPermissions(null);
          }}
          onSubmit={(permissions) => handleUpdatePermissions(selectedUserForPermissions.id, permissions)}
        />
      )}
    </div>
  );
}

// 创建用户模态框组件
function CreateUserModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: CreateUserData) => void;
}) {
  const [formData, setFormData] = useState<CreateUserData>({
    username: '',
    email: '',
    fullName: '',
    role: 'viewer',
    password: '',
    sendInvite: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">添加新用户</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                用户名 *
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮箱 *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                全名 *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                角色 *
              </label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as User['role'] }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="viewer">查看者</option>
                <option value="editor">编辑者</option>
                <option value="manager">经理</option>
                <option value="admin">管理员</option>
              </select>
            </div>

            {!formData.sendInvite && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密码 *
                </label>
                <input
                  type="password"
                  required={!formData.sendInvite}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="sendInvite"
                checked={formData.sendInvite}
                onChange={(e) => setFormData(prev => ({ ...prev, sendInvite: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="sendInvite" className="ml-2 text-sm text-gray-700">
                发送邀请邮件 (用户将通过邮件设置密码)
              </label>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? '创建中...' : '创建用户'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}