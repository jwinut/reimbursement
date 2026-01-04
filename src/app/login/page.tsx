'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleLineLogin = async () => {
    setIsLoading(true)
    try {
      await signIn('line', { callbackUrl: '/expenses/new' })
    } catch (error) {
      console.error('Login failed:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Reimbursement
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to submit your expenses
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={handleLineLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#00B900] hover:bg-[#00a000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00B900] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </span>
            ) : (
              <>
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 5.82 2 10.5c0 3.78 3.4 6.96 8 7.91v2.39c0 .47.54.78.97.53l4.03-2.42c3.03-1.83 5-4.79 5-7.91C22 5.82 17.52 2 12 2z"/>
                </svg>
                Sign in with LINE
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-gray-500">
          By signing in, you agree to our terms of service
        </p>
      </div>
    </div>
  )
}
