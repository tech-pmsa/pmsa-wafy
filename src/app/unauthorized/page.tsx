// app/unauthorized/page.tsx
'use client'

import { useRouter } from 'next/navigation'

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-yellow-50 text-yellow-800 px-4 text-center">
      <h1 className="text-3xl font-bold mb-2">🚫 Unauthorized Access</h1>
      <p className="mb-4 text-sm">
        You don’t have permission to view this page. Please check your role or login with the appropriate account.
      </p>
      <button
        onClick={() => router.push('/')}
        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition"
      >
        Go Back to Home
      </button>
    </div>
  )
}
