'use client'

import { ExpenseStatus } from '@prisma/client'
import { StatusBadge } from '@/components/StatusBadge'
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

export interface ExpenseCardData {
  id: string
  description: string
  amount: number
  date: string
  imageUrl: string | null
  status: ExpenseStatus
  createdAt: string
  user?: ExpenseUser
  approver?: ExpenseApprover | null
  rejectionReason?: string | null
  approvalDate?: string | null
}

interface ExpenseCardProps {
  expense: ExpenseCardData
  showUser?: boolean
  onClick?: (() => void) | undefined
}

export function ExpenseCard({ expense, showUser = false, onClick }: ExpenseCardProps) {
  const formattedDate = new Date(expense.date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const formattedAmount = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(expense.amount)

  const CardContent = (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {expense.description}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{formattedDate}</p>
        </div>
        <StatusBadge status={expense.status} className="ml-2 flex-shrink-0" />
      </div>

      <div className="flex justify-between items-center">
        <span className="text-lg font-semibold text-gray-900">{formattedAmount}</span>
        {expense.imageUrl && (
          <span className="text-xs text-gray-400">
            <svg
              className="w-4 h-4 inline"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </span>
        )}
      </div>

      {showUser && expense.user && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center">
            {expense.user.pictureUrl ? (
              <img
                src={expense.user.pictureUrl}
                alt={expense.user.displayName || 'User'}
                className="w-5 h-5 rounded-full mr-2"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-300 mr-2" />
            )}
            <span className="text-xs text-gray-600">{expense.user.displayName || 'Unknown'}</span>
          </div>
        </div>
      )}

      {expense.status === ExpenseStatus.REJECTED && expense.rejectionReason && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-red-600">
            <span className="font-medium">Reason:</span> {expense.rejectionReason}
          </p>
        </div>
      )}

      {expense.status === ExpenseStatus.APPROVED && expense.approver && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-green-600">
            <span className="font-medium">Approved by:</span> {expense.approver.displayName || 'Manager'}
          </p>
        </div>
      )}
    </div>
  )

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left">
        {CardContent}
      </button>
    )
  }

  return (
    <Link href={`/expenses/${expense.id}`} className="block">
      {CardContent}
    </Link>
  )
}
