import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseStatus } from '@prisma/client'
import { ApprovalActions } from '@/components/ApprovalActions'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ApprovalActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render Approve and Reject buttons for PENDING status', () => {
    render(
      <ApprovalActions
        expenseId="expense-123"
        currentStatus={ExpenseStatus.PENDING}
        csrfToken="test-token"
      />
    )

    expect(screen.getByText('Approve')).toBeInTheDocument()
    expect(screen.getByText('Reject')).toBeInTheDocument()
  })

  it('should render Mark as Paid button for APPROVED status', () => {
    render(
      <ApprovalActions
        expenseId="expense-123"
        currentStatus={ExpenseStatus.APPROVED}
        csrfToken="test-token"
      />
    )

    expect(screen.getByText('Mark as Paid')).toBeInTheDocument()
    expect(screen.queryByText('Approve')).not.toBeInTheDocument()
    expect(screen.queryByText('Reject')).not.toBeInTheDocument()
  })

  it('should return null for REJECTED status', () => {
    const { container } = render(
      <ApprovalActions
        expenseId="expense-123"
        currentStatus={ExpenseStatus.REJECTED}
        csrfToken="test-token"
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should return null for REIMBURSED status', () => {
    const { container } = render(
      <ApprovalActions
        expenseId="expense-123"
        currentStatus={ExpenseStatus.REIMBURSED}
        csrfToken="test-token"
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should call approve API with CSRF token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: ExpenseStatus.APPROVED }),
    })

    render(
      <ApprovalActions
        expenseId="expense-123"
        currentStatus={ExpenseStatus.PENDING}
        csrfToken="test-csrf-token"
      />
    )

    fireEvent.click(screen.getByText('Approve'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/expenses/expense-123/approve',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-CSRF-Token': 'test-csrf-token',
          }),
        })
      )
    })
  })

  it('should call onActionComplete after successful approval', async () => {
    const onActionComplete = vi.fn()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: ExpenseStatus.APPROVED }),
    })

    render(
      <ApprovalActions
        expenseId="expense-123"
        currentStatus={ExpenseStatus.PENDING}
        csrfToken="test-token"
        onActionComplete={onActionComplete}
      />
    )

    fireEvent.click(screen.getByText('Approve'))

    await waitFor(() => {
      expect(onActionComplete).toHaveBeenCalledWith(ExpenseStatus.APPROVED)
    })
  })

  it('should show reject modal when clicking Reject button', async () => {
    render(
      <ApprovalActions
        expenseId="expense-123"
        currentStatus={ExpenseStatus.PENDING}
        csrfToken="test-token"
      />
    )

    fireEvent.click(screen.getByText('Reject'))

    expect(screen.getByRole('heading', { name: 'Reject Expense' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Please provide a reason for rejection...')).toBeInTheDocument()
  })

  it('should require rejection reason before submitting', async () => {
    const onError = vi.fn()
    render(
      <ApprovalActions
        expenseId="expense-123"
        currentStatus={ExpenseStatus.PENDING}
        csrfToken="test-token"
        onError={onError}
      />
    )

    // Open modal
    fireEvent.click(screen.getByText('Reject'))

    // Try to reject without reason (button should be disabled)
    // Find the submit button in the modal (not the heading)
    const buttons = screen.getAllByRole('button')
    const rejectSubmitButton = buttons.find(btn => btn.textContent === 'Reject Expense')
    expect(rejectSubmitButton).toBeDisabled()
  })

  it('should call reject API with reason and CSRF token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: ExpenseStatus.REJECTED }),
    })

    render(
      <ApprovalActions
        expenseId="expense-123"
        currentStatus={ExpenseStatus.PENDING}
        csrfToken="test-csrf-token"
      />
    )

    // Open modal
    fireEvent.click(screen.getByText('Reject'))

    // Enter reason
    const textarea = screen.getByPlaceholderText('Please provide a reason for rejection...')
    await userEvent.type(textarea, 'Missing receipt')

    // Submit - find the submit button explicitly
    const buttons = screen.getAllByRole('button')
    const rejectSubmitButton = buttons.find(btn => btn.textContent === 'Reject Expense')
    fireEvent.click(rejectSubmitButton!)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/expenses/expense-123/reject',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-CSRF-Token': 'test-csrf-token',
          }),
          body: JSON.stringify({ reason: 'Missing receipt' }),
        })
      )
    })
  })

  it('should call onActionComplete after successful rejection', async () => {
    const onActionComplete = vi.fn()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: ExpenseStatus.REJECTED }),
    })

    render(
      <ApprovalActions
        expenseId="expense-123"
        currentStatus={ExpenseStatus.PENDING}
        csrfToken="test-token"
        onActionComplete={onActionComplete}
      />
    )

    fireEvent.click(screen.getByText('Reject'))
    const textarea = screen.getByPlaceholderText('Please provide a reason for rejection...')
    await userEvent.type(textarea, 'Test reason')

    // Find the submit button explicitly
    const buttons = screen.getAllByRole('button')
    const rejectSubmitButton = buttons.find(btn => btn.textContent === 'Reject Expense')
    fireEvent.click(rejectSubmitButton!)

    await waitFor(() => {
      expect(onActionComplete).toHaveBeenCalledWith(ExpenseStatus.REJECTED)
    })
  })

  it('should call pay API with CSRF token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: ExpenseStatus.REIMBURSED }),
    })

    render(
      <ApprovalActions
        expenseId="expense-123"
        currentStatus={ExpenseStatus.APPROVED}
        csrfToken="test-csrf-token"
      />
    )

    fireEvent.click(screen.getByText('Mark as Paid'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/expenses/expense-123/pay',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-CSRF-Token': 'test-csrf-token',
          }),
        })
      )
    })
  })

  it('should call onActionComplete after successful payment', async () => {
    const onActionComplete = vi.fn()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: ExpenseStatus.REIMBURSED }),
    })

    render(
      <ApprovalActions
        expenseId="expense-123"
        currentStatus={ExpenseStatus.APPROVED}
        csrfToken="test-token"
        onActionComplete={onActionComplete}
      />
    )

    fireEvent.click(screen.getByText('Mark as Paid'))

    await waitFor(() => {
      expect(onActionComplete).toHaveBeenCalledWith(ExpenseStatus.REIMBURSED)
    })
  })

  it('should call onError when API returns error', async () => {
    const onError = vi.fn()
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Something went wrong' }),
    })

    render(
      <ApprovalActions
        expenseId="expense-123"
        currentStatus={ExpenseStatus.PENDING}
        csrfToken="test-token"
        onError={onError}
      />
    )

    fireEvent.click(screen.getByText('Approve'))

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Something went wrong')
    })
  })

  it('should disable buttons while loading', async () => {
    // Create a promise that doesn't resolve immediately
    let resolvePromise: () => void
    const pendingPromise = new Promise<Response>((resolve) => {
      resolvePromise = () => resolve({
        ok: true,
        json: async () => ({}),
      } as Response)
    })
    mockFetch.mockReturnValueOnce(pendingPromise)

    render(
      <ApprovalActions
        expenseId="expense-123"
        currentStatus={ExpenseStatus.PENDING}
        csrfToken="test-token"
      />
    )

    fireEvent.click(screen.getByText('Approve'))

    // Buttons should be disabled while loading
    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toBeDisabled()
      })
    })

    // Resolve the promise
    resolvePromise!()
  })

  it('should close modal and clear reason after cancel', async () => {
    render(
      <ApprovalActions
        expenseId="expense-123"
        currentStatus={ExpenseStatus.PENDING}
        csrfToken="test-token"
      />
    )

    // Open modal
    fireEvent.click(screen.getByText('Reject'))

    // Modal heading should be visible
    expect(screen.getByRole('heading', { name: 'Reject Expense' })).toBeInTheDocument()

    // Enter some text
    const textarea = screen.getByPlaceholderText('Please provide a reason for rejection...')
    await userEvent.type(textarea, 'Some reason')

    // Click cancel
    fireEvent.click(screen.getByText('Cancel'))

    // Modal should be closed - heading should not be visible
    expect(screen.queryByRole('heading', { name: 'Reject Expense' })).not.toBeInTheDocument()

    // Reopen modal - reason should be cleared
    fireEvent.click(screen.getByText('Reject'))
    const newTextarea = screen.getByPlaceholderText('Please provide a reason for rejection...')
    expect(newTextarea).toHaveValue('')
  })
})
