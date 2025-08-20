// User Profile Types
export interface UserProfile {
  id: string
  email: string
  display_name?: string
  avatar_url?: string
  bio?: string
  location?: string
  website?: string
  timezone?: string
  created_at: Date
  updated_at: Date
  email_verified: boolean
  subscription_tier: 'free' | 'premium'
  consent_given: boolean
  consent_date?: Date
  last_login: Date
  login_count: number
  oauth_provider?: OIDCProvider
  oauth_provider_id?: string
  oauth_provider_data?: Record<string, any>
}

// Profile Management Types
export interface ProfileUpdateData {
  display_name?: string
  avatar_url?: string
  bio?: string
  location?: string
  website?: string
  timezone?: string
}

export interface AccountSettings {
  id: string
  user_id: string
  theme_preference: 'light' | 'dark' | 'auto'
  email_notifications: boolean
  push_notifications: boolean
  profile_visibility: 'public' | 'private'
  data_sharing: boolean
  created_at: Date
  updated_at: Date
}

export interface SecuritySettings {
  current_password: string
  new_password: string
  confirm_password: string
}

export interface OAuthProviderData {
  provider: OIDCProvider
  provider_user_id: string
  created_at: Date
}

export interface UserDataExport {
  profile: UserProfile
  settings: AccountSettings
  oauth_providers: OAuthProviderData[]
  sessions: SessionData[]
  consent_records: ConsentRecord[]
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

// OAuth Configuration Types
export interface OAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
  authorizationUrl: string
  tokenUrl: string
  profileUrl: string
}

// OAuth Profile Types
export interface OAuthProfile {
  id: string
  email: string | null // Allow null for providers that might not provide email
  displayName?: string
  avatarUrl?: string
  emailVerified: boolean
  provider: OIDCProvider
}

// OAuth Error Types
export enum OAuthErrorCode {
  INVALID_STATE = 'invalid_state',
  INVALID_CODE = 'invalid_code',
  TOKEN_EXCHANGE_FAILED = 'token_exchange_failed',
  PROFILE_FETCH_FAILED = 'profile_fetch_failed',
  USER_CREATION_FAILED = 'user_creation_failed',
  PROVIDER_UNAVAILABLE = 'provider_unavailable',
  PERMISSION_DENIED = 'permission_denied',
  NETWORK_ERROR = 'network_error'
}

export interface OAuthError {
  code: OAuthErrorCode
  provider: OIDCProvider
  message: string
  details?: any
  retryAfter?: number
}

// PKCE State Types
export interface PKCEState {
  codeVerifier: string
  codeChallenge: string
  state: string
  provider: OIDCProvider
  redirectTo?: string
}

// OAuth Session Types
export interface OAuthSession {
  id: string
  userId: string
  provider: OIDCProvider
  providerSessionId?: string
  accessTokenHash: string
  refreshTokenHash?: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

// Authentication State Types
export interface AuthState {
  user: UserProfile | null
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
