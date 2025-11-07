import React, { useState } from 'react';
import { Modal, Button, Input, Select, Switch, Badge } from '@/components/ui';
import { useTeamInvitations } from '@/hooks/data/useTeams';
import {
  UserPlusIcon,
  XMarkIcon,
  EnvelopeIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  onSuccess: () => void;
}

interface InviteForm {
  method: 'email' | 'link';
  emails: string[];
  role: 'member' | 'admin';
  message: string;
  expiresIn: number;
  allowMultipleUse: boolean;
}

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  teamId,
  teamName,
  onSuccess
}) => {
  const { sendInvitations, generateInviteLink, isLoading } = useTeamInvitations(teamId);
  
  const [formData, setFormData] = useState<InviteForm>({
    method: 'email',
    emails: [''],
    role: 'member',
    message: '',
    expiresIn: 7,
    allowMultipleUse: false,
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  const [inviteLink, setInviteLink] = useState<string>('');
  const [linkCopied, setLinkCopied] = useState(false);

  const handleMethodChange = (method: 'email' | 'link') => {
    setFormData(prev => ({ ...prev, method }));
    setErrors([]);
    setInviteLink('');
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...formData.emails];
    newEmails[index] = value;
    setFormData(prev => ({ ...prev, emails: newEmails }));
    
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const addEmailField = () => {
    setFormData(prev => ({
      ...prev,
      emails: [...prev.emails, '']
    }));
  };

  const removeEmailField = (index: number) => {
    if (formData.emails.length > 1) {
      const newEmails = formData.emails.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, emails: newEmails }));
    }
  };

  const validateEmails = (): boolean => {
    const newErrors: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    formData.emails.forEach((email, index) => {
      if (!email.trim()) {
        newErrors.push(`请输入第 ${index + 1} 个邮箱地址`);
      } else if (!emailRegex.test(email.trim())) {
        newErrors.push(`第 ${index + 1} 个邮箱地址格式不正确`);
      }
    });
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.method === 'email') {
      if (!validateEmails()) {
        return;
      }
      
      try {
        await sendInvitations({
          emails: formData.emails.filter(email => email.trim()),
          role: formData.role,
          message: formData.message,
        });
        onSuccess();
        handleClose();
      } catch (error) {
        console.error('Failed to send invitations:', error);
        setErrors(['发送邀请失败，请重试']);
      }
    } else {
      try {
        const link = await generateInviteLink({
          role: formData.role,
          expiresIn: formData.expiresIn,
          allowMultipleUse: formData.allowMultipleUse,
        });
        setInviteLink(link);
      } catch (error) {
        console.error('Failed to generate invite link:', error);
        setErrors(['生成邀请链接失败，请重试']);
      }
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      method: 'email',
      emails: [''],
      role: 'member',
      message: '',
      expiresIn: 7,
      allowMultipleUse: false,
    });
    setErrors([]);
    setInviteLink('');
    setLinkCopied(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserPlusIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">邀请成员</h2>
              <p className="text-sm text-gray-600">邀请成员加入 {teamName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="px-6 py-6 space-y-6">
          {/* 邀请方式选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              邀请方式
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleMethodChange('email')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  formData.method === 'email'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <EnvelopeIcon className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">邮箱邀请</div>
                    <div className="text-sm text-gray-500">发送邮件邀请</div>
                  </div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => handleMethodChange('link')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  formData.method === 'link'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <LinkIcon className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">邀请链接</div>
                    <div className="text-sm text-gray-500">生成邀请链接</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

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

          {/* 邮箱邀请表单 */}
          {formData.method === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  邮箱地址 *
                </label>
                <div className="space-y-2">
                  {formData.emails.map((email, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => handleEmailChange(index, e.target.value)}
                        placeholder="输入邮箱地址"
                        className="flex-1"
                      />
                      {formData.emails.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEmailField(index)}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEmailField}
                  className="mt-2"
                >
                  + 添加邮箱
                </Button>
              </div>

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
            </div>
          )}

          {/* 链接邀请表单 */}
          {formData.method === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  链接有效期
                </label>
                <Select
                  value={formData.expiresIn.toString()}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    expiresIn: parseInt(e.target.value) 
                  }))}
                >
                  <option value="1">1 天</option>
                  <option value="3">3 天</option>
                  <option value="7">7 天</option>
                  <option value="14">14 天</option>
                  <option value="30">30 天</option>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">允许多次使用</h4>
                  <p className="text-sm text-gray-600">链接可以被多个用户使用</p>
                </div>
                <Switch
                  checked={formData.allowMultipleUse}
                  onChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    allowMultipleUse: checked 
                  }))}
                />
              </div>

              {/* 生成的邀请链接 */}
              {inviteLink && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-800 mb-2">邀请链接已生成</h4>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 bg-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyInviteLink}
                      className={linkCopied ? 'text-green-600' : ''}
                    >
                      {linkCopied ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {linkCopied && (
                    <p className="text-sm text-green-600 mt-1">链接已复制到剪贴板</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 成员角色 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              成员角色
            </label>
            <Select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                role: e.target.value as 'member' | 'admin' 
              }))}
            >
              <option value="member">成员 - 基本权限</option>
              <option value="admin">管理员 - 管理权限</option>
            </Select>
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                {formData.role === 'member' 
                  ? '成员可以查看团队内容、参与项目协作'
                  : '管理员可以管理团队设置、邀请成员、管理项目'
                }
              </p>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <Button type="button" variant="outline" onClick={handleClose}>
            取消
          </Button>
          
          <Button 
            type="submit" 
            loading={isLoading}
            disabled={formData.method === 'link' && !!inviteLink}
          >
            {formData.method === 'email' ? '发送邀请' : '生成链接'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default InviteMemberModal;