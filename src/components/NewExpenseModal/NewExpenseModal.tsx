'use client'

import { useRouter } from 'next/navigation'
import { Modal } from '@/components/Modal'
import { ExpenseForm } from '@/components/ExpenseForm'

interface NewExpenseModalProps {
  basePath: string
}

export function NewExpenseModal({ basePath }: NewExpenseModalProps) {
  const router = useRouter()

  const handleClose = () => {
    router.replace(basePath)
  }

  const handleSuccess = () => {
    router.replace(basePath)
    router.refresh()
  }

  return (
    <Modal onClose={handleClose}>
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">New Expense</h2>
        <p className="text-sm text-gray-600 mb-6">
          Submit a new expense for reimbursement
        </p>
        <ExpenseForm onSuccess={handleSuccess} />
      </div>
    </Modal>
  )
}
