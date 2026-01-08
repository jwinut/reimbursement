import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'

export default async function NewExpensePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Redirect to appropriate dashboard with modal trigger
  if (session.user.role === Role.MANAGER) {
    redirect('/manager/dashboard?new=true')
  } else {
    redirect('/expenses/list?new=true')
  }
}
