'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface RoleData {
  loading: boolean
  role: string | null
  cic?: string
  classId?: string
  batch?: string
}

export function useUserRoleData(): RoleData {
  const [data, setData] = useState<RoleData>({
    loading: true,
    role: null,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session) {
          setData({ loading: false, role: null })
          return
        }

        const uid = session.user.id

        // Try profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, designation, batch')
          .eq('uid', uid)
          .single()

        if (profile && !profileError) {
          setData({
            loading: false,
            role: profile.role,
            classId: profile.designation || undefined,
            batch: profile.batch || undefined,
          })
          return
        }

        // Try students table
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('role, cic, class_id, batch')
          .eq('uid', uid)
          .single()

        if (student && !studentError) {
          setData({
            loading: false,
            role: student.role,
            cic: student.cic,
            classId: student.class_id,
            batch: student.batch,
          })
          return
        }

        // No role found
        setData({ loading: false, role: null })
      } catch (err) {
        console.error('Error fetching user role data:', err)
        setData({ loading: false, role: null })
      }
    }

    fetchData()
  }, [])

  return data
}
