'use client'

import { Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { ExpenseStatus } from '@prisma/client'
import { Navigation } from '@/components/Navigation'
import { ExpenseList, ExpenseCardData } from '@/components/ExpenseList'
import { NewExpenseModal } from '@/components/NewExpenseModal'
import { StatusTabs } from '@/components/StatusTabs'
import Link from 'next/link'

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ExpenseResponse {
  expenses: ExpenseCardData[]
  pagination: Pagination
}

function ExpenseListContent() {
  const { status: sessionStatus } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const showNewModal = searchParams.get('new') === 'true'

  const [expenses, setExpenses] = useState<ExpenseCardData[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | ''>(() => {
    const param = searchParams.get('status')
    return param && Object.values(ExpenseStatus).includes(param as ExpenseStatus)
      ? (param as ExpenseStatus)
      : ''
  })

  const currentPage = parseInt(searchParams.get('page') || '1', 10)

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', currentPage.toString())
      params.set('limit', '20')
      if (statusFilter) {
        params.set('status', statusFilter)
      }

      const response = await fetch(`/api/expenses?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch expenses')
      }

      const data: ExpenseResponse = await response.json()
      setExpenses(data.expenses)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, statusFilter])

  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (sessionStatus === 'unauthenticated') {
      router.push('/login')
      return
    }
    fetchExpenses()
  }, [sessionStatus, router, fetchExpenses])

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`/expenses/list?${params.toString()}`)
  }

  const handleStatusFilterChange = (status: ExpenseStatus | '') => {
    setStatusFilter(status)
    const params = new URLSearchParams()
    if (status) {
      params.set('status', status)
    }
    params.set('page', '1')
    router.push(`/expenses/list?${params.toString()}`)
  }

  if (sessionStatus === 'loading') {
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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">ค่าใช้จ่ายของฉัน</h1>
          <Link
            href="/expenses/new"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            สร้างรายการใหม่
          </Link>
        </div>

        {/* Status Filter Tabs */}
        <StatusTabs
          value={statusFilter}
          onChange={(value) => handleStatusFilterChange(value as ExpenseStatus | '')}
          options={[
            { value: '', label: 'ทั้งหมด' },
            ...Object.values(ExpenseStatus).map((status) => ({
              value: status,
              label: {
                PENDING: 'รอดำเนินการ',
                APPROVED: 'อนุมัติแล้ว',
                REJECTED: 'ปฏิเสธแล้ว',
                REIMBURSED: 'เบิกจ่ายแล้ว',
              }[status] || status.charAt(0) + status.slice(1).toLowerCase(),
            })),
          ]}
        />

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
                  onClick={fetchExpenses}
                  className="mt-2 text-sm text-red-600 underline hover:text-red-500"
                >
                  ลองอีกครั้ง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expense list */}
        <ExpenseList
          expenses={expenses}
          pagination={pagination || undefined}
          isLoading={isLoading}
          onPageChange={handlePageChange}
          emptyMessage={
            statusFilter
              ? `No ${statusFilter.toLowerCase()} expenses found`
              : 'No expenses found'
          }
        />
      </main>

      {showNewModal && <NewExpenseModal basePath="/expenses/list" />}
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>
  )
}

export default function ExpenseListPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ExpenseListContent />
    </Suspense>
  )
}
