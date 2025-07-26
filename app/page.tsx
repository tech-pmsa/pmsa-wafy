'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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
        .eq('id', session.user.id)
        .single()

      if (!profile) {
        router.replace('/unauthorized')
        return
      }

      // Redirect based on role
      switch (profile.role) {
        case 'officer':
          router.replace('/dashboard')
          break
        case 'class':
          router.replace('/dashboard')
          break
        case 'class-leader':
          router.replace('/dashboard')
          break
        case 'student':
          router.replace('/dashboard')
          break
        default:
          router.replace('/unauthorized')
      }
    }

    redirectUser().finally(() => setLoading(false))
  }, [router, supabase])

  if (loading) return <div className="text-center mt-10 text-lg">🔄 Redirecting...</div>

  return null
}
