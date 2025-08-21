'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { GradientBackground } from '@/components/ui/GradientBackground'
import CompetitionForm from '@/components/competition/CompetitionForm'
import { cn } from '@/lib/utils'

interface User {
  id: string
  email: string
  display_name: string
  email_verified: boolean
}

export default function CreateCompetitionPage() {
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

  const handleCompetitionCreated = (competitionId: string) => {
    router.push(`/competitions/${competitionId}`)
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
              Create New Competition
            </h1>
            <p className="text-lg text-muted-foreground">
              Set up your competition with events, participants, and rules
            </p>
          </div>

          <div className={cn(
            'p-8 rounded-lg shadow-lg',
            'bg-surface/80 backdrop-blur-sm border border-border/50'
          )}>
            <CompetitionForm 
              onSuccess={handleCompetitionCreated}
              onCancel={() => router.push('/competitions')}
            />
          </div>
        </div>
      </div>
    </GradientBackground>
  )
}
