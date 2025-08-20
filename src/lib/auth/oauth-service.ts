import { createServerClient } from '@/lib/supabase/config'
import { 
  generatePKCEState, 
  generateOAuthUrl, 
  exchangeCodeForToken, 
  fetchOAuthProfile,
  hashToken,
  validateOAuthConfig
} from './oauth'
import { 
  OIDCProvider, 
  OAuthProfile, 
  PKCEState, 
  OAuthError, 
  OAuthErrorCode,
  UserProfile 
} from '@/types/auth'
import { createSession, createSignedSessionToken } from './session'

// OAuth configuration validation will be done when needed

export class OAuthService {
  private supabase = createServerClient()

  /**
   * Initiate OAuth flow for a provider
   */
  async initiateOAuth(provider: OIDCProvider, redirectTo?: string): Promise<{ authorizationUrl: string; state: string }> {
    try {
      // Validate OAuth configuration when needed
      validateOAuthConfig()
      
      const pkceState = generatePKCEState(provider, redirectTo)
      const authorizationUrl = generateOAuthUrl(provider, pkceState.state, pkceState.codeChallenge, redirectTo)
      
      // Store PKCE state in database for server-side validation
      await this.storePKCEState(pkceState)
      
      return {
        authorizationUrl,
        state: pkceState.state
      }
    } catch (error) {
      const oauthError: OAuthError = {
        code: OAuthErrorCode.PROVIDER_UNAVAILABLE,
        provider,
        message: `Failed to initiate OAuth flow: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
      throw oauthError
    }
  }

  /**
   * Handle OAuth callback and create/update user
   */
  async handleOAuthCallback(
    provider: OIDCProvider,
    code: string,
    state: string
  ): Promise<{ user: UserProfile; sessionToken: string }> {
    try {
      // Retrieve and validate PKCE state
      const pkceState = await this.retrievePKCEState(state)
      if (!pkceState || pkceState.provider !== provider) {
        const oauthError: OAuthError = {
          code: OAuthErrorCode.INVALID_STATE,
          provider,
          message: 'Invalid or expired OAuth state'
        }
        throw oauthError
      }

      // Exchange authorization code for access token
      const tokenResponse = await exchangeCodeForToken(provider, code, pkceState.codeVerifier)
      
      // Fetch user profile from OAuth provider
      const oauthProfile = await fetchOAuthProfile(provider, tokenResponse.access_token)
      
      // Create or update user in database
      const user = await this.createOrUpdateUser(oauthProfile, tokenResponse.access_token)
      
             // Create session
       const session = await createSession({ userId: user.id })
       if (!session) {
         const oauthError: OAuthError = {
           code: OAuthErrorCode.USER_CREATION_FAILED,
           provider,
           message: 'Failed to create user session'
         }
         throw oauthError
       }
       
       // Create signed session token
       const sessionToken = createSignedSessionToken(
         session.id,
         session.userId,
         session.expiresAt.getTime()
       )
      
      // Store OAuth session for security tracking
      await this.storeOAuthSession(user.id, provider, tokenResponse.access_token, tokenResponse.refresh_token, tokenResponse.expires_in)
      
      // Clean up PKCE state
      await this.cleanupPKCEState(state)
      
      return { user, sessionToken }
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && 'provider' in error) {
        throw error as OAuthError
      }
      
      const oauthError: OAuthError = {
        code: OAuthErrorCode.USER_CREATION_FAILED,
        provider,
        message: `OAuth callback failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
      throw oauthError
    }
  }

  /**
   * Create or update user from OAuth profile with account merging support
   */
  private async createOrUpdateUser(oauthProfile: OAuthProfile, accessToken: string): Promise<UserProfile> {
    // Handle case where email might not be available (e.g., Facebook OAuth)
    if (!oauthProfile.email) {
      const oauthError: OAuthError = {
        code: OAuthErrorCode.PERMISSION_DENIED,
        provider: oauthProfile.provider,
        message: 'Email address is required but not provided by the OAuth provider. Please grant email permission or use email registration.'
      }
      throw oauthError
    }

    const { data: existingUser } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', oauthProfile.email)
      .single()

    if (existingUser) {
      // Check if this OAuth provider is already linked to this user
      const { data: existingOAuthProvider } = await this.supabase
        .from('user_oauth_providers')
        .select('*')
        .eq('user_id', existingUser.id)
        .eq('provider', oauthProfile.provider)
        .single()

      if (existingOAuthProvider) {
        // Update existing OAuth provider link
        await this.supabase
          .from('user_oauth_providers')
          .update({
            provider_user_id: oauthProfile.id,
            access_token_hash: hashToken(accessToken),
            expires_at: new Date(Date.now() + 3600 * 1000), // 1 hour default
            updated_at: new Date().toISOString()
          })
          .eq('id', existingOAuthProvider.id)
      } else {
        // Link new OAuth provider to existing user (account merging)
        await this.supabase
          .from('user_oauth_providers')
          .insert({
            user_id: existingUser.id,
            provider: oauthProfile.provider,
            provider_user_id: oauthProfile.id,
            access_token_hash: hashToken(accessToken),
            expires_at: new Date(Date.now() + 3600 * 1000), // 1 hour default
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
      }

      // Update existing user with latest OAuth information
      const { data: updatedUser, error } = await this.supabase
        .from('users')
        .update({
          // Update primary OAuth provider if not set, or if this is the first OAuth login
          oauth_provider: existingUser.oauth_provider || oauthProfile.provider,
          oauth_provider_id: existingUser.oauth_provider_id || oauthProfile.id,
          oauth_provider_data: {
            display_name: oauthProfile.displayName,
            avatar_url: oauthProfile.avatarUrl,
            email_verified: oauthProfile.emailVerified,
            last_updated: new Date().toISOString(),
            linked_providers: await this.getLinkedProviders(existingUser.id)
          },
          // Update profile info if not already set
          display_name: existingUser.display_name || oauthProfile.displayName,
          avatar_url: existingUser.avatar_url || oauthProfile.avatarUrl,
          email_verified: oauthProfile.emailVerified || existingUser.email_verified,
          last_login: new Date().toISOString(),
          login_count: (existingUser.login_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single()

      if (error) {
        const oauthError: OAuthError = {
          code: OAuthErrorCode.USER_CREATION_FAILED,
          provider: oauthProfile.provider,
          message: `Failed to update user: ${error.message}`
        }
        throw oauthError
      }

      return updatedUser
    } else {
      // Create new user
      const { data: newUser, error } = await this.supabase
        .from('users')
        .insert({
          email: oauthProfile.email,
          display_name: oauthProfile.displayName,
          avatar_url: oauthProfile.avatarUrl,
          email_verified: oauthProfile.emailVerified,
          oauth_provider: oauthProfile.provider,
          oauth_provider_id: oauthProfile.id,
          oauth_provider_data: {
            display_name: oauthProfile.displayName,
            avatar_url: oauthProfile.avatarUrl,
            email_verified: oauthProfile.emailVerified,
            created_at: new Date().toISOString()
          },
          subscription_tier: 'free',
          consent_given: true,
          consent_date: new Date().toISOString(),
          last_login: new Date().toISOString(),
          login_count: 1
        })
        .select()
        .single()

      if (error) {
        const oauthError: OAuthError = {
          code: OAuthErrorCode.USER_CREATION_FAILED,
          provider: oauthProfile.provider,
          message: `Failed to create user: ${error.message}`
        }
        throw oauthError
      }

      // Link OAuth provider to new user
      await this.supabase
        .from('user_oauth_providers')
        .insert({
          user_id: newUser.id,
          provider: oauthProfile.provider,
          provider_user_id: oauthProfile.id,
          access_token_hash: hashToken(accessToken),
          expires_at: new Date(Date.now() + 3600 * 1000), // 1 hour default
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      return newUser
    }
  }

  /**
   * Get linked OAuth providers for a user
   */
  private async getLinkedProviders(userId: string): Promise<string[]> {
    const { data: providers } = await this.supabase
      .from('user_oauth_providers')
      .select('provider')
      .eq('user_id', userId)

    return providers?.map(p => p.provider) || []
  }

  /**
   * Store PKCE state in database
   */
  private async storePKCEState(pkceState: PKCEState): Promise<void> {
    const { error } = await this.supabase
      .from('pkce_states')
      .insert({
        state: pkceState.state,
        code_verifier: pkceState.codeVerifier,
        code_challenge: pkceState.codeChallenge,
        provider: pkceState.provider,
        redirect_to: pkceState.redirectTo,
        expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
        created_at: new Date().toISOString()
      })

    if (error) {
      throw new Error(`Failed to store PKCE state: ${error.message}`)
    }
  }

  /**
   * Retrieve PKCE state from database
   */
  private async retrievePKCEState(state: string): Promise<PKCEState | null> {
    const { data, error } = await this.supabase
      .from('pkce_states')
      .select('*')
      .eq('state', state)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (error || !data) {
      return null
    }

    return {
      codeVerifier: data.code_verifier,
      codeChallenge: data.code_challenge,
      state: data.state,
      provider: data.provider as OIDCProvider,
      redirectTo: data.redirect_to || undefined
    }
  }

  /**
   * Clean up PKCE state after use
   */
  private async cleanupPKCEState(state: string): Promise<void> {
    const { error } = await this.supabase
      .from('pkce_states')
      .delete()
      .eq('state', state)

    if (error) {
      console.error('Failed to cleanup PKCE state:', error)
    }
  }

  /**
   * Store OAuth session for security tracking
   */
  private async storeOAuthSession(
    userId: string,
    provider: OIDCProvider,
    accessToken: string,
    refreshToken?: string,
    expiresIn?: number
  ): Promise<void> {
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : new Date(Date.now() + 3600 * 1000) // Default 1 hour

    const { error } = await this.supabase
      .from('oauth_sessions')
      .insert({
        user_id: userId,
        provider,
        access_token_hash: hashToken(accessToken),
        refresh_token_hash: refreshToken ? hashToken(refreshToken) : null,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to store OAuth session:', error)
      // Don't throw error as this is for tracking purposes
    }
  }

  /**
   * Get OAuth provider configuration
   */
  getProviderConfig(provider: OIDCProvider) {
    const configs = {
      google: {
        name: 'Google',
        color: '#4285F4',
        icon: '🔍'
      },
      facebook: {
        name: 'Facebook',
        color: '#1877F2',
        icon: '📘'
      },
      microsoft: {
        name: 'Microsoft',
        color: '#00A4EF',
        icon: '🪟'
      }
    }
    
    return configs[provider]
  }

  /**
   * Clean up expired PKCE states
   */
  async cleanupExpiredPKCEStates(): Promise<void> {
    const { error } = await this.supabase
      .from('pkce_states')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (error) {
      console.error('Failed to cleanup expired PKCE states:', error)
    }
  }
}
