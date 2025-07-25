// app/(auth)/layout.tsx
import React from 'react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="bg-gray-100 min-h-screen flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
