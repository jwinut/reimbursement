import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'

// Mock next-auth
vi.mock('next-auth/react', async () => {
  const actual = await vi.importActual('next-auth/react')
  return {
    ...actual,
    signIn: vi.fn(),
  }
})

import { signIn } from 'next-auth/react'
import LoginPage from '@/app/login/page'

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <SessionProvider session={null}>
      {component}
    </SessionProvider>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render login page with title', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText('Reimbursement')).toBeInTheDocument()
  })

  it('should render LINE sign in button', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByRole('button', { name: /sign in with line/i })).toBeInTheDocument()
  })

  it('should call signIn with LINE provider when button is clicked', async () => {
    renderWithProviders(<LoginPage />)

    const button = screen.getByRole('button', { name: /sign in with line/i })
    fireEvent.click(button)

    expect(signIn).toHaveBeenCalledWith('line', { callbackUrl: '/expenses/new' })
  })

  it('should show loading state when signing in', async () => {
    renderWithProviders(<LoginPage />)

    const button = screen.getByRole('button', { name: /sign in with line/i })
    fireEvent.click(button)

    expect(screen.getByText('Signing in...')).toBeInTheDocument()
  })
})
