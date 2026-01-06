'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Role } from '@prisma/client'
import { Navigation } from '@/components/Navigation'
import { ExpenseList, ExpenseCardData } from '@/components/ExpenseList'
import Link from 'next/link'

interface SummaryData {
  counts: {
    pending: number
    approved: number
    rejected: number
    reimbursed: number
    total: number
  }
  totals: {
    pending: number
    approved: number
    reimbursed: number
  }
  recentPending: ExpenseCardData[]
}

export default function ManagerDashboard() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()

  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/expenses/summary')
      if (response.status === 403) {
        router.push('/expenses/list')
        return
      }
      if (!response.ok) {
        throw new Error('Failed to fetch summary')
      }

      const data: SummaryData = await response.json()
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (sessionStatus === 'unauthenticated') {
      router.push('/login')
      return
    }
    // Check if user is manager
    if (session?.user?.role !== Role.MANAGER) {
      router.push('/expenses/list')
      return
    }
    fetchSummary()
  }, [sessionStatus, session, router, fetchSummary])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount)
  }

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of expense submissions and approvals
          </p>
        </div>

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
                <button
                  onClick={fetchSummary}
                  className="mt-2 text-sm text-red-600 underline hover:text-red-500"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {summary && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Pending */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-yellow-800">Pending</p>
                    <p className="text-2xl font-semibold text-yellow-900">{summary.counts.pending}</p>
                    <p className="text-xs text-yellow-600">{formatCurrency(summary.totals.pending)}</p>
                  </div>
                </div>
              </div>

              {/* Approved */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-800">Approved</p>
                    <p className="text-2xl font-semibold text-green-900">{summary.counts.approved}</p>
                    <p className="text-xs text-green-600">{formatCurrency(summary.totals.approved)}</p>
                  </div>
                </div>
              </div>

              {/* Rejected */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-red-800">Rejected</p>
                    <p className="text-2xl font-semibold text-red-900">{summary.counts.rejected}</p>
                  </div>
                </div>
              </div>

              {/* Reimbursed */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-800">Reimbursed</p>
                    <p className="text-2xl font-semibold text-blue-900">{summary.counts.reimbursed}</p>
                    <p className="text-xs text-blue-600">{formatCurrency(summary.totals.reimbursed)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Pending Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Pending Approvals</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Expenses waiting for your review
                    </p>
                  </div>
                  {summary.counts.pending > 5 && (
                    <Link
                      href="/expenses/list?all=true&status=PENDING"
                      className="text-sm text-green-600 hover:text-green-700 font-medium"
                    >
                      View all ({summary.counts.pending})
                    </Link>
                  )}
                </div>
              </div>

              <div className="p-4">
                {summary.recentPending.length > 0 ? (
                  <ExpenseList
                    expenses={summary.recentPending}
                    showUser={true}
                    emptyMessage="No pending expenses"
                  />
                ) : (
                  <div className="text-center py-8">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">All caught up!</h3>
                    <p className="mt-1 text-sm text-gray-500">No expenses pending approval.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/expenses/list?all=true&status=PENDING"
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow flex items-center"
              >
                <div className="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Review Pending</p>
                  <p className="text-xs text-gray-500">View all pending expenses</p>
                </div>
              </Link>

              <Link
                href="/expenses/list?all=true&status=APPROVED"
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow flex items-center"
              >
                <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Process Payments</p>
                  <p className="text-xs text-gray-500">Mark approved as reimbursed</p>
                </div>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
