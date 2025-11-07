import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Textarea, Select, Switch, Badge } from '@/components/ui';
import { useTeamSettings } from '@/hooks/data/useTeams';
import {
  UserGroupIcon,
  ShieldCheckIcon,
  BellIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Team } from '@/types/entities';

interface TeamSettingsProps {
  team: Team;
  onUpdate: () => void;
}

interface TeamSettingsForm {
  name: string;
  description: string;
  visibility: 'public' | 'private' | 'internal';
  joinPolicy: 'open' | 'invite_only' | 'request';
  allowMemberInvite: boolean;
  allowMemberProjectCreate: boolean;
  requireApprovalForJoin: boolean;
  defaultMemberRole: 'member' | 'viewer';
  notifications: {
    newMember: boolean;
    projectUpdates: boolean;
    memberActivity: boolean;
  };
}

const TeamSettings: React.FC<TeamSettingsProps> = ({ team, onUpdate }) => {
  const { updateTeamSettings, archiveTeam, deleteTeam, isLoading } = useTeamSettings(team.id);
  
  const [formData, setFormData] = useState<TeamSettingsForm>({
    name: '',
    description: '',
    visibility: 'private',
    joinPolicy: 'invite_only',
    allowMemberInvite: true,
    allowMemberProjectCreate: true,
    requireApprovalForJoin: false,
    defaultMemberRole: 'member',
    notifications: {
      newMember: true,
      projectUpdates: true,
      memberActivity: false,
    },
  });
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [errors, setErrors] = useState<Partial<TeamSettingsForm>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || '',
        description: team.description || '',
        visibility: team.visibility || 'private',
        joinPolicy: team.joinPolicy || 'invite_only',
        allowMemberInvite: team.settings?.allowMemberInvite ?? true,
        allowMemberProjectCreate: team.settings?.allowMemberProjectCreate ?? true,
        requireApprovalForJoin: team.settings?.requireApprovalForJoin ?? false,
        defaultMemberRole: team.settings?.defaultMemberRole || 'member',
        notifications: {
          newMember: team.settings?.notifications?.newMember ?? true,
          projectUpdates: team.settings?.notifications?.projectUpdates ?? true,
          memberActivity: team.settings?.notifications?.memberActivity ?? false,
        },
      });
    }
  }, [team]);

  const handleInputChange = (field: keyof TeamSettingsForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
    
    // 重置保存状态
    setSaveStatus('idle');
  };

  const handleNotificationChange = (field: keyof TeamSettingsForm['notifications'], value: boolean) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value,
      },
    }));
    setSaveStatus('idle');
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<TeamSettingsForm> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '请输入团队名称';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = '团队名称至少需要2个字符';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = '团队名称不能超过50个字符';
    }
    
    if (formData.description && formData.description.length > 500) {
      newErrors.description = '描述不能超过500个字符';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaveStatus('saving');
      setIsUpdating(true);
      await updateTeamSettings(formData);
      setSaveStatus('saved');
      onUpdate();
      
      // 3秒后重置保存状态
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to update team settings:', error);
      setSaveStatus('error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleArchiveTeam = async () => {
    if (window.confirm('确定要归档这个团队吗？归档后团队将不再活跃，但数据会保留。')) {
      try {
        await archiveTeam();
        onUpdate();
      } catch (error) {
        console.error('Failed to archive team:', error);
      }
    }
  };

  const handleDeleteTeam = async () => {
    if (window.confirm('确定要删除这个团队吗？这个操作不可逆转，所有数据将被永久删除。')) {
      if (window.confirm('请再次确认：删除团队将永久删除所有相关数据，包括项目、成员记录等。')) {
        try {
          await deleteTeam();
          // 删除成功后会跳转到团队列表，所以不需要调用onUpdate
        } catch (error) {
          console.error('Failed to delete team:', error);
        }
      }
    }
  };

  const getVisibilityDescription = (visibility: string) => {
    const descriptions = {
      public: '任何人都可以看到这个团队，包括团队成员和项目',
      internal: '平台内的所有用户都可以看到这个团队',
      private: '只有团队成员可以看到这个团队',
    };
    return descriptions[visibility as keyof typeof descriptions];
  };

  const getJoinPolicyDescription = (policy: string) => {
    const descriptions = {
      open: '任何人都可以直接加入团队',
      request: '用户可以申请加入，需要管理员审批',
      invite_only: '只能通过邀请链接或管理员邀请加入',
    };
    return descriptions[policy as keyof typeof descriptions];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 基本信息 */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <UserGroupIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-900">基本信息</h2>
            <p className="text-sm text-gray-600">管理团队的基本信息和显示设置</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              团队名称 *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="输入团队名称"
              error={errors.name}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              可见性
            </label>
            <Select
              value={formData.visibility}
              onChange={(e) => handleInputChange('visibility', e.target.value)}
            >
              <option value="public">公开 - 所有人可见</option>
              <option value="internal">内部 - 平台用户可见</option>
              <option value="private">私有 - 仅成员可见</option>
            </Select>
            <p className="mt-1 text-xs text-gray-500">
              {getVisibilityDescription(formData.visibility)}
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              团队描述
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="描述团队的目标和职责..."
              rows={3}
              error={errors.description}
            />
          </div>
        </div>
      </Card>

      {/* 成员管理设置 */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <ShieldCheckIcon className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-900">成员管理</h2>
            <p className="text-sm text-gray-600">控制成员加入和权限设置</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              加入政策
            </label>
            <Select
              value={formData.joinPolicy}
              onChange={(e) => handleInputChange('joinPolicy', e.target.value)}
            >
              <option value="open">开放 - 任何人可加入</option>
              <option value="request">申请 - 需要批准</option>
              <option value="invite_only">邀请 - 仅限邀请</option>
            </Select>
            <p className="mt-1 text-xs text-gray-500">
              {getJoinPolicyDescription(formData.joinPolicy)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              默认成员角色
            </label>
            <Select
              value={formData.defaultMemberRole}
              onChange={(e) => handleInputChange('defaultMemberRole', e.target.value)}
            >
              <option value="member">成员 - 完整权限</option>
              <option value="viewer">查看者 - 只读权限</option>
            </Select>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">允许成员邀请其他人</h4>
              <p className="text-sm text-gray-600">成员可以邀请新成员加入团队</p>
            </div>
            <Switch
              checked={formData.allowMemberInvite}
              onChange={(checked) => handleInputChange('allowMemberInvite', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">允许成员创建项目</h4>
              <p className="text-sm text-gray-600">成员可以在团队内创建新项目</p>
            </div>
            <Switch
              checked={formData.allowMemberProjectCreate}
              onChange={(checked) => handleInputChange('allowMemberProjectCreate', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">加入需要审批</h4>
              <p className="text-sm text-gray-600">新成员加入需要管理员审批</p>
            </div>
            <Switch
              checked={formData.requireApprovalForJoin}
              onChange={(checked) => handleInputChange('requireApprovalForJoin', checked)}
            />
          </div>
        </div>
      </Card>

      {/* 通知设置 */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <BellIcon className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-900">通知设置</h2>
            <p className="text-sm text-gray-600">控制团队相关的通知</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">新成员加入通知</h4>
              <p className="text-sm text-gray-600">有新成员加入时通知管理员</p>
            </div>
            <Switch
              checked={formData.notifications.newMember}
              onChange={(checked) => handleNotificationChange('newMember', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">项目更新通知</h4>
              <p className="text-sm text-gray-600">项目有重要更新时通知团队成员</p>
            </div>
            <Switch
              checked={formData.notifications.projectUpdates}
              onChange={(checked) => handleNotificationChange('projectUpdates', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">成员活动通知</h4>
              <p className="text-sm text-gray-600">成员有重要活动时发送通知</p>
            </div>
            <Switch
              checked={formData.notifications.memberActivity}
              onChange={(checked) => handleNotificationChange('memberActivity', checked)}
            />
          </div>
        </div>
      </Card>

      {/* 保存按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {saveStatus === 'saved' && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckIcon className="h-4 w-4" />
              <span className="text-sm">设置已保存</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-600">
              <XMarkIcon className="h-4 w-4" />
              <span className="text-sm">保存失败</span>
            </div>
          )}
        </div>
        
        <Button 
          type="submit" 
          loading={isUpdating}
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? '保存中...' : '保存设置'}
        </Button>
      </div>

      {/* 危险操作区域 */}
      <Card className="border-red-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">危险操作</h2>
                <p className="text-sm text-gray-600">这些操作可能对团队造成不可逆的影响</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDangerZone(!showDangerZone)}
            >
              {showDangerZone ? '隐藏' : '显示'}
            </Button>
          </div>

          {showDangerZone && (
            <div className="space-y-4 pt-4 border-t border-red-200">
              <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                <div>
                  <h4 className="font-medium text-orange-900">归档团队</h4>
                  <p className="text-sm text-orange-700">
                    归档后团队将不再活跃，但所有数据将被保留
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleArchiveTeam}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  disabled={team.status === 'archived'}
                >
                  <ArchiveBoxIcon className="h-4 w-4 mr-2" />
                  {team.status === 'archived' ? '已归档' : '归档团队'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <h4 className="font-medium text-red-900">删除团队</h4>
                  <p className="text-sm text-red-700">
                    永久删除团队及所有相关数据，此操作不可逆转
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDeleteTeam}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  删除团队
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </form>
  );
};

export default TeamSettings;