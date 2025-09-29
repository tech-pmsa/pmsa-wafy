'use client'

import CollegeLiveAttendance from '@/components/CollegeLiveAttendance';
import AllStaffRegister from '@/components/AllStaffRegister'; // --- NEW: Import the new component
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // --- NEW: Import Tabs
import { GraduationCap } from 'lucide-react';
import { format } from 'date-fns';

export default function StaffDashboardPage() {
    const today = format(new Date(), 'PPP');

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <GraduationCap className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">Staff Dashboard</CardTitle>
                            <CardDescription>
                                View student attendance or review the staff register.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* --- NEW: Tabbed layout for switching views --- */}
            <Tabs defaultValue="students" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="students">Student Live Attendance</TabsTrigger>
                    <TabsTrigger value="register">Staff Register</TabsTrigger>
                </TabsList>
                <TabsContent value="students" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>College Live Attendance</CardTitle>
                            <CardDescription>A real-time overview of student attendance for <span className="font-semibold text-primary">{today}</span>.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CollegeLiveAttendance />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="register" className="mt-6">
                    <AllStaffRegister />
                </TabsContent>
            </Tabs>
        </div>
    )
}
