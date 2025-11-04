import React from 'react';
import { toast, Toaster, ToastBar } from 'react-hot-toast';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon 
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/helpers';

interface ToastContainerProps {
  position?: 
    | 'top-left' 
    | 'top-center' 
    | 'top-right' 
    | 'bottom-left' 
    | 'bottom-center' 
    | 'bottom-right';
  maxToasts?: number;
  duration?: number;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right',
  maxToasts = 5,
  duration = 4000,
}) => {
  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'loading':
        return (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <Toaster
      position={position}
      toastOptions={{
        duration,
        style: {
          background: 'white',
          color: '#374151',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          padding: '12px 16px',
          maxWidth: '400px',
        },
        success: {
          style: {
            border: '1px solid #10b981',
          },
        },
        error: {
          style: {
            border: '1px solid #ef4444',
          },
        },
      }}
      containerStyle={{
        top: position.includes('top') ? 20 : undefined,
        bottom: position.includes('bottom') ? 20 : undefined,
        left: position.includes('left') ? 20 : undefined,
        right: position.includes('right') ? 20 : undefined,
      }}
      gutter={8}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <div className="flex items-center space-x-3 w-full">
              {/* 自定义图标 */}
              <div className="flex-shrink-0">
                {getToastIcon(t.type)}
              </div>

              {/* 消息内容 */}
              <div className="flex-1 text-sm font-medium">
                {message}
              </div>

              {/* 关闭按钮 */}
              {t.type !== 'loading' && (
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className={cn(
                    'flex-shrink-0 p-1 rounded-full',
                    'hover:bg-gray-100 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-gray-300'
                  )}
                >
                  <XMarkIcon className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
};

// 导出便捷的 toast 方法
export const showToast = {
  success: (message: string, options?: any) => {
    toast.success(message, options);
  },
  error: (message: string, options?: any) => {
    toast.error(message, options);
  },
  info: (message: string, options?: any) => {
    toast(message, { icon: '💡', ...options });
  },
  warning: (message: string, options?: any) => {
    toast(message, { 
      icon: '⚠️',
      style: {
        border: '1px solid #f59e0b',
      },
      ...options 
    });
  },
  loading: (message: string, options?: any) => {
    return toast.loading(message, options);
  },
  promise: function<T>(
    promise: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
    options?: any
  ) {
    return toast.promise(promise, msgs, options);
  },
  dismiss: (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },
  remove: (toastId?: string) => {
    if (toastId) {
      toast.remove(toastId);
    } else {
      toast.remove();
    }
  },
};

export default ToastContainer;