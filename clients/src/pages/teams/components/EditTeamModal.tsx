import React, { useState, useEffect } from 'react';
import { Modal, Input, Textarea, Button, Switch } from '@/components/ui';
import { Team } from '@/types/entities';
import { showToast } from '@/components/ui/ToastContainer';

export interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  onUpdate: (teamId: string, data: Partial<Team>) => Promise<void>;
  isLoading?: boolean;
}

interface FormData {
  name: string;
  description: string;
  avatar: string;
  isPublic: boolean;
  allowMemberInvite: boolean;
  allowMemberCreateProject: boolean;
}

interface FormErrors {
  name?: string;
  description?: string;
  avatar?: string;
}

const EditTeamModal: React.FC<EditTeamModalProps> = ({
  isOpen,
  onClose,
  team,
  onUpdate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    avatar: '',
    isPublic: true,
    allowMemberInvite: false,
    allowMemberCreateProject: false,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // 当team改变时更新表单数据
  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || '',
        description: team.description || '',
        avatar: team.avatar || '',
        isPublic: team.visibility === 'public',
        allowMemberInvite: team.settings?.allowMemberInvite ?? false,
        allowMemberCreateProject: team.settings?.allowMemberCreateProject ?? false,
      });
    }
  }, [team]);

  // 表单验证
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = '团队名称不能为空';
    } else if (formData.name.length < 2) {
      errors.name = '团队名称至少2个字符';
    } else if (formData.name.length > 50) {
      errors.name = '团队名称不能超过50个字符';
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = '团队描述不能超过500个字符';
    }

    if (formData.avatar && !isValidUrl(formData.avatar)) {
      errors.avatar = '请输入有效的图片URL';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // URL验证
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // 处理输入变化
  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 清除相关错误
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!team) return;

    if (!validateForm()) {
      showToast.error('请检查表单填写');
      return;
    }

    setIsSaving(true);

    try {
      await onUpdate(team.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        avatar: formData.avatar.trim() || undefined,
        visibility: formData.isPublic ? 'public' : 'private',
        settings: {
          ...team.settings,
          allowMemberInvite: formData.allowMemberInvite,
          allowMemberCreateProject: formData.allowMemberCreateProject,
        },
      });

      showToast.success('团队信息已更新');
      onClose();
    } catch (error: any) {
      showToast.error(error.message || '更新失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 关闭前重置表单
  const handleClose = () => {
    setFormErrors({});
    onClose();
  };

  if (!team) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="编辑团队信息" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 团队名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            团队名称 <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="输入团队名称"
            error={formErrors.name}
            disabled={isSaving}
            maxLength={50}
          />
          <p className="mt-1 text-xs text-gray-500">
            {formData.name.length}/50
          </p>
        </div>

        {/* 团队描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            团队描述
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="简要描述团队的目标和职能"
            error={formErrors.description}
            disabled={isSaving}
            rows={4}
            maxLength={500}
          />
          <p className="mt-1 text-xs text-gray-500">
            {formData.description.length}/500
          </p>
        </div>

        {/* 团队头像 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            团队头像URL
          </label>
          <Input
            value={formData.avatar}
            onChange={(e) => handleInputChange('avatar', e.target.value)}
            placeholder="https://example.com/avatar.png"
            error={formErrors.avatar}
            disabled={isSaving}
          />
          {formData.avatar && isValidUrl(formData.avatar) && (
            <div className="mt-2">
              <img
                src={formData.avatar}
                alt="团队头像预览"
                className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://via.placeholder.com/64?text=Invalid';
                }}
              />
            </div>
          )}
        </div>

        {/* 团队设置 */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-900">团队设置</h4>

          {/* 公开/私密 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">公开团队</p>
              <p className="text-xs text-gray-500">
                公开团队可被所有用户发现和申请加入
              </p>
            </div>
            <Switch
              checked={formData.isPublic}
              onChange={(checked) => handleInputChange('isPublic', checked)}
              disabled={isSaving}
            />
          </div>

          {/* 成员邀请权限 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">允许成员邀请</p>
              <p className="text-xs text-gray-500">
                普通成员可以邀请新成员加入团队
              </p>
            </div>
            <Switch
              checked={formData.allowMemberInvite}
              onChange={(checked) => handleInputChange('allowMemberInvite', checked)}
              disabled={isSaving}
            />
          </div>

          {/* 成员创建项目权限 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">允许成员创建项目</p>
              <p className="text-xs text-gray-500">
                普通成员可以创建新项目
              </p>
            </div>
            <Switch
              checked={formData.allowMemberCreateProject}
              onChange={(checked) =>
                handleInputChange('allowMemberCreateProject', checked)
              }
              disabled={isSaving}
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
            className="flex-1"
          >
            取消
          </Button>
          <Button
            type="submit"
            loading={isSaving}
            disabled={isSaving || isLoading}
            className="flex-1"
          >
            保存更改
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditTeamModal;
