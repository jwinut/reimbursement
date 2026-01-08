import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExpenseStatus } from '@prisma/client'
import { StatusBadge } from '@/components/StatusBadge'

describe('StatusBadge', () => {
  it('should render "รอดำเนินการ" with yellow styling for PENDING status', () => {
    render(<StatusBadge status={ExpenseStatus.PENDING} />)

    const badge = screen.getByText('รอดำเนินการ')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-yellow-100')
    expect(badge).toHaveClass('text-yellow-800')
  })

  it('should render "อนุมัติแล้ว" with green styling for APPROVED status', () => {
    render(<StatusBadge status={ExpenseStatus.APPROVED} />)

    const badge = screen.getByText('อนุมัติแล้ว')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-green-100')
    expect(badge).toHaveClass('text-green-800')
  })

  it('should render "ถูกปฏิเสธ" with red styling for REJECTED status', () => {
    render(<StatusBadge status={ExpenseStatus.REJECTED} />)

    const badge = screen.getByText('ถูกปฏิเสธ')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-red-100')
    expect(badge).toHaveClass('text-red-800')
  })

  it('should render "เบิกแล้ว" with blue styling for REIMBURSED status', () => {
    render(<StatusBadge status={ExpenseStatus.REIMBURSED} />)

    const badge = screen.getByText('เบิกแล้ว')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-blue-100')
    expect(badge).toHaveClass('text-blue-800')
  })

  it('should apply custom className when provided', () => {
    render(<StatusBadge status={ExpenseStatus.PENDING} className="custom-class" />)

    const badge = screen.getByText('รอดำเนินการ')
    expect(badge).toHaveClass('custom-class')
  })
})
