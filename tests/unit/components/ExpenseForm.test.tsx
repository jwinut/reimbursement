import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseForm } from '@/components/ExpenseForm'

// Mock fetch
global.fetch = vi.fn()

// Helper to mock fetch responses
function mockFetchResponses(csrfToken: string = 'test-csrf-token') {
  ;(global.fetch as any).mockImplementation((url: string) => {
    if (url === '/api/csrf') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ csrfToken }),
      })
    }
    // Default response for /api/expenses
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ id: '1' }),
    })
  })
}

describe('ExpenseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchResponses()
  })

  it('should render all form fields', () => {
    render(<ExpenseForm />)

    expect(screen.getByLabelText(/รายละเอียด/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/จำนวนเงิน \(บาท\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/วันที่/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/รูปใบเสร็จ/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ส่งค่าใช้จ่าย/i })).toBeInTheDocument()
  })

  it('should show validation errors for empty required fields', async () => {
    render(<ExpenseForm />)

    const submitButton = screen.getByRole('button', { name: /ส่งค่าใช้จ่าย/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/description is required/i)).toBeInTheDocument()
    })
  })

  it('should show error for negative amount', async () => {
    const user = userEvent.setup()
    render(<ExpenseForm />)

    await user.type(screen.getByLabelText(/รายละเอียด/i), 'Test expense')
    await user.type(screen.getByLabelText(/จำนวนเงิน \(บาท\)/i), '-100')

    const submitButton = screen.getByRole('button', { name: /ส่งค่าใช้จ่าย/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/amount must be a positive number/i)).toBeInTheDocument()
    })
  })

  it('should submit form with valid data', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    render(<ExpenseForm onSuccess={onSuccess} />)

    await user.type(screen.getByLabelText(/รายละเอียด/i), 'Lunch meeting')
    await user.type(screen.getByLabelText(/จำนวนเงิน \(บาท\)/i), '250')

    const submitButton = screen.getByRole('button', { name: /ส่งค่าใช้จ่าย/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/expenses', expect.any(Object))
    })
  })

  it('should include CSRF token in request headers', async () => {
    const csrfToken = 'unique-csrf-token-12345'
    mockFetchResponses(csrfToken)

    const user = userEvent.setup()
    render(<ExpenseForm />)

    // Wait for CSRF token to be fetched
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/csrf')
    })

    await user.type(screen.getByLabelText(/รายละเอียด/i), 'Test expense')
    await user.type(screen.getByLabelText(/จำนวนเงิน \(บาท\)/i), '100')

    const submitButton = screen.getByRole('button', { name: /ส่งค่าใช้จ่าย/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/expenses',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-CSRF-Token': csrfToken,
          }),
        })
      )
    })
  })

  it('should show loading state while submitting', async () => {
    const user = userEvent.setup()
    // First call returns CSRF token, second never resolves
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url === '/api/csrf') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ csrfToken: 'test-token' }),
        })
      }
      return new Promise(() => {}) // Never resolves for /api/expenses
    })

    render(<ExpenseForm />)

    await user.type(screen.getByLabelText(/รายละเอียด/i), 'Test')
    await user.type(screen.getByLabelText(/จำนวนเงิน \(บาท\)/i), '100')

    const submitButton = screen.getByRole('button', { name: /ส่งค่าใช้จ่าย/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/กำลังส่ง/i)).toBeInTheDocument()
    })
  })

  it('should display error message on API failure', async () => {
    const user = userEvent.setup()
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url === '/api/csrf') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ csrfToken: 'test-token' }),
        })
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Server error' }),
      })
    })

    render(<ExpenseForm />)

    await user.type(screen.getByLabelText(/รายละเอียด/i), 'Test')
    await user.type(screen.getByLabelText(/จำนวนเงิน \(บาท\)/i), '100')

    const submitButton = screen.getByRole('button', { name: /ส่งค่าใช้จ่าย/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument()
    })
  })
})
