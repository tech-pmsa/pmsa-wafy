'use client'

import React from 'react'
import { useUserData } from '@/hooks/useUserData'

// Import the dedicated components
import ClassAttendanceDashboard from '@/components/admin/ClassAttendanceDashboard'
import FeeManagementDashboard from '@/components/FeeManagementDashboard'
import AchievementViewer from '@/components/admin/AchievementViewer'

const ClassroomDashboardPage = () => {
  const { details } = useUserData();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold font-heading">
          {details?.designation || 'Class'} Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome, {details?.name}. Here is an overview of your class.
        </p>
      </div>

      {/* Main Dashboard Components */}
      <div className="space-y-8">
        <ClassAttendanceDashboard />
        <FeeManagementDashboard />
        <AchievementViewer />
      </div>
    </div>
  )
}

export default ClassroomDashboardPage;