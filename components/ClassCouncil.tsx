'use client'

import { useState, useEffect } from 'react'
import { useUserData } from '@/hooks/useUserData'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

// Shadcn/UI & Icon Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Pencil, Crown, PenSquare, Banknote, ShieldCheck, UserSquare2, Users, Speaker, Loader2 } from 'lucide-react'

// Define the structure for council positions for easier mapping
const councilPositions = [
  { key: 'batch', label: 'Batch', icon: Users },
  { key: 'president', label: 'President', icon: Crown },
  { key: 'vicepresident', label: 'Vice President', icon: UserSquare2 },
  { key: 'secretary', label: 'Secretary', icon: PenSquare },
  { key: 'jointsecretary', label: 'Joint Secretary', icon: PenSquare },
  { key: 'treasurer', label: 'Treasurer', icon: Banknote },
  { key: 'auditor', label: 'Auditor', icon: ShieldCheck },
  { key: 'pro', label: 'PRO', icon: Speaker },
]

export default function ClassCouncil() {
  const { user, loading: userLoading } = useUserData()
  const [council, setCouncil] = useState<any>(null)
  const [originalCouncil, setOriginalCouncil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    const fetchCouncil = async () => {
      if (!user?.id) {
        if (!userLoading) setLoading(false);
        return;
      }
      setLoading(true)

      const { data, error } = await supabase
        .from('class_council')
        .select('*')
        .eq('uid', user.id)
        .single()

      if (data) {
        setCouncil(data)
        setOriginalCouncil(data)
      } else {
        // If no record exists, create a blank one to allow editing
        const blankCouncil = councilPositions.reduce((acc, pos) => ({ ...acc, [pos.key]: '' }), { uid: user.id })
        setCouncil(blankCouncil)
        setOriginalCouncil(blankCouncil)
      }
      setLoading(false)
    }

    fetchCouncil()
  }, [user, userLoading])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCouncil({ ...council, [e.target.name]: e.target.value })
  }

  const handleCancel = () => {
    setCouncil(originalCouncil);
    setEditMode(false);
  }

  const handleSubmit = async () => {
    setIsSaving(true)
    const { error } = await supabase
      .from('class_council')
      .upsert({ ...council, uid: user?.id })
      .select()
      .single()

    if (error) {
      toast.error('Failed to save changes.', { description: error.message })
    } else {
      toast.success('Class council has been updated successfully!')
      setOriginalCouncil(council)
      setEditMode(false)
    }
    setIsSaving(false)
  }

  if (loading || userLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-32" /></div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Class Council Details</CardTitle>
          <CardDescription>{editMode ? 'Update the names for each council position.' : `Council for Batch: ${council?.batch || 'N/A'}`}</CardDescription>
        </div>
        {!editMode && (<Button variant="outline" onClick={() => setEditMode(true)}><Pencil className="h-4 w-4 mr-2" /> Edit</Button>)}
      </CardHeader>
      <CardContent>
        {editMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {councilPositions.map(({ key, label, icon: Icon }) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key} className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" />{label}</Label>
                <Input id={key} name={key} value={council?.[key] || ''} onChange={handleChange} placeholder={`Enter name for ${label}`} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {councilPositions.map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center gap-4 rounded-lg border p-4 bg-muted/40">
                <Avatar className="h-12 w-12"><AvatarFallback><Icon className="h-6 w-6 text-muted-foreground" /></AvatarFallback></Avatar>
                <div><p className="text-sm text-muted-foreground">{label}</p><p className="font-semibold">{council?.[key] || 'Not Assigned'}</p></div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {editMode && (
        <CardFooter className="flex justify-end gap-2 border-t pt-6">
          <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}