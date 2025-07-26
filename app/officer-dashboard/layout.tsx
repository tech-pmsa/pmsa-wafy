// app/(officer)/layout.tsx
import React from 'react'
import WithNavbarLayout from '@/components/WithNavbarLayout'

export default function OfficerLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WithNavbarLayout>{children}</WithNavbarLayout>
      </body>
    </html>
  )
}
