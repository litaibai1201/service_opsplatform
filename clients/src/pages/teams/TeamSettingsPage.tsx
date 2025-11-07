import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { Card, Button, Input, Textarea, Select, Switch, Badge } from '@/components/ui';
import { useTeamDetail, useTeamSettings } from '@/hooks/data/useTeams';
import { RequireTeamManage } from '@/components/layout/PermissionGuard';
import { 
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  BellIcon
} from '@heroicons/react/24/outline';

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

const TeamSettingsPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector(state => state.auth);
  
  const { team, isLoading, error, refreshTeam } = useTeamDetail(teamId!);
  const { updateTeamSettings, archiveTeam, deleteTeam } = useTeamSettings(teamId!);
  
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
  };

  const handleNotificationChange = (field: keyof TeamSettingsForm['notifications'], value: boolean) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsUpdating(true);
      await updateTeamSettings(formData);
      refreshTeam();
    } catch (error) {
      console.error('Failed to update team settings:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleArchiveTeam = async () => {
    if (window.confirm('确定要归档这个团队吗？归档后团队将不再活跃，但数据会保留。')) {
      try {
        await archiveTeam();
        navigate('/teams');
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
          navigate('/teams');
        } catch (error) {
          console.error('Failed to delete team:', error);
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">加载团队设置...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-6">{error || '团队不存在或您没有管理权限'}</p>
          <Button onClick={() => navigate('/teams')}>返回团队列表</Button>
        </Card>
      </div>
    );
  }

  return (
    <RequireTeamManage teamId={teamId!}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 头部导航 */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/teams/${teamId}`)}
            className="p-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">团队设置</h1>
            <p className="text-gray-600">{team.name}</p>
          </div>
        </div>

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
          <div className="flex justify-end space-x-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate(`/teams/${teamId}`)}
            >
              取消
            </Button>
            <Button type="submit" loading={isUpdating}>
              保存设置
            </Button>
          </div>
        </form>

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
      </div>
    </RequireTeamManage>
  );
};

export default TeamSettingsPage;