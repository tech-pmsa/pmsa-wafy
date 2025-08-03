'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserRoleData } from '@/hooks/useUserRoleData'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function AchievementsForm() {
  const { uid, name, cic, batch } = useUserRoleData()

  const [form, setForm] = useState({
    title: '',
    description: '',
    proof_url: '',
  })

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    setErrorMsg('')
    setSuccessMsg('')

    if (!form.title.trim() || !form.description.trim()) {
      setErrorMsg('Title and description are required.')
      return
    }

    if (!uid || !name || !cic || !batch) {
      setErrorMsg('User data is incomplete.')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('achievements').insert([
      {
        title: form.title,
        description: form.description,
        proof_url: form.proof_url || null,
        student_uid: uid,
        name,
        cic,
        batch,
        approved: false
      },
    ])
    setLoading(false)

    if (error) {
      setErrorMsg('❌ Submission failed. Please try again.')
    } else {
      setSuccessMsg('✅ Achievement submitted successfully!')
      setForm({ title: '', description: '', proof_url: '' })
    }
  }

  return (
    <div className="flex justify-center">
      <Dialog>
        <DialogTrigger asChild>
          <div className="cursor-pointer bg-muted hover:bg-muted/80 p-8 rounded-xl border-dashed border-2 border-gray-300 w-full max-w-md text-center shadow-sm">
            <Plus className="mx-auto text-gray-500" size={40} />
            <p className="mt-2 font-medium text-gray-600">Add an Achievement</p>
          </div>
        </DialogTrigger>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit New Achievement</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
            {successMsg && <p className="text-green-600 text-sm">{successMsg}</p>}

            <Input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Achievement Title"
            />
            <Textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Achievement Description"
              rows={4}
            />
            <Input
              name="proof_url"
              value={form.proof_url}
              onChange={handleChange}
              placeholder="Proof Image URL (optional)"
            />
            {form.proof_url && (
              <img
                src={form.proof_url}
                alt="Proof preview"
                className="w-32 h-32 object-cover border rounded"
              />
            )}

            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
