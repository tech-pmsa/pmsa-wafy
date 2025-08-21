'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useUserData } from '@/hooks/useUserData'

// Shadcn/UI & Icon Components
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Pencil, User, Mail, Phone, Briefcase, Building, Shield, UserCheck, PhoneCall, Home, Loader2, Lock, BookMarked } from 'lucide-react' // Added BookMarked icon

function ProfileInfoLine({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-4">
      <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium text-neutral-black">{value || 'Not set'}</p>
      </div>
    </div>
  )
}

function ReadOnlyField({ label, value, icon: Icon }: { label: string, value: string, icon: React.ElementType }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={label} className="flex items-center gap-2 text-muted-foreground"><Lock className="h-3 w-3" /> {label}</Label>
      <Input id={label} value={value || ''} readOnly disabled className="cursor-not-allowed" />
    </div>
  )
}

export default function ProfileSection() {
  const router = useRouter();
  const { user, details, role, loading } = useUserData();

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (details) {
      setForm(details);
    }
  }, [details]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  const handleSave = async () => {
    if (!user || !role) return;
    setIsSaving(true);

    const isStudent = role === 'student';
    const table = isStudent ? 'students' : 'profiles';
    const bucket = 'avatars';

    const { name, phone, guardian, g_phone, address, designation, batch } = form;
    let updatedData: any = isStudent
      ? { name, phone, guardian, g_phone, address }
      : { name, designation, batch };

    if (file) {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true });
      if (uploadError) { console.error("Upload Error:", uploadError); setIsSaving(false); return; }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      updatedData.img_url = `${urlData.publicUrl}?t=${new Date().getTime()}`;
    }

    const { error: updateError } = await supabase.from(table).update(updatedData).eq('uid', user.id);
    if (updateError) { console.error("Update Error:", updateError); }
    else { router.refresh(); setEditOpen(false); }

    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsSaving(false);
  }

  if (loading) {
    return (
        <Card>
            <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col items-center md:w-1/4"><Skeleton className="h-32 w-32 rounded-full" /><Skeleton className="h-6 w-3/4 mt-4" /><Skeleton className="h-5 w-1/2 mt-2" /></div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            </CardContent>
        </Card>
    );
  }

  if (!details) {
    return <p className="text-center mt-10 text-muted-foreground">Could not load user profile.</p>
  }

  const isStudent = role === 'student';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle className="text-2xl">Your Profile</CardTitle><CardDescription>View and manage your personal information.</CardDescription></div>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild><Button variant="outline"><Pencil className="w-4 h-4 mr-2" /> Edit Profile</Button></DialogTrigger>
          <DialogContent className="lg:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Your Profile</DialogTitle><DialogDescription>Make changes to your profile here. Click save when you're done.</DialogDescription></DialogHeader>
            <div className="flex flex-col md:flex-row gap-8 py-4">
              <div className="flex flex-col items-center gap-4 pt-4 md:w-1/3 md:border-r md:pr-8"><Avatar className="h-32 w-32"><AvatarImage src={preview || details.img_url} alt="Avatar Preview" className='object-cover' /><AvatarFallback><User className="h-16 w-16" /></AvatarFallback></Avatar><Button variant="outline" onClick={() => fileInputRef.current?.click()}>Change Photo</Button><Input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" /></div>
              <div className="grid gap-4 md:w-2/3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="name">Full Name</Label><Input id="name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                {isStudent ? (
                  <>
                    <ReadOnlyField label="CIC" value={form.cic} icon={UserCheck} />
                    <ReadOnlyField label="Class" value={form.class_id} icon={Building} />
                    <ReadOnlyField label="Batch" value={form.batch} icon={Shield} />
                    <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                    <div className="space-y-2"><Label htmlFor="guardian">Guardian Name</Label><Input id="guardian" value={form.guardian || ''} onChange={(e) => setForm({ ...form, guardian: e.target.value })} /></div>
                    <div className="space-y-2"><Label htmlFor="g_phone">Guardian Phone</Label><Input id="g_phone" value={form.g_phone || ''} onChange={(e) => setForm({ ...form, g_phone: e.target.value })} /></div>
                    <div className="space-y-2 sm:col-span-2"><Label htmlFor="address">Address</Label><Input id="address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                  </>
                ) : (
                  <>
                    <ReadOnlyField label="Email" value={details.email} icon={Mail} />
                    <ReadOnlyField label='Designation' value={details.designation} icon={Shield}/>
                    <div className="space-y-2"><Label htmlFor="relation">Related to</Label><Input id="relation" value={form.batch || ''} onChange={(e) => setForm({ ...form, batch: e.target.value })} /></div>
                  </>
                )}
              </div>
            </div>
            <DialogFooter><Button onClick={() => setEditOpen(false)} variant="ghost">Cancel</Button><Button onClick={handleSave} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row gap-8 pt-6">
        <div className="flex flex-col items-center text-center gap-2 md:w-1/4">
          <Avatar className="w-32 h-32 border-4 border-background shadow-md"><AvatarImage src={details.img_url} alt={details.name} className='object-cover' /><AvatarFallback><User className="h-16 w-16" /></AvatarFallback></Avatar>
          <h2 className="text-2xl font-bold mt-2">{details.name}</h2>
          <Badge variant="secondary" className="capitalize">{details.role}</Badge>
          <p className="text-sm text-muted-foreground">{isStudent ? details.batch : details.email}</p>
        </div>
        {/* ====================================================== */}
        {/* START OF FIX                                         */}
        {/* ====================================================== */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8 border-t md:border-t-0 md:border-l pl-0 md:pl-8 pt-6 md:pt-0">
          {isStudent ? (
            <>
              <ProfileInfoLine icon={UserCheck} label="CIC Number" value={details.cic} />
              <ProfileInfoLine icon={Building} label="Class" value={details.class_id} />
              <ProfileInfoLine icon={Shield} label="Council" value={details.council} />
              <ProfileInfoLine icon={Phone} label="Phone" value={details.phone} />
              <ProfileInfoLine icon={User} label="Guardian" value={details.guardian} />
              <ProfileInfoLine icon={PhoneCall} label="Guardian Phone" value={details.g_phone} />
              <ProfileInfoLine icon={BookMarked} label="SSLC Board" value={details.sslc} />
              <ProfileInfoLine icon={BookMarked} label="Plus Two Board" value={details.plustwo} />
              <ProfileInfoLine icon={BookMarked} label="Plus Two Stream" value={details.plustwo_streams} />
              <ProfileInfoLine icon={Home} label="Address" value={details.address} />
            </>
          ) : (
            <>
              <ProfileInfoLine icon={Briefcase} label="Designation" value={details.designation} />
              <ProfileInfoLine icon={Mail} label="Email" value={details.email} />
              <ProfileInfoLine icon={Building} label="Related to" value={details.batch} />
            </>
          )}
        </div>
        {/* ====================================================== */}
        {/* END OF FIX                                           */}
        {/* ====================================================== */}
      </CardContent>
    </Card>
  )
}