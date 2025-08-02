// app/admins/officer/officer-dashboard/page.tsx
'use client'
import React from 'react'
import FeeTable from '@/components/FeeTable'
import ClassStudentPresent from '@/components/ClassStudentPresent'

const Class = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Class Dashboard</h1>
      <ClassStudentPresent/>
      <FeeTable/>
    </div>
  )
}

export default Class
