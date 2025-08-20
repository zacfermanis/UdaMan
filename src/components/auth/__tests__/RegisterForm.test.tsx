import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import RegisterForm from '../RegisterForm'
import { supabase } from '@/lib/supabase/client'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: jest.fn()
    }
  }
}))

// Mock validation utilities
jest.mock('@/lib/auth/validation', () => ({
  validateEmail: jest.fn(),
  validatePasswordStrength: jest.fn()
}))

const mockRouter = {
  push: jest.fn()
}

const mockSupabase = supabase as jest.Mocked<typeof supabase>
const mockValidateEmail = require('@/lib/auth/validation').validateEmail
const mockValidatePasswordStrength = require('@/lib/auth/validation').validatePasswordStrength

describe('RegisterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    mockValidateEmail.mockReturnValue({ isValid: true, error: null })
    mockValidatePasswordStrength.mockReturnValue({ isValid: true, error: null, score: 4 })
  })

  it('renders registration form with all required fields', () => {
    render(<RegisterForm />)

    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument()
  })

  it('handles display name input changes', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    const displayNameInput = screen.getByLabelText(/display name/i)
    await user.type(displayNameInput, 'John Doe')

    expect(displayNameInput).toHaveValue('John Doe')
  })

  it('handles email input changes', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    const emailInput = screen.getByLabelText(/email address/i)
    await user.type(emailInput, 'test@example.com')

    expect(emailInput).toHaveValue('test@example.com')
  })

  it('handles password input changes', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    await user.type(passwordInput, 'password123')

    expect(passwordInput).toHaveValue('password123')
  })

  it('handles confirm password input changes', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    await user.type(confirmPasswordInput, 'password123')

    expect(confirmPasswordInput).toHaveValue('password123')
  })

  it('handles consent checkbox changes', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    const consentCheckbox = screen.getByRole('checkbox')
    await user.click(consentCheckbox)

    expect(consentCheckbox).toBeChecked()
  })

  it('shows loading state during form submission', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.signUp.mockImplementation(() => 
      new Promise(() => {}) // Never resolves to simulate loading
    )

    render(<RegisterForm />)

    const displayNameInput = screen.getByLabelText(/display name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const consentCheckbox = screen.getByRole('checkbox')
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(displayNameInput, 'John Doe')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.click(consentCheckbox)
    await user.click(submitButton)

    expect(screen.getByText('Creating account...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('handles successful registration', async () => {
    const user = userEvent.setup()
    const mockUser = { id: '123', email: 'test@example.com' }
    const mockData = { user: mockUser, session: null }
    
    mockSupabase.auth.signUp.mockResolvedValue({
      data: mockData,
      error: null
    })

    const onSuccess = jest.fn()
    render(<RegisterForm onSuccess={onSuccess} redirectTo="/auth/verify-email" />)

    const displayNameInput = screen.getByLabelText(/display name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const consentCheckbox = screen.getByRole('checkbox')
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(displayNameInput, 'John Doe')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.click(consentCheckbox)
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            display_name: 'John Doe',
            consent_given: true,
            consent_date: expect.any(String)
          }
        }
      })
      expect(onSuccess).toHaveBeenCalled()
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/verify-email')
    })
  })

  it('handles registration error with user-friendly message', async () => {
    const user = userEvent.setup()
    const mockError = {
      name: 'AuthApiError',
      message: 'User already registered'
    }

    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: mockError
    })

    const onError = jest.fn()
    render(<RegisterForm onError={onError} />)

    const displayNameInput = screen.getByLabelText(/display name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const consentCheckbox = screen.getByRole('checkbox')
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(displayNameInput, 'John Doe')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.click(consentCheckbox)
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('An account with this email already exists. Please sign in instead.')).toBeInTheDocument()
      expect(onError).toHaveBeenCalledWith({
        code: 'AuthApiError',
        message: 'User already registered',
        details: mockError
      })
    })
  })

  it('handles unexpected errors', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.signUp.mockRejectedValue(new Error('Network error'))

    const onError = jest.fn()
    render(<RegisterForm onError={onError} />)

    const displayNameInput = screen.getByLabelText(/display name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const consentCheckbox = screen.getByRole('checkbox')
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(displayNameInput, 'John Doe')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.click(consentCheckbox)
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
      expect(onError).toHaveBeenCalledWith({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: expect.any(Error)
      })
    })
  })

  it('shows password strength indicator', async () => {
    const user = userEvent.setup()
    mockValidatePasswordStrength.mockReturnValue({ 
      isValid: true, 
      error: null,
      score: 3
    })
    
    render(<RegisterForm />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    await user.type(passwordInput, 'password123')

    await waitFor(() => {
      expect(screen.getByText('Medium strength password')).toBeInTheDocument()
    })
  })

  it('applies custom className prop', () => {
    render(<RegisterForm className="custom-class" />)
    
    const form = document.querySelector('form')
    expect(form).toHaveClass('custom-class')
  })

  it('disables form inputs during loading', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.signUp.mockImplementation(() => 
      new Promise(() => {}) // Never resolves to simulate loading
    )

    render(<RegisterForm />)

    const displayNameInput = screen.getByLabelText(/display name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const consentCheckbox = screen.getByRole('checkbox')
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(displayNameInput, 'John Doe')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.click(consentCheckbox)
    await user.click(submitButton)

    expect(displayNameInput).toBeDisabled()
    expect(emailInput).toBeDisabled()
    expect(passwordInput).toBeDisabled()
    expect(confirmPasswordInput).toBeDisabled()
    expect(consentCheckbox).toBeDisabled()
    expect(submitButton).toBeDisabled()
  })
})
