import crypto from 'crypto'
import { OAuthConfig, OIDCProvider, PKCEState, OAuthError, OAuthErrorCode, OAuthProfile } from '@/types/auth'

// OAuth Provider Configurations
export const GOOGLE_OAUTH_CONFIG: OAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/oauth/callback/google`,
  scopes: ['openid', 'email', 'profile'],
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  profileUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
}

export const FACEBOOK_OAUTH_CONFIG: OAuthConfig = {
  clientId: process.env.FACEBOOK_CLIENT_ID!,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/oauth/callback/facebook`,
  scopes: ['public_profile', 'email'], // Explicitly request email permission
  authorizationUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
  tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
  profileUrl: 'https://graph.facebook.com/v18.0/me?fields=id,name,email,picture'
}

export const MICROSOFT_OAUTH_CONFIG: OAuthConfig = {
  clientId: process.env.MICROSOFT_CLIENT_ID!,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/oauth/callback/microsoft`,
  scopes: ['User.Read', 'email', 'profile', 'openid'],
  authorizationUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/authorize`,
  tokenUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/token`,
  profileUrl: 'https://graph.microsoft.com/v1.0/me'
}

// Provider configuration mapping
export const OAUTH_CONFIGS: Record<OIDCProvider, OAuthConfig> = {
  google: GOOGLE_OAUTH_CONFIG,
  facebook: FACEBOOK_OAUTH_CONFIG,
  microsoft: MICROSOFT_OAUTH_CONFIG
}

// PKCE Implementation
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function generateCodeChallenge(codeVerifier: string): string {
  const hash = crypto.createHash('sha256')
  hash.update(codeVerifier)
  return hash.digest('base64url')
}

export function generatePKCEState(provider: OIDCProvider, redirectTo?: string): PKCEState {
  const codeVerifier = generateRandomString(128)
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const state = generateRandomString(32)
  
  return {
    codeVerifier,
    codeChallenge,
    state,
    provider,
    redirectTo
  }
}

// OAuth URL Generation
export function generateOAuthUrl(provider: OIDCProvider, state: string, codeChallenge: string, redirectTo?: string): string {
  const config = OAUTH_CONFIGS[provider]
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  })

  if (redirectTo) {
    params.append('redirect_to', redirectTo)
  }

  return `${config.authorizationUrl}?${params.toString()}`
}

// Token Exchange
export async function exchangeCodeForToken(
  provider: OIDCProvider,
  code: string,
  codeVerifier: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const config = OAUTH_CONFIGS[provider]
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier
  })

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error: OAuthError = {
      code: OAuthErrorCode.TOKEN_EXCHANGE_FAILED,
      provider,
      message: `Token exchange failed: ${response.status} ${response.statusText}`,
      details: errorData
    }
    throw error
  }

  return response.json()
}

// Profile Fetching
export async function fetchOAuthProfile(
  provider: OIDCProvider,
  accessToken: string
): Promise<OAuthProfile> {
  const config = OAUTH_CONFIGS[provider]
  
  const response = await fetch(config.profileUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error: OAuthError = {
      code: OAuthErrorCode.PROFILE_FETCH_FAILED,
      provider,
      message: `Profile fetch failed: ${response.status} ${response.statusText}`
    }
    throw error
  }

  const data = await response.json()
  
  // Normalize profile data across providers
  return normalizeOAuthProfile(data, provider)
}

// Profile Normalization
function normalizeOAuthProfile(data: any, provider: OIDCProvider): OAuthProfile {
  switch (provider) {
    case 'google':
      return {
        id: data.id,
        email: data.email,
        displayName: data.name,
        avatarUrl: data.picture,
        emailVerified: data.verified_email,
        provider
      }
    
    case 'facebook':
      return {
        id: data.id,
        email: data.email || null, // Email might not be available if user didn't grant permission
        displayName: data.name,
        avatarUrl: data.picture?.data?.url,
        emailVerified: true, // Facebook doesn't provide email verification status
        provider
      }
    
    case 'microsoft':
      return {
        id: data.id,
        email: data.mail || data.userPrincipalName,
        displayName: data.displayName,
        avatarUrl: undefined, // Microsoft Graph doesn't provide avatar in basic profile
        emailVerified: true, // Microsoft accounts are typically verified
        provider
      }
    
    default:
      const error: OAuthError = {
        code: OAuthErrorCode.PROFILE_FETCH_FAILED,
        provider,
        message: `Unsupported provider: ${provider}`
      }
      throw error
  }
}

// Error Recovery Strategies
export const ERROR_RECOVERY_STRATEGIES: Record<OAuthErrorCode, string> = {
  [OAuthErrorCode.INVALID_STATE]: 'Please try signing in again',
  [OAuthErrorCode.INVALID_CODE]: 'Please try signing in again',
  [OAuthErrorCode.TOKEN_EXCHANGE_FAILED]: 'Authentication failed. Please try again',
  [OAuthErrorCode.PROFILE_FETCH_FAILED]: 'Unable to retrieve profile. Please try again',
  [OAuthErrorCode.USER_CREATION_FAILED]: 'Account creation failed. Please try again',
  [OAuthErrorCode.PROVIDER_UNAVAILABLE]: 'Service temporarily unavailable. Please try again later',
  [OAuthErrorCode.PERMISSION_DENIED]: 'Email permission required. Please grant email access or use email registration',
  [OAuthErrorCode.NETWORK_ERROR]: 'Network error. Please check your connection and try again'
}

// Configuration Validation
export function validateOAuthConfig(): void {
  const requiredProviders: OIDCProvider[] = ['google', 'facebook', 'microsoft']
  
  for (const provider of requiredProviders) {
    const config = OAUTH_CONFIGS[provider]
    if (!config.clientId || !config.clientSecret) {
      console.warn(`OAuth configuration missing for ${provider}. Please set ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET in your .env.local file.`)
      throw new Error(`Missing OAuth configuration for ${provider}. Please check your .env.local file.`)
    }
  }
}

// Token Hashing for Security
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
