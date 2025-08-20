'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserProfile, ProfileUpdateData } from '@/types/auth'
import { Header } from '@/components/layout/Header'
import { GradientBackground } from '@/components/ui/GradientBackground'
import ProfileForm from '@/components/profile/ProfileForm'
import AvatarUpload from '@/components/profile/AvatarUpload'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch profile data on component mount
  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/profile')
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login')
          return
        }
        throw new Error(data.error || 'Failed to fetch profile')
      }

      setProfile(data.profile)
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileUpdate = async (updateData: ProfileUpdateData) => {
    try {
      setError(null)
      setSuccessMessage(null)

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      setProfile(data.profile)
      setSuccessMessage(data.message || 'Profile updated successfully')
      setIsEditing(false)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    }
  }

  const handleAvatarUpload = async (file: File) => {
    try {
      setError(null)

      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload avatar')
      }

      // Update profile with new avatar URL
      await handleProfileUpdate({ avatar_url: data.avatar_url })
    } catch (err) {
      console.error('Error uploading avatar:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload avatar')
    }
  }

  if (isLoading) {
    return (
      <GradientBackground>
        <Header checkAuth={true} />
        <div className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-8"></div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                  <div className="flex items-center space-x-6 mb-8">
                    <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GradientBackground>
    )
  }

  if (error) {
    return (
      <GradientBackground>
        <Header checkAuth={true} />
        <div className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Error loading profile
                    </h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                      {error}
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={fetchProfile}
                        className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GradientBackground>
    )
  }

  if (!profile) {
    return (
      <GradientBackground>
        <Header checkAuth={true} />
        <div className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Profile Not Found
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Unable to load your profile information.
                </p>
              </div>
            </div>
          </div>
        </div>
      </GradientBackground>
    )
  }

  return (
    <GradientBackground>
      <Header checkAuth={true} />
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your account information and preferences
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    {successMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Profile Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            {isEditing ? (
              <ProfileForm
                profile={profile}
                onSubmit={handleProfileUpdate}
                onCancel={() => setIsEditing(false)}
                isLoading={false}
              />
            ) : (
              <div className="p-8">
                {/* Avatar Section */}
                <div className="flex items-center space-x-6 mb-8">
                  <AvatarUpload
                    currentAvatar={profile.avatar_url}
                    onUpload={handleAvatarUpload}
                    onRemove={() => handleProfileUpdate({ avatar_url: undefined })}
                    maxSize={5 * 1024 * 1024} // 5MB
                    acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                  />
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {profile.display_name || 'No display name set'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      {profile.email}
                    </p>
                    {profile.email_verified && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 mt-2">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Edit Profile
                  </button>
                </div>

                {/* Profile Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Personal Information
                    </h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Display Name</dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {profile.display_name || 'Not set'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Bio</dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {profile.bio || 'No bio added'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {profile.location || 'Not specified'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Website</dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {profile.website ? (
                            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">
                              {profile.website}
                            </a>
                          ) : (
                            'Not specified'
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Account Information
                    </h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Member Since</dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Login</dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {new Date(profile.last_login).toLocaleDateString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Login Count</dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {profile.login_count}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Subscription</dt>
                        <dd className="text-sm text-gray-900 dark:text-white capitalize">
                          {profile.subscription_tier}
                        </dd>
                      </div>
                      {profile.oauth_provider && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">OAuth Provider</dt>
                          <dd className="text-sm text-gray-900 dark:text-white capitalize">
                            {profile.oauth_provider}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
        </div>
      </GradientBackground>
    )
  }
