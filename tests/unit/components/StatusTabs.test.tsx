import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatusTabs } from '@/components/StatusTabs'

const mockOptions = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'PENDING', label: 'รอดำเนินการ' },
  { value: 'APPROVED', label: 'อนุมัติแล้ว' },
  { value: 'REJECTED', label: 'ถูกปฏิเสธ' },
]

describe('StatusTabs', () => {
  it('should render all tab options', () => {
    render(<StatusTabs value="" onChange={() => {}} options={mockOptions} />)

    expect(screen.getByText('ทั้งหมด')).toBeInTheDocument()
    expect(screen.getByText('รอดำเนินการ')).toBeInTheDocument()
    expect(screen.getByText('อนุมัติแล้ว')).toBeInTheDocument()
    expect(screen.getByText('ถูกปฏิเสธ')).toBeInTheDocument()
  })

  it('should show active state for selected tab', () => {
    render(<StatusTabs value="PENDING" onChange={() => {}} options={mockOptions} />)

    const pendingTab = screen.getByText('รอดำเนินการ')
    const allTab = screen.getByText('ทั้งหมด')

    expect(pendingTab).toHaveClass('border-green-600')
    expect(pendingTab).toHaveClass('text-green-600')
    expect(allTab).toHaveClass('border-transparent')
    expect(allTab).toHaveClass('text-gray-500')
  })

  it('should call onChange when tab is clicked', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<StatusTabs value="" onChange={handleChange} options={mockOptions} />)

    await user.click(screen.getByText('อนุมัติแล้ว'))

    expect(handleChange).toHaveBeenCalledWith('APPROVED')
  })

  it('should have correct ARIA attributes for accessibility', () => {
    render(<StatusTabs value="PENDING" onChange={() => {}} options={mockOptions} />)

    const tablist = screen.getByRole('tablist')
    expect(tablist).toHaveAttribute('aria-label', 'Status filter')

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(4)

    const pendingTab = screen.getByText('รอดำเนินการ')
    expect(pendingTab).toHaveAttribute('aria-selected', 'true')

    const allTab = screen.getByText('ทั้งหมด')
    expect(allTab).toHaveAttribute('aria-selected', 'false')
  })

  it('should show "ทั้งหมด" as active when value is empty string', () => {
    render(<StatusTabs value="" onChange={() => {}} options={mockOptions} />)

    const allTab = screen.getByText('ทั้งหมด')
    expect(allTab).toHaveClass('border-green-600')
    expect(allTab).toHaveClass('text-green-600')
  })
})
