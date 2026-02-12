import React, { useState } from 'react';
import { Select, Button, Modal } from '@/components/ui';
import { TeamRole } from '@/types/entities';
import {
  ShieldCheckIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

export interface RoleSelectorProps {
  currentRole: TeamRole;
  onRoleChange: (newRole: TeamRole) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
  memberName?: string;
  canChangeToOwner?: boolean;
}

interface RoleOption {
  value: TeamRole;
  label: string;
  description: string;
  icon: React.ReactNode;
  permissions: string[];
}

const roleOptions: RoleOption[] = [
  {
    value: 'owner',
    label: '所有者',
    description: '拥有团队的完全控制权',
    icon: <ShieldCheckIcon className="w-5 h-5 text-purple-600" />,
    permissions: [
      '管理团队所有设置',
      '删除团队',
      '转让团队所有权',
      '管理所有成员和项目',
      '所有管理员和成员权限',
    ],
  },
  {
    value: 'admin',
    label: '管理员',
    description: '可以管理团队和项目',
    icon: <UserGroupIcon className="w-5 h-5 text-blue-600" />,
    permissions: [
      '邀请和移除成员',
      '管理项目',
      '分配项目维护员',
      '修改团队设置（除删除外）',
      '所有成员权限',
    ],
  },
  {
    value: 'member',
    label: '成员',
    description: '可以查看和参与项目',
    icon: <UserIcon className="w-5 h-5 text-gray-600" />,
    permissions: [
      '查看团队项目',
      '参与项目协作',
      '评论和讨论',
      '根据项目权限编辑内容',
    ],
  },
];

const RoleSelector: React.FC<RoleSelectorProps> = ({
  currentRole,
  onRoleChange,
  isOpen,
  onClose,
  memberName = '该成员',
  canChangeToOwner = false,
}) => {
  const [selectedRole, setSelectedRole] = useState<TeamRole>(currentRole);
  const [isChanging, setIsChanging] = useState(false);

  const availableRoles = roleOptions.filter(
    (role) => canChangeToOwner || role.value !== 'owner'
  );

  const handleConfirm = async () => {
    if (selectedRole === currentRole) {
      onClose();
      return;
    }

    setIsChanging(true);
    try {
      await onRoleChange(selectedRole);
      onClose();
    } catch (error) {
      // 错误已经由父组件处理
    } finally {
      setIsChanging(false);
    }
  };

  const selectedRoleOption = roleOptions.find((r) => r.value === selectedRole);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`更改 ${memberName} 的角色`}
      size="md"
    >
      <div className="space-y-6">
        {/* 当前角色 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">当前角色</p>
          <p className="text-lg font-semibold text-gray-900">
            {roleOptions.find((r) => r.value === currentRole)?.label}
          </p>
        </div>

        {/* 角色选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            选择新角色
          </label>
          <div className="space-y-3">
            {availableRoles.map((role) => (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className={`
                  w-full text-left p-4 rounded-lg border-2 transition-all
                  ${
                    selectedRole === role.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{role.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{role.label}</h4>
                      {role.value === currentRole && (
                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                          当前
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                  </div>
                  <div
                    className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center
                    ${
                      selectedRole === role.value
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }
                  `}
                  >
                    {selectedRole === role.value && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 权限说明 */}
        {selectedRoleOption && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h5 className="font-medium text-blue-900 mb-2">权限说明</h5>
            <ul className="space-y-1">
              {selectedRoleOption.permissions.map((permission, index) => (
                <li key={index} className="text-sm text-blue-800 flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{permission}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 警告提示 */}
        {selectedRole === 'owner' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>注意：</strong>
              转让所有者权限后，您将自动变更为管理员角色。此操作不可撤销。
            </p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isChanging} className="flex-1">
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            loading={isChanging}
            disabled={isChanging || selectedRole === currentRole}
            className="flex-1"
          >
            确认更改
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RoleSelector;
