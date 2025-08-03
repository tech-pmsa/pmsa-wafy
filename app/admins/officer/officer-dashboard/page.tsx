// app/admins/officer/officer-dashboard/page.tsx
'use client'

import React from 'react'
import ClassAttendanceTabs from '@/components/ClassAttendanceTabs'
import FeeTable from '@/components/FeeTable'
import ApprovedAchievements from '@/components/ApprovedAchievements'

const Officer = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Officer Dashboard</h1>
      <ClassAttendanceTabs />
      <FeeTable />
      <ApprovedAchievements/>
    </div>
  )
}

export default Officer
