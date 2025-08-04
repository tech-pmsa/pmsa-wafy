// app/admins/officer/officer-dashboard/page.tsx
'use client'

import React from 'react'
import ClassAttendanceTabs from '@/components/ClassAttendanceTabs'
import FeeTable from '@/components/FeeTable'
import ApprovedAchievements from '@/components/ApprovedAchievements'

const Officer = () => {
  return (
    <div className="p-4">
      <ClassAttendanceTabs />
      <FeeTable />
      <ApprovedAchievements/>
    </div>
  )
}

export default Officer
