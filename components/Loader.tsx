// components/Loader.tsx
'use client'

import React from 'react'

export default function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-grey text-dark-green">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-16 h-16 border-4 border-dark-green border-t-transparent rounded-full animate-spin"></div>
        <p className="text-lg font-semibold">Loading College Portal...</p>
      </div>
    </div>
  )
}
