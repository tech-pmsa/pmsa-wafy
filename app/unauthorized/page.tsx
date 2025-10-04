// app/unauthorized/page.tsx
'use client'

import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useUserData } from '@/hooks/useUserData' // Import the hook for a smarter redirect
import { ShieldAlert, LogOut, Home } from 'lucide-react'

// Shadcn/UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function UnauthorizedPage() {
  const router = useRouter()
  const { role } = useUserData(); // Get user's role for a smarter redirect

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // This function determines the correct "home" page based on the user's role
  const getDashboardLink = () => {
    if (!role) return '/'; // Default to homepage if role is unknown
    switch (role) {
      case 'officer': return '/admins/officer/officer-dashboard';
      case 'class': return '/admins/classroom/class-dashboard';
      case 'class-leader': return '/admins/classleader/class-leader-dashboard';
      case 'student': return '/students/student-dashboard';
      case 'staff': return '/admins/staff/staff-dashboard';
      default: return '/';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md text-center animate-in fade-in-50 duration-500 shadow-lg">
        <CardHeader className="p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-heading mt-4">Access Denied</CardTitle>
          <CardDescription>
            You do not have the necessary permissions to view this page. Please contact an administrator if you believe this is an error.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-8 pb-8">
          <Button onClick={() => router.push(getDashboardLink())}>
            <Home className="mr-2 h-4 w-4" />
            Go to My Dashboard
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