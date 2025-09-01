'use client'

import { useUserData } from '@/hooks/useUserData'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, User } from 'lucide-react'

// Import your setting components
import AddStudents from '@/components/AddStudents'
import ClassCouncil from '@/components/ClassCouncil'
import AddBulkStudents from '@/components/AddBulkStudents'
import ProfileSection from '@/components/ProfileSection'

export default function AdminSettingsPage() {
  const { role, loading } = useUserData();

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (!role) {
    return (
        <Alert variant="destructive">
            <User className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
                Could not determine your user role. Please try logging in again.
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold font-heading">Settings</h1>
            <p className="text-muted-foreground">Manage your profile and system settings.</p>
        </div>

        {/* Profile Section - Visible to all roles */}
        <ProfileSection />

        {/* Class Teacher Specific Settings */}
        {role === 'class' && (
            <Card>
                <CardHeader>
                    <CardTitle>Class Council</CardTitle>
                    <CardDescription>Manage your class council members.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ClassCouncil />
                </CardContent>
            </Card>
        )}

        {/* Officer Specific Settings */}
        {role === 'officer' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Add Single Student</CardTitle>
                        <CardDescription>Manually add a new student to the system.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AddStudents />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Add Bulk Students</CardTitle>
                        <CardDescription>Upload a CSV file to add multiple students at once.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AddBulkStudents />
                    </CardContent>
                </Card>
            </div>
        )}
    </div>
  )
}