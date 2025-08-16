// User Profile Types
export interface UserProfile {
  id: string
  email: string
  display_name?: string
  avatar_url?: string
  created_at: Date
  updated_at: Date
  email_verified: boolean
  subscription_tier: 'free' | 'premium'
  consent_given: boolean
  consent_date?: Date
  last_login: Date
  login_count: number
}

// Session Data Types
export interface SessionData {
  user_id: string
  session_token: string
  expires_at: Date
  created_at: Date
  ip_address: string
  user_agent: string
  is_active: boolean
}

// Consent Record Types
export interface ConsentRecord {
  user_id: string
  consent_type: 'data_processing' | 'marketing' | 'cookies'
  granted: boolean
  granted_at: Date
  revoked_at?: Date
  ip_address: string
  user_agent: string
}

// Authentication Error Types
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'invalid_credentials',
  EMAIL_NOT_VERIFIED = 'email_not_verified',
  ACCOUNT_LOCKED = 'account_locked',
  RATE_LIMITED = 'rate_limited',
  NETWORK_ERROR = 'network_error',
  OAUTH_ERROR = 'oauth_error',
  CONSENT_REQUIRED = 'consent_required'
}

export interface AuthError {
  type: AuthErrorType
  message: string
  code?: string
  retryAfter?: number
}

// OIDC Provider Types
export type OIDCProvider = 'google' | 'facebook' | 'microsoft'

// Authentication State Types
export interface AuthState {
  user: UserProfile | null
  session: SessionData | null
  isLoading: boolean
  error: AuthError | null
}

// Form State Types
export interface LoginFormState {
  email: string
  password: string
  rememberMe: boolean
  isLoading: boolean
  errors: Record<string, string>
}

export interface RegisterFormState {
  email: string
  password: string
  confirmPassword: string
  displayName: string
  consentGiven: boolean
  isLoading: boolean
  errors: Record<string, string>
}

// Component Props Types
export interface LoginFormProps {
  onSuccess: (user: UserProfile) => void
  onError: (error: AuthError) => void
  redirectTo?: string
}

export interface SocialLoginButtonsProps {
  providers: OIDCProvider[]
  onSuccess: (user: UserProfile) => void
  onError: (error: AuthError) => void
}

export interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireVerified?: boolean
  requirePremium?: boolean
  fallback?: React.ReactNode
}
