'use client'

import RegisterForm from '@/components/auth/RegisterForm'
import SocialLoginButtons from '@/components/auth/SocialLoginButtons'
import { AuthHeader } from '@/components/layout/Header'
import { GradientBackground } from '@/components/ui/GradientBackground'
import { cn } from '@/lib/utils'
import { OAuthError } from '@/types/auth'

export default function RegisterPage() {
  const handleOAuthSuccess = (user: any) => {
    console.log('OAuth registration successful!', user)
    // OAuth users are automatically logged in, so redirect to dashboard
    window.location.href = '/dashboard'
  }

  const handleOAuthError = (error: OAuthError) => {
    console.error('OAuth registration error:', error)
    // You could show a toast notification here
  }

  return (
    <GradientBackground>
      <AuthHeader />
      
      <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8 min-h-screen">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <img
              className="h-12 w-auto"
              src="/Udaman_Logo.webp"
              alt="Udaman"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Join Udaman and start managing your competitions
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className={cn(
            'py-8 px-4 shadow-lg sm:rounded-lg sm:px-10',
            'bg-surface/80 backdrop-blur-sm border border-border/50'
          )}>
            <RegisterForm 
              onSuccess={() => console.log('Registration successful!')}
              onError={(error) => console.error('Registration error:', error)}
              redirectTo="/auth/verify-email"
            />
            
            <div className="mt-6">
              <SocialLoginButtons
                onSuccess={handleOAuthSuccess}
                onError={handleOAuthError}
                redirectTo="/dashboard"
              />
            </div>
          </div>
        </div>
      </div>
    </GradientBackground>
  )
}
