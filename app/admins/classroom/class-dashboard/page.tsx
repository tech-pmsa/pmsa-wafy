// app/admins/officer/officer-dashboard/page.tsx
'use client'
import React from 'react'
import FeeTable from '@/components/FeeTable'
import ClassStudentPresent from '@/components/ClassStudentPresent'
import ApprovedAchievements from '@/components/ApprovedAchievements'

const Class = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Class Dashboard</h1>
      <ClassStudentPresent/>
      <FeeTable/>
      <ApprovedAchievements/>
    </div>
  )
}

export default Class
