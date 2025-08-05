// components/ProfileSection.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Shadcn/UI & Icon Components
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Pencil, User, Mail, Phone, Briefcase, Building, Shield, UserCheck, PhoneCall, Home, Loader2, Lock } from 'lucide-react'

// A reusable component for displaying a line of profile information
function ProfileInfoLine({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-4">
      <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value || 'Not set'}</p>
      </div>
    </div>
  )
}

// A component for a disabled/read-only form field
function ReadOnlyField({ label, value, icon: Icon }: { label: string, value: string, icon: React.ElementType }) {
    return (
        <div className="space-y-2">
            <Label htmlFor={label} className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-3 w-3" /> {label}
            </Label>
            <Input id={label} value={value || ''} readOnly disabled />
        </div>
    )
}

export default function ProfileSection() {
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  const [form, setForm] = useState<any>({})
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true)
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setLoading(false); return; }

      let { data: profileData } = await supabase.from('profiles').select('*').eq('uid', authUser.id).single()
      if (!profileData) {
        let { data: studentData } = await supabase.from('students').select('*').eq('uid', authUser.id).single()
        profileData = studentData
      }

      if (profileData) {
        setUser(profileData)
        setForm(profileData)
      }
      setLoading(false)
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
    if (!user) return
    setIsSaving(true)

    const isStudent = user.role === 'student'
    const table = isStudent ? 'students' : 'profiles'
    const bucket = 'avatars' // Using a single bucket is often easier to manage policies for

    // We only want to update fields that are actually editable
    const { name, phone, guardian, g_phone, address, designation } = form;
    let updatedData: any = isStudent
        ? { name, phone, guardian, g_phone, address }
        : { name, designation };

    if (file) {
      const filePath = `${user.uid}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true })

      if (uploadError) {
        console.error("Upload Error:", uploadError)
        setIsSaving(false)
        return
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath)
      updatedData.img_url = `${urlData.publicUrl}?t=${new Date().getTime()}` // Add timestamp to bust cache
    }

    const { data: newUserData, error: updateError } = await supabase
      .from(table)
      .update(updatedData)
      .eq('uid', user.uid)
      .select()
      .single()

    if (updateError) {
        console.error("Update Error:", updateError)
    } else if (newUserData) {
        setUser(newUserData)
        setForm(newUserData)
        setEditOpen(false)
    }

    setFile(null)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsSaving(false)
  }

  if (loading) {
    // ... Skeleton loader remains the same ...
    return <p>Loading...</p>
  }

  if (!user) {
    return <p className="text-center mt-10 text-muted-foreground">Could not load user profile.</p>
  }

  const isStudent = user.role === 'student'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl">Your Profile</CardTitle>
          <CardDescription>View and manage your personal information.</CardDescription>
        </div>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline"><Pencil className="w-4 h-4 mr-2" /> Edit Profile</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Edit Your Profile</DialogTitle>
              <DialogDescription>Make changes to your profile here. Click save when you're done.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-8 py-4 md:grid-cols-3">
                <div className="flex flex-col items-center gap-4 pt-4">
                    <Avatar className="h-32 w-32">
                        <AvatarImage src={preview || user.img_url} alt="Avatar Preview"/>
                        <AvatarFallback><User className="h-16 w-16"/></AvatarFallback>
                    </Avatar>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Change Photo</Button>
                    <Input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                </div>
                {/* ====================================================== */}
                {/* START OF UPDATED FORM WITH READ-ONLY FIELDS          */}
                {/* ====================================================== */}
                <div className="grid gap-4 md:col-span-2 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                     {isStudent ? (
                         <>
                            <ReadOnlyField label="CIC" value={form.cic} icon={UserCheck} />
                            <ReadOnlyField label="Class" value={form.class_id} icon={Building} />
                            <ReadOnlyField label="Batch" value={form.batch} icon={Shield} />
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="guardian">Guardian Name</Label>
                                <Input id="guardian" value={form.guardian || ''} onChange={(e) => setForm({ ...form, guardian: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="g_phone">Guardian Phone</Label>
                                <Input id="g_phone" value={form.g_phone || ''} onChange={(e) => setForm({ ...form, g_phone: e.target.value })} />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="address">Address</Label>
                                <Input id="address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                            </div>
                         </>
                     ) : (
                        <>
                            <ReadOnlyField label="Email" value={form.email} icon={Mail} />
                             <ReadOnlyField label="designation" value={form.designation} icon={Shield} />
                             <ReadOnlyField label="Batch" value={form.batch} icon={Shield} />
                        </>
                     )}
                </div>
                {/* ====================================================== */}
                {/* END OF UPDATED FORM                                  */}
                {/* ====================================================== */}
            </div>
            <DialogFooter>
              <Button onClick={() => setEditOpen(false)} variant="ghost">Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="flex flex-col md:flex-row gap-8 pt-6">
        <div className="flex flex-col items-center text-center gap-2 md:w-1/4">
          <Avatar className="w-32 h-32 border-4 border-background shadow-md">
            <AvatarImage src={user.img_url} alt={user.name} />
            <AvatarFallback><User className="h-16 w-16"/></AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold mt-2">{user.name}</h2>
          <Badge variant="secondary" className="capitalize">{user.role}</Badge>
          <p className="text-sm text-muted-foreground">{isStudent ? user.batch : user.email}</p>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8 border-t md:border-t-0 md:border-l pl-0 md:pl-8 pt-6 md:pt-0">
          {isStudent ? (
            <>
              <ProfileInfoLine icon={UserCheck} label="CIC" value={user.cic} />
              <ProfileInfoLine icon={Building} label="Class" value={user.class_id} />
              <ProfileInfoLine icon={Phone} label="Phone" value={user.phone} />
              <ProfileInfoLine icon={Shield} label="Council" value={user.council} />
              <ProfileInfoLine icon={User} label="Guardian" value={user.guardian} />
              <ProfileInfoLine icon={PhoneCall} label="Guardian Phone" value={user.g_phone} />
              <ProfileInfoLine icon={Home} label="Address" value={user.address} />
            </>
          ) : (
            <>
              <ProfileInfoLine icon={Briefcase} label="Designation" value={user.designation} />
              <ProfileInfoLine icon={Mail} label="Email" value={user.email} />
              <ProfileInfoLine icon={Building} label="Batch" value={user.batch} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}