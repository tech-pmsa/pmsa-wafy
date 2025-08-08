'use client'

import React from 'react'
import { useUserData } from '@/hooks/useUserData'
import AttendanceForm from '@/components/AttendanceForm' // The refactored component

const ClassLeaderDashboardPage = () => {
  const { details } = useUserData();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold font-heading">
          Attendance Portal
        </h1>
        <p className="text-muted-foreground">
          Welcome, {details?.name}. Please mark the attendance for your class: {details?.designation}.
        </p>
      </div>

      {/* The main attendance form is the only component needed here */}
      <AttendanceForm />
    </div>
  )
}

export default ClassLeaderDashboardPage;