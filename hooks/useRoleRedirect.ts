// hooks/useRoleRedirect.ts
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

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('uid', session.user.id)
        .single()

      if (error || !profile || profile.role !== requiredRole) {
        router.push('/unauthorized')
      }
    }

    checkRole()
  }, [requiredRole, router])
}
