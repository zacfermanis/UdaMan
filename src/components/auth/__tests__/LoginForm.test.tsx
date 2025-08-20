import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import LoginForm from '../LoginForm'
import { supabase } from '@/lib/supabase/client'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn()
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

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    mockValidateEmail.mockReturnValue({ isValid: true, error: null })
  })

  it('renders login form with all required fields', () => {
    render(<LoginForm />)

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument()
    expect(screen.getByText(/forgot your password/i)).toBeInTheDocument()
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument()
  })

  it('handles email input changes', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email address/i)
    await user.type(emailInput, 'test@example.com')

    expect(emailInput).toHaveValue('test@example.com')
  })

  it('handles password input changes', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    const passwordInput = screen.getByLabelText(/password/i)
    await user.type(passwordInput, 'password123')

    expect(passwordInput).toHaveValue('password123')
  })

  it('handles remember me checkbox changes', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    const rememberMeCheckbox = screen.getByLabelText(/remember me/i)
    await user.click(rememberMeCheckbox)

    expect(rememberMeCheckbox).toBeChecked()
  })

  it('shows loading state during form submission', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.signInWithPassword.mockImplementation(() => 
      new Promise(() => {}) // Never resolves to simulate loading
    )

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    expect(screen.getByText('Signing in...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('handles successful login', async () => {
    const user = userEvent.setup()
    const mockUser = { id: '123', email: 'test@example.com' }
    const mockData = { user: mockUser, session: null }
    
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: mockData,
      error: null
    })

    const onSuccess = jest.fn()
    render(<LoginForm onSuccess={onSuccess} redirectTo="/dashboard" />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
      expect(onSuccess).toHaveBeenCalled()
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('handles login error with user-friendly message', async () => {
    const user = userEvent.setup()
    const mockError = {
      name: 'AuthApiError',
      message: 'Invalid login credentials'
    }

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: mockError
    })

    const onError = jest.fn()
    render(<LoginForm onError={onError} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password. Please check your credentials and try again.')).toBeInTheDocument()
      expect(onError).toHaveBeenCalledWith({
        code: 'AuthApiError',
        message: 'Invalid login credentials',
        details: mockError
      })
    })
  })

  it('handles unexpected errors', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.signInWithPassword.mockRejectedValue(new Error('Network error'))

    const onError = jest.fn()
    render(<LoginForm onError={onError} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
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

  it('clears field errors when user starts typing', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)

    // Type in email field
    await user.type(emailInput, 'test@example.com')
    expect(emailInput).toHaveValue('test@example.com')

    // Type in password field
    await user.type(passwordInput, 'password123')
    expect(passwordInput).toHaveValue('password123')
  })

  it('applies custom className prop', () => {
    render(<LoginForm className="custom-class" />)
    
    const form = document.querySelector('form')
    expect(form).toHaveClass('custom-class')
  })

  it('disables form inputs during loading', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.signInWithPassword.mockImplementation(() => 
      new Promise(() => {}) // Never resolves to simulate loading
    )

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const rememberMeCheckbox = screen.getByLabelText(/remember me/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    expect(emailInput).toBeDisabled()
    expect(passwordInput).toBeDisabled()
    expect(rememberMeCheckbox).toBeDisabled()
    expect(submitButton).toBeDisabled()
  })
})
