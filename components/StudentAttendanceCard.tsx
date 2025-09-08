'use client'

import { useEffect, useState, useMemo } from 'react'
import { useUserData } from '@/hooks/useUserData'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CalendarCheck2, CalendarDays, TrendingUp, TrendingDown, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

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
    period_1: PeriodDetail; period_2: PeriodDetail; period_3: PeriodDetail; period_4: PeriodDetail;
    period_5: PeriodDetail; period_6: PeriodDetail; period_7: PeriodDetail; period_8: PeriodDetail;
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
                <circle className="text-neutral-medium/30" stroke="currentColor" strokeWidth={stroke} fill="transparent" r={normalizedRadius} cx={60} cy={60} />
                <circle className={colorClass} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" fill="transparent" r={normalizedRadius} cx={60} cy={60} style={{ strokeDasharray: `${circumference} ${circumference}`, strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease-out' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-neutral-black">{percentage.toFixed(0)}%</span>
                <span className="text-xs text-neutral-dark">Overall</span>
            </div>
        </div>
    );
}

// Component for Today's Real-time Status with Tooltips
function TodaysStatus({ todayData }: { todayData: TodaysAttendanceRecord | null }) {
    if (!todayData) {
        return (
            <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="font-semibold">Today's Attendance is Pending</p>
                <p className="text-sm text-muted-foreground">Your class leader has not yet marked today's attendance.</p>
            </div>
        )
    }
    if (todayData.is_leave_day) {
        return (
            <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="font-semibold text-blue-800">Today is a Leave Day</p>
                <p className="text-sm text-blue-700">No attendance will be recorded.</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <h4 className="font-semibold text-center">Today's Status ({format(new Date(), 'PPP')})</h4>
            <div className="grid grid-cols-4 gap-2">
                {periods.map((period, i) => {
                    const detail = (todayData as any)[period] as PeriodDetail;
                    const isPresent = detail?.status === 'Present';
                    const isExcused = excusedAbsences.includes(detail?.reason || '');
                    let bgColor = 'bg-destructive/10 text-destructive';
                    let Icon = XCircle;

                    if (isPresent) {
                        bgColor = 'bg-green-600/10 text-green-700';
                        Icon = CheckCircle2;
                    } else if (isExcused) {
                        bgColor = 'bg-blue-500/10 text-blue-700';
                        Icon = AlertCircle;
                    }

                    return (
                        <TooltipProvider key={period}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className={`p-2 rounded-md text-center ${bgColor} ${!isPresent ? 'cursor-pointer' : ''}`}>
                                        <p className="font-bold text-xs">P{i + 1}</p>
                                        <Icon className="h-5 w-5 mx-auto mt-1" />
                                    </div>
                                </TooltipTrigger>
                                {!isPresent && (
                                    <TooltipContent>
                                        <p className="font-semibold">{detail?.reason || "Absent"}</p>
                                        {detail?.description && (
                                            <p className="text-sm text-muted-foreground max-w-xs">{detail.description}</p>
                                        )}
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
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

    useEffect(() => {
        if (user?.id) {
            const fetchInitialData = async () => {
                setLoading(true);
                const summaryPromise = supabase.from('students_with_attendance').select('total_present, total_days').eq('uid', user.id).single();
                const todayPromise = supabase.from('attendance').select('*').eq('student_uid', user.id).eq('date', todayString).single();

                const [{ data: summary, error: summaryError }, { data: todayRecord, error: todayError }] = await Promise.all([summaryPromise, todayPromise]);

                if (summaryError) console.error("Error fetching summary:", summaryError.message);
                else setSummaryData(summary);

                if (todayError && todayError.code !== 'PGRST116') console.error("Error fetching today's attendance:", todayError.message);
                else setTodayData(todayRecord);

                setLoading(false);
            };
            fetchInitialData();

            const channel = supabase.channel(`attendance-channel-${user.id}`)
                .on('postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'attendance',
                        filter: `student_uid=eq.${user.id}`
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

        } else if (!userLoading) {
            setLoading(false);
        }
    }, [user, userLoading, todayString]);

    const attendanceInfo = useMemo(() => {
        if (!summaryData) return null;
        const { total_present, total_days } = summaryData;
        const percentage = total_days > 0 ? (total_present / total_days) * 100 : 0;
        let status: 'Good' | 'Average' | 'Poor';
        let colorClass: string;
        let description: string;
        let Icon: React.ElementType;

        if (percentage >= 75) { status = 'Good'; colorClass = 'text-brand-green'; description = "Excellent work! You're on track."; Icon = TrendingUp; }
        else if (percentage >= 50) { status = 'Average'; colorClass = 'text-brand-yellow-dark'; description = 'There is room for improvement.'; Icon = TrendingUp; }
        else { status = 'Poor'; colorClass = 'text-destructive'; description = 'Attendance is critically low.'; Icon = TrendingDown; }

        return { total_present, total_days, percentage, status, colorClass, description, Icon };
    }, [summaryData]);

    if (loading || userLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6">
                    <Skeleton className="h-36 w-36 rounded-full" />
                    <div className="w-full space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
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
                    <p className="text-center text-neutral-dark">No attendance record found.</p>
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
                    <div className="flex justify-around rounded-lg bg-neutral-light p-4">
                        <div className="text-center">
                            <CalendarCheck2 className="mx-auto h-6 w-6 text-neutral-dark" />
                            <p className="text-xl font-bold text-neutral-black">{attendanceInfo.total_present}</p>
                            <p className="text-xs text-neutral-dark">Days Present</p>
                        </div>
                        <div className="text-center">
                            <CalendarDays className="mx-auto h-6 w-6 text-neutral-dark" />
                            <p className="text-xl font-bold text-neutral-black">{attendanceInfo.total_days}</p>
                            <p className="text-xs text-neutral-dark">Total Days</p>
                        </div>
                    </div>
                    <div className={`flex items-center justify-center gap-2 rounded-lg p-3 text-center ${attendanceInfo.colorClass.replace('text-', 'bg-')}/10`}>
                       <attendanceInfo.Icon className={`h-5 w-5 ${attendanceInfo.colorClass}`} />
                       <div>
                           <p className={`font-semibold ${attendanceInfo.colorClass}`}>{attendanceInfo.status} Standing</p>
                           <p className="text-xs text-neutral-dark">{attendanceInfo.description}</p>
                       </div>
                   </div>
                    <div className="border-t pt-4">
                        <TodaysStatus todayData={todayData} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
