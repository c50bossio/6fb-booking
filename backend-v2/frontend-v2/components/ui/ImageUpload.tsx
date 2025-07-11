'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { OptimizedImage } from './OptimizedImage'
import { 
  ImageValidator, 
  ImageCompressor, 
  ImageOptimizer,
  imageConfig 
} from '@/lib/image-optimization'
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react'

interface ImageUploadProps {
  value?: string[]
  onChange?: (files: string[]) => void
  maxFiles?: number
  maxSize?: number // in MB
  acceptedTypes?: string[]
  quality?: keyof typeof imageConfig.quality
  className?: string
  disabled?: boolean
  preview?: boolean
  compress?: boolean
  children?: React.ReactNode
}

interface UploadingFile {
  id: string
  file: File
  preview: string
  status: 'uploading' | 'processing' | 'success' | 'error'
  progress: number
  error?: string
  optimizedUrl?: string
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value = [],
  onChange,
  maxFiles = 5,
  maxSize = 10, // 10MB default
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  quality = 'standard',
  className,
  disabled = false,
  preview = true,
  compress = true,
  children,
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: FileList) => {
    const filesArray = Array.from(files)
    
    // Check file count limit
    if (value.length + filesArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Process each file
    for (const file of filesArray) {
      const fileId = `${Date.now()}-${Math.random()}`
      const preview = URL.createObjectURL(file)
      
      const uploadingFile: UploadingFile = {
        id: fileId,
        file,
        preview,
        status: 'uploading',
        progress: 0,
      }

      setUploadingFiles(prev => [...prev, uploadingFile])

      try {
        // Validate file
        const validation = await ImageValidator.validateFile(file, {
          maxSize: maxSize * 1024 * 1024,
          allowedTypes: acceptedTypes,
        })

        if (!validation.valid) {
          throw new Error(validation.errors.join(', '))
        }

        // Update status to processing
        setUploadingFiles(prev => 
          prev.map(f => f.id === fileId ? { ...f, status: 'processing', progress: 50 } : f)
        )

        let processedFile = file
        let optimizedUrl = preview

        // Compress if enabled
        if (compress) {
          processedFile = await ImageCompressor.compressFile(file, {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: imageConfig.quality[quality] / 100,
            format: 'image/jpeg',
          })

          optimizedUrl = URL.createObjectURL(processedFile)
        }

        // Simulate upload progress
        for (let progress = 60; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100))
          setUploadingFiles(prev => 
            prev.map(f => f.id === fileId ? { ...f, progress } : f)
          )
        }

        // Mark as successful
        setUploadingFiles(prev => 
          prev.map(f => f.id === fileId ? { 
            ...f, 
            status: 'success', 
            progress: 100,
            optimizedUrl 
          } : f)
        )

        // Add to final value
        const newFiles = [...value, optimizedUrl]
        onChange?.(newFiles)

        // Clean up preview URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(preview)
          if (optimizedUrl !== preview) {
            URL.revokeObjectURL(optimizedUrl)
          }
        }, 5000)

      } catch (error) {
        setUploadingFiles(prev => 
          prev.map(f => f.id === fileId ? { 
            ...f, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Upload failed' 
          } : f)
        )
      }
    }
  }, [value, onChange, maxFiles, maxSize, acceptedTypes, quality, compress])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true)
    }
  }, [])

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const removeFile = useCallback((index: number) => {
    const newFiles = value.filter((_, i) => i !== index)
    onChange?.(newFiles)
  }, [value, onChange])

  const removeUploadingFile = useCallback((fileId: string) => {
    setUploadingFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file) {
        URL.revokeObjectURL(file.preview)
        if (file.optimizedUrl) {
          URL.revokeObjectURL(file.optimizedUrl)
        }
      }
      return prev.filter(f => f.id !== fileId)
    })
  }, [])

  const openFileDialog = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }, [disabled])

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      uploadingFiles.forEach(file => {
        URL.revokeObjectURL(file.preview)
        if (file.optimizedUrl) {
          URL.revokeObjectURL(file.optimizedUrl)
        }
      })
    }
  }, [])

  return (
    <div className={cn('w-full', className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Drop zone */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-all duration-200',
          'hover:border-primary-400 hover:bg-primary-50/50',
          'dark:hover:border-primary-600 dark:hover:bg-primary-950/20',
          dragActive 
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30' 
            : 'border-gray-300 dark:border-gray-600',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer'
        )}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        {children ? (
          children
        ) : (
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <div className="mt-4">
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Drop images here or click to upload
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Supports {acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} up to {maxSize}MB each
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Maximum {maxFiles} files
              </p>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              className="mt-4"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation()
                openFileDialog()
              }}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Choose Images
            </Button>
          </div>
        )}

        {dragActive && (
          <div className="absolute inset-0 bg-primary-100/80 dark:bg-primary-900/80 rounded-lg flex items-center justify-center">
            <div className="text-primary-600 dark:text-primary-400 text-lg font-medium">
              Drop files here
            </div>
          </div>
        )}
      </div>

      {/* Progress indicators for uploading files */}
      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-3">
          {uploadingFiles.map(file => (
            <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                <img
                  src={file.preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {file.file.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {file.status === 'success' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <p className={cn(
                    'text-xs',
                    file.status === 'success' && 'text-green-600 dark:text-green-400',
                    file.status === 'error' && 'text-red-600 dark:text-red-400',
                    (file.status === 'uploading' || file.status === 'processing') && 'text-gray-500 dark:text-gray-400'
                  )}>
                    {file.status === 'uploading' && 'Uploading...'}
                    {file.status === 'processing' && 'Processing...'}
                    {file.status === 'success' && 'Complete'}
                    {file.status === 'error' && (file.error || 'Failed')}
                  </p>
                </div>
                
                {(file.status === 'uploading' || file.status === 'processing') && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  removeUploadingFile(file.id)
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Preview grid */}
      {preview && value.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Uploaded Images ({value.length}/{maxFiles})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {value.map((url, index) => (
              <div key={index} className="relative group aspect-square">
                <OptimizedImage
                  src={url}
                  alt={`Upload ${index + 1}`}
                  fill
                  className="rounded-lg object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(index)
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File info */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        {compress && (
          <p>✓ Images will be automatically compressed and optimized</p>
        )}
        <p>Accepted formats: {acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}</p>
        <p>Maximum file size: {maxSize}MB per image</p>
      </div>
    </div>
  )
}

// Simplified version for single image upload
export const SingleImageUpload: React.FC<Omit<ImageUploadProps, 'value' | 'onChange' | 'maxFiles'> & {
  value?: string
  onChange?: (file: string | null) => void
}> = ({
  value,
  onChange,
  ...props
}) => {
  return (
    <ImageUpload
      {...props}
      maxFiles={1}
      value={value ? [value] : []}
      onChange={(files) => onChange?.(files[0] || null)}
    />
  )
}

// Avatar upload component
export const AvatarUpload: React.FC<{
  value?: string
  onChange?: (file: string | null) => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  disabled?: boolean
}> = ({
  value,
  onChange,
  size = 'lg',
  className,
  disabled = false,
}) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40',
  }

  return (
    <div className={cn('relative', className)}>
      <SingleImageUpload
        value={value}
        onChange={onChange}
        maxSize={5}
        acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
        quality="avatar"
        preview={false}
        compress={true}
        disabled={disabled}
        className={cn('border-0 p-0', sizeClasses[size])}
      >
        <div className={cn(
          'w-full h-full rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600',
          'hover:border-primary-400 dark:hover:border-primary-600',
          'flex items-center justify-center bg-gray-50 dark:bg-gray-800',
          'cursor-pointer transition-colors',
          disabled && 'opacity-50 cursor-not-allowed'
        )}>
          {value ? (
            <OptimizedImage
              src={value}
              alt="Avatar"
              fill
              className="rounded-full object-cover"
              sizes={`${sizeClasses[size].split(' ')[0].replace('w-', '')}px`}
            />
          ) : (
            <div className="text-center">
              <ImageIcon className="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500" />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Upload Avatar
              </p>
            </div>
          )}
        </div>
      </SingleImageUpload>
    </div>
  )
}

export default ImageUpload