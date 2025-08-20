import {
  validateEmail,
  validatePasswordStrength,
  validatePasswordConfirmation,
  validateDisplayName,
  validateConsent,
  validateRegistrationForm,
  validateLoginForm,
  getPasswordStrengthColor,
  getPasswordStrengthLabel
} from '../validation'

describe('Email Validation', () => {
  test('should validate correct email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'user+tag@example.org'
    ]

    validEmails.forEach(email => {
      const result = validateEmail(email)
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  test('should reject invalid email addresses', () => {
    const invalidEmails = [
      '',
      'invalid-email',
      '@example.com',
      'user@',
      'user@.com',
      'a'.repeat(256) + '@example.com'
    ]

    invalidEmails.forEach(email => {
      const result = validateEmail(email)
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})

describe('Password Strength Validation', () => {
  test('should identify very weak passwords', () => {
    const result = validatePasswordStrength('')
    expect(result.score).toBe(0)
    expect(result.isStrong).toBe(false)
    expect(result.feedback.length).toBeGreaterThan(0)
  })

  test('should identify strong passwords', () => {
    const result = validatePasswordStrength('StrongPass123!')
    expect(result.score).toBeGreaterThanOrEqual(3)
    expect(result.isStrong).toBe(true)
  })

  test('should provide correct requirements feedback', () => {
    const result = validatePasswordStrength('weak')
    expect(result.requirements.length).toBe(false)
    expect(result.requirements.uppercase).toBe(false)
    expect(result.requirements.numbers).toBe(false)
    expect(result.requirements.symbols).toBe(false)
  })

  test('should validate password with all requirements met', () => {
    const result = validatePasswordStrength('StrongPass123!')
    expect(result.requirements.length).toBe(true)
    expect(result.requirements.lowercase).toBe(true)
    expect(result.requirements.uppercase).toBe(true)
    expect(result.requirements.numbers).toBe(true)
    expect(result.requirements.symbols).toBe(true)
  })
})

describe('Password Confirmation Validation', () => {
  test('should validate matching passwords', () => {
    const result = validatePasswordConfirmation('password123', 'password123')
    expect(result.isValid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  test('should reject non-matching passwords', () => {
    const result = validatePasswordConfirmation('password123', 'different123')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Passwords do not match')
  })

  test('should require confirmation password', () => {
    const result = validatePasswordConfirmation('password123', '')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Please confirm your password')
  })
})

describe('Display Name Validation', () => {
  test('should validate correct display names', () => {
    const validNames = [
      'John Doe',
      'user123',
      'test-user',
      'Test_User'
    ]

    validNames.forEach(name => {
      const result = validateDisplayName(name)
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  test('should reject invalid display names', () => {
    const invalidNames = [
      '',
      'a',
      'a'.repeat(101),
      'user@name',
      'user#name'
    ]

    invalidNames.forEach(name => {
      const result = validateDisplayName(name)
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})

describe('Consent Validation', () => {
  test('should require consent', () => {
    const result = validateConsent(false)
    expect(result.isValid).toBe(false)
    expect(result.error).toBeDefined()
  })

  test('should accept consent', () => {
    const result = validateConsent(true)
    expect(result.isValid).toBe(true)
    expect(result.error).toBeUndefined()
  })
})

describe('Registration Form Validation', () => {
  test('should validate complete registration form', () => {
    const formData = {
      email: 'test@example.com',
      password: 'StrongPass123!',
      confirmPassword: 'StrongPass123!',
      displayName: 'Test User',
      consentGiven: true
    }

    const result = validateRegistrationForm(formData)
    expect(result.isValid).toBe(true)
    expect(Object.keys(result.errors)).toHaveLength(0)
  })

  test('should catch all validation errors', () => {
    const formData = {
      email: 'invalid-email',
      password: 'weak',
      confirmPassword: 'different',
      displayName: '',
      consentGiven: false
    }

    const result = validateRegistrationForm(formData)
    expect(result.isValid).toBe(false)
    expect(Object.keys(result.errors).length).toBeGreaterThan(0)
  })
})

describe('Login Form Validation', () => {
  test('should validate complete login form', () => {
    const formData = {
      email: 'test@example.com',
      password: 'password123'
    }

    const result = validateLoginForm(formData)
    expect(result.isValid).toBe(true)
    expect(Object.keys(result.errors)).toHaveLength(0)
  })

  test('should catch login validation errors', () => {
    const formData = {
      email: 'invalid-email',
      password: ''
    }

    const result = validateLoginForm(formData)
    expect(result.isValid).toBe(false)
    expect(Object.keys(result.errors).length).toBeGreaterThan(0)
  })
})

describe('Password Strength UI Helpers', () => {
  test('should return correct colors for strength levels', () => {
    const weakStrength = { score: 1, feedback: [], isStrong: false, requirements: { length: true, lowercase: true, uppercase: false, numbers: false, symbols: false } }
    const strongStrength = { score: 4, feedback: [], isStrong: true, requirements: { length: true, lowercase: true, uppercase: true, numbers: true, symbols: true } }

    expect(getPasswordStrengthColor(weakStrength)).toBe('text-orange-500')
    expect(getPasswordStrengthColor(strongStrength)).toBe('text-green-500')
  })

  test('should return correct labels for strength levels', () => {
    const weakStrength = { score: 1, feedback: [], isStrong: false, requirements: { length: true, lowercase: true, uppercase: false, numbers: false, symbols: false } }
    const strongStrength = { score: 4, feedback: [], isStrong: true, requirements: { length: true, lowercase: true, uppercase: true, numbers: true, symbols: true } }

    expect(getPasswordStrengthLabel(weakStrength)).toBe('Weak')
    expect(getPasswordStrengthLabel(strongStrength)).toBe('Strong')
  })
})
