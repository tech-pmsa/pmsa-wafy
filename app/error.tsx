// app/error.tsx
'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('App Error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center h-screen bg-red-50 text-red-800">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">⚠️ Something went wrong!</h2>
        <p className="mb-4">{error.message || 'Unexpected application error occurred.'}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
