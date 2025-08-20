import { randomBytes, createHmac } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export interface CSRFToken {
  token: string
  expiresAt: number
  signature: string
}

export interface CSRFConfig {
  secret: string
  tokenLength: number
  tokenExpiry: number // in milliseconds
  cookieName: string
  headerName: string
  formFieldName: string
}

// Default CSRF configuration
const defaultConfig: CSRFConfig = {
  secret: process.env.CSRF_SECRET || 'csrf-secret-key-change-in-production',
  tokenLength: 32,
  tokenExpiry: 60 * 60 * 1000, // 1 hour
  cookieName: 'csrf_token',
  headerName: 'X-CSRF-Token',
  formFieldName: '_csrf'
}

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(config: Partial<CSRFConfig> = {}): CSRFToken {
  const finalConfig = { ...defaultConfig, ...config }
  
  // Generate random token
  const token = randomBytes(finalConfig.tokenLength).toString('hex')
  const expiresAt = Date.now() + finalConfig.tokenExpiry
  
  // Create signature
  const payload = `${token}.${expiresAt}`
  const signature = createHmac('sha256', finalConfig.secret)
    .update(payload)
    .digest('hex')
  
  return {
    token,
    expiresAt,
    signature
  }
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(
  token: string,
  signature: string,
  expiresAt: number,
  config: Partial<CSRFConfig> = {}
): boolean {
  const finalConfig = { ...defaultConfig, ...config }
  
  try {
    // Check if token is expired
    if (Date.now() > expiresAt) {
      return false
    }
    
    // Verify signature
    const payload = `${token}.${expiresAt}`
    const expectedSignature = createHmac('sha256', finalConfig.secret)
      .update(payload)
      .digest('hex')
    
    return signature === expectedSignature
  } catch (error) {
    return false
  }
}

/**
 * Create a signed CSRF token string for cookies/forms
 */
export function createSignedCSRFToken(config: Partial<CSRFConfig> = {}): string {
  const csrfToken = generateCSRFToken(config)
  const tokenData = {
    token: csrfToken.token,
    expiresAt: csrfToken.expiresAt,
    signature: csrfToken.signature
  }
  
  return Buffer.from(JSON.stringify(tokenData)).toString('base64url')
}

/**
 * Parse and validate a signed CSRF token
 */
export function parseSignedCSRFToken(
  signedToken: string,
  config: Partial<CSRFConfig> = {}
): CSRFToken | null {
  try {
    const tokenData = JSON.parse(Buffer.from(signedToken, 'base64url').toString('utf-8'))
    
    if (!tokenData.token || !tokenData.signature || !tokenData.expiresAt) {
      return null
    }
    
    if (!validateCSRFToken(tokenData.token, tokenData.signature, tokenData.expiresAt, config)) {
      return null
    }
    
    return tokenData as CSRFToken
  } catch (error) {
    return null
  }
}

/**
 * Extract CSRF token from request (cookie, header, or form data)
 */
export async function extractCSRFToken(
  request: NextRequest,
  config: Partial<CSRFConfig> = {}
): Promise<string | null> {
  const finalConfig = { ...defaultConfig, ...config }
  
  // Try to get token from header first (for AJAX requests)
  const headerToken = request.headers.get(finalConfig.headerName)
  if (headerToken) {
    return headerToken
  }
  
  // Try to get token from form data (only for multipart/form-data requests)
  if (request.headers.get('content-type')?.includes('multipart/form-data') || 
      request.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
    const formData = request.formData?.()
    if (formData) {
      const formToken = formData.get(finalConfig.formFieldName)
      if (formToken && typeof formToken === 'string') {
        return formToken
      }
    }
  }
  
  // Try to get token from cookie
  const cookieToken = request.cookies.get(finalConfig.cookieName)?.value
  if (cookieToken) {
    return cookieToken
  }
  
  return null
}

/**
 * Set CSRF token in response cookie
 */
export function setCSRFTokenCookie(
  response: NextResponse,
  config: Partial<CSRFConfig> = {}
): NextResponse {
  const finalConfig = { ...defaultConfig, ...config }
  const signedToken = createSignedCSRFToken(finalConfig)
  
  response.cookies.set(finalConfig.cookieName, signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: finalConfig.tokenExpiry / 1000,
    path: '/'
  })
  
  return response
}

/**
 * CSRF middleware for protecting routes
 */
export function csrfProtection(
  request: NextRequest,
  config: Partial<CSRFConfig> = {}
): NextResponse | null {
  const finalConfig = { ...defaultConfig, ...config }
  
  // Only protect state-changing methods
  const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  if (!protectedMethods.includes(request.method)) {
    return null
  }
  
  // Extract CSRF token from request
  const token = extractCSRFToken(request, finalConfig)
  if (!token) {
    return new NextResponse(
      JSON.stringify({ error: 'CSRF token missing' }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
  
  // Parse and validate token
  const parsedToken = parseSignedCSRFToken(token, finalConfig)
  if (!parsedToken) {
    return new NextResponse(
      JSON.stringify({ error: 'Invalid CSRF token' }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
  
  return null // Token is valid, continue with request
}

/**
 * Generate CSRF token for forms
 */
export function generateFormCSRFToken(config: Partial<CSRFConfig> = {}): {
  token: string
  fieldName: string
  expiresAt: number
} {
  const finalConfig = { ...defaultConfig, ...config }
  const signedToken = createSignedCSRFToken(finalConfig)
  
  return {
    token: signedToken,
    fieldName: finalConfig.formFieldName,
    expiresAt: Date.now() + finalConfig.tokenExpiry
  }
}

/**
 * Verify CSRF token in API route
 */
export async function verifyCSRFToken(
  request: NextRequest,
  config: Partial<CSRFConfig> = {}
): Promise<{ valid: boolean; error?: string }> {
  const finalConfig = { ...defaultConfig, ...config }
  
  // Extract token
  const token = await extractCSRFToken(request, finalConfig)
  if (!token) {
    return { valid: false, error: 'CSRF token missing' }
  }
  
  // Parse and validate token
  const parsedToken = parseSignedCSRFToken(token, finalConfig)
  if (!parsedToken) {
    return { valid: false, error: 'Invalid CSRF token' }
  }
  
  return { valid: true }
}

/**
 * Clean up expired CSRF tokens (for periodic cleanup)
 */
export function cleanupExpiredCSRFTokens(): void {
  // In a real implementation, you might want to clean up stored tokens
  // For now, tokens are stateless and expire automatically
  console.log('CSRF token cleanup completed')
}

/**
 * Get CSRF token from cookie for client-side use
 */
export function getCSRFTokenFromCookie(cookieName?: string): string | null {
  if (typeof document === 'undefined') {
    return null // Server-side
  }
  
  const finalCookieName = cookieName || defaultConfig.cookieName
  const cookies = document.cookie.split(';')
  
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === finalCookieName) {
      return value
    }
  }
  
  return null
}

/**
 * Add CSRF token to fetch request headers
 */
export function addCSRFTokenToHeaders(
  headers: HeadersInit = {},
  cookieName?: string
): HeadersInit {
  const token = getCSRFTokenFromCookie(cookieName)
  
  if (token) {
    return {
      ...headers,
      [defaultConfig.headerName]: token
    }
  }
  
  return headers
}
