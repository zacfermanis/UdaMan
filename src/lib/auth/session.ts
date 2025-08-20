import { createServerClient } from '@/lib/supabase/config'
import { randomBytes, createHmac } from 'crypto'

export interface SessionData {
  id: string
  userId: string
  sessionToken: string
  expiresAt: Date
  createdAt: Date
  ipAddress?: string
  userAgent?: string
  isActive: boolean
}

export interface CreateSessionOptions {
  userId: string
  ipAddress?: string
  userAgent?: string
  rememberMe?: boolean
}

export interface ValidateSessionResult {
  isValid: boolean
  session?: SessionData
  error?: string
}

export interface SessionTokenPayload {
  sessionId: string
  userId: string
  expiresAt: number
  signature: string
}

/**
 * Generate a cryptographically secure session token
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Create a signed session token with embedded data
 */
export function createSignedSessionToken(
  sessionId: string,
  userId: string,
  expiresAt: number
): string {
  const payload = {
    sessionId,
    userId,
    expiresAt
  }
  
  const payloadString = JSON.stringify(payload)
  const signature = createHmac('sha256', process.env.SESSION_SECRET || 'fallback-secret')
    .update(payloadString)
    .digest('hex')
  
  const tokenPayload: SessionTokenPayload = {
    ...payload,
    signature
  }
  
  return Buffer.from(JSON.stringify(tokenPayload)).toString('base64url')
}

/**
 * Validate and decode a signed session token
 */
export function validateSignedSessionToken(token: string): SessionTokenPayload | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const payload: SessionTokenPayload = JSON.parse(decoded)
    
    // Verify signature
    const { signature, ...data } = payload
    const expectedSignature = createHmac('sha256', process.env.SESSION_SECRET || 'fallback-secret')
      .update(JSON.stringify(data))
      .digest('hex')
    
    if (signature !== expectedSignature) {
      return null
    }
    
    // Check if token is expired
    if (Date.now() > payload.expiresAt) {
      return null
    }
    
    return payload
  } catch (error) {
    return null
  }
}

/**
 * Create a new session in the database
 */
export async function createSession(options: CreateSessionOptions): Promise<SessionData | null> {
  try {
    const supabaseAdmin = createServerClient()
    
    // Generate session data
    const sessionId = randomBytes(16).toString('hex')
    const sessionToken = generateSessionToken()
    
    // Set expiration based on remember me option
    const expiresAt = new Date()
    if (options.rememberMe) {
      expiresAt.setDate(expiresAt.getDate() + 30) // 30 days
    } else {
      expiresAt.setHours(expiresAt.getHours() + 24) // 24 hours
    }
    
    // Insert session into database
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .insert({
        id: sessionId,
        user_id: options.userId,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        ip_address: options.ipAddress,
        user_agent: options.userAgent,
        is_active: true
      })
      .select()
      .single()
    
    if (error || !data) {
      console.error('Failed to create session:', error)
      return null
    }
    
    return {
      id: data.id,
      userId: data.user_id,
      sessionToken: data.session_token,
      expiresAt: new Date(data.expires_at),
      createdAt: new Date(data.created_at),
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      isActive: data.is_active
    }
  } catch (error) {
    console.error('Session creation error:', error)
    return null
  }
}

/**
 * Validate a session token and return session data
 */
export async function validateSession(token: string): Promise<ValidateSessionResult> {
  try {
    // First validate the signed token
    const tokenPayload = validateSignedSessionToken(token)
    if (!tokenPayload) {
      return { isValid: false, error: 'Invalid or expired token' }
    }
    
    const supabaseAdmin = createServerClient()
    
    // Check if session exists and is active in database
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', tokenPayload.sessionId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (error || !data) {
      return { isValid: false, error: 'Session not found or expired' }
    }
    
    const session: SessionData = {
      id: data.id,
      userId: data.user_id,
      sessionToken: data.session_token,
      expiresAt: new Date(data.expires_at),
      createdAt: new Date(data.created_at),
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      isActive: data.is_active
    }
    
    return { isValid: true, session }
  } catch (error) {
    console.error('Session validation error:', error)
    return { isValid: false, error: 'Session validation failed' }
  }
}

/**
 * Revoke a session (mark as inactive)
 */
export async function revokeSession(sessionId: string): Promise<boolean> {
  try {
    const supabaseAdmin = createServerClient()
    
    const { error } = await supabaseAdmin
      .from('sessions')
      .update({ is_active: false })
      .eq('id', sessionId)
    
    if (error) {
      console.error('Failed to revoke session:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Session revocation error:', error)
    return false
  }
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(userId: string): Promise<boolean> {
  try {
    const supabaseAdmin = createServerClient()
    
    const { error } = await supabaseAdmin
      .from('sessions')
      .update({ is_active: false })
      .eq('user_id', userId)
    
    if (error) {
      console.error('Failed to revoke user sessions:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('User session revocation error:', error)
    return false
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const supabaseAdmin = createServerClient()
    
    const { count, error } = await supabaseAdmin
      .from('sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())
    
    if (error) {
      console.error('Failed to cleanup expired sessions:', error)
      return 0
    }
    
    return count || 0
  } catch (error) {
    console.error('Session cleanup error:', error)
    return 0
  }
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<SessionData[]> {
  try {
    const supabaseAdmin = createServerClient()
    
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    
    if (error || !data) {
      console.error('Failed to get user sessions:', error)
      return []
    }
    
    return data.map(session => ({
      id: session.id,
      userId: session.user_id,
      sessionToken: session.session_token,
      expiresAt: new Date(session.expires_at),
      createdAt: new Date(session.created_at),
      ipAddress: session.ip_address,
      userAgent: session.user_agent,
      isActive: session.is_active
    }))
  } catch (error) {
    console.error('Get user sessions error:', error)
    return []
  }
}

/**
 * Extend session expiration
 */
export async function extendSession(sessionId: string, hours: number = 24): Promise<boolean> {
  try {
    const supabaseAdmin = createServerClient()
    
    const newExpiresAt = new Date()
    newExpiresAt.setHours(newExpiresAt.getHours() + hours)
    
    const { error } = await supabaseAdmin
      .from('sessions')
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq('id', sessionId)
      .eq('is_active', true)
    
    if (error) {
      console.error('Failed to extend session:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Session extension error:', error)
    return false
  }
}

/**
 * Check if a session is about to expire (within 1 hour)
 */
export function isSessionExpiringSoon(session: SessionData): boolean {
  const oneHourFromNow = new Date()
  oneHourFromNow.setHours(oneHourFromNow.getHours() + 1)
  
  return session.expiresAt <= oneHourFromNow
}

/**
 * Get session expiration time in a human-readable format
 */
export function getSessionExpirationText(session: SessionData): string {
  const now = new Date()
  const timeLeft = session.expiresAt.getTime() - now.getTime()
  
  if (timeLeft <= 0) {
    return 'Expired'
  }
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60))
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days} day${days !== 1 ? 's' : ''}`
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
}
