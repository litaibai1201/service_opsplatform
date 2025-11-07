import React from 'react';
import { UserIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/helpers';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'square' | 'rounded';
  fallback?: string;
  showBorder?: boolean;
  borderColor?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  className?: string;
  onClick?: () => void;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  size = 'md',
  shape = 'circle',
  fallback,
  showBorder = false,
  borderColor = 'border-white',
  status,
  className,
  onClick,
}) => {
  const [imageError, setImageError] = React.useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20',
  };

  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  };

  const statusSizeClasses = {
    xs: 'w-1.5 h-1.5 border',
    sm: 'w-2 h-2 border',
    md: 'w-2.5 h-2.5 border-2',
    lg: 'w-3 h-3 border-2',
    xl: 'w-4 h-4 border-2',
    '2xl': 'w-5 h-5 border-2',
  };

  const getAvatarClasses = () => {
    return cn(
      'relative inline-flex items-center justify-center bg-gray-300 overflow-hidden',
      sizeClasses[size],
      shapeClasses[shape],
      {
        'border-2': showBorder,
        'cursor-pointer': onClick,
      },
      showBorder && borderColor,
      className
    );
  };

  const renderContent = () => {
    if (src && !imageError) {
      return (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      );
    }

    if (fallback) {
      const initials = fallback
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);

      return (
        <span className="text-gray-700 font-medium text-sm">
          {initials}
        </span>
      );
    }

    return <UserIcon className="w-1/2 h-1/2 text-gray-500" />;
  };

  return (
    <div className="relative inline-block">
      <div className={getAvatarClasses()} onClick={onClick}>
        {renderContent()}
      </div>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full border-white',
            statusSizeClasses[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
};

// Avatar Group 组件
interface AvatarGroupProps {
  avatars: Array<{
    src?: string;
    alt?: string;
    fallback?: string;
  }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'square' | 'rounded';
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  max = 3,
  size = 'md',
  shape = 'circle',
  className,
}) => {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          {...avatar}
          size={size}
          shape={shape}
          showBorder
          className="ring-2 ring-white"
        />
      ))}
      
      {remainingCount > 0 && (
        <Avatar
          fallback={`+${remainingCount}`}
          size={size}
          shape={shape}
          showBorder
          className="ring-2 ring-white bg-gray-100 text-gray-600"
        />
      )}
    </div>
  );
};

export default Avatar;