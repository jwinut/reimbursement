import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExpenseStatus } from '@prisma/client'
import { StatusBadge } from '@/components/StatusBadge'

describe('StatusBadge', () => {
  it('should render "Pending" with yellow styling for PENDING status', () => {
    render(<StatusBadge status={ExpenseStatus.PENDING} />)

    const badge = screen.getByText('Pending')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-yellow-100')
    expect(badge).toHaveClass('text-yellow-800')
  })

  it('should render "Approved" with green styling for APPROVED status', () => {
    render(<StatusBadge status={ExpenseStatus.APPROVED} />)

    const badge = screen.getByText('Approved')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-green-100')
    expect(badge).toHaveClass('text-green-800')
  })

  it('should render "Rejected" with red styling for REJECTED status', () => {
    render(<StatusBadge status={ExpenseStatus.REJECTED} />)

    const badge = screen.getByText('Rejected')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-red-100')
    expect(badge).toHaveClass('text-red-800')
  })

  it('should render "Reimbursed" with blue styling for REIMBURSED status', () => {
    render(<StatusBadge status={ExpenseStatus.REIMBURSED} />)

    const badge = screen.getByText('Reimbursed')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-blue-100')
    expect(badge).toHaveClass('text-blue-800')
  })

  it('should apply custom className when provided', () => {
    render(<StatusBadge status={ExpenseStatus.PENDING} className="custom-class" />)

    const badge = screen.getByText('Pending')
    expect(badge).toHaveClass('custom-class')
  })
})
