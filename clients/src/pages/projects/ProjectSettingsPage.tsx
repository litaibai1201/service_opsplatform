import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { Card, Button, Input, Textarea, Select, Switch, Badge } from '@/components/ui';
import { useProjectDetail, useProjectSettings } from '@/hooks/data/useProjects';
import { RequireProjectManage } from '@/components/layout/PermissionGuard';
import { 
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  FolderIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { Project } from '@/types/entities';

interface ProjectSettingsForm {
  name: string;
  description: string;
  type: 'web' | 'mobile' | 'api' | 'desktop' | 'library';
  visibility: 'public' | 'private';
  priority: 'high' | 'medium' | 'low';
  allowMemberEdit: boolean;
  allowExternalView: boolean;
  allowExternalComment: boolean;
  requireApprovalForChanges: boolean;
  notifications: {
    documentUpdates: boolean;
    memberActivity: boolean;
    statusChanges: boolean;
  };
}

const ProjectSettingsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector(state => state.auth);
  
  const { project, isLoading, error, refreshProject } = useProjectDetail(projectId!);
  const { updateProjectSettings, archiveProject, deleteProject } = useProjectSettings(projectId!);
  
  const [formData, setFormData] = useState<ProjectSettingsForm>({
    name: '',
    description: '',
    type: 'web',
    visibility: 'private',
    priority: 'medium',
    allowMemberEdit: true,
    allowExternalView: false,
    allowExternalComment: false,
    requireApprovalForChanges: false,
    notifications: {
      documentUpdates: true,
      memberActivity: true,
      statusChanges: true,
    },
  });
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [errors, setErrors] = useState<Partial<ProjectSettingsForm>>({});

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        type: project.type || 'web',
        visibility: project.visibility || 'private',
        priority: project.priority || 'medium',
        allowMemberEdit: project.allowMemberEdit ?? true,
        allowExternalView: project.allowExternalView ?? false,
        allowExternalComment: project.allowExternalComment ?? false,
        requireApprovalForChanges: project.settings?.requireApprovalForChanges ?? false,
        notifications: {
          documentUpdates: project.settings?.notifications?.documentUpdates ?? true,
          memberActivity: project.settings?.notifications?.memberActivity ?? true,
          statusChanges: project.settings?.notifications?.statusChanges ?? true,
        },
      });
    }
  }, [project]);

  const handleInputChange = (field: keyof ProjectSettingsForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleNotificationChange = (field: keyof ProjectSettingsForm['notifications'], value: boolean) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value,
      },
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ProjectSettingsForm> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '请输入项目名称';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = '项目名称至少需要2个字符';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = '项目名称不能超过50个字符';
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
      setIsUpdating(true);
      await updateProjectSettings(formData);
      refreshProject();
    } catch (error) {
      console.error('Failed to update project settings:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleArchiveProject = async () => {
    if (window.confirm('确定要归档这个项目吗？归档后项目将不再活跃，但数据会保留。')) {
      try {
        await archiveProject();
        navigate('/projects');
      } catch (error) {
        console.error('Failed to archive project:', error);
      }
    }
  };

  const handleDeleteProject = async () => {
    if (window.confirm('确定要删除这个项目吗？这个操作不可逆转，所有数据将被永久删除。')) {
      if (window.confirm('请再次确认：删除项目将永久删除所有相关数据，包括文档、成员记录等。')) {
        try {
          await deleteProject();
          navigate('/projects');
        } catch (error) {
          console.error('Failed to delete project:', error);
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">加载项目设置...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-6">{error || '项目不存在或您没有管理权限'}</p>
          <Button onClick={() => navigate('/projects')}>返回项目列表</Button>
        </Card>
      </div>
    );
  }

  return (
    <RequireProjectManage projectId={projectId!}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 头部导航 */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/projects/${projectId}`)}
            className="p-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">项目设置</h1>
            <p className="text-gray-600">{project.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 基本信息 */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FolderIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">基本信息</h2>
                <p className="text-sm text-gray-600">管理项目的基本信息和显示设置</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  项目名称 *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="输入项目名称"
                  error={errors.name}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  项目类型
                </label>
                <Select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                >
                  <option value="web">Web应用</option>
                  <option value="mobile">移动应用</option>
                  <option value="api">API服务</option>
                  <option value="desktop">桌面应用</option>
                  <option value="library">代码库</option>
                </Select>
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
                  <option value="private">私有 - 仅成员可见</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  优先级
                </label>
                <Select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                >
                  <option value="high">高优先级</option>
                  <option value="medium">中优先级</option>
                  <option value="low">低优先级</option>
                </Select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  项目描述
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="描述项目的目标和功能..."
                  rows={3}
                  error={errors.description}
                />
              </div>
            </div>
          </Card>

          {/* 权限设置 */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ShieldCheckIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">权限设置</h2>
                <p className="text-sm text-gray-600">控制项目的访问和编辑权限</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">允许成员编辑</h4>
                  <p className="text-sm text-gray-600">项目成员可以编辑项目内容</p>
                </div>
                <Switch
                  checked={formData.allowMemberEdit}
                  onChange={(checked) => handleInputChange('allowMemberEdit', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">允许外部查看</h4>
                  <p className="text-sm text-gray-600">非项目成员可以查看项目内容</p>
                </div>
                <Switch
                  checked={formData.allowExternalView}
                  onChange={(checked) => handleInputChange('allowExternalView', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">允许外部评论</h4>
                  <p className="text-sm text-gray-600">非项目成员可以添加评论</p>
                </div>
                <Switch
                  checked={formData.allowExternalComment}
                  onChange={(checked) => handleInputChange('allowExternalComment', checked)}
                  disabled={!formData.allowExternalView}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">变更需要审批</h4>
                  <p className="text-sm text-gray-600">重要变更需要管理员审批</p>
                </div>
                <Switch
                  checked={formData.requireApprovalForChanges}
                  onChange={(checked) => handleInputChange('requireApprovalForChanges', checked)}
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
                <p className="text-sm text-gray-600">控制项目相关的通知</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">文档更新通知</h4>
                  <p className="text-sm text-gray-600">文档有更新时通知项目成员</p>
                </div>
                <Switch
                  checked={formData.notifications.documentUpdates}
                  onChange={(checked) => handleNotificationChange('documentUpdates', checked)}
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

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">状态变更通知</h4>
                  <p className="text-sm text-gray-600">项目状态变更时通知相关人员</p>
                </div>
                <Switch
                  checked={formData.notifications.statusChanges}
                  onChange={(checked) => handleNotificationChange('statusChanges', checked)}
                />
              </div>
            </div>
          </Card>

          {/* 保存按钮 */}
          <div className="flex justify-end space-x-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate(`/projects/${projectId}`)}
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
                  <p className="text-sm text-gray-600">这些操作可能对项目造成不可逆的影响</p>
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
                    <h4 className="font-medium text-orange-900">归档项目</h4>
                    <p className="text-sm text-orange-700">
                      归档后项目将不再活跃，但所有数据将被保留
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleArchiveProject}
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                    disabled={project.status === 'archived'}
                  >
                    <ArchiveBoxIcon className="h-4 w-4 mr-2" />
                    {project.status === 'archived' ? '已归档' : '归档项目'}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                  <div>
                    <h4 className="font-medium text-red-900">删除项目</h4>
                    <p className="text-sm text-red-700">
                      永久删除项目及所有相关数据，此操作不可逆转
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleDeleteProject}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    删除项目
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </RequireProjectManage>
  );
};

export default ProjectSettingsPage;