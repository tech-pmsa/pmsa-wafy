'use client'

import React from 'react'
import { useUserData } from '@/hooks/useUserData'
import AttendanceForm from '@/components/AttendanceForm'

const ClassLeaderDashboardPage = () => {
  const { details } = useUserData();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold font-heading">
          Attendance Portal
        </h1>
        <p className="text-muted-foreground">
          Welcome, {details?.name}. Please mark the attendance for your class: {details?.designation}.
        </p>
      </div>

      <AttendanceForm />
    </div>
  )
}

export default ClassLeaderDashboardPage;