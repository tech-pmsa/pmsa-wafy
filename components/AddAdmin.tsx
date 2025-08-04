// components/AddAdmin.tsx
'use client'

import { useState } from 'react'

// Shadcn/UI & Icon Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { UserPlus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function AddAdmin() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    designation: '',
    batch: '',
    role: 'officer',
  })

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)

    // The logic to derive the password from the email
    const username = formData.email.split('@')[0]
    const password = `pmsa-${username}`

    try {
      const response = await fetch('/api/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, password }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'An unknown error occurred.')
      }

      setMessage({ type: 'success', text: 'Admin user created successfully!' })
      // Reset form to initial state
      setFormData({ name: '', email: '', designation: '', batch: '', role: 'officer' })

    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <div>
                <CardTitle>Create New Admin User</CardTitle>
                <CardDescription>Fill out the form to add a new officer, class teacher, or class leader.</CardDescription>
            </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={message.type === 'success' ? 'border-green-500' : ''}>
              {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-green-600"/>}
              <AlertTitle>{message.type === 'error' ? 'Creation Failed' : 'Success'}</AlertTitle>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" required value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g., John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" required value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="user@pmsa.com" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select required value={formData.role} onValueChange={(value) => handleChange('role', value)}>
                    <SelectTrigger id="role">
                        <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="officer">Officer</SelectItem>
                        <SelectItem value="class">Class Teacher</SelectItem>
                        <SelectItem value="class-leader">Class Leader</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Conditional field for Designation */}
            {formData.role !== 'student' && (
                <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input id="designation" required value={formData.designation} onChange={(e) => handleChange('designation', e.target.value)} placeholder="e.g., Head of Department" />
                </div>
            )}

            {/* Conditional field for Batch */}
            {(formData.role === 'class' || formData.role === 'class-leader') && (
                <div className="space-y-2">
                    <Label htmlFor="batch">Associated Batch</Label>
                    <Input id="batch" required value={formData.batch} onChange={(e) => handleChange('batch', e.target.value)} placeholder="e.g., 2024-2027" />
                </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto ml-auto">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Creating User...' : 'Add Admin User'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}