// app/(auth)/layout.tsx
import React from 'react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 min-h-screen flex items-center justify-center">
        {children}
      </body>
    </html>
  )
}
