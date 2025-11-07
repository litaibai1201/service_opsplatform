import { useState, useEffect, useCallback } from 'react';
import { 
  adminApi, 
  AdminUser, 
  UserListParams, 
  UserListResponse, 
  CreateUserRequest, 
  UpdateUserRequest, 
  BulkUserOperation 
} from '@/services/api';

export interface UseUserManagementReturn {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  searchUsers: (params: UserListParams) => Promise<void>;
  createUser: (userData: CreateUserRequest) => Promise<AdminUser>;
  updateUser: (userId: string, userData: UpdateUserRequest) => Promise<AdminUser>;
  deleteUser: (userId: string) => Promise<void>;
  bulkOperation: (operation: BulkUserOperation) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

export const useUserManagement = (initialParams: UserListParams = {}): UseUserManagementReturn => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentParams, setCurrentParams] = useState<UserListParams>(initialParams);

  const searchUsers = useCallback(async (params: UserListParams) => {
    try {
      setIsLoading(true);
      setError(null);
      setCurrentParams(params);

      const response: UserListResponse = await adminApi.getUserList(params);
      
      setUsers(response.users);
      setTotal(response.total);
      setPage(response.page);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取用户列表失败');
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createUser = useCallback(async (userData: CreateUserRequest): Promise<AdminUser> => {
    try {
      const newUser = await adminApi.createUser(userData);
      
      // 刷新用户列表
      await searchUsers(currentParams);
      
      return newUser;
    } catch (err) {
      console.error('Failed to create user:', err);
      throw err;
    }
  }, [currentParams, searchUsers]);

  const updateUser = useCallback(async (userId: string, userData: UpdateUserRequest): Promise<AdminUser> => {
    try {
      const updatedUser = await adminApi.updateUser(userId, userData);
      
      // 更新本地状态
      setUsers(prev => prev.map(user => 
        user.id === userId ? updatedUser : user
      ));
      
      return updatedUser;
    } catch (err) {
      console.error('Failed to update user:', err);
      throw err;
    }
  }, []);

  const deleteUser = useCallback(async (userId: string): Promise<void> => {
    try {
      await adminApi.deleteUser(userId);
      
      // 从本地状态中移除
      setUsers(prev => prev.filter(user => user.id !== userId));
      setTotal(prev => prev - 1);
    } catch (err) {
      console.error('Failed to delete user:', err);
      throw err;
    }
  }, []);

  const bulkOperation = useCallback(async (operation: BulkUserOperation): Promise<void> => {
    try {
      await adminApi.bulkUserOperation(operation);
      
      // 刷新用户列表
      await searchUsers(currentParams);
    } catch (err) {
      console.error('Failed to perform bulk operation:', err);
      throw err;
    }
  }, [currentParams, searchUsers]);

  const refreshUsers = useCallback(async () => {
    await searchUsers(currentParams);
  }, [currentParams, searchUsers]);

  // 初始化加载
  useEffect(() => {
    searchUsers(initialParams);
  }, [searchUsers, initialParams]);

  return {
    users,
    total,
    page,
    totalPages,
    isLoading,
    error,
    searchUsers,
    createUser,
    updateUser,
    deleteUser,
    bulkOperation,
    refreshUsers,
  };
};