'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { GradientBackground } from '@/components/ui/GradientBackground'
import { cn } from '@/lib/utils'

interface User {
  id: string
  email: string
  display_name: string
  email_verified: boolean
  subscription_tier: string
  login_count: number
  last_login?: string
}

interface Session {
  id: string
  expiresAt: string
  isActive: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/validate-session', {
          method: 'GET',
          credentials: 'include'
        })

        if (!response.ok) {
          router.push('/auth/login')
          return
        }

        const data = await response.json()
        setUser(data.user)
        setSession(data.session)
      } catch (error) {
        console.error('Error checking session:', error)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [router])

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        router.push('/auth/login')
      } else {
        console.error('Error signing out')
      }
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  if (loading) {
    return (
      <GradientBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </GradientBackground>
    )
  }

  return (
    <GradientBackground>
      <Header checkAuth={true} />
      
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Welcome to Your Dashboard
            </h1>
            <p className="text-lg text-muted-foreground">
              Hello, {user?.display_name || user?.email}!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Welcome Card */}
            <div className={cn(
              'p-6 rounded-lg shadow-lg',
              'bg-surface/80 backdrop-blur-sm border border-border/50'
            )}>
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                  <svg
                    className="w-6 h-6 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">Account Info</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Email:</span> {user?.email}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Display Name:</span> {user?.display_name || 'Not set'}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Subscription:</span> {user?.subscription_tier}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Login Count:</span> {user?.login_count || 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Email Verified:</span> 
                  <span className={user?.email_verified ? 'text-green-600' : 'text-red-600'}>
                    {user?.email_verified ? 'Yes' : 'No'}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={cn(
              'p-6 rounded-lg shadow-lg',
              'bg-surface/80 backdrop-blur-sm border border-border/50'
            )}>
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3">
                  <svg
                    className="w-6 h-6 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/profile')}
                  className="w-full text-left p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <div className="font-medium text-blue-900 dark:text-blue-100">Edit Profile</div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Update your account information</div>
                </button>
                <button
                  onClick={() => router.push('/competitions/create')}
                  className="w-full text-left p-3 rounded-md bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <div className="font-medium text-green-900 dark:text-green-100">Create Competition</div>
                  <div className="text-sm text-green-700 dark:text-green-300">Start a new competition</div>
                </button>
                <button
                  onClick={() => router.push('/competitions')}
                  className="w-full text-left p-3 rounded-md bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <div className="font-medium text-purple-900 dark:text-purple-100">My Competitions</div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">View and manage competitions</div>
                </button>
                <button
                  onClick={() => alert('Settings coming soon!')}
                  className="w-full text-left p-3 rounded-md bg-gray-50 dark:bg-gray-900/20 hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">Settings</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">Manage your preferences</div>
                </button>
              </div>
            </div>

            {/* Session Information */}
            <div className={cn(
              'p-6 rounded-lg shadow-lg',
              'bg-surface/80 backdrop-blur-sm border border-border/50'
            )}>
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mr-3">
                  <svg
                    className="w-6 h-6 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">Session Info</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Active
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Session ID:</span> {session?.id?.substring(0, 8)}...
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Expires:</span> {session?.expiresAt ? new Date(session.expiresAt).toLocaleString() : 'Unknown'}
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Coming Soon Section */}
          <div className="mt-12 text-center">
            <div className={cn(
              'p-8 rounded-lg shadow-lg',
              'bg-surface/80 backdrop-blur-sm border border-border/50'
            )}>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                More Features Coming Soon
              </h2>
              <p className="text-muted-foreground mb-6">
                We're working hard to bring you more amazing features. Stay tuned!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">Social Login</div>
                  <div className="text-blue-700 dark:text-blue-300">✅ Google, Facebook, Microsoft</div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="font-medium text-green-900 dark:text-green-100 mb-1">Profile Management</div>
                  <div className="text-green-700 dark:text-green-300">✅ Avatar, preferences, settings</div>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="font-medium text-purple-900 dark:text-purple-100 mb-1">Advanced Security</div>
                  <div className="text-purple-700 dark:text-purple-300">2FA, session management</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GradientBackground>
  )
}
