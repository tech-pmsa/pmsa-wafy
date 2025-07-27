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
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        // Not logged in → go to login
        router.replace('/login')
        return
      }

      // Fetch user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('uid', session.user.id)
        .single()

      if (!profile) {
        router.replace('/unauthorized')
        return
      }

      // Redirect based on role
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
        case 'student':
          router.replace('students/student-dashboard')
          break
        default:
          router.replace('/unauthorized')
      }
    }

    redirectUser().finally(() => setLoading(false))
  }, [router, supabase])

  if (loading) return <div className="text-center mt-10 text-lg"><Loader/></div>

  return null
}
