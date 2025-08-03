'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserRoleData } from '@/hooks/useUserRoleData'
import { Button } from '@/components/ui/button'

export default function ClassAchievementsList() {
  const { batch } = useUserRoleData()
  const [achievements, setAchievements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAchievements = async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('batch', batch)
        .order('submitted_at', { ascending: false })

      if (error) {
        console.error(error)
      } else {
        setAchievements(data)
      }

      setLoading(false)
    }

    if (batch) fetchAchievements()
  }, [batch])

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('achievements')
      .update({ approved: true })
      .eq('id', id)

    if (!error) {
      setAchievements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, approved: true } : a))
      )
    }
  }

  if (loading) return <p>Loading achievements...</p>

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Achievements from Students</h2>
      {achievements.length === 0 && <p>No achievements submitted yet.</p>}
      {achievements.map((ach) => (
        <div
          key={ach.id}
          className="p-4 border rounded space-y-1 bg-white shadow-sm"
        >
          <div className="font-semibold">{ach.title}</div>
          <div className="text-sm text-gray-700">{ach.description}</div>
          <div className="text-xs text-gray-500">
            Submitted by {ach.name} ({ach.cic}) on{' '}
            {new Date(ach.submitted_at).toLocaleString()}
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
          {!ach.approved ? (
            <Button
              onClick={() => handleApprove(ach.id)}
              className="mt-2 text-sm"
            >
              ✅ Approve
            </Button>
          ) : (
            <span className="text-green-600 text-sm font-medium">Approved</span>
          )}
        </div>
      ))}
    </div>
  )
}
