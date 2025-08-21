'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { GradientBackground } from '@/components/ui/GradientBackground'
import CompetitionList from '@/components/competition/CompetitionList'
import { cn } from '@/lib/utils'

interface User {
  id: string
  email: string
  display_name: string
  email_verified: boolean
}

export default function CompetitionsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
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
      } catch (error) {
        console.error('Error checking session:', error)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [router])

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
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              My Competitions
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Manage your competitions and track their progress
            </p>
            <button
              onClick={() => router.push('/competitions/create')}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Competition
            </button>
          </div>

          <div className={cn(
            'p-8 rounded-lg shadow-lg',
            'bg-surface/80 backdrop-blur-sm border border-border/50'
          )}>
            <CompetitionList 
              userId={user?.id || ''}
            />
          </div>
        </div>
      </div>
    </GradientBackground>
  )
}
