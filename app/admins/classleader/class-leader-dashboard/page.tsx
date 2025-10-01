// app/admins/classleader/class-leader-dashboard/page.tsx
'use client'

import React from 'react'
import { useUserData } from '@/hooks/useUserData'
import { Skeleton } from '@/components/ui/skeleton'
import AttendanceForm from '@/components/AttendanceForm' // The redesigned form

export default function ClassLeaderDashboardPage() {
  const { details, loading } = useUserData();

  if (loading) {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-5 w-80" />
            </div>
            <Skeleton className="h-[600px] w-full" />
        </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-heading">
          Attendance Portal
        </h1>
        <p className="text-muted-foreground">
          Welcome, {details?.name}. Please mark today's attendance for your class: {details?.designation}.
        </p>
      </div>

      <AttendanceForm />
    </div>
  )
}