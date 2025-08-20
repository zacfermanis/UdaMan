'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

interface AvatarUploadProps {
  currentAvatar?: string
  onUpload: (file: File) => Promise<string>
  onRemove: () => void
  maxSize?: number // in bytes
  acceptedTypes?: string[]
}

export default function AvatarUpload({ 
  currentAvatar, 
  onUpload, 
  onRemove, 
  maxSize = 5 * 1024 * 1024, // 5MB default
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Clear previous errors
    setError(null)

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      setError(`Please select a valid image file (${acceptedTypes.join(', ')})`)
      return
    }

    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024))
      setError(`File size must be less than ${maxSizeMB}MB`)
      return
    }

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    try {
      setIsUploading(true)
      await onUpload(file)
      // Clear preview URL after successful upload
      URL.revokeObjectURL(url)
      setPreviewUrl(null)
    } catch (err) {
      console.error('Error uploading avatar:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload avatar')
      // Clear preview URL on error
      URL.revokeObjectURL(url)
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = async () => {
    try {
      setError(null)
      await onRemove()
    } catch (err) {
      console.error('Error removing avatar:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove avatar')
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const displayAvatar = previewUrl || currentAvatar

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Avatar Display */}
      <div className="relative group">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border-4 border-white dark:border-gray-600 shadow-lg">
          {displayAvatar ? (
            <Image
              src={displayAvatar}
              alt="Profile avatar"
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {/* Upload Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <button
            onClick={handleClick}
            disabled={isUploading}
            className="text-white text-sm font-medium hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                Uploading...
              </div>
            ) : (
              'Change'
            )}
          </button>
        </div>
      </div>

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={handleClick}
          disabled={isUploading}
          className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Upload
        </button>
        {currentAvatar && (
          <button
            onClick={handleRemove}
            disabled={isUploading}
            className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 text-center max-w-48">
          {error}
        </div>
      )}

      {/* Upload Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-48">
        <p>JPG, PNG, or WebP</p>
        <p>Max {Math.round(maxSize / (1024 * 1024))}MB</p>
      </div>
    </div>
  )
}
