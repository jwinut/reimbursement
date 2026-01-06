'use client'

import { ExpenseStatus } from '@prisma/client'

interface StatusBadgeProps {
  status: ExpenseStatus
  className?: string
}

const statusConfig: Record<ExpenseStatus, { label: string; className: string }> = {
  [ExpenseStatus.PENDING]: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  [ExpenseStatus.APPROVED]: {
    label: 'Approved',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  [ExpenseStatus.REJECTED]: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  [ExpenseStatus.REIMBURSED]: {
    label: 'Reimbursed',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}
    >
      {config.label}
    </span>
  )
}
