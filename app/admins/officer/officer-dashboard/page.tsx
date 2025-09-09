'use client' // <--- THIS IS THE FIX

import React from 'react'
import { useUserData } from '@/hooks/useUserData'

import CollegeAttendanceOverview from '@/components/admin/CollegeAttendanceOverview'
import FeeManagementDashboard from '@/components/FeeManagementDashboard'
import AchievementViewer from '@/components/admin/AchievementViewer'

const OfficerDashboardPage = () => {
  const { details } = useUserData();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold font-heading">
          Welcome, {details?.name || 'Officer'}
        </h1>
        <p className="text-muted-foreground">
          Here is the high-level overview of the college's status.
        </p>
      </div>

      <div className="space-y-8">
        <CollegeAttendanceOverview />
        <FeeManagementDashboard />
        <AchievementViewer />
      </div>
    </div>
  )
}

export default OfficerDashboardPage