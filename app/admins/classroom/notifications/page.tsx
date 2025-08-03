'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserRoleData } from '@/hooks/useUserRoleData'

export default function FullNotificationsPage() {
  const { batch } = useUserRoleData()
  const [achievements, setAchievements] = useState<any[]>([])

  useEffect(() => {
    const fetchAchievements = async () => {
      const { data } = await supabase
        .from('achievements')
        .select('*')
        .eq('batch', batch)
        .eq('approved', false)
        .order('submitted_at', { ascending: false })

      setAchievements(data || [])
    }

    if (batch) fetchAchievements()
  }, [batch])

  const handleApprove = async (id: number) => {
    const confirmed = window.confirm('Are you sure you want to approve this achievement?')
    if (!confirmed) return

    const { error } = await supabase
      .from('achievements')
      .update({ approved: true })
      .eq('id', id)

    if (!error) {
      setAchievements((prev) => prev.filter((a) => a.id !== id))
    } else {
      alert('Failed to approve. Try again.')
    }
  }

  const handleDecline = async (id: number) => {
    const confirmed = window.confirm('Are you sure you want to decline (delete) this achievement?')
    if (!confirmed) return

    const { error } = await supabase
      .from('achievements')
      .delete()
      .eq('id', id)

    if (!error) {
      setAchievements((prev) => prev.filter((a) => a.id !== id))
    } else {
      alert('Failed to decline. Try again.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 px-4">
      <h1 className="text-2xl font-bold mb-4">All Notifications</h1>
      {achievements.length === 0 && <p>No pending achievements.</p>}
      {achievements.map((ach) => (
        <div
          key={ach.id}
          className="p-4 border rounded mb-4 bg-white shadow-sm space-y-1"
        >
          <div className="font-semibold">{ach.title}</div>
          <div className="text-sm text-gray-700">{ach.description}</div>
          <div className="text-xs text-gray-500">
            Submitted by {ach.name} ({ach.cic})
          </div>
          {ach.proof_url && (
            <a
              href={ach.proof_url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 text-sm underline"
            >
              View Proof
            </a>
          )}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleApprove(ach.id)}
              className="px-4 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Approve
            </button>
            <button
              onClick={() => handleDecline(ach.id)}
              className="px-4 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
