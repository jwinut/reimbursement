'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { ExpenseStatus, Role } from '@prisma/client'
import { Navigation } from '@/components/Navigation'
import { StatusBadge } from '@/components/StatusBadge'
import { ApprovalActions } from '@/components/ApprovalActions'
import Link from 'next/link'

interface ExpenseUser {
  id: string
  displayName: string | null
  pictureUrl: string | null
}

interface ExpenseApprover {
  id: string
  displayName: string | null
}

interface ExpenseDetail {
  id: string
  description: string
  amount: number
  date: string
  imageUrl: string | null
  status: ExpenseStatus
  createdAt: string
  updatedAt: string
  userId: string
  user: ExpenseUser
  approver: ExpenseApprover | null
  rejectionReason: string | null
  approvalDate: string | null
  paidDate: string | null
  paidAmount: number | null
}

export default function ExpenseDetailPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const expenseId = params.id as string

  const [expense, setExpense] = useState<ExpenseDetail | null>(null)
  const [csrfToken, setCsrfToken] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExpense = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/expenses/${expenseId}`)
      if (response.status === 404) {
        setError('Expense not found')
        return
      }
      if (response.status === 403) {
        setError('You do not have permission to view this expense')
        return
      }
      if (!response.ok) {
        throw new Error('Failed to fetch expense')
      }

      const data: ExpenseDetail = await response.json()
      setExpense(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [expenseId])

  const fetchCsrfToken = useCallback(async () => {
    try {
      const response = await fetch('/api/csrf')
      const data = await response.json()
      setCsrfToken(data.csrfToken)
    } catch (err) {
      console.error('Failed to fetch CSRF token:', err)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (sessionStatus === 'unauthenticated') {
      router.push('/login')
      return
    }
    fetchExpense()
    fetchCsrfToken()
  }, [sessionStatus, router, fetchExpense, fetchCsrfToken])

  const handleActionComplete = (newStatus: ExpenseStatus) => {
    if (expense) {
      setExpense({ ...expense, status: newStatus })
    }
    // Refresh to get updated data
    fetchExpense()
  }

  const handleActionError = (errorMsg: string) => {
    setError(errorMsg)
    // Clear error after 5 seconds
    setTimeout(() => setError(null), 5000)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount)
  }

  const isManager = session?.user?.role === Role.MANAGER

  if (sessionStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back button */}
        <Link
          href="/expenses/list"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to expenses
        </Link>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {expense && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{expense.description}</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Submitted on {formatDateTime(expense.createdAt)}
                  </p>
                </div>
                <StatusBadge status={expense.status} />
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-6">
              {/* Amount and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Amount</label>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {formatCurrency(expense.amount)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Expense Date</label>
                  <p className="mt-1 text-lg text-gray-900">{formatDate(expense.date)}</p>
                </div>
              </div>

              {/* Submitter info (for managers) */}
              {isManager && expense.user && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Submitted by</label>
                  <div className="flex items-center">
                    {expense.user.pictureUrl ? (
                      <img
                        src={expense.user.pictureUrl}
                        alt={expense.user.displayName || 'User'}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-600 font-medium">
                          {expense.user.displayName?.charAt(0) || 'U'}
                        </span>
                      </div>
                    )}
                    <span className="ml-3 text-gray-900">{expense.user.displayName || 'Unknown'}</span>
                  </div>
                </div>
              )}

              {/* Receipt image */}
              {expense.imageUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Receipt</label>
                  <a
                    href={expense.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={expense.imageUrl}
                      alt="Receipt"
                      className="max-w-full max-h-96 rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                    />
                  </a>
                </div>
              )}

              {/* Approval info */}
              {expense.status !== ExpenseStatus.PENDING && expense.approver && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    {expense.status === ExpenseStatus.APPROVED
                      ? 'Approved by'
                      : expense.status === ExpenseStatus.REJECTED
                      ? 'Rejected by'
                      : 'Processed by'}
                  </label>
                  <p className="text-gray-900">{expense.approver.displayName || 'Manager'}</p>
                  {expense.approvalDate && (
                    <p className="text-sm text-gray-500 mt-1">on {formatDateTime(expense.approvalDate)}</p>
                  )}
                </div>
              )}

              {/* Rejection reason */}
              {expense.status === ExpenseStatus.REJECTED && expense.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-red-800 mb-1">Rejection Reason</label>
                  <p className="text-red-700">{expense.rejectionReason}</p>
                </div>
              )}

              {/* Payment info */}
              {expense.status === ExpenseStatus.REIMBURSED && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-blue-800 mb-2">Payment Details</label>
                  {expense.paidDate && (
                    <p className="text-blue-700">Paid on {formatDate(expense.paidDate)}</p>
                  )}
                  {expense.paidAmount && (
                    <p className="text-blue-900 font-semibold mt-1">
                      Amount paid: {formatCurrency(expense.paidAmount)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions (for managers) */}
            {isManager && (expense.status === ExpenseStatus.PENDING || expense.status === ExpenseStatus.APPROVED) && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <ApprovalActions
                  expenseId={expense.id}
                  currentStatus={expense.status}
                  csrfToken={csrfToken}
                  onActionComplete={handleActionComplete}
                  onError={handleActionError}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
