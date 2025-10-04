// app/admins/admin-settings/page.tsx
'use client'

import { useUserData } from '@/hooks/useUserData'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, User, UserPlus, Users, BookUser, Trash2, KeyRound } from 'lucide-react'

// Import your setting components
import AddStudents from '@/components/AddStudents'
import ClassCouncil from '@/components/ClassCouncil'
import AddBulkStudents from '@/components/AddBulkStudents'
import ProfileSection from '@/components/ProfileSection'
import ClearAttendance from '@/components/admin/ClearAttendance'
import UnlockAttendance from '@/components/admin/UnlockAttendance'

// Configuration for our dynamic tabs. This is the new "source of truth" for the page layout.
const settingsTabs = [
    { value: 'profile', label: 'My Profile', icon: User, roles: ['student', 'officer', 'class', 'class-leader', 'staff'] },
    { value: 'council', label: 'Class Council', icon: BookUser, roles: ['class'] },
    { value: 'student-management', label: 'Student Management', icon: UserPlus, roles: ['officer'] },
    { value: 'danger-zone', label: 'Danger Zone', icon: Trash2, roles: ['officer'] },
];

export default function AdminSettingsPage() {
    const { role, loading } = useUserData();

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-10 w-full max-w-lg" />
                <Skeleton className="h-[500px] w-full" />
            </div>
        );
    }

    if (!role) {
        return (
            <Alert variant="destructive">
                <User className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>Could not determine user role. Please try again.</AlertDescription>
            </Alert>
        );
    }

    // Filter tabs based on the current user's role
    const accessibleTabs = settingsTabs.filter(tab => tab.roles.includes(role));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-heading">Settings</h1>
                <p className="text-muted-foreground">Manage your profile and system settings based on your role.</p>
            </div>

            <Tabs defaultValue={accessibleTabs[0]?.value} className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex h-auto">
                    {accessibleTabs.map(tab => (
                        <TabsTrigger key={tab.value} value={tab.value} className="py-2">
                           <tab.icon className="mr-2 h-4 w-4" /> {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* Profile Tab - For Everyone */}
                <TabsContent value="profile" className="mt-6">
                    <ProfileSection />
                </TabsContent>

                {/* Class Teacher Tab */}
                <TabsContent value="council" className="mt-6">
                    <ClassCouncil />
                </TabsContent>

                {/* Officer Tabs */}
                <TabsContent value="student-management" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <AddStudents />
                        <AddBulkStudents />
                    </div>
                </TabsContent>

                <TabsContent value="danger-zone" className="mt-6">
                    <Card className="border-destructive">
                        <CardHeader>
                            <CardTitle className="text-destructive">Danger Zone</CardTitle>
                            <CardDescription>These are critical actions that may have permanent consequences. Please proceed with caution.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* We will redesign these components next */}
                            <UnlockAttendance />
                            <ClearAttendance />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}