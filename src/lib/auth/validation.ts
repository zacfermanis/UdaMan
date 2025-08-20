// Password strength requirements
export interface PasswordStrength {
  score: number // 0-4 (0: very weak, 4: very strong)
  feedback: string[]
  isStrong: boolean
  requirements: {
    length: boolean
    lowercase: boolean
    uppercase: boolean
    numbers: boolean
    symbols: boolean
  }
}

// Email validation
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!email) {
    return { isValid: false, error: 'Email is required' }
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' }
  }
  
  if (email.length > 255) {
    return { isValid: false, error: 'Email address is too long' }
  }
  
  return { isValid: true }
}

// Password strength validation
export function validatePasswordStrength(password: string): PasswordStrength {
  const requirements = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  }
  
  // Calculate strength score
  let score = 0
  const feedback: string[] = []
  
  // Length contribution
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  
  // Character variety contribution
  if (requirements.lowercase) score += 1
  if (requirements.uppercase) score += 1
  if (requirements.numbers) score += 1
  if (requirements.symbols) score += 1
  
  // Bonus for length
  if (password.length >= 16) score += 1
  
  // Cap score at 4
  score = Math.min(score, 4)
  
  // Generate feedback
  if (!requirements.length) {
    feedback.push('Password must be at least 8 characters long')
  }
  if (!requirements.lowercase) {
    feedback.push('Include at least one lowercase letter')
  }
  if (!requirements.uppercase) {
    feedback.push('Include at least one uppercase letter')
  }
  if (!requirements.numbers) {
    feedback.push('Include at least one number')
  }
  if (!requirements.symbols) {
    feedback.push('Include at least one special character')
  }
  
  // Additional feedback for stronger passwords
  if (password.length < 12 && score >= 3) {
    feedback.push('Consider making your password longer for better security')
  }
  
  return {
    score,
    feedback,
    isStrong: score >= 3 && requirements.length,
    requirements
  }
}

// Password confirmation validation
export function validatePasswordConfirmation(password: string, confirmPassword: string): { isValid: boolean; error?: string } {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' }
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' }
  }
  
  return { isValid: true }
}

// Display name validation
export function validateDisplayName(displayName: string): { isValid: boolean; error?: string } {
  if (!displayName) {
    return { isValid: false, error: 'Display name is required' }
  }
  
  if (displayName.length < 2) {
    return { isValid: false, error: 'Display name must be at least 2 characters long' }
  }
  
  if (displayName.length > 100) {
    return { isValid: false, error: 'Display name must be less than 100 characters' }
  }
  
  // Check for valid characters (letters, numbers, spaces, hyphens, underscores)
  const nameRegex = /^[a-zA-Z0-9\s\-_]+$/
  if (!nameRegex.test(displayName)) {
    return { isValid: false, error: 'Display name can only contain letters, numbers, spaces, hyphens, and underscores' }
  }
  
  return { isValid: true }
}

// Consent validation
export function validateConsent(consentGiven: boolean): { isValid: boolean; error?: string } {
  if (!consentGiven) {
    return { isValid: false, error: 'You must agree to the terms and conditions and data processing consent' }
  }
  
  return { isValid: true }
}

// Rate limiting validation (simplified client-side check)
export function validateRateLimit(lastAttemptTime: number, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): { isAllowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const timeSinceLastAttempt = now - lastAttemptTime
  
  if (timeSinceLastAttempt < windowMs) {
    const retryAfter = Math.ceil((windowMs - timeSinceLastAttempt) / 1000)
    return { isAllowed: false, retryAfter }
  }
  
  return { isAllowed: true }
}

// Get password strength color for UI
export function getPasswordStrengthColor(strength: PasswordStrength): string {
  if (strength.score === 0) return 'text-red-500'
  if (strength.score === 1) return 'text-orange-500'
  if (strength.score === 2) return 'text-yellow-500'
  if (strength.score === 3) return 'text-blue-500'
  return 'text-green-500'
}

// Get password strength label for UI
export function getPasswordStrengthLabel(strength: PasswordStrength): string {
  if (strength.score === 0) return 'Very Weak'
  if (strength.score === 1) return 'Weak'
  if (strength.score === 2) return 'Fair'
  if (strength.score === 3) return 'Good'
  return 'Strong'
}

// Comprehensive form validation
export interface FormValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export function validateRegistrationForm(data: {
  email: string
  password: string
  confirmPassword: string
  displayName: string
  consentGiven: boolean
}): FormValidationResult {
  const errors: Record<string, string> = {}
  
  // Email validation
  const emailValidation = validateEmail(data.email)
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!
  }
  
  // Password validation
  const passwordStrength = validatePasswordStrength(data.password)
  if (!passwordStrength.isStrong) {
    errors.password = passwordStrength.feedback[0] || 'Password is too weak'
  }
  
  // Password confirmation validation
  const confirmValidation = validatePasswordConfirmation(data.password, data.confirmPassword)
  if (!confirmValidation.isValid) {
    errors.confirmPassword = confirmValidation.error!
  }
  
  // Display name validation
  const nameValidation = validateDisplayName(data.displayName)
  if (!nameValidation.isValid) {
    errors.displayName = nameValidation.error!
  }
  
  // Consent validation
  const consentValidation = validateConsent(data.consentGiven)
  if (!consentValidation.isValid) {
    errors.consent = consentValidation.error!
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export function validateLoginForm(data: {
  email: string
  password: string
}): FormValidationResult {
  const errors: Record<string, string> = {}
  
  // Email validation
  const emailValidation = validateEmail(data.email)
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!
  }
  
  // Password validation (basic check for login)
  if (!data.password) {
    errors.password = 'Password is required'
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}
