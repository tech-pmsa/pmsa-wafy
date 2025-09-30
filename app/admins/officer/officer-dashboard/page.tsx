// app/admins/officer/officer-dashboard/page.tsx
'use client'

import React from 'react'
import { useUserData } from '@/hooks/useUserData'
import { Skeleton } from '@/components/ui/skeleton'

// Import the redesigned dashboard components
import CollegeAttendanceOverview from '@/components/admin/CollegeAttendanceOverview'
import FeeManagementDashboard from '@/components/FeeManagementDashboard'
import AchievementViewer from '@/components/admin/AchievementViewer'

const OfficerDashboardPage = () => {
  const { details, loading } = useUserData();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-heading">
          Welcome, {details?.name || 'Officer'}
        </h1>
        <p className="text-muted-foreground">
          Here is the high-level overview of the college's status.
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

export default OfficerDashboardPage