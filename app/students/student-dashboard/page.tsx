'use client'

import React from 'react'
import StudentAttendanceCard from '@/components/StudentAttendanceCard'
import FeeTable from '@/components/FeeTable'
import AchievementsForm from '@/components/AchievementsForm'

const Student = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Attendance</h1>
      <StudentAttendanceCard />
      <AchievementsForm/>
      <FeeTable />
    </div>
  )
}

export default Student
