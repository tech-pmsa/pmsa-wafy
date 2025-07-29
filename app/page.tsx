'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Loader from '@/components/Loader'

export default function Home() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const redirectUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      const uid = session.user.id

      // 1. Try to get role from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('uid', uid)
        .single()

      if (profile && profile.role) {
        switch (profile.role) {
          case 'officer':
            router.replace('/admins/officer/officer-dashboard')
            break
          case 'class':
            router.replace('/admins/classroom/class-dashboard')
            break
          case 'class-leader':
            router.replace('/admins/classleader/class-leader-dashboard')
            break
          default:
            router.replace('/unauthorized')
        }
      } else {
        // 2. Try to get role from students table
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('role')
          .eq('uid', uid)
          .single()

        if (student && student.role === 'student') {
          router.replace('/students/student-dashboard')
        } else {
          router.replace('/unauthorized')
        }
      }
    }

    redirectUser().finally(() => setLoading(false))
  }, [router, supabase])

  if (loading) return <div className="text-center mt-10 text-lg"><Loader /></div>

  return null
}
