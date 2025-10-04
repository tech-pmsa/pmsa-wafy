// components/StudentAttendanceCard.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useUserData } from '@/hooks/useUserData'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { CalendarCheck2, CalendarDays, TrendingUp, TrendingDown, CheckCircle2, XCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// --- Type Definitions ---
interface AttendanceSummary {
    total_present: number;
    total_days: number;
}
interface PeriodDetail {
    status: 'Present' | 'Absent';
    reason?: string;
    description?: string;
}
interface TodaysAttendanceRecord {
    date: string;
    is_leave_day: boolean;
    [key: string]: any; // To allow indexing with period strings
}
const periods = Array.from({ length: 8 }, (_, i) => `period_${i + 1}`);
const excusedAbsences = ['Cic Related', 'Wsf Related', 'Exam Related'];

// Reusable component for the radial progress chart
function RadialProgress({ percentage, colorClass }: { percentage: number; colorClass: string }) {
    const radius = 52;
    const stroke = 10;
    const normalizedRadius = radius - stroke / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative h-36 w-36">
            <svg height="100%" width="100%" viewBox="0 0 120 120" className="-rotate-90">
                <circle className="text-muted/20" stroke="currentColor" strokeWidth={stroke} fill="transparent" r={normalizedRadius} cx={60} cy={60} />
                <circle className={colorClass} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" fill="transparent" r={normalizedRadius} cx={60} cy={60} style={{ strokeDasharray: `${circumference} ${circumference}`, strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease-out' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold font-heading">{percentage.toFixed(0)}%</span>
                <span className="text-xs text-muted-foreground">Overall</span>
            </div>
        </div>
    );
}

