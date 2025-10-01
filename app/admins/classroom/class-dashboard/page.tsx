// app/admins/classroom/class-dashboard/page.tsx
'use client'

import React from 'react'
import { useUserData } from '@/hooks/useUserData'
import { Skeleton } from '@/components/ui/skeleton'

// Import the redesigned dashboard components
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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

      {/* A responsive grid for the main dashboard widgets */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ClassAttendanceDashboard />
        </div>
        <div className="lg:col-span-2">
          <FeeManagementDashboard />
        </div>
        <div className="lg:col-span-5">
          <AchievementViewer />
        </div>
      </div>
    </div>
  )
}