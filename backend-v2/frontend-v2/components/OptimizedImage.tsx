/**
 * Optimized Image Component
 * Replaces regular img tags with Next.js optimized images
 */
import Image from 'next/image'
import React, { useState } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  fill?: boolean
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  sizes?: string
  onLoad?: () => void
  onError?: () => void
}

const OptimizedImage = React.memo<OptimizedImageProps>(({
  src,
  alt,
  width,
  height,
  className,
  fill = false,
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    onError?.()
  }

  if (hasError) {
    return (
      <div 
        className={cn(
          'bg-gray-200 flex items-center justify-center text-gray-400 text-sm',
          className
        )}
        style={{ width, height }}
      >
        Failed to load image
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse rounded"
          style={{ width, height }}
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        sizes={sizes}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  )
})

OptimizedImage.displayName = 'OptimizedImage'

// Pre-configured image components for common use cases
export const AvatarImage = React.memo<Omit<OptimizedImageProps, 'width' | 'height'> & { size?: number }>(({
  size = 40,
  className,
  ...props
}) => (
  <OptimizedImage
    {...props}
    width={size}
    height={size}
    className={cn('rounded-full object-cover', className)}
    quality={85}
  />
))

AvatarImage.displayName = 'AvatarImage'

export const LogoImage = React.memo<OptimizedImageProps>(({
  className,
  priority = true,
  quality = 90,
  ...props
}) => (
  <OptimizedImage
    {...props}
    className={cn('object-contain', className)}
    priority={priority}
    quality={quality}
  />
))

LogoImage.displayName = 'LogoImage'

export const HeroImage = React.memo<OptimizedImageProps>(({
  className,
  priority = true,
  quality = 85,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  ...props
}) => (
  <OptimizedImage
    {...props}
    className={cn('object-cover w-full h-full', className)}
    priority={priority}
    quality={quality}
    sizes={sizes}
  />
))

HeroImage.displayName = 'HeroImage'

export const ThumbnailImage = React.memo<OptimizedImageProps>(({
  className,
  quality = 70,
  ...props
}) => (
  <OptimizedImage
    {...props}
    className={cn('object-cover rounded', className)}
    quality={quality}
  />
))

ThumbnailImage.displayName = 'ThumbnailImage'

export default OptimizedImage