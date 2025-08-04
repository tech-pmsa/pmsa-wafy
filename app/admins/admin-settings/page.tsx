'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import AddStudents from '@/components/AddStudents'
import ClassCouncil from '@/components/ClassCouncil'
import AddBulkStudents from '@/components/AddBulkStudents'
import AddAdmin from '@/components/AddAdmin'
import ProfileSection from '@/components/ProfileSection'

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
    <div className="max-w-[95dvw] mx-auto p-6 flex flex-col gap-4">
      {/* Card 1: User Info */}
      <div className=''>
        <h2 className="text-xl font-semibold p-5">Settings</h2>
        <div className="bg-white shadow-md rounded p-4 w-full">
          <ProfileSection />
        </div>
      </div>
        {/* Card 2: Role-based Components */}
        {(user.role === 'officer' || user.role === 'class') && (
          <div className="bg-white shadow-md rounded p-4">
            {user.role === 'officer' && <AddStudents />}
            {user.role === 'class' && <ClassCouncil />}
          </div>
        )}

        {/* Card 3: Role-based Components */}
        {(user.role === 'officer') && (
          <div className="bg-white shadow-md rounded p-4">
            {user.role === 'officer' && <AddBulkStudents />}
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
