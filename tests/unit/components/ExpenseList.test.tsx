import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExpenseStatus } from '@prisma/client'
import { ExpenseList } from '@/components/ExpenseList/ExpenseList'
import { ExpenseCardData } from '@/components/ExpenseList/ExpenseCard'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const createMockExpense = (id: string, description: string): ExpenseCardData => ({
  id,
  description,
  amount: 100,
  date: '2024-01-15T00:00:00.000Z',
  imageUrl: null,
  status: ExpenseStatus.PENDING,
  createdAt: '2024-01-15T00:00:00.000Z',
})

describe('ExpenseList', () => {
  it('should render loading skeleton when isLoading is true', () => {
    render(<ExpenseList expenses={[]} isLoading={true} />)

    // Should show 3 skeleton items with animate-pulse class
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(3)
  })

  it('should render empty state with custom message', () => {
    render(<ExpenseList expenses={[]} emptyMessage="No pending expenses" />)

    expect(screen.getByText('No pending expenses')).toBeInTheDocument()
    expect(screen.getByText('เริ่มต้นด้วยการสร้างค่าใช้จ่ายใหม่')).toBeInTheDocument()
  })

  it('should render list of expense cards', () => {
    const expenses = [
      createMockExpense('1', 'Lunch'),
      createMockExpense('2', 'Taxi'),
    ]

    render(<ExpenseList expenses={expenses} />)

    expect(screen.getByText('Lunch')).toBeInTheDocument()
    expect(screen.getByText('Taxi')).toBeInTheDocument()
  })

  it('should render pagination when totalPages > 1', () => {
    const expenses = [createMockExpense('1', 'Expense 1')]
    const pagination = { page: 1, limit: 20, total: 50, totalPages: 3 }

    render(<ExpenseList expenses={expenses} pagination={pagination} />)

    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('should not render pagination when totalPages <= 1', () => {
    const expenses = [createMockExpense('1', 'Expense 1')]
    const pagination = { page: 1, limit: 20, total: 5, totalPages: 1 }

    render(<ExpenseList expenses={expenses} pagination={pagination} />)

    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument()
  })

  it('should call onPageChange when clicking next', () => {
    const onPageChange = vi.fn()
    const expenses = [createMockExpense('1', 'Expense 1')]
    const pagination = { page: 1, limit: 20, total: 50, totalPages: 3 }

    render(
      <ExpenseList
        expenses={expenses}
        pagination={pagination}
        onPageChange={onPageChange}
      />
    )

    // Find the desktop next button (hidden on mobile)
    const nextButtons = screen.getAllByRole('button')
    const nextButton = nextButtons.find((btn) => btn.textContent === 'ถัดไป')
    if (nextButton) {
      fireEvent.click(nextButton)
    }

    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('should call onPageChange when clicking previous', () => {
    const onPageChange = vi.fn()
    const expenses = [createMockExpense('1', 'Expense 1')]
    const pagination = { page: 2, limit: 20, total: 50, totalPages: 3 }

    render(
      <ExpenseList
        expenses={expenses}
        pagination={pagination}
        onPageChange={onPageChange}
      />
    )

    const prevButtons = screen.getAllByRole('button')
    const prevButton = prevButtons.find((btn) => btn.textContent === 'ก่อนหน้า')
    if (prevButton) {
      fireEvent.click(prevButton)
    }

    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('should disable previous button on first page', () => {
    const expenses = [createMockExpense('1', 'Expense 1')]
    const pagination = { page: 1, limit: 20, total: 50, totalPages: 3 }

    render(<ExpenseList expenses={expenses} pagination={pagination} />)

    const prevButtons = screen.getAllByRole('button')
    const prevButton = prevButtons.find((btn) => btn.textContent === 'ก่อนหน้า')

    expect(prevButton).toBeDisabled()
  })

  it('should disable next button on last page', () => {
    const expenses = [createMockExpense('1', 'Expense 1')]
    const pagination = { page: 3, limit: 20, total: 50, totalPages: 3 }

    render(<ExpenseList expenses={expenses} pagination={pagination} />)

    const nextButtons = screen.getAllByRole('button')
    const nextButton = nextButtons.find((btn) => btn.textContent === 'ถัดไป')

    expect(nextButton).toBeDisabled()
  })

  it('should pass showUser prop to ExpenseCard', () => {
    const expenses = [
      {
        ...createMockExpense('1', 'Test'),
        user: { id: 'user-1', displayName: 'John', pictureUrl: null },
      },
    ]

    render(<ExpenseList expenses={expenses} showUser={true} />)

    expect(screen.getByText('John')).toBeInTheDocument()
  })
})
