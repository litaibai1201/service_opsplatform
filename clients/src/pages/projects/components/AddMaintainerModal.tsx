import React, { useState } from 'react';
import { Modal, Button, Input, Select, Avatar } from '@/components/ui';
import { useProjectMaintainers } from '@/hooks/useProjectMaintainers';
import { useTeamMembers } from '@/hooks/data/useTeams';
import {
  UserPlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface AddMaintainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  onSuccess: () => void;
}

interface AddMaintainerForm {
  selectedUsers: string[];
  message: string;
}

const AddMaintainerModal: React.FC<AddMaintainerModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  onSuccess
}) => {
  const { addMaintainer, isLoading } = useProjectMaintainers(projectId);
  
  const [formData, setFormData] = useState<AddMaintainerForm>({
    selectedUsers: [],
    message: '',
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState(1); // 1: 选择用户, 2: 完成

  // 模拟可添加的用户列表 - 实际应该从API获取
  const availableUsers = [
    {
      id: '1',
      name: '张三',
      email: 'zhangsan@example.com',
      avatar: '',
      role: 'admin',
      isAlreadyMaintainer: false,
    },
    {
      id: '2',
      name: '李四',
      email: 'lisi@example.com',
      avatar: '',
      role: 'member',
      isAlreadyMaintainer: false,
    },
    {
      id: '3',
      name: '王五',
      email: 'wangwu@example.com',
      avatar: '',
      role: 'member',
      isAlreadyMaintainer: true,
    },
  ];

  const filteredUsers = availableUsers.filter(user => {
    if (user.isAlreadyMaintainer) return false;
    if (!searchTerm) return true;
    return user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleUserSelect = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedUsers: prev.selectedUsers.includes(userId)
        ? prev.selectedUsers.filter(id => id !== userId)
        : [...prev.selectedUsers, userId]
    }));
    
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];
    
    if (formData.selectedUsers.length === 0) {
      newErrors.push('请至少选择一个用户');
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      for (const userId of formData.selectedUsers) {
        await addMaintainer({
          userId,
          message: formData.message,
        });
      }
      setStep(2);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to add maintainers:', error);
      setErrors(['添加成员失败，请重试']);
    }
  };

  const handleClose = () => {
    setFormData({
      selectedUsers: [],
      message: '',
    });
    setSearchTerm('');
    setErrors([]);
    setStep(1);
    onClose();
  };

  const selectedUsersData = availableUsers.filter(user => 
    formData.selectedUsers.includes(user.id)
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserPlusIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">添加项目成员</h2>
              <p className="text-sm text-gray-600">为 {projectName} 添加维护员</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="px-6 py-6">
          {/* 步骤1: 选择用户 */}
          {step === 1 && (
            <div className="space-y-6">
              {/* 错误信息 */}
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">请修正以下错误：</h4>
                      <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                        {errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 搜索框 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  搜索用户
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索用户名称或邮箱..."
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 用户列表 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择用户 ({formData.selectedUsers.length} 个已选中)
                </label>
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="p-6 text-center">
                      <UserPlusIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">
                        {searchTerm ? '没有找到匹配的用户' : '没有可添加的用户'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                            formData.selectedUsers.includes(user.id) ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleUserSelect(user.id)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <Avatar
                                src={user.avatar}
                                alt={user.name}
                                size="sm"
                              />
                              {formData.selectedUsers.includes(user.id) && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                  <CheckIcon className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {user.name}
                                </p>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  user.role === 'admin' 
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {user.role === 'admin' ? '管理员' : '成员'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 邀请消息 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  邀请消息（可选）
                </label>
                <Input
                  type="text"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="添加个人邀请消息..."
                />
              </div>

              {/* 已选择用户预览 */}
              {selectedUsersData.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    已选择的用户
                  </label>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex flex-wrap gap-2">
                      {selectedUsersData.map((user) => (
                        <div
                          key={user.id}
                          className="inline-flex items-center space-x-2 bg-white border rounded-lg px-3 py-1"
                        >
                          <Avatar src={user.avatar} alt={user.name} size="xs" />
                          <span className="text-sm font-medium">{user.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUserSelect(user.id);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 步骤2: 完成 */}
          {step === 2 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">成员添加成功！</h3>
              <p className="text-gray-600 mb-4">
                已成功添加 {selectedUsersData.length} 名成员到项目中
              </p>
              <div className="animate-pulse">
                <div className="h-2 bg-green-200 rounded-full">
                  <div className="h-2 bg-green-600 rounded-full w-full"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        {step === 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            <Button type="button" variant="outline" onClick={handleClose}>
              取消
            </Button>
            
            <Button 
              type="submit" 
              loading={isLoading}
              disabled={formData.selectedUsers.length === 0}
            >
              添加成员 ({formData.selectedUsers.length})
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default AddMaintainerModal;