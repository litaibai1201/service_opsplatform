import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/helpers';
import Button from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  children?: React.ReactNode;
  type?: 'info' | 'warning' | 'error' | 'success' | 'danger';
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  children,
  type = 'warning',
  confirmText = '确认',
  cancelText = '取消',
  isLoading = false,
  icon,
  size = 'md',
}) => {
  const getTypeConfig = () => {
    switch (type) {
      case 'info':
        return {
          icon: <InformationCircleIcon className="h-6 w-6 text-blue-600" />,
          iconBg: 'bg-blue-100',
          confirmVariant: 'primary' as const,
        };
      case 'success':
        return {
          icon: <CheckCircleIcon className="h-6 w-6 text-green-600" />,
          iconBg: 'bg-green-100',
          confirmVariant: 'primary' as const,
        };
      case 'error':
        return {
          icon: <XCircleIcon className="h-6 w-6 text-red-600" />,
          iconBg: 'bg-red-100',
          confirmVariant: 'danger' as const,
        };
      case 'danger':
        return {
          icon: <TrashIcon className="h-6 w-6 text-red-600" />,
          iconBg: 'bg-red-100',
          confirmVariant: 'danger' as const,
        };
      case 'warning':
      default:
        return {
          icon: <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />,
          iconBg: 'bg-yellow-100',
          confirmVariant: 'warning' as const,
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return {
          panel: 'max-w-sm',
          padding: 'p-4',
          iconContainer: 'h-10 w-10',
          spacing: 'space-y-3',
        };
      case 'lg':
        return {
          panel: 'max-w-lg',
          padding: 'p-8',
          iconContainer: 'h-14 w-14',
          spacing: 'space-y-6',
        };
      case 'md':
      default:
        return {
          panel: 'max-w-md',
          padding: 'p-6',
          iconContainer: 'h-12 w-12',
          spacing: 'space-y-4',
        };
    }
  };

  const typeConfig = getTypeConfig();
  const sizeConfig = getSizeConfig();

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isLoading) {
      handleConfirm();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-50" 
        onClose={isLoading ? () => {} : onClose}
        onKeyDown={handleKeyDown}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className={cn(
                'w-full transform overflow-hidden rounded-xl',
                'bg-white text-left align-middle shadow-xl transition-all',
                sizeConfig.panel,
                sizeConfig.padding
              )}>
                <div className={cn('flex flex-col items-center text-center', sizeConfig.spacing)}>
                  {/* 图标 */}
                  <div className={cn(
                    'flex items-center justify-center rounded-full',
                    sizeConfig.iconContainer,
                    typeConfig.iconBg
                  )}>
                    {icon || typeConfig.icon}
                  </div>

                  {/* 标题和内容 */}
                  <div className="space-y-2">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      {title}
                    </Dialog.Title>
                    
                    {message && (
                      <p className="text-sm text-gray-600">
                        {message}
                      </p>
                    )}
                    
                    {children && (
                      <div className="text-sm text-gray-600">
                        {children}
                      </div>
                    )}
                  </div>

                  {/* 按钮 */}
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-center gap-3 w-full sm:w-auto">
                    <Button
                      onClick={onClose}
                      variant="outline"
                      disabled={isLoading}
                      className="sm:min-w-[80px]"
                    >
                      {cancelText}
                    </Button>
                    
                    <Button
                      onClick={handleConfirm}
                      variant={typeConfig.confirmVariant}
                      loading={isLoading}
                      className="sm:min-w-[80px]"
                    >
                      {confirmText}
                    </Button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// 便捷的确认对话框 Hook
export const useConfirmDialog = () => {
  const [dialogConfig, setDialogConfig] = React.useState<{
    isOpen: boolean;
    title: string;
    message?: string;
    type?: 'info' | 'warning' | 'error' | 'success' | 'danger';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
  });

  const showConfirm = React.useCallback((config: {
    title: string;
    message?: string;
    type?: 'info' | 'warning' | 'error' | 'success' | 'danger';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }) => {
    setDialogConfig({
      ...config,
      isOpen: true,
      isLoading: false,
    });
  }, []);

  const hideConfirm = React.useCallback(() => {
    setDialogConfig(prev => ({ ...prev, isOpen: false }));
  }, []);

  const setLoading = React.useCallback((loading: boolean) => {
    setDialogConfig(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const handleConfirm = React.useCallback(() => {
    if (dialogConfig.onConfirm) {
      dialogConfig.onConfirm();
    } else {
      hideConfirm();
    }
  }, [dialogConfig.onConfirm, hideConfirm]);

  const ConfirmDialogComponent = React.useCallback(() => (
    <ConfirmDialog
      isOpen={dialogConfig.isOpen}
      onClose={hideConfirm}
      onConfirm={handleConfirm}
      title={dialogConfig.title}
      message={dialogConfig.message}
      type={dialogConfig.type}
      confirmText={dialogConfig.confirmText}
      cancelText={dialogConfig.cancelText}
      isLoading={dialogConfig.isLoading}
    />
  ), [dialogConfig, hideConfirm, handleConfirm]);

  return {
    showConfirm,
    hideConfirm,
    setLoading,
    ConfirmDialog: ConfirmDialogComponent,
  };
};

export default ConfirmDialog;