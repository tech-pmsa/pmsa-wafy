'use client'
'use client'

import CollegeLiveAttendance from '@/components/CollegeLiveAttendance';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
                            <CardTitle className="text-2xl">College Live Attendance</CardTitle>
                            <CardDescription>
                                A real-time overview of student attendance for <span className="font-semibold text-primary">{today}</span>.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <CollegeLiveAttendance />
        </div>
    )
}
