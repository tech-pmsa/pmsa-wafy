// app/admins/classroom/class-dashboard/page.tsx
'use client'

import React from 'react'
import { useUserData } from '@/hooks/useUserData'
import { Skeleton } from '@/components/ui/skeleton'

// Import the dashboard components
import ClassAttendanceDashboard from '@/components/admin/ClassAttendanceDashboard'
import FeeManagementDashboard from '@/components/FeeManagementDashboard'
import AchievementViewer from '@/components/admin/AchievementViewer'

export default function ClassroomDashboardPage() {
  const { details, loading } = useUserData();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-80" />
        </div>
        {/* Skeleton now reflects a single-column layout */}
        <div className="space-y-8">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-heading">
          {details?.designation || 'Class'} Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome, {details?.name}. Here is an overview of your class.
        </p>
      </div>
      <div className="space-y-8">
        <ClassAttendanceDashboard />
        <FeeManagementDashboard />
        <AchievementViewer />
      </div>
    </div>
  )
}