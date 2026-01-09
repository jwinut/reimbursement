'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Role, SummaryTriggerType, ExpenseStatus } from '@prisma/client'
import { Navigation } from '@/components/Navigation'

interface ExpenseSnapshot {
  id: string
  description: string
  amount: number
  date: string
  status: ExpenseStatus
}

interface SummaryDetail {
  id: string
  userId: string
  userName: string | null
  userPictureUrl: string | null
  startDate: string
  endDate: string
  totalAmount: string
  expenseCount: number
  expenses: ExpenseSnapshot[]
  triggerType: SummaryTriggerType
  createdAt: string
}

const TRIGGER_TYPE_LABELS: Record<SummaryTriggerType, string> = {
  MANUAL: 'สร้างด้วยตนเอง',
  SUBMISSION: 'สร้างจากการส่ง',
  SCHEDULED: 'สร้างอัตโนมัติ',
}

const TRIGGER_TYPE_COLORS: Record<SummaryTriggerType, string> = {
  MANUAL: 'bg-blue-100 text-blue-800',
  SUBMISSION: 'bg-green-100 text-green-800',
  SCHEDULED: 'bg-purple-100 text-purple-800',
}

const STATUS_LABELS: Record<ExpenseStatus, string> = {
  PENDING: 'รอดำเนินการ',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ปฏิเสธ',
  REIMBURSED: 'เบิกจ่ายแล้ว',
}

const STATUS_COLORS: Record<ExpenseStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  REIMBURSED: 'bg-blue-100 text-blue-800',
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const startStr = start.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
  })
  const endStr = end.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return `${startStr} - ${endStr}`
}

function SummaryDetailContent() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const summaryId = params.id as string

  const [summary, setSummary] = useState<SummaryDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    if (!summaryId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/summaries/${summaryId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('ไม่พบสรุปรายจ่าย')
        }
        throw new Error('ไม่สามารถโหลดข้อมูลได้')
      }
      const data = await response.json()
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setIsLoading(false)
    }
  }, [summaryId])

  useEffect(() => {
    if (sessionStatus === 'loading') return

    if (sessionStatus === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (session?.user?.role !== Role.MANAGER) {
      router.push('/expenses/list')
      return
    }

    fetchSummary()
  }, [sessionStatus, session, router, fetchSummary])

  if (sessionStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 mb-4">{error}</p>
            <Link
              href="/manager/summaries"
              className="inline-flex items-center text-green-600 hover:text-green-700"
            >
              ← กลับไปยังรายการสรุป
            </Link>
          </div>
        </main>
      </div>
    )
  }

  if (!summary) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/manager/summaries"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            กลับไปยังรายการสรุป
          </Link>
        </div>

        {/* Summary Header Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              {summary.userPictureUrl ? (
                <img
                  src={summary.userPictureUrl}
                  alt={summary.userName || 'User'}
                  className="h-16 w-16 rounded-full"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-xl">
                    {summary.userName?.charAt(0) || '?'}
                  </span>
                </div>
              )}
              <div className="ml-4">
                <h1 className="text-xl font-bold text-gray-900">
                  {summary.userName || 'Unknown'}
                </h1>
                <p className="text-sm text-gray-500">
                  {formatDateRange(summary.startDate, summary.endDate)}
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${TRIGGER_TYPE_COLORS[summary.triggerType]}`}>
              {TRIGGER_TYPE_LABELS[summary.triggerType]}
            </span>
          </div>

          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">จำนวนรายการ</p>
              <p className="text-2xl font-bold text-gray-900">{summary.expenseCount}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">ยอดรวม</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(parseFloat(summary.totalAmount))}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 col-span-2 sm:col-span-1">
              <p className="text-sm text-gray-500">วันที่สร้าง</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatDate(summary.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">รายการค่าใช้จ่าย</h2>
          </div>

          {summary.expenses.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              ไม่มีรายการค่าใช้จ่าย
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        รายละเอียด
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        วันที่
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        จำนวนเงิน
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summary.expenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {expense.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(expense.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[expense.status]}`}>
                            {STATUS_LABELS[expense.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(expense.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden divide-y divide-gray-200">
                {summary.expenses.map((expense) => (
                  <div key={expense.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {expense.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(expense.date)}
                        </p>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(expense.amount)}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${STATUS_COLORS[expense.status]}`}>
                          {STATUS_LABELS[expense.status]}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
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

export default function SummaryDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SummaryDetailContent />
    </Suspense>
  )
}
