'use client'

import React from 'react'
import StudentAttendanceCard from '@/components/StudentAttendanceCard'
import FeeTable from '@/components/FeeTable'

const Student = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Attendance</h1>
      <StudentAttendanceCard />
      <FeeTable />
    </div>
  )
}

export default Student
