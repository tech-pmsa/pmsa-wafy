'use client'

import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { ShieldAlert, LogOut, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function UnauthorizedPage() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-light">
      <Card className="w-full max-w-md text-center animate-fade-in shadow-lg">
        <CardHeader>
          <div className="mx-auto bg-brand-yellow/20 text-brand-yellow-dark p-3 rounded-full w-fit">
            <ShieldAlert className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-heading mt-4">Access Denied</CardTitle>
          <CardDescription>
            You don’t have permission to view this page. Please check your account role.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={() => router.push('/')}>
            <Home className="mr-2 h-4 w-4" />
            Go to Homepage
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout & Sign In Again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}