import React, { useState } from 'react';
import { Card, Switch, Button, Badge, Avatar } from '@/components/ui';
import {
  LockClosedIcon,
  LockOpenIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  EyeIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

export interface AccessLevel {
  role: 'viewer' | 'editor' | 'admin';
  label: string;
  description: string;
  permissions: string[];
}

export interface AccessControlProps {
  visibility: 'public' | 'private';
  onVisibilityChange: (visibility: 'public' | 'private') => void;
  members?: Array<{
    id: string;
    name: string;
    avatar?: string;
    role: string;
    accessLevel: 'viewer' | 'editor' | 'admin';
  }>;
  onMemberAccessChange?: (memberId: string, level: 'viewer' | 'editor' | 'admin') => void;
  isOwner?: boolean;
  className?: string;
}

const accessLevels: AccessLevel[] = [
  {
    role: 'viewer',
    label: '查看者',
    description: '只能查看项目内容',
    permissions: ['查看所有内容', '查看评论', '下载文件'],
  },
  {
    role: 'editor',
    label: '编辑者',
    description: '可以编辑项目内容',
    permissions: ['所有查看权限', '编辑内容', '添加评论', '上传文件'],
  },
  {
    role: 'admin',
    label: '管理员',
    description: '完全控制项目',
    permissions: ['所有编辑权限', '管理成员', '修改设置', '删除项目'],
  },
];

const AccessControl: React.FC<AccessControlProps> = ({
  visibility,
  onVisibilityChange,
  members = [],
  onMemberAccessChange,
  isOwner = false,
  className = '',
}) => {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  const getAccessLevelInfo = (level: 'viewer' | 'editor' | 'admin') => {
    return accessLevels.find((al) => al.role === level);
  };

  const getAccessIcon = (level: 'viewer' | 'editor' | 'admin') => {
    switch (level) {
      case 'viewer':
        return <EyeIcon className="w-4 h-4" />;
      case 'editor':
        return <PencilIcon className="w-4 h-4" />;
      case 'admin':
        return <ShieldCheckIcon className="w-4 h-4" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 可见性设置 */}
      <Card>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {visibility === 'public' ? (
                <LockOpenIcon className="w-6 h-6 text-green-600" />
              ) : (
                <LockClosedIcon className="w-6 h-6 text-gray-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  项目可见性
                </h3>
                {isOwner && (
                  <Switch
                    checked={visibility === 'public'}
                    onChange={(checked) =>
                      onVisibilityChange(checked ? 'public' : 'private')
                    }
                  />
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {visibility === 'public'
                  ? '所有团队成员都可以查看此项目'
                  : '只有被授权的成员才能查看此项目'}
              </p>

              {visibility === 'public' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <UserGroupIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">公开项目</p>
                      <p className="mt-1">
                        团队中的所有成员都可以发现和访问此项目。您可以为不同成员设置不同的访问级别。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {visibility === 'private' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <LockClosedIcon className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <p className="font-medium">私密项目</p>
                      <p className="mt-1">
                        只有下方列出的成员可以访问此项目。其他团队成员无法看到或访问此项目。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 访问级别说明 */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            访问级别说明
          </h3>
          <div className="space-y-3">
            {accessLevels.map((level) => (
              <div
                key={level.role}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0 mt-1">
                  {getAccessIcon(level.role)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{level.label}</h4>
                    <Badge variant="default" size="sm">
                      {level.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{level.description}</p>
                  <ul className="space-y-1">
                    {level.permissions.map((permission, index) => (
                      <li
                        key={index}
                        className="text-xs text-gray-500 flex items-center gap-2"
                      >
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        {permission}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* 成员访问权限 */}
      {members.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              成员访问权限 ({members.length})
            </h3>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={member.avatar} alt={member.name} size="sm" />
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        member.accessLevel === 'admin'
                          ? 'primary'
                          : member.accessLevel === 'editor'
                          ? 'success'
                          : 'default'
                      }
                    >
                      {getAccessLevelInfo(member.accessLevel)?.label}
                    </Badge>

                    {isOwner && onMemberAccessChange && (
                      <select
                        value={member.accessLevel}
                        onChange={(e) =>
                          onMemberAccessChange(
                            member.id,
                            e.target.value as 'viewer' | 'editor' | 'admin'
                          )
                        }
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="viewer">查看者</option>
                        <option value="editor">编辑者</option>
                        <option value="admin">管理员</option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AccessControl;
