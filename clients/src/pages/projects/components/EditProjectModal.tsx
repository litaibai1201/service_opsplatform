import React, { useState, useEffect } from 'react';
import { Modal, Input, Textarea, Button, Switch, Select } from '@/components/ui';
import { Project } from '@/types/entities';
import { showToast } from '@/components/ui/ToastContainer';

export interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onUpdate: (projectId: string, data: Partial<Project>) => Promise<void>;
  isLoading?: boolean;
}

interface FormData {
  name: string;
  description: string;
  icon: string;
  visibility: 'public' | 'private';
  status: 'active' | 'archived' | 'completed';
  allowMemberEdit: boolean;
  requireApproval: boolean;
}

interface FormErrors {
  name?: string;
  description?: string;
}

const statusOptions = [
  { value: 'active', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'archived', label: '已归档' },
];

const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    icon: '',
    visibility: 'public',
    status: 'active',
    allowMemberEdit: false,
    requireApproval: false,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // 当project改变时更新表单数据
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        icon: project.icon || '',
        visibility: project.visibility || 'public',
        status: project.status || 'active',
        allowMemberEdit: project.settings?.allowMemberEdit ?? false,
        requireApproval: project.settings?.requireApproval ?? false,
      });
    }
  }, [project]);

  // 表单验证
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = '项目名称不能为空';
    } else if (formData.name.length < 2) {
      errors.name = '项目名称至少2个字符';
    } else if (formData.name.length > 100) {
      errors.name = '项目名称不能超过100个字符';
    }

    if (formData.description && formData.description.length > 1000) {
      errors.description = '项目描述不能超过1000个字符';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
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

    if (!project) return;

    if (!validateForm()) {
      showToast.error('请检查表单填写');
      return;
    }

    setIsSaving(true);

    try {
      await onUpdate(project.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        icon: formData.icon.trim() || undefined,
        visibility: formData.visibility,
        status: formData.status,
        settings: {
          ...project.settings,
          allowMemberEdit: formData.allowMemberEdit,
          requireApproval: formData.requireApproval,
        },
      });

      showToast.success('项目信息已更新');
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

  if (!project) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="编辑项目信息" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 项目名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            项目名称 <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="输入项目名称"
            error={formErrors.name}
            disabled={isSaving}
            maxLength={100}
          />
          <p className="mt-1 text-xs text-gray-500">{formData.name.length}/100</p>
        </div>

        {/* 项目描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            项目描述
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="简要描述项目的目标和范围"
            error={formErrors.description}
            disabled={isSaving}
            rows={4}
            maxLength={1000}
          />
          <p className="mt-1 text-xs text-gray-500">
            {formData.description.length}/1000
          </p>
        </div>

        {/* 项目图标 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            项目图标 Emoji
          </label>
          <Input
            value={formData.icon}
            onChange={(e) => handleInputChange('icon', e.target.value)}
            placeholder="🚀"
            disabled={isSaving}
            maxLength={10}
          />
          <p className="mt-1 text-xs text-gray-500">输入一个emoji表情</p>
        </div>

        {/* 项目状态 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            项目状态
          </label>
          <Select
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            disabled={isSaving}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {/* 项目设置 */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-900">项目设置</h4>

          {/* 公开/私密 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">公开项目</p>
              <p className="text-xs text-gray-500">
                公开项目对所有团队成员可见
              </p>
            </div>
            <Switch
              checked={formData.visibility === 'public'}
              onChange={(checked) =>
                handleInputChange('visibility', checked ? 'public' : 'private')
              }
              disabled={isSaving}
            />
          </div>

          {/* 成员编辑权限 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">允许成员编辑</p>
              <p className="text-xs text-gray-500">
                普通成员可以编辑项目内容
              </p>
            </div>
            <Switch
              checked={formData.allowMemberEdit}
              onChange={(checked) => handleInputChange('allowMemberEdit', checked)}
              disabled={isSaving}
            />
          </div>

          {/* 变更审批 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">需要审批</p>
              <p className="text-xs text-gray-500">
                重要变更需要维护员审批
              </p>
            </div>
            <Switch
              checked={formData.requireApproval}
              onChange={(checked) => handleInputChange('requireApproval', checked)}
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

export default EditProjectModal;
