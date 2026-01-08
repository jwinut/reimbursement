'use client'

import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function PendingApprovalPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    // If user is approved, redirect to home
    if (status === 'authenticated' && session?.user?.isApproved) {
      router.push('/')
    }
  }, [status, session, router])

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Clock icon */}
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            รอการอนุมัติ
          </h1>

          <p className="text-gray-600 mb-6">
            บัญชีของคุณกำลังรอการอนุมัติจากผู้จัดการ
            <br />
            กรุณารอสักครู่
          </p>

          {session?.user && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-3">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div className="text-left">
                  <p className="font-medium text-gray-900">{session.user.name}</p>
                  <p className="text-sm text-gray-500">LINE Account</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>

        <p className="text-sm text-gray-500">
          หากมีคำถาม กรุณาติดต่อผู้จัดการของคุณ
        </p>
      </div>
    </div>
  )
}
