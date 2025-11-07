import React, { useState, useRef, useEffect } from 'react';
import { Spinner } from './Spinner';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  webpSrc?: string;
  placeholder?: string;
  lazy?: boolean;
  quality?: number;
  className?: string;
  loadingClassName?: string;
  errorClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
  blurDataURL?: string;
  priority?: boolean;
}

export default function OptimizedImage({
  src,
  alt,
  fallbackSrc,
  webpSrc,
  placeholder,
  lazy = true,
  quality = 80,
  className = '',
  loadingClassName = '',
  errorClassName = '',
  onLoad,
  onError,
  blurDataURL,
  priority = false,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const [currentSrc, setCurrentSrc] = useState<string>(placeholder || blurDataURL || '');
  const imgRef = useRef<HTMLImageElement>(null);
  const intersectionRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || !intersectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.1,
      }
    );

    observer.observe(intersectionRef.current);

    return () => observer.disconnect();
  }, [lazy, priority]);

  // Determine the best image source
  const getBestImageSrc = (originalSrc: string) => {
    // Check WebP support
    const supportsWebP = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    })();

    // If WebP is supported and webpSrc is provided, use it
    if (supportsWebP && webpSrc) {
      return webpSrc;
    }

    // Add quality parameter if needed
    if (originalSrc.includes('?')) {
      return `${originalSrc}&q=${quality}`;
    } else {
      return `${originalSrc}?q=${quality}`;
    }
  };

  // Load the actual image when in view
  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    const imageSrc = getBestImageSrc(src);

    img.onload = () => {
      setCurrentSrc(imageSrc);
      setIsLoading(false);
      onLoad?.();
    };

    img.onerror = () => {
      // Try fallback image if available
      if (fallbackSrc && imageSrc !== fallbackSrc) {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          setCurrentSrc(fallbackSrc);
          setIsLoading(false);
          onLoad?.();
        };
        fallbackImg.onerror = () => {
          setHasError(true);
          setIsLoading(false);
          onError?.();
        };
        fallbackImg.src = fallbackSrc;
      } else {
        setHasError(true);
        setIsLoading(false);
        onError?.();
      }
    };

    img.src = imageSrc;
  }, [isInView, src, webpSrc, fallbackSrc, quality, onLoad, onError]);

  const renderPlaceholder = () => {
    if (hasError) {
      return (
        <div
          className={`flex items-center justify-center bg-gray-200 text-gray-500 ${errorClassName} ${className}`}
          style={{ minHeight: props.height || '200px', minWidth: props.width || '200px' }}
        >
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">图片加载失败</p>
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div
          className={`flex items-center justify-center bg-gray-100 ${loadingClassName} ${className}`}
          style={{ minHeight: props.height || '200px', minWidth: props.width || '200px' }}
        >
          <Spinner size="sm" />
        </div>
      );
    }

    return null;
  };

  return (
    <div ref={intersectionRef} className="relative">
      {/* Blur placeholder */}
      {blurDataURL && isLoading && (
        <img
          src={blurDataURL}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover filter blur-sm transition-opacity duration-300 ${
            isLoading ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      {!hasError && currentSrc && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          } ${className}`}
          loading={lazy && !priority ? 'lazy' : 'eager'}
          {...props}
        />
      )}

      {/* Loading/Error placeholder */}
      {(isLoading || hasError) && (
        <div className="absolute inset-0">
          {renderPlaceholder()}
        </div>
      )}
    </div>
  );
}

// Responsive image component
interface ResponsiveImageProps extends Omit<OptimizedImageProps, 'src'> {
  src: string;
  sizes?: string;
  srcSet?: string;
  breakpoints?: {
    [key: string]: string; // e.g., { '640w': 'image-640.jpg', '1024w': 'image-1024.jpg' }
  };
}

export function ResponsiveImage({
  src,
  sizes = '100vw',
  srcSet,
  breakpoints,
  ...props
}: ResponsiveImageProps) {
  // Generate srcSet from breakpoints
  const generateSrcSet = () => {
    if (srcSet) return srcSet;
    
    if (breakpoints) {
      return Object.entries(breakpoints)
        .map(([size, imageSrc]) => `${imageSrc} ${size}`)
        .join(', ');
    }
    
    return undefined;
  };

  return (
    <OptimizedImage
      src={src}
      srcSet={generateSrcSet()}
      sizes={sizes}
      {...props}
    />
  );
}

// Avatar component with optimized loading
interface OptimizedAvatarProps {
  src?: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fallbackText?: string;
  className?: string;
  priority?: boolean;
}

export function OptimizedAvatar({
  src,
  alt,
  size = 'md',
  fallbackText,
  className = '',
  priority = false,
}: OptimizedAvatarProps) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-14 h-14 text-xl',
    '2xl': 'w-16 h-16 text-2xl',
  };

  const baseClasses = `${sizeClasses[size]} rounded-full flex items-center justify-center ${className}`;

  if (!src) {
    return (
      <div className={`${baseClasses} bg-gray-300 text-gray-600 font-medium`}>
        {fallbackText?.charAt(0)?.toUpperCase() || alt.charAt(0)?.toUpperCase()}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={`${baseClasses} object-cover`}
      priority={priority}
      fallbackSrc="/default-avatar.png"
      lazy={!priority}
    />
  );
}

// Image gallery with lazy loading
interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    webpSrc?: string;
    thumbnail?: string;
  }>;
  className?: string;
  onImageClick?: (index: number) => void;
}

export function ImageGallery({ images, className = '', onImageClick }: ImageGalleryProps) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
      {images.map((image, index) => (
        <div
          key={index}
          className="aspect-square cursor-pointer hover:scale-105 transition-transform duration-200"
          onClick={() => onImageClick?.(index)}
        >
          <OptimizedImage
            src={image.thumbnail || image.src}
            alt={image.alt}
            webpSrc={image.webpSrc}
            className="w-full h-full object-cover rounded-lg"
            lazy={true}
            placeholder="/image-placeholder.jpg"
          />
        </div>
      ))}
    </div>
  );
}