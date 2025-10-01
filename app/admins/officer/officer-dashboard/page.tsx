// app/admins/officer/officer-dashboard/page.tsx
'use client'

import React from 'react'
import { useUserData } from '@/hooks/useUserData'
import { Skeleton } from '@/components/ui/skeleton'

// Import the redesigned dashboard components
import CollegeAttendanceOverview from '@/components/admin/CollegeAttendanceOverview'
import FeeManagementDashboard from '@/components/FeeManagementDashboard'
import AchievementViewer from '@/components/admin/AchievementViewer'

export default function OfficerDashboardPage() {
  const { details, loading } = useUserData();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-heading">
          Welcome, {details?.name || 'Officer'}
        </h1>
        <p className="text-muted-foreground">
          Here is a high-level overview of the college's current status.
        </p>
      </div>

      {/* A responsive grid for the main dashboard widgets */}
      <div className="space-y-8">
        <CollegeAttendanceOverview />
        <FeeManagementDashboard />
        <AchievementViewer />
      </div>
    </div>
  )
}