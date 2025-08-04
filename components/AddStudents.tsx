// components/AddStudents.tsx
'use client'

import { useState } from 'react'

// Shadcn/UI & Icon Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { User, GraduationCap, Phone, Home, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

// Helper component for the Review step
function ReviewItem({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value || 'Not provided'}</p>
    </div>
  )
}

export default function AddStudents() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    cic: '',
    class_id: '',
    council: '',
    batch: '',
    phone: '',
    guardian: '',
    g_phone: '',
    address: '',
    sslc: '',
    plustwo: '',
    plustwo_streams: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const nextStep = () => setStep(prev => prev < 4 ? prev + 1 : prev)
  const prevStep = () => setStep(prev => prev > 1 ? prev - 1 : prev)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const cic = formData.cic.trim().toLowerCase()
      const email = `${cic}@pmsa.com`
      const password = `${cic}@11`

      // NOTE: This uses your existing API route for user creation, now without img_url
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, email, password }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add student')

      setMessage({ type: 'success', text: 'Student added successfully!' })
      setStep(1)
      setFormData({ // Reset form to initial state
        name: '', cic: '', class_id: '', council: '', batch: '', phone: '',
        guardian: '', g_phone: '', address: '', sslc: '', plustwo: '',
        plustwo_streams: '',
      })

    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const stepTitles = [
    { icon: User, title: 'Personal Information', description: 'Start with the student\'s basic details.' },
    { icon: GraduationCap, title: 'Academic Details', description: 'Enter their class and previous academic info.' },
    { icon: Phone, title: 'Contact Information', description: 'Provide contact details for the student and guardian.' },
    { icon: CheckCircle2, title: 'Review & Submit', description: 'Please review all information before submitting.' },
  ]

  const currentStepInfo = stepTitles[step - 1];

  return (
    <Card className="w-full mx-auto">
      <CardHeader>
        <div className="mb-4">
            <Label className="text-sm font-medium text-muted-foreground">Step {step} of 4</Label>
            <Progress value={(step / 4) * 100} className="mt-1" />
        </div>
        <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <currentStepInfo.icon className="h-6 w-6 text-primary" />
            </div>
            <div>
                <CardTitle>{currentStepInfo.title}</CardTitle>
                <CardDescription>{currentStepInfo.description}</CardDescription>
            </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 min-h-[250px]">
          {step === 1 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input required id="name" name="name" placeholder="e.g., Mohammed Shuhaib M" onChange={handleChange} value={formData.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cic">CIC Number (Unique)</Label>
                <Input required id="cic" name="cic" placeholder="e.g., 16828" onChange={handleChange} value={formData.cic} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="class_id">Class ID</Label><Input required id="class_id" name="class_id" placeholder="e.g., AL-4, AL-5, TH-2, TH-1, FD-A" onChange={handleChange} value={formData.class_id} /></div>
              <div className="space-y-2"><Label htmlFor="council">Council</Label><Input required id="council" name="council" placeholder="e.g., INSHIRAH, AL-ABTHAL" onChange={handleChange} value={formData.council} /></div>
              <div className="space-y-2"><Label htmlFor="batch">Batch</Label><Input required id="batch" name="batch" placeholder="e.g., Batch 12, Batch 13, Batch 14" onChange={handleChange} value={formData.batch} /></div>
              <div className="space-y-2"><Label htmlFor="sslc">SSLC Board</Label><Input required id="sslc" name="sslc" placeholder="e.g., Board of kerala, CBSE, ICSE" onChange={handleChange} value={formData.sslc} /></div>
              <div className="space-y-2"><Label htmlFor="plustwo">Plus Two Board</Label><Input required id="plustwo" name="plustwo" placeholder="e.g., Board of kerala, CBSE, ICSE" onChange={handleChange} value={formData.plustwo} /></div>
              <div className="space-y-2"><Label htmlFor="plustwo_streams">Plus Two Stream</Label><Input required id="plustwo_streams" name="plustwo_streams" placeholder="e.g., Science, Commerce, Humanities" onChange={handleChange} value={formData.plustwo_streams} /></div>
            </div>
          )}

          {step === 3 && (
            <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="phone">Student Phone</Label><Input required id="phone" name="phone" placeholder="Student's contact number" onChange={handleChange} value={formData.phone} /></div>
                <div className="space-y-2"><Label htmlFor="guardian">Guardian Name</Label><Input required id="guardian" name="guardian" placeholder="Guardian's name" onChange={handleChange} value={formData.guardian} /></div>
                <div className="space-y-2"><Label htmlFor="g_phone">Guardian Phone</Label><Input required id="g_phone" name="g_phone" placeholder="Guardian's contact number" onChange={handleChange} value={formData.g_phone} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="address">Address</Label><Textarea required id="address" name="address" placeholder="Full residential address" onChange={handleChange} value={formData.address} /></div>
            </div>
          )}

          {step === 4 && (
             <div className="space-y-4">
                {message && (
                    <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={message.type === 'success' ? 'border-green-500' : ''}>
                        {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-green-600"/>}
                        <AlertTitle>{message.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
                        <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                )}
                 <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 border-t pt-4">
                     <ReviewItem label="Name" value={formData.name} />
                     <ReviewItem label="CIC" value={formData.cic} />
                     <ReviewItem label="Class" value={formData.class_id} />
                     <ReviewItem label="Batch" value={formData.batch} />
                     <ReviewItem label="Council" value={formData.council} />
                     <ReviewItem label="SSLC" value={formData.sslc} />
                     <ReviewItem label="Plus Two" value={formData.plustwo} />
                     <ReviewItem label="Plus Two Stream" value={formData.plustwo_streams} />
                     <ReviewItem label="Student Phone" value={formData.phone} />
                     <ReviewItem label="Guardian" value={formData.guardian} />
                     <ReviewItem label="Guardian Phone" value={formData.g_phone} />
                     <ReviewItem label="Address" value={formData.address} />
                 </div>
             </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          {step > 1 && <Button type="button" variant="ghost" onClick={prevStep}>Previous</Button>}
          <div className="flex-grow"></div> {/* Spacer */}
          {step < 4 && <Button type="button" onClick={nextStep}>Next Step</Button>}
          {step === 4 && (
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Submitting...' : 'Confirm and Add Student'}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}