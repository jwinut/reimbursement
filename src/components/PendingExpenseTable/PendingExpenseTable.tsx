'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExpenseCardData } from '@/components/ExpenseList'

interface PendingExpenseTableProps {
  expenses: ExpenseCardData[]
  onApproveSelected: (ids: string[]) => Promise<void>
  isApproving: boolean
}

export function PendingExpenseTable({
  expenses,
  onApproveSelected,
  isApproving,
}: PendingExpenseTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const allSelected = expenses.length > 0 && selected.size === expenses.length
  const someSelected = selected.size > 0 && selected.size < expenses.length

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(expenses.map((e) => e.id)))
    }
  }

  const toggleOne = (id: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  const handleApprove = async () => {
    await onApproveSelected(Array.from(selected))
    setSelected(new Set())
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
    })
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('th-TH').format(amount)
  }

  if (expenses.length === 0) {
    return (
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
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected
            }}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          Select all ({expenses.length})
        </label>
        {selected.size > 0 && (
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isApproving ? 'Approving...' : `Approve (${selected.size})`}
          </button>
        )}
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
          >
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={selected.has(expense.id)}
              onChange={() => toggleOne(expense.id)}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 flex-shrink-0"
            />

            {/* User avatar */}
            {expense.user?.pictureUrl ? (
              <img
                src={expense.user.pictureUrl}
                alt=""
                className="w-6 h-6 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-300 flex-shrink-0" />
            )}

            {/* User name */}
            <span className="text-sm text-gray-600 w-16 truncate flex-shrink-0">
              {expense.user?.displayName || 'Unknown'}
            </span>

            {/* Description - clickable link */}
            <Link
              href={`/expenses/${expense.id}`}
              className="flex-1 text-sm text-gray-900 truncate hover:text-green-600"
            >
              {expense.description}
            </Link>

            {/* Amount */}
            <span className="text-sm font-medium text-gray-900 flex-shrink-0">
              ฿{formatAmount(expense.amount)}
            </span>

            {/* Date */}
            <span className="text-xs text-gray-400 w-14 text-right flex-shrink-0">
              {formatDate(expense.date)}
            </span>

            {/* Arrow link */}
            <Link
              href={`/expenses/${expense.id}`}
              className="text-gray-400 hover:text-green-600 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
