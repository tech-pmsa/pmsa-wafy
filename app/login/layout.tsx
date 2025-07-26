// app/(auth)/layout.tsx
import React from 'react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="bg-primary-grey min-h-screen flex items-center font-body justify-center">
        {children}
      </div>
    </div>
  )
}
