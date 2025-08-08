'use client'

import { useEffect, useState, useMemo } from 'react'
import { useUserData } from '@/hooks/useUserData' // Using the main user data hook
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarCheck2, CalendarDays, TrendingUp, TrendingDown } from 'lucide-react'

// This is a reusable component for the radial progress chart.
// It's well-designed, so we'll just ensure it uses our theme colors.
function RadialProgress({ percentage, colorClass }: { percentage: number; colorClass: string }) {
  const radius = 52;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative h-36 w-36">
      <svg height="100%" width="100%" viewBox="0 0 120 120" className="-rotate-90">
        {/* Background Circle */}
        <circle
          className="text-neutral-medium/30"
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={60}
          cy={60}
        />
        {/* Foreground Circle (Progress) */}
        <circle
          className={colorClass}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={60}
          cy={60}
          style={{
            strokeDasharray: `${circumference} ${circumference}`,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.8s ease-out',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-neutral-black">{percentage.toFixed(0)}%</span>
        <span className="text-xs text-neutral-dark">Overall</span>
      </div>
    </div>
  );
}

// Main component
export default function StudentAttendanceCard() {
  const { user, loading: userLoading } = useUserData(); // Get user from our hook
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<{
    total_present: number
    total_days: number
  } | null>(null);

  useEffect(() => {
    // Only fetch data if we have a user
    if (user?.id) {
      const fetchAttendance = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('students_with_attendance') // Assuming this is a view or RPC
          .select('total_present, total_days')
          .eq('uid', user.id)
          .single();

        if (error) {
          console.error("Error fetching student attendance:", error.message);
        } else {
          setAttendanceData(data);
        }
        setLoading(false);
      };
      fetchAttendance();
    } else if (!userLoading) {
      // If user loading is finished and there's no user, stop loading.
      setLoading(false);
    }
  }, [user, userLoading]);

  // Memoize calculations for performance
  const attendanceInfo = useMemo(() => {
    if (!attendanceData) return null;

    const { total_present, total_days } = attendanceData;
    const percentage = total_days > 0 ? (total_present / total_days) * 100 : 0;

    let status: 'Good' | 'Average' | 'Poor';
    let colorClass: string;
    let description: string;
    let Icon: React.ElementType;

    if (percentage >= 75) {
      status = 'Good';
      colorClass = 'text-brand-green';
      description = "Excellent work! You're on track.";
      Icon = TrendingUp;
    } else if (percentage >= 50) {
      status = 'Average';
      colorClass = 'text-brand-yellow-dark';
      description = 'There is room for improvement.';
      Icon = TrendingUp;
    } else {
      status = 'Poor';
      colorClass = 'text-destructive';
      description = 'Attendance is critically low.';
      Icon = TrendingDown;
    }

    return { total_present, total_days, percentage, status, colorClass, description, Icon };
  }, [attendanceData]);

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
        <CardDescription>Your overall attendance summary.</CardDescription>
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
        </div>
      </CardContent>
    </Card>
  );
}