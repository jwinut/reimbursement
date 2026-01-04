import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { ExpenseForm } from '@/components/ExpenseForm'

export default async function NewExpensePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">New Expense</h1>
          <p className="mt-1 text-sm text-gray-600">
            Submit a new expense for reimbursement
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <ExpenseForm />
        </div>
      </div>
    </div>
  )
}
