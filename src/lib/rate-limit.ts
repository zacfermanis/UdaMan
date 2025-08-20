import { NextRequest } from 'next/server'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string // Custom key generator
  skipSuccessfulRequests?: boolean // Skip rate limiting for successful requests
  skipFailedRequests?: boolean // Skip rate limiting for failed requests
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

// In-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: 15 * 60 * 1000, // 15 minutes default
      maxRequests: 5, // 5 requests per window default
      keyGenerator: (req) => {
        // Default key generator uses IP address
        const forwarded = req.headers.get('x-forwarded-for')
        const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown'
        return ip
      },
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    }
  }

  async checkLimit(request: NextRequest): Promise<RateLimitResult> {
    const key = this.config.keyGenerator!(request)
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    // Get current rate limit data
    const current = rateLimitStore.get(key)
    
    if (!current || now > current.resetTime) {
      // First request or window expired
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs
      })
      
      return {
        success: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs
      }
    }

    // Check if limit exceeded
    if (current.count >= this.config.maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetTime: current.resetTime,
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      }
    }

    // Increment count
    current.count++
    rateLimitStore.set(key, current)

    return {
      success: true,
      remaining: this.config.maxRequests - current.count,
      resetTime: current.resetTime
    }
  }

  async updateLimit(request: NextRequest, success: boolean): Promise<void> {
    // If we're skipping successful/failed requests, update the count accordingly
    if ((success && this.config.skipSuccessfulRequests) || 
        (!success && this.config.skipFailedRequests)) {
      const key = this.config.keyGenerator!(request)
      const current = rateLimitStore.get(key)
      
      if (current) {
        current.count = Math.max(0, current.count - 1)
        rateLimitStore.set(key, current)
      }
    }
  }
}

// Pre-configured rate limiters for different authentication endpoints
export const authRateLimiters = {
  // Registration: 3 attempts per 15 minutes
  registration: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 3,
    keyGenerator: (req) => {
      const forwarded = req.headers.get('x-forwarded-for')
      const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown'
      return `registration:${ip}`
    }
  }),

  // Login: 5 attempts per 15 minutes
  login: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyGenerator: (req) => {
      const forwarded = req.headers.get('x-forwarded-for')
      const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown'
      return `login:${ip}`
    }
  }),

  // Password reset: 3 attempts per hour
  passwordReset: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    keyGenerator: (req) => {
      const forwarded = req.headers.get('x-forwarded-for')
      const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown'
      return `password-reset:${ip}`
    }
  }),

  // Email verification: 5 attempts per hour
  emailVerification: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    keyGenerator: (req) => {
      const forwarded = req.headers.get('x-forwarded-for')
      const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown'
      return `email-verification:${ip}`
    }
  })
}

// Helper function to add rate limit headers to response
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers)
  
  headers.set('X-RateLimit-Limit', '5')
  headers.set('X-RateLimit-Remaining', result.remaining.toString())
  headers.set('X-RateLimit-Reset', result.resetTime.toString())
  
  if (!result.success && result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString())
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

// Helper function to create rate limit error response
export function createRateLimitError(result: RateLimitResult): Response {
  const errorMessage = result.retryAfter 
    ? `Too many requests. Please try again in ${Math.ceil(result.retryAfter / 60)} minutes.`
    : 'Too many requests. Please try again later.'

  return new Response(
    JSON.stringify({ 
      error: errorMessage,
      retryAfter: result.retryAfter 
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetTime.toString(),
        ...(result.retryAfter && { 'Retry-After': result.retryAfter.toString() })
      }
    }
  )
}

// Simple rate limit function for OAuth endpoints
export async function rateLimit(
  ip: string, 
  key: string, 
  maxRequests: number, 
  windowMs: number
): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  const rateLimiter = new RateLimiter({
    windowMs,
    maxRequests,
    keyGenerator: () => `${key}:${ip}`
  })
  
  const mockRequest = {
    headers: new Headers(),
    ip: ip
  } as NextRequest
  
  const result = await rateLimiter.checkLimit(mockRequest)
  return {
    success: result.success,
    remaining: result.remaining,
    resetTime: result.resetTime
  }
}
