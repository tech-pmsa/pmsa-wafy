'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserRoleData } from '@/hooks/useUserRoleData'

// Shadcn/UI & Icon Components
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card' // Import Card for the trigger
import { Award, Type, FileText, Link, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export default function AchievementsForm() {
  const { uid, name, cic, batch } = useUserRoleData()
  const [isOpen, setIsOpen] = useState(false)

  // Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // UI State
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProofFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setProofFile(null)
    setPreviewUrl(null)
    if(fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    setErrorMsg('')
    setSuccessMsg('')

    if (!title.trim() || !description.trim()) {
      setErrorMsg('Title and description are required.')
      return
    }

    if (!uid || !name || !cic || !batch) {
      setErrorMsg('User data is incomplete. Please try logging in again.')
      return
    }

    setLoading(true)
    let proofUrl = null

    if (proofFile) {
      const filePath = `public/${uid}/${Date.now()}-${proofFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('achievements')
        .upload(filePath, proofFile)

      if (uploadError) {
        setErrorMsg('Failed to upload proof. Please try again.')
        setLoading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('achievements')
        .getPublicUrl(filePath)

      proofUrl = urlData.publicUrl
    }

    const { error: insertError } = await supabase.from('achievements').insert([
      {
        title,
        description,
        proof_url: proofUrl,
        student_uid: uid,
        name,
        cic,
        batch,
        approved: false,
      },
    ])
    setLoading(false)

    if (insertError) {
      setErrorMsg('Submission failed. Please try again.')
    } else {
      setSuccessMsg('Achievement submitted successfully for review!')
      resetForm()
      setTimeout(() => {
        setIsOpen(false)
        setSuccessMsg('')
      }, 2000)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {/* ====================================================== */}
        {/* START OF UPDATED TRIGGER                             */}
        {/* ====================================================== */}
      <DialogTrigger asChild>
        <Card className="group w-full max-w-md cursor-pointer border-2 border-dashed border-border bg-transparent transition-all hover:border-primary hover:bg-accent">
          <CardContent className="flex h-52 flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4 transition-transform group-hover:scale-110">
              <Award className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Have a New Achievement?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Click here to submit it for review and recognition.
            </p>
          </CardContent>
        </Card>
      </DialogTrigger>
        {/* ====================================================== */}
        {/* END OF UPDATED TRIGGER                               */}
        {/* ====================================================== */}

      <DialogContent className="sm:max-w-[480px]">
        {/* The dialog content and form logic remain the same as before */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-6 w-6 text-primary"/>
            <span className="text-2xl">Submit New Achievement</span>
          </DialogTitle>
          <DialogDescription>
            Share your recent accomplishments with the college. It will be reviewed by an officer.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {errorMsg && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}
          {successMsg && (
            <Alert variant="default" className="border-green-500 text-green-700">
               <CheckCircle2 className="h-4 w-4 text-green-500"/>
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{successMsg}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right"><Type className="inline-block h-4 w-4 mr-1"/>Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" placeholder="e.g., Won Hackathon"/>
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2"><FileText className="inline-block h-4 w-4 mr-1"/>Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" placeholder="Describe your achievement..." rows={4}/>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="proof-file" className="text-right"><Link className="inline-block h-4 w-4 mr-1"/>Proof</Label>
            <Input id="proof-file" type="file" onChange={handleFileChange} ref={fileInputRef} className="col-span-3 file:text-primary file:font-semibold" accept="image/png, image/jpeg, application/pdf"/>
          </div>

          {previewUrl && (
             <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-start-2 col-span-3">
                   <img src={previewUrl} alt="Proof preview" className="max-h-40 rounded-md border object-contain"/>
                </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Submitting...' : 'Submit for Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}