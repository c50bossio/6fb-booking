'use client'

import React, { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { OptimizedImage } from './OptimizedImage'
import { toast } from '@/hooks/use-toast'
import { 
  Camera, 
  Upload, 
  X, 
  User, 
  AlertCircle, 
  CheckCircle,
  ImageIcon
} from 'lucide-react'

interface ProfileImageUploadProps {
  value?: string | null
  onChange?: (imageUrl: string | null) => void
  onUpload?: (file: File) => Promise<string> // Return the uploaded image URL
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  disabled?: boolean
  showRemoveButton?: boolean
  placeholder?: React.ReactNode
  uploadButtonText?: string
  acceptedTypes?: string[]
  maxSize?: number // in MB
}

interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error'
  progress: number
  error?: string
}

const PRESET_SIZES = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24', 
  lg: 'w-32 h-32',
  xl: 'w-40 h-40',
  '2xl': 'w-48 h-48'
}

const validateFile = (file: File, maxSize: number, acceptedTypes: string[]): string | null => {
  // Check file type
  if (!acceptedTypes.includes(file.type)) {
    return `Invalid file type. Accepted formats: ${acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}`
  }
  
  // Check file size
  const maxBytes = maxSize * 1024 * 1024
  if (file.size > maxBytes) {
    return `File too large. Maximum size is ${maxSize}MB`
  }
  
  return null
}

export const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({
  value,
  onChange,
  onUpload,
  size = 'lg',
  className,
  disabled = false,
  showRemoveButton = true,
  placeholder,
  uploadButtonText = 'Upload Image',
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  maxSize = 5 // 5MB default
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0
  })
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileProcessing = useCallback(async (file: File) => {
    // Validate file
    const validationError = validateFile(file, maxSize, acceptedTypes)
    if (validationError) {
      setUploadState({ status: 'error', progress: 0, error: validationError })
      toast({
        title: 'Invalid File',
        description: validationError,
        variant: 'destructive'
      })
      return
    }

    setUploadState({ status: 'uploading', progress: 10 })

    try {
      // Simulate upload progress
      const updateProgress = (progress: number) => {
        setUploadState(prev => ({ ...prev, progress }))
      }

      // Progress simulation
      updateProgress(30)
      
      if (onUpload) {
        // Use custom upload function
        updateProgress(60)
        const imageUrl = await onUpload(file)
        updateProgress(90)
        
        onChange?.(imageUrl)
        setUploadState({ status: 'success', progress: 100 })
        
        toast({
          title: 'Success',
          description: 'Profile image uploaded successfully!'
        })
      } else {
        // Fallback: create blob URL for preview
        updateProgress(80)
        const imageUrl = URL.createObjectURL(file)
        onChange?.(imageUrl)
        updateProgress(100)
        setUploadState({ status: 'success', progress: 100 })
        
        toast({
          title: 'Image Selected',
          description: 'Image ready for upload when you save your profile.'
        })
      }

      // Reset upload state after delay
      setTimeout(() => {
        setUploadState({ status: 'idle', progress: 0 })
      }, 2000)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadState({ status: 'error', progress: 0, error: errorMessage })
      
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }, [onUpload, onChange, maxSize, acceptedTypes])

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    handleFileProcessing(files[0])
  }, [handleFileProcessing])

  const handleDragEvents = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: React.DragEvent) => {
    handleDragEvents(e)
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true)
    }
  }, [handleDragEvents])

  const handleDragOut = useCallback((e: React.DragEvent) => {
    handleDragEvents(e)
    setDragActive(false)
  }, [handleDragEvents])

  const handleDrop = useCallback((e: React.DragEvent) => {
    handleDragEvents(e)
    setDragActive(false)
    
    if (disabled) return
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileSelect(files)
    }
  }, [handleDragEvents, handleFileSelect, disabled])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
  }, [handleFileSelect])

  const openFileDialog = useCallback(() => {
    if (!disabled && uploadState.status !== 'uploading') {
      fileInputRef.current?.click()
    }
  }, [disabled, uploadState.status])

  const handleRemove = useCallback(() => {
    if (!disabled) {
      onChange?.(null)
      toast({
        title: 'Image Removed',
        description: 'Profile image has been removed.'
      })
    }
  }, [disabled, onChange])

  const hasImage = Boolean(value)
  const isUploading = uploadState.status === 'uploading' || uploadState.status === 'processing'
  const hasError = uploadState.status === 'error'

  return (
    <div className={cn('relative', className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Main upload area */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-full transition-all duration-200 cursor-pointer',
          PRESET_SIZES[size],
          'group overflow-hidden',
          dragActive 
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30' 
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-primary-50/50 dark:hover:border-primary-600 dark:hover:bg-primary-950/20',
          disabled && 'opacity-50 cursor-not-allowed',
          hasError && 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-950/20'
        )}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDragEvents}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        {/* Background image or placeholder */}
        {hasImage ? (
          <>
            <OptimizedImage
              src={value!}
              alt="Profile"
              fill
              className="object-cover rounded-full"
              sizes={`${PRESET_SIZES[size].split(' ')[0].replace('w-', '')}px`}
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-full">
            {placeholder || (
              <>
                <User className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-1" />
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center px-2">
                  {size === 'sm' || size === 'md' ? 'Add' : 'Add Photo'}
                </p>
              </>
            )}
          </div>
        )}

        {/* Upload progress overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mx-auto mb-1"></div>
              <p className="text-xs">{uploadState.progress}%</p>
            </div>
          </div>
        )}

        {/* Success indicator */}
        {uploadState.status === 'success' && (
          <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Error indicator */}
        {hasError && (
          <div className="absolute top-1 right-1 bg-red-500 rounded-full p-1">
            <AlertCircle className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Drop zone indicator */}
        {dragActive && (
          <div className="absolute inset-0 bg-primary-100/80 dark:bg-primary-900/80 rounded-full flex items-center justify-center">
            <div className="text-center text-primary-600 dark:text-primary-400">
              <Upload className="w-6 h-6 mx-auto mb-1" />
              <p className="text-xs">Drop here</p>
            </div>
          </div>
        )}
      </div>

      {/* Remove button */}
      {hasImage && showRemoveButton && !disabled && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
          onClick={(e) => {
            e.stopPropagation()
            handleRemove()
          }}
        >
          <X className="w-3 h-3" />
        </Button>
      )}

      {/* Upload button (alternative to clicking the image) */}
      {!hasImage && (
        <div className="mt-3 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openFileDialog}
            disabled={disabled || isUploading}
            className="text-xs"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <ImageIcon className="w-3 h-3 mr-2" />
                {uploadButtonText}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Error message */}
      {hasError && uploadState.error && (
        <p className="text-xs text-red-600 dark:text-red-400 text-center mt-2">
          {uploadState.error}
        </p>
      )}

      {/* File info */}
      <div className="mt-2 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} • Max {maxSize}MB
        </p>
      </div>
    </div>
  )
}

export default ProfileImageUpload