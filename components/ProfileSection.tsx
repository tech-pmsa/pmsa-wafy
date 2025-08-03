// components/ProfileSection.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import Image from 'next/image'
import { gu } from 'date-fns/locale'

export default function ProfileSection() {
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<any>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<any>({})
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      let profile = await supabase.from('profiles').select('*').eq('uid', user.id).single()
      if (!profile.data) {
        profile = await supabase.from('students').select('*').eq('uid', user.id).single()
      }
      setUser(profile.data)
      setForm(profile.data)
    }

    fetchUser()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleSave = async () => {
    const table = user?.role === 'student' ? 'students' : 'profiles'
    const bucket = user?.role === 'student' ? 'student-photos' : 'admin-photos'

    let img_url = user.img_url
    if (file) {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(`avatars/${user.uid}`, file, { upsert: true })

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(`avatars/${user.uid}`)
        img_url = publicUrl
      }
    }

    await supabase.from(table).update({ ...form, img_url }).eq('uid', user.uid)
    setUser({ ...form, img_url })
    setEditOpen(false)
  }

  if (!user) return <p className="text-center mt-10">Loading...</p>

  const isStudent = user.role === 'student'

  return (
    <div className="bg-white p-6 shadow rounded-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Profile</h2>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Pencil className="w-4 h-4" /> Edit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Edit Profile</h3>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Image
                  src={preview || user.img_url || '/default-avatar.png'}
                  alt="Avatar"
                  width={80}
                  height={80}
                  className="rounded-full object-cover border"
                />
                <label className="absolute bottom-0 right-0 bg-white p-1 rounded-full cursor-pointer shadow">
                  <Pencil className="w-4 h-4" />
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full">
                <Input
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                {isStudent && (
                  <div className='grid grid-cols-1 gap-2 w-full'>
                  <Input
                    placeholder="Phone"
                    value={form.phone || ''}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                  <Input
                    placeholder="Class ID"
                    value={form.class_id || ''}
                    onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                  />
                  <Input
                    placeholder="Guardian"
                    value={form.guardian || ''}
                    onChange={(e) => setForm({ ...form, guardian: e.target.value })}
                  />
                  <Input
                    placeholder="Guardian Phone"
                    value={form.g_phone || ''}
                    onChange={(e) => setForm({ ...form, g_phone: e.target.value })}
                  />
                  <Input
                    placeholder="Address"
                    value={form.address || ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 text-right">
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <img
          src={user.img_url || '/default-avatar.png'}
          alt="Avatar"
          className="w-32 h-32 rounded-full object-cover border"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <ProfileRow label="Name" value={user.name} />
          {isStudent ? (
            <>
              <ProfileRow label="CIC" value={user.cic} />
              <ProfileRow label="Class ID" value={user.class_id} />
              <ProfileRow label="Batch" value={user.batch} />
              <ProfileRow label="Council" value={user.council} />
              <ProfileRow label="Phone" value={user.phone} />
              <ProfileRow label="Guardian" value={user.guardian} />
              <ProfileRow label="Guardian Phone" value={user.g_phone} />
              <ProfileRow label="Address" value={user.address} />
            </>
          ) : (
            <>
              <ProfileRow label="Designation" value={user.designation} />
              <ProfileRow label="Email" value={user.email} />
              <ProfileRow label="Batch" value={user.batch} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-sm text-gray-500">{label}</label>
      <p className="text-base font-medium">{value || '-'}</p>
    </div>
  )
}
