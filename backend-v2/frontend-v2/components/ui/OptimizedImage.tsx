'use client'

import React, { useState, useRef, useEffect } from 'react'
import Image, { ImageProps } from 'next/image'
import { cn } from '@/lib/utils'
import { useLazyLoading } from '@/lib/lazy-loading'

/**
 * Optimized Image Component with Progressive Loading
 * Combines Next.js Image optimization with lazy loading and progressive enhancement
 */

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  // Progressive loading options
  progressive?: boolean
  showPlaceholder?: boolean
  placeholderClassName?: string
  
  // Lazy loading options
  lazyLoading?: boolean
  threshold?: number
  
  // Error handling
  fallbackSrc?: string
  onLoadComplete?: () => void
  onError?: (error: Error) => void
  
  // Performance options
  priority?: boolean
  quality?: number
  
  // Responsive options
  responsive?: boolean
  aspectRatio?: number
  
  // Accessibility
  decorative?: boolean
}

export const OptimizedImage = React.forwardRef<HTMLImageElement, OptimizedImageProps>(({
  src,
  alt,
  className,
  progressive = true,
  showPlaceholder = true,
  placeholderClassName,
  lazyLoading = true,
  threshold = 0.1,
  fallbackSrc,
  onLoadComplete,
  onError,
  priority = false,
  quality = 85,
  responsive = true,
  aspectRatio,
  decorative = false,
  ...props
}, ref) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)
  const { elementRef, isLoaded } = useLazyLoading()
  const imageRef = useRef<HTMLImageElement>(null)

  // Combine refs
  useEffect(() => {
    if (ref && imageRef.current) {
      if (typeof ref === 'function') {
        ref(imageRef.current)
      } else {
        ref.current = imageRef.current
      }
    }
  }, [ref])

  const handleLoad = () => {
    setIsLoading(false)
    onLoadComplete?.()
  }

  const handleError = (error: any) => {
    setIsLoading(false)
    setHasError(true)
    
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
      setHasError(false)
    } else {
      onError?.(new Error('Failed to load image'))
    }
  }

  // Generate placeholder based on dimensions
  const generatePlaceholder = (width?: number, height?: number) => {
    const w = width || 400
    const h = height || Math.round(w / (aspectRatio || 1.5))
    
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <rect width="100%" height="100%" fill="url(#shimmer)"/>
        <defs>
          <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#e5e7eb;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f3f4f6;stop-opacity:1" />
          </linearGradient>
        </defs>
      </svg>
    `)}`
  }

  // Intersection observer for lazy loading
  const shouldLoad = !lazyLoading || isLoaded || priority

  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 text-gray-400 text-sm',
          className
        )}
        role={decorative ? 'presentation' : 'img'}
        aria-label={decorative ? undefined : alt || 'Image failed to load'}
      >
        <svg
          className="w-8 h-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    )
  }

  return (
    <div
      ref={lazyLoading ? (elementRef as any) : undefined}
      className={cn('relative overflow-hidden', className)}
      data-lazy-id={`optimized-image-${src}`}
    >
      {/* Progressive placeholder */}
      {showPlaceholder && isLoading && progressive && (
        <div
          className={cn(
            'absolute inset-0 animate-pulse bg-gray-200',
            'after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent',
            'after:animate-shimmer',
            placeholderClassName
          )}
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      {shouldLoad && (
        <Image
          ref={imageRef}
          src={currentSrc}
          alt={decorative ? '' : alt}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            responsive && 'w-full h-auto',
            className
          )}
          priority={priority}
          quality={quality}
          placeholder={progressive ? 'blur' : 'empty'}
          blurDataURL={progressive ? generatePlaceholder(props.width as number, props.height as number) : undefined}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          sizes={responsive ? '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw' : undefined}
          {...(decorative && { 'aria-hidden': 'true', role: 'presentation' })}
          {...props}
        />
      )}

      {/* Loading indicator */}
      {isLoading && !progressive && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100"
          aria-hidden="true"
        >
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
})

OptimizedImage.displayName = 'OptimizedImage'

// Gallery component with optimized image loading
export const ImageGallery = React.memo(({
  images,
  columns = 3,
  gap = 4,
  className,
  onImageClick,
  aspectRatio = 1,
}: {
  images: Array<{
    src: string
    alt?: string
    width?: number
    height?: number
  }>
  columns?: number
  gap?: number
  className?: string
  onImageClick?: (image: any, index: number) => void
  aspectRatio?: number
}) => {
  return (
    <div
      className={cn(
        'grid gap-' + gap,
        `grid-cols-1 sm:grid-cols-${Math.min(2, columns)} lg:grid-cols-${columns}`,
        className
      )}
    >
      {images.map((image, index) => (
        <div
          key={image.src}
          className={cn(
            'relative cursor-pointer transition-transform hover:scale-105',
            onImageClick && 'group'
          )}
          onClick={() => onImageClick?.(image, index)}
          style={{ aspectRatio }}
        >
          <OptimizedImage
            src={image.src}
            alt={image.alt || `Gallery image ${index + 1}`}
            width={image.width || 400}
            height={image.height || Math.round((image.width || 400) / aspectRatio)}
            className="rounded-lg object-cover w-full h-full"
            quality={80}
            priority={index < 3} // Prioritize first 3 images
          />
          
          {onImageClick && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  )
})

ImageGallery.displayName = 'ImageGallery'

// Avatar component with optimized loading
export const OptimizedAvatar = React.memo(({
  src,
  alt,
  size = 'md',
  fallbackSrc,
  className,
  ...props
}: {
  src?: string
  alt: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fallbackSrc?: string
  className?: string
} & Omit<OptimizedImageProps, 'width' | 'height'>) => {
  const sizeMap = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  }

  const sizeValue = sizeMap[size]
  const initials = alt.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2)

  if (!src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-primary-100 text-primary-700 font-medium',
          size === 'xs' && 'text-xs',
          size === 'sm' && 'text-sm',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-base',
          size === 'xl' && 'text-lg',
          className
        )}
        style={{ width: sizeValue, height: sizeValue }}
        aria-label={alt}
      >
        {initials}
      </div>
    )
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={sizeValue}
      height={sizeValue}
      className={cn('rounded-full object-cover', className)}
      fallbackSrc={fallbackSrc}
      quality={90}
      priority={size === 'lg' || size === 'xl'}
      {...props}
    />
  )
})

OptimizedAvatar.displayName = 'OptimizedAvatar'

export default OptimizedImage