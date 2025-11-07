import React, { useState } from 'react';
import { Modal, Button, Input, Textarea, Select, Switch } from '@/components/ui';
import { useProjects } from '@/hooks/data/useProjects';
import { useTeams } from '@/hooks/data/useTeams';
import {
  FolderIcon,
  XMarkIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreateProjectForm {
  name: string;
  description: string;
  type: 'web' | 'mobile' | 'api' | 'desktop' | 'library';
  teamId: string;
  visibility: 'public' | 'private';
  priority: 'high' | 'medium' | 'low';
  allowMemberEdit: boolean;
  allowExternalView: boolean;
  templateId?: string;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const { createProject, isLoading } = useProjects();
  const { teams } = useTeams();
  
  const [formData, setFormData] = useState<CreateProjectForm>({
    name: '',
    description: '',
    type: 'web',
    teamId: '',
    visibility: 'private',
    priority: 'medium',
    allowMemberEdit: true,
    allowExternalView: false,
  });
  
  const [errors, setErrors] = useState<Partial<CreateProjectForm>>({});
  const [step, setStep] = useState(1); // 1: 基本信息, 2: 高级设置, 3: 完成

  const handleInputChange = (field: keyof CreateProjectForm, value: any) => {
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
    const newErrors: Partial<CreateProjectForm> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '请输入项目名称';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = '项目名称至少需要2个字符';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = '项目名称不能超过50个字符';
    }
    
    if (!formData.teamId) {
      newErrors.teamId = '请选择所属团队';
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
        await createProject(formData);
        setStep(3);
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      } catch (error) {
        console.error('Failed to create project:', error);
      }
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      type: 'web',
      teamId: '',
      visibility: 'private',
      priority: 'medium',
      allowMemberEdit: true,
      allowExternalView: false,
    });
    setErrors({});
    setStep(1);
    onClose();
  };

  const getTypeDescription = (type: string) => {
    const descriptions = {
      web: 'Web应用程序，包括前端和后端服务',
      mobile: '移动应用程序，iOS或Android平台',
      api: 'API服务，提供数据接口和业务逻辑',
      desktop: '桌面应用程序，跨平台或特定操作系统',
      library: '代码库或组件库，可被其他项目引用',
    };
    return descriptions[type as keyof typeof descriptions];
  };

  const getVisibilityDescription = (visibility: string) => {
    const descriptions = {
      public: '所有人都可以查看这个项目的内容',
      private: '只有项目成员可以查看项目内容',
    };
    return descriptions[visibility as keyof typeof descriptions];
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FolderIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">创建项目</h2>
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
                  项目名称 *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="输入项目名称"
                  error={errors.name}
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">
                  项目名称将在所有地方显示，请选择一个有意义的名称
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  所属团队 *
                </label>
                <Select
                  value={formData.teamId}
                  onChange={(e) => handleInputChange('teamId', e.target.value)}
                  error={errors.teamId}
                >
                  <option value="">请选择团队</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-gray-500">
                  项目将属于选定的团队，团队成员将自动获得项目访问权限
                </p>
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
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <div className="flex">
                    <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-700">
                      {getTypeDescription(formData.type)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  项目描述
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="描述项目的目标和功能..."
                  rows={4}
                  error={errors.description}
                />
                <p className="mt-1 text-xs text-gray-500">
                  帮助团队成员了解项目的用途和目标
                </p>
              </div>
            </div>
          )}

          {/* 步骤2: 高级设置 */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">项目设置</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      项目可见性
                    </label>
                    <Select
                      value={formData.visibility}
                      onChange={(e) => handleInputChange('visibility', e.target.value)}
                    >
                      <option value="private">私有项目</option>
                      <option value="public">公开项目</option>
                    </Select>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        {getVisibilityDescription(formData.visibility)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      项目优先级
                    </label>
                    <Select
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                    >
                      <option value="low">低优先级</option>
                      <option value="medium">中优先级</option>
                      <option value="high">高优先级</option>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">允许成员编辑</h4>
                        <p className="text-sm text-gray-600">团队成员可以编辑项目内容</p>
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
                        disabled={formData.visibility === 'private'}
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">项目创建成功！</h3>
              <p className="text-gray-600 mb-4">
                项目 "{formData.name}" 已成功创建，正在跳转到项目页面...
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
                  创建项目
                </Button>
              )}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default CreateProjectModal;