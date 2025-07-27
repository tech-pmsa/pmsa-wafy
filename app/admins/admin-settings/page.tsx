'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import AddStudents from '@/components/AddStudents'
import ClassCouncil from '@/components/ClassCouncil'
import StudentDetails from '@/components/StudentDetails'
import AddBulkStudents from '@/components/AddBulkStudents'
import Notifications from '@/components/Notifications'
import AddAdmin from '@/components/AddAdmin'

export default function AdminSettingsPage() {
  const supabase = createClientComponentClient()

  const [user, setUser] = useState<{ name: string; role: string } | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('uid', user.id)
        .single()

      if (!profile) {
        const { data: student } = await supabase
          .from('students')
          .select('name, role')
          .eq('uid', user.id)
          .single()
        if (student) setUser(student)
      } else {
        setUser(profile)
      }
    }

    fetchUser()
  }, [supabase])

  if (!user) return <p className="text-center mt-10">Loading...</p>

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Card 1: User Info */}
      <div className="bg-white shadow-md rounded p-4 text-center">
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-gray-700 mt-2">
          Logged in as: <span className="font-bold capitalize">{user.role}</span> - {user.name}
        </p>
      </div>

      {/* Card 2: Role-based Components */}
      <div className="bg-white shadow-md rounded p-4">
        {user.role === 'officer' && <AddStudents />}
        {user.role === 'class' && <ClassCouncil />}
        {user.role === 'class-leader' && <StudentDetails />}
      </div>

      {/* Card 3: Role-based Components */}
      {(user.role === 'officer' || user.role === 'class') && (
        <div className="bg-white shadow-md rounded p-4">
          {user.role === 'officer' && <AddBulkStudents />}
          {user.role === 'class' && <Notifications />}
        </div>
      )}

      {/* Card 4: Officer Only */}
      {user.role === 'officer' && (
        <div className="bg-white shadow-md rounded p-4">
          <AddAdmin />
        </div>
      )}
    </div>
  )
}
