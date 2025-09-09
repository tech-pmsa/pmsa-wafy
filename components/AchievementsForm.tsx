'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserData } from '@/hooks/useUserData'

// Shadcn/UI & Icon Components
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Award, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export default function AchievementsForm() {
  const { user, details, loading: userLoading } = useUserData();
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (e.g., 5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("File is too large. Please upload a file smaller than 5MB.");
        return;
      }
      setProofFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setErrorMsg('');
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setProofFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
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

    if (!user || !details?.name || !details?.cic || !details?.batch) {
      setErrorMsg('Your user data is incomplete. Please try logging in again.')
      return
    }

    setLoading(true)
    let proofUrl = null

    if (proofFile) {
      const filePath = `${user.id}/${Date.now()}-${proofFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('achievements')
        .upload(filePath, proofFile)

      if (uploadError) {
        setErrorMsg(`Failed to upload proof: ${uploadError.message}`)
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
        student_uid: user.id,
        name: details.name,
        cic: details.cic,
        batch: details.batch,
        approved: false,
      },
    ])
    setLoading(false)

    if (insertError) {
      setErrorMsg(`Submission failed: ${insertError.message}`)
    } else {
      setSuccessMsg('Achievement submitted successfully for review!')
      resetForm()
      setTimeout(() => {
        setIsOpen(false)
        setSuccessMsg('')
      }, 2500)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="group w-full cursor-pointer border-2 border-dashed border-border bg-transparent transition-all hover:border-primary hover:bg-primary/5">
          <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4 transition-transform group-hover:scale-110 group-hover:rotate-6">
              <Award className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold font-heading">Submit an Achievement</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Won an award? Published a paper? Click here to share it.
            </p>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading">Submit New Achievement</DialogTitle>
          <DialogDescription>
            Share your accomplishment. It will be sent to your class teacher for review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {errorMsg && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}
          {successMsg && (
            <Alert className="border-green-500/50 text-green-700">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>{successMsg}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., First Prize in National Hackathon" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Briefly describe what you accomplished, the event, and the date." rows={4} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proof-file">Proof (Optional)</Label>
            <Input id="proof-file" type="file" onChange={handleFileChange} ref={fileInputRef} className="file:text-primary file:font-semibold" accept="image/png, image/jpeg, application/pdf" />
            <p className="text-xs text-muted-foreground">Upload a certificate, photo, or PDF. Max file size: 5MB.</p>
          </div>

          {previewUrl && (
            <div>
              <Label>Preview</Label>
              <div className="mt-2 rounded-md border p-2">
                <img src={previewUrl} alt="Proof preview" className="max-h-40 w-full rounded-md object-contain" />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading || userLoading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit for Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}