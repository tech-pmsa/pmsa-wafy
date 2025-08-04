// app/(officer)/layout.tsx
import React from 'react'
import WithNavbarLayout from '@/components/WithNavbarLayout'
import { Toaster } from '@/components/ui/sonner'

export default function OfficerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div>
        <WithNavbarLayout>
          {children}
          <Toaster richColors position="top-right" />
        </WithNavbarLayout>
      </div>
    </div>
  )
}
