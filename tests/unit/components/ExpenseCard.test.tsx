import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExpenseStatus } from '@prisma/client'
import { ExpenseCard, ExpenseCardData } from '@/components/ExpenseList/ExpenseCard'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const createMockExpense = (overrides?: Partial<ExpenseCardData>): ExpenseCardData => ({
  id: 'expense-123',
  description: 'Test expense',
  amount: 100,
  date: '2024-01-15T00:00:00.000Z',
  imageUrl: null,
  status: ExpenseStatus.PENDING,
  createdAt: '2024-01-15T00:00:00.000Z',
  ...overrides,
})

describe('ExpenseCard', () => {
  it('should render expense description', () => {
    const expense = createMockExpense({ description: 'Lunch meeting' })
    render(<ExpenseCard expense={expense} />)

    expect(screen.getByText('Lunch meeting')).toBeInTheDocument()
  })

  it('should render formatted amount in THB currency', () => {
    const expense = createMockExpense({ amount: 1500.5 })
    render(<ExpenseCard expense={expense} />)

    // Thai currency format
    expect(screen.getByText(/฿.*1,500.50/)).toBeInTheDocument()
  })

  it('should render formatted date', () => {
    const expense = createMockExpense({ date: '2024-03-15T00:00:00.000Z' })
    render(<ExpenseCard expense={expense} />)

    // Date should be displayed (Thai locale uses Buddhist calendar: 2567)
    // Look for "มี.ค." (March in Thai) or the day number
    const dateElement = screen.getByText(/15.*มี\.ค|Mar.*15|2567/)
    expect(dateElement).toBeInTheDocument()
  })

  it('should render StatusBadge with correct status', () => {
    const expense = createMockExpense({ status: ExpenseStatus.APPROVED })
    render(<ExpenseCard expense={expense} />)

    expect(screen.getByText('Approved')).toBeInTheDocument()
  })

  it('should render image icon when imageUrl exists', () => {
    const expense = createMockExpense({ imageUrl: '/uploads/receipt.jpg' })
    render(<ExpenseCard expense={expense} />)

    // SVG icon should be rendered
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should not render image icon when no imageUrl', () => {
    const expense = createMockExpense({ imageUrl: null })
    render(<ExpenseCard expense={expense} />)

    // No SVG icon in the amount section (the only svg would be inside StatusBadge if any)
    const svgs = document.querySelectorAll('svg')
    expect(svgs.length).toBe(0)
  })

  it('should render user info when showUser is true', () => {
    const expense = createMockExpense({
      user: {
        id: 'user-123',
        displayName: 'John Doe',
        pictureUrl: null,
      },
    })
    render(<ExpenseCard expense={expense} showUser={true} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('should not render user info when showUser is false', () => {
    const expense = createMockExpense({
      user: {
        id: 'user-123',
        displayName: 'John Doe',
        pictureUrl: null,
      },
    })
    render(<ExpenseCard expense={expense} showUser={false} />)

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
  })

  it('should render rejection reason for REJECTED status', () => {
    const expense = createMockExpense({
      status: ExpenseStatus.REJECTED,
      rejectionReason: 'Missing receipt',
    })
    render(<ExpenseCard expense={expense} />)

    expect(screen.getByText('Missing receipt')).toBeInTheDocument()
    expect(screen.getByText('Reason:')).toBeInTheDocument()
  })

  it('should render approver info for APPROVED status', () => {
    const expense = createMockExpense({
      status: ExpenseStatus.APPROVED,
      approver: {
        id: 'manager-123',
        displayName: 'Jane Manager',
      },
    })
    render(<ExpenseCard expense={expense} />)

    expect(screen.getByText('Jane Manager')).toBeInTheDocument()
    expect(screen.getByText('Approved by:')).toBeInTheDocument()
  })

  it('should render as Link when no onClick provided', () => {
    const expense = createMockExpense()
    render(<ExpenseCard expense={expense} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/expenses/expense-123')
  })

  it('should render as button when onClick provided', () => {
    const handleClick = vi.fn()
    const expense = createMockExpense()
    render(<ExpenseCard expense={expense} onClick={handleClick} />)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should render user picture when pictureUrl exists', () => {
    const expense = createMockExpense({
      user: {
        id: 'user-123',
        displayName: 'John Doe',
        pictureUrl: 'https://example.com/avatar.jpg',
      },
    })
    render(<ExpenseCard expense={expense} showUser={true} />)

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })
})
