'use client'

import React from 'react'
import StudentAttendanceCard from '@/components/StudentAttendanceCard'
import FeeTable from '@/components/FeeTable'
import AchievementsForm from '@/components/AchievementsForm'
import ApprovedAchievements from '@/components/ApprovedAchievements'

const Student = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Attendance</h1>
      <div className='flex flex-col md:flex-row gap-4'>
      <StudentAttendanceCard />
      <AchievementsForm/>
      </div>
      <FeeTable />
      <ApprovedAchievements/>
    </div>
  )
}

export default Student