//Component for Today's Real-time Status
function TodaysStatus({ todayData }: { todayData: TodaysAttendanceRecord | null }) {
    if (!todayData) {
        return (
            <Alert variant="default" className="bg-muted/50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Pending</AlertTitle>
                <AlertDescription>Your class leader has not yet marked today's attendance.</AlertDescription>
            </Alert>
        )
    }
    if (todayData.is_leave_day) {
        return (
            <Alert variant="default" className="border-blue-500/50 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
                <CalendarDays className="h-4 w-4" />
                <AlertTitle>Leave Day</AlertTitle>
                <AlertDescription>Today is a leave day. No attendance will be recorded.</AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="space-y-3">
            <h4 className="font-semibold text-center">Today's Status ({format(new Date(), 'PPP')})</h4>
            <div className="grid grid-cols-4 gap-2">
                {periods.map((period, i) => {
                    const detail = todayData[period] as PeriodDetail;
                    const isPresent = detail?.status === 'Present';
                    const isExcused = excusedAbsences.includes(detail?.reason || '');
                    let bgColor = 'bg-destructive/10 text-destructive';
                    let Icon = XCircle;

                    if (isPresent) { bgColor = 'bg-green-600/10 text-green-700 dark:bg-green-900/40 dark:text-green-400'; Icon = CheckCircle2; }
                    else if (isExcused) { bgColor = 'bg-blue-500/10 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'; Icon = AlertCircle; }

                    const periodElement = (<div className={`p-2 rounded-md text-center ${bgColor} ${!isPresent ? 'cursor-pointer' : ''}`}><p className="font-bold text-xs">P{i + 1}</p><Icon className="h-5 w-5 mx-auto mt-1" /></div>);

                    if (isPresent) { return <div key={period}>{periodElement}</div>; }

                    return (
                        <Dialog key={period}>
                            <DialogTrigger asChild><button className="w-full text-left">{periodElement}</button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{detail?.reason || "Absent"} - Period {i + 1}</DialogTitle>
                                    <DialogDescription>Reason for your absence.</DialogDescription>
                                </DialogHeader>
                                <p className="text-sm text-muted-foreground">{detail?.description || "No description provided."}</p>
                            </DialogContent>
                        </Dialog>
                    )
                })}
            </div>
        </div>
    )
}

// Main component
export default function StudentAttendanceCard() {
    const { user, loading: userLoading } = useUserData();
    const [loading, setLoading] = useState(true);
    const [summaryData, setSummaryData] = useState<AttendanceSummary | null>(null);
    const [todayData, setTodayData] = useState<TodaysAttendanceRecord | null>(null);
    const todayString = format(new Date(), 'yyyy-MM-dd');

    // ======================================================
    // START OF THE FIX
    // ======================================================
    useEffect(() => {
        // Guard Clause: If user data is still loading or there is no user, stop here.
        if (userLoading || !user) {
            if (!userLoading) {
                setLoading(false); // Stop this component's loader if user loading is done
            }
            return;
        }

        // From this point on, TypeScript knows 'user' is not null.
        const fetchInitialData = async () => {
            setLoading(true);
            const summaryPromise = supabase.from('students_with_attendance').select('total_present, total_days').eq('uid', user.id).single();
            const todayPromise = supabase.from('attendance').select('*').eq('student_uid', user.id).eq('date', todayString).single();

            const [{ data: summary, error: summaryError }, { data: todayRecord, error: todayError }] = await Promise.all([summaryPromise, todayPromise]);

            if (summaryError) console.error("Error fetching summary:", summaryError.message);
            else setSummaryData(summary);

            if (todayError && todayError.code !== 'PGRST116') console.error("Error fetching today's attendance:", todayError.message);
            else setTodayData(todayRecord as TodaysAttendanceRecord | null);

            setLoading(false);
        };
        fetchInitialData();

        const channel = supabase.channel(`attendance-channel-${user.id}`)
            .on('postgres_changes',
                {
                    event: '*', schema: 'public', table: 'attendance',
                    filter: `student_uid=eq.${user.id}` // Now safe to use user.id
                },
                (payload) => {
                    const newRecord = payload.new as TodaysAttendanceRecord;
                    if (newRecord.date === todayString) {
                        setTodayData(newRecord);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, [user, userLoading, todayString]);
    // ======================================================
    // END OF THE FIX
    // ======================================================

    const attendanceInfo = useMemo(() => {
        if (!summaryData) return null;
        const { total_present, total_days } = summaryData;
        const percentage = total_days > 0 ? (total_present / total_days) * 100 : 0;
        let status: 'Good' | 'Average' | 'Poor', colorClass: string, description: string, Icon: React.ElementType;

        if (percentage >= 75) { status = 'Good'; colorClass = 'text-green-600'; description = "Excellent work! You're on track."; Icon = TrendingUp; }
        else if (percentage >= 50) { status = 'Average'; colorClass = 'text-yellow-600'; description = 'There is room for improvement.'; Icon = TrendingUp; }
        else { status = 'Poor'; colorClass = 'text-destructive'; description = 'Attendance is critically low.'; Icon = TrendingDown; }

        return { total_present, total_days, percentage, status, colorClass, description, Icon };
    }, [summaryData]);

    if (loading || userLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-1/3 mt-2" />
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6">
                    <Skeleton className="h-36 w-36 rounded-full" />
                    <div className="w-full space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!attendanceInfo) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>My Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground py-12">No attendance record found.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>My Attendance</CardTitle>
                <CardDescription>Your overall summary and today's live status.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
                <RadialProgress percentage={attendanceInfo.percentage} colorClass={attendanceInfo.colorClass} />
                <div className="w-full space-y-4">
                    <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
                        <div className="text-center">
                            <CalendarCheck2 className="mx-auto h-6 w-6 text-muted-foreground" />
                            <p className="text-xl font-bold">{attendanceInfo.total_present}</p>
                            <p className="text-xs text-muted-foreground">Days Present</p>
                        </div>
                        <div className="text-center">
                            <CalendarDays className="mx-auto h-6 w-6 text-muted-foreground" />
                            <p className="text-xl font-bold">{attendanceInfo.total_days}</p>
                            <p className="text-xs text-muted-foreground">Total Days</p>
                        </div>
                    </div>
                    <Alert className={`border-${attendanceInfo.colorClass.replace('text-','bg-')}/20 ${attendanceInfo.colorClass.replace('text-','bg-')}/10`}>
                        <attendanceInfo.Icon className={`h-4 w-4 ${attendanceInfo.colorClass}`} />
                        <AlertTitle className={attendanceInfo.colorClass}>{attendanceInfo.status} Standing</AlertTitle>
                        <AlertDescription>{attendanceInfo.description}</AlertDescription>
                    </Alert>
                    <div className="border-t pt-4">
                        <TodaysStatus todayData={todayData} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}