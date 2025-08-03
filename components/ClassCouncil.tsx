'use client'

import { useState, useEffect } from 'react'
import { useUserRoleData } from '@/hooks/useUserRoleData'
import { supabase } from '@/lib/supabaseClient'
import { Pencil } from 'lucide-react'

export default function ClassCouncil() {
  const { uid } = useUserRoleData()
  const [council, setCouncil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)

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

    if (!error) {
      alert('Saved successfully')
      setEditMode(false)
    }
  }

  if (loading) return <p>Loading class council...</p>
  if (!council) return <p>No class council data available.</p>

  const fields = [
    'batch',
    'president',
    'secretary',
    'treasurer',
    'auditor',
    'vicepresident',
    'jointsecretary',
    'pro',
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Class Council</h2>
        {!editMode && (
          <button
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
            onClick={() => setEditMode(true)}
          >
            <Pencil size={18} /> Edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field}>
            <label className="text-gray-600 capitalize block mb-1">
              {field.replace(/([A-Z])/g, ' $1')}
            </label>
            {editMode ? (
              <input
                name={field}
                value={council?.[field] || ''}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            ) : (
              <p className="p-2 bg-gray-100 rounded">
                {council?.[field] || '—'}
              </p>
            )}
          </div>
        ))}
      </div>

      {editMode && (
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Save
          </button>
          <button
            onClick={() => setEditMode(false)}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
