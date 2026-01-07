'use client'

import { useRouter } from 'next/navigation'
import { Modal } from '@/components/Modal'
import { ExpenseForm } from '@/components/ExpenseForm'

export default function NewExpenseModal() {
  const router = useRouter()

  const handleSuccess = () => {
    router.back()
    // Trigger a refresh of the expense list
    router.refresh()
  }

  return (
    <Modal>
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
