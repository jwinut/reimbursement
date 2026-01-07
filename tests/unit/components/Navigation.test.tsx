import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Role } from '@prisma/client'
import { Navigation } from '@/components/Navigation'

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usePathname).mockReturnValue('/expenses/list')
  })

  it('should not render when user is not authenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    })

    const { container } = render(<Navigation />)

    expect(container.firstChild).toBeNull()
  })

  it('should render brand/logo link', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-123', name: 'Test User', role: Role.EMPLOYEE },
        expires: new Date().toISOString(),
      },
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<Navigation />)

    expect(screen.getByText('Reimbursement')).toBeInTheDocument()
  })

  it('should render "New Expense" nav item for employees', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-123', name: 'Test User', role: Role.EMPLOYEE },
        expires: new Date().toISOString(),
      },
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<Navigation />)

    expect(screen.getAllByText('New Expense').length).toBeGreaterThan(0)
  })

  it('should render "My Expenses" nav item for employees', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-123', name: 'Test User', role: Role.EMPLOYEE },
        expires: new Date().toISOString(),
      },
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<Navigation />)

    expect(screen.getAllByText('My Expenses').length).toBeGreaterThan(0)
  })

  it('should render "Dashboard" nav item only for managers', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'manager-123', name: 'Test Manager', role: Role.MANAGER },
        expires: new Date().toISOString(),
      },
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<Navigation />)

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
  })

  it('should not render "Dashboard" for employees', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-123', name: 'Test User', role: Role.EMPLOYEE },
        expires: new Date().toISOString(),
      },
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<Navigation />)

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('should highlight active nav item based on pathname', () => {
    vi.mocked(usePathname).mockReturnValue('/expenses/list')
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-123', name: 'Test User', role: Role.EMPLOYEE },
        expires: new Date().toISOString(),
      },
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<Navigation />)

    // Find the My Expenses link and check if it has the active class
    const links = screen.getAllByRole('link')
    const activeLink = links.find((link) => link.getAttribute('href') === '/expenses/list')

    // Desktop link should have active classes
    expect(activeLink?.className).toContain('bg-green-50')
  })

  it('should render user avatar/image', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: 'user-123',
          name: 'Test User',
          role: Role.EMPLOYEE,
          image: 'https://example.com/avatar.jpg',
        },
        expires: new Date().toISOString(),
      },
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<Navigation />)

    // Find the img element by alt text which is more reliable
    const avatar = screen.getByAltText('Test User')
    expect(avatar).toBeInTheDocument()
    expect(avatar.tagName).toBe('IMG')
  })

  it('should call signOut when clicking sign out button', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-123', name: 'Test User', role: Role.EMPLOYEE },
        expires: new Date().toISOString(),
      },
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<Navigation />)

    // Find and click the sign out button (there are multiple - desktop and mobile)
    const signOutButtons = screen.getAllByText('Sign out')
    if (signOutButtons[0]) {
      fireEvent.click(signOutButtons[0])
    }

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login' })
  })
})
