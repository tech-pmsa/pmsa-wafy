'use client'

import { useState, useEffect } from 'react'
import { useUserRoleData } from '@/hooks/useUserRoleData'
import { supabase } from '@/lib/supabaseClient'

export default function ClassCouncil() {
  const { uid } = useUserRoleData()
  const [council, setCouncil] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCouncil = async () => {
      const { data, error } = await supabase
        .from('class_council')
        .select('*')
        .eq('uid', uid)
        .single()

      if (!error) setCouncil(data)
      setLoading(false)
    }

    if (uid) fetchCouncil()
  }, [uid])

  const handleChange = (e: any) => {
    setCouncil({ ...council, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    const { error } = await supabase
      .from('class_council')
      .upsert([{ ...council, uid }])

    if (!error) alert('Saved successfully')
  }

  if (loading) return <p>Loading class council...</p>

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Class Council</h2>
      {[
        'batch',
        'president',
        'secretary',
        'treasurer',
        'auditor',
        'vicepresident',
        'jointsecretary',
        'pro',
      ].map((field) => (
        <input
          key={field}
          name={field}
          value={council?.[field] || ''}
          onChange={handleChange}
          placeholder={field}
          className="w-full p-2 border rounded"
        />
      ))}
      <button
        onClick={handleSubmit}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Save
      </button>
    </div>
  )
}
