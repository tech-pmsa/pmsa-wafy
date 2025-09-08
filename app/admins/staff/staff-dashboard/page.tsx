'use client'

import CollegeLiveAttendance from '@/components/CollegeLiveAttendance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

export default function StaffDashboardPage() {
  return (
    <div className="space-y-6">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <GraduationCap className="h-8 w-8" />
                    <div>
                        <CardTitle className="text-2xl">Staff Dashboard</CardTitle>
                        <CardDescription className="text-primary-foreground/80">
                            A real-time overview of college-wide student attendance.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
        </Card>

        {/* The main component for displaying live attendance */}
        <CollegeLiveAttendance />
    </div>
  )
}