'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export function useRoleRedirect(requiredRole: string) {
  const router = useRouter()

  useEffect(() => {
    const checkRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const uid = session.user.id
      let role: string | null = null

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('uid', uid)
        .single()

      if (profile) {
        role = profile.role
      } else {
        const { data: studentProfile } = await supabase
          .from('students')
          .select('role')
          .eq('uid', uid)
          .single()

        if (studentProfile) {
          role = studentProfile.role
        }
      }

      if (role !== requiredRole) {
        router.push('/unauthorized')
      }
    }

    checkRole()
  }, [requiredRole, router])
}
