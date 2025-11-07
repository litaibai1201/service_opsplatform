import React, { useState } from 'react';
import { Modal, Button, Input, Textarea, Select, Switch } from '@/components/ui';
import { useTeams } from '@/hooks/data/useTeams';
import { 
  UserGroupIcon, 
  XMarkIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreateTeamForm {
  name: string;
  description: string;
  visibility: 'public' | 'private' | 'internal';
  joinPolicy: 'open' | 'invite_only' | 'request';
  allowMemberInvite: boolean;
  allowMemberProjectCreate: boolean;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const { createTeam, isLoading } = useTeams();
  
  const [formData, setFormData] = useState<CreateTeamForm>({
    name: '',
    description: '',
    visibility: 'private',
    joinPolicy: 'invite_only',
    allowMemberInvite: true,
    allowMemberProjectCreate: true,
  });
  
  const [errors, setErrors] = useState<Partial<CreateTeamForm>>({});
  const [step, setStep] = useState(1); // 1: 基本信息, 2: 高级设置, 3: 完成

  const handleInputChange = (field: keyof CreateTeamForm, value: any) => {
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
  };

  const validateStep1 = (): boolean => {
    const newErrors: Partial<CreateTeamForm> = {};
    
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

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1 && !validateStep1()) {
      return;
    }
    
    if (step === 2) {
      try {
        await createTeam(formData);
        setStep(3);
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      } catch (error) {
        console.error('Failed to create team:', error);
      }
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      visibility: 'private',
      joinPolicy: 'invite_only',
      allowMemberInvite: true,
      allowMemberProjectCreate: true,
    });
    setErrors({});
    setStep(1);
    onClose();
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
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">创建团队</h2>
              <p className="text-sm text-gray-600">
                步骤 {step} / 2
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>
        
        {/* 进度条 */}
        <div className="mt-4">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <div className={`flex-1 h-1 rounded ${
              step >= 2 ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="px-6 py-6">
          {/* 步骤1: 基本信息 */}
          {step === 1 && (
            <div className="space-y-6">
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
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">
                  团队名称将显示在所有地方，请选择一个有意义的名称
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  团队描述
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="描述团队的目标和职责..."
                  rows={4}
                  error={errors.description}
                />
                <p className="mt-1 text-xs text-gray-500">
                  帮助其他人了解这个团队的用途和目标
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  团队可见性
                </label>
                <Select
                  value={formData.visibility}
                  onChange={(e) => handleInputChange('visibility', e.target.value)}
                >
                  <option value="private">私有团队</option>
                  <option value="internal">内部团队</option>
                  <option value="public">公开团队</option>
                </Select>
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <div className="flex">
                    <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-700">
                      {getVisibilityDescription(formData.visibility)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 步骤2: 高级设置 */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">团队设置</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      加入政策
                    </label>
                    <Select
                      value={formData.joinPolicy}
                      onChange={(e) => handleInputChange('joinPolicy', e.target.value)}
                    >
                      <option value="invite_only">仅限邀请</option>
                      <option value="request">申请加入</option>
                      <option value="open">开放加入</option>
                    </Select>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        {getJoinPolicyDescription(formData.joinPolicy)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
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
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 步骤3: 完成 */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">团队创建成功！</h3>
              <p className="text-gray-600 mb-4">
                团队 "{formData.name}" 已成功创建，正在跳转到团队页面...
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
        {step < 3 && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            <div>
              {step > 1 && (
                <Button type="button" variant="outline" onClick={handleBack}>
                  上一步
                </Button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                取消
              </Button>
              
              {step === 1 ? (
                <Button type="button" onClick={handleNext}>
                  下一步
                </Button>
              ) : (
                <Button type="submit" loading={isLoading}>
                  创建团队
                </Button>
              )}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default CreateTeamModal;