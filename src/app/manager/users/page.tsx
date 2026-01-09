'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Role } from '@prisma/client'
import { Navigation } from '@/components/Navigation'

interface User {
  id: string
  lineId: string
  displayName: string | null
  pictureUrl: string | null
  role: Role
  isApproved: boolean
  createdAt: string
}

function UserManagementContent() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [csrfToken, setCsrfToken] = useState<string>('')
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)

  // Fetch CSRF token
  useEffect(() => {
    fetch('/api/csrf')
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.csrfToken))
      .catch(console.error)
  }, [])

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/users')
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await response.json()
      setUsers(data.users)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [])

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

    fetchUsers()
  }, [sessionStatus, session, router, fetchUsers])

  const handleApprove = async (userId: string) => {
    setProcessingUserId(userId)
    try {
      const response = await fetch(`/api/users/${userId}/approve`, {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfToken,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to approve user')
      }

      // Update local state
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, isApproved: true } : user
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve user')
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleDisable = async (userId: string) => {
    setProcessingUserId(userId)
    try {
      const response = await fetch(`/api/users/${userId}/disable`, {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfToken,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to disable user')
      }

      // Update local state
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, isApproved: false } : user
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable user')
    } finally {
      setProcessingUserId(null)
    }
  }

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  const pendingUsers = users.filter((u) => !u.isApproved)
  const approvedUsers = users.filter((u) => u.isApproved)

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้</h1>
          <p className="mt-1 text-sm text-gray-600">
            อนุมัติหรือปิดการใช้งานบัญชีผู้ใช้
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 underline hover:text-red-500"
            >
              ปิด
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pending Users Section */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2" />
                รอการอนุมัติ ({pendingUsers.length})
              </h2>
              {pendingUsers.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
                  ไม่มีผู้ใช้รอการอนุมัติ
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <ul className="divide-y divide-gray-200">
                    {pendingUsers.map((user) => (
                      <UserListItem
                        key={user.id}
                        user={user}
                        currentUserId={session?.user?.id}
                        isProcessing={processingUserId === user.id}
                        onApprove={() => handleApprove(user.id)}
                        onDisable={() => handleDisable(user.id)}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Approved Users Section */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                อนุมัติแล้ว ({approvedUsers.length})
              </h2>
              {approvedUsers.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
                  ยังไม่มีผู้ใช้ที่อนุมัติแล้ว
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <ul className="divide-y divide-gray-200">
                    {approvedUsers.map((user) => (
                      <UserListItem
                        key={user.id}
                        user={user}
                        currentUserId={session?.user?.id}
                        isProcessing={processingUserId === user.id}
                        onApprove={() => handleApprove(user.id)}
                        onDisable={() => handleDisable(user.id)}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

interface UserListItemProps {
  user: User
  currentUserId: string | undefined
  isProcessing: boolean
  onApprove: () => void
  onDisable: () => void
}

function UserListItem({
  user,
  currentUserId,
  isProcessing,
  onApprove,
  onDisable,
}: UserListItemProps) {
  const isCurrentUser = user.id === currentUserId
  const formattedDate = new Date(user.createdAt).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <li className="p-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center min-w-0 flex-1">
          {user.pictureUrl ? (
            <img
              src={user.pictureUrl}
              alt={user.displayName || 'User'}
              className="w-10 h-10 rounded-full flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-gray-500 text-sm">
                {user.displayName?.charAt(0) || '?'}
              </span>
            </div>
          )}
          <div className="ml-3 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.displayName || 'Unknown'}
              </p>
              {user.role === Role.MANAGER && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  ผู้จัดการ
                </span>
              )}
              {isCurrentUser && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  คุณ
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              เข้าร่วมเมื่อ {formattedDate}
            </p>
          </div>
        </div>

        <div className="ml-4 flex-shrink-0">
          {user.isApproved ? (
            <button
              onClick={onDisable}
              disabled={isProcessing || isCurrentUser}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? 'กำลังดำเนินการ...' : 'ปิดการใช้งาน'}
            </button>
          ) : (
            <button
              onClick={onApprove}
              disabled={isProcessing}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? 'กำลังดำเนินการ...' : 'อนุมัติ'}
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>
  )
}

export default function UserManagementPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UserManagementContent />
    </Suspense>
  )
}
