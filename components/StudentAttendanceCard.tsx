'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarCheck2, CalendarDays } from 'lucide-react'

// A new, custom component for the radial progress chart
function RadialProgress({ percentage, colorClass }: { percentage: number; colorClass: string }) {
  const radius = 60; // Increased radius for a slightly larger viewBox
  const stroke = 10;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative h-40 w-40">
      <svg
        height="100%"
        width="100%"
        viewBox="0 0 120 120"
        className="-rotate-90"
      >
        {/* Background Circle */}
        <circle
          className="text-muted/20"
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Foreground Circle (Progress) */}
        <circle
          className={colorClass}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.5s ease-out',
          }}
        />
        {/* Text Element for Perfect Centering */}
        <text
          // Counter-rotate the text to make it upright
          transform={`rotate(90 ${radius} ${radius})`}
          // Center the text block horizontally and vertically
          textAnchor="middle"
          dominantBaseline="middle"
          x="50%"
          y="50%"
          className="fill-current text-foreground"
        >
          {/* First line: Percentage */}
          <tspan
            className="text-2xl font-bold"
            x="50%"
            dy="-0.2em" // Nudge up slightly
          >
            {percentage.toFixed(0)}%
          </tspan>
          {/* Second line: "Attendance" */}
          <tspan
            className="text-xs font-medium text-muted-foreground"
            x="50%"
            dy="1.4em" // Move down from the percentage line
          >
            Attendance
          </tspan>
        </text>
      </svg>
    </div>
  );
}

const StudentAttendanceCard = () => {
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<{
    name: string
    class_id: string
    total_present: number
    total_days: number
  } | null>(null)

  useEffect(() => {
    const fetchStudent = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('students_with_attendance')
        .select('name, class_id, total_present, total_days')
        .eq('uid', user.id)
        .single()

      if (!error && data) {
        setStudent(data)
      } else if (error) {
        console.error("Error fetching student attendance:", error.message)
      }
      setLoading(false)
    }
    fetchStudent()
  }, [])

  // Memoize calculations for performance and cleaner render logic
  const attendanceInfo = useMemo(() => {
    if (!student) return null;

    const percentage = student.total_days > 0
        ? (student.total_present / student.total_days) * 100
        : 0;

    let status = 'Good';
    let colorClass = 'text-green-500';
    let description = "You're on track. Keep it up!";

    if (percentage < 75 && percentage >= 50) {
      status = 'Average';
      colorClass = 'text-orange-500';
      description = 'There is room for improvement. Try not to miss any more classes.';
    } else if (percentage < 50) {
      status = 'Poor';
      colorClass = 'text-red-500';
      description = 'Your attendance is low. Please attend classes regularly.';
    }

    return { ...student, percentage, status, colorClass, description };
  }, [student]);

  if (loading) {
    return (
        <Card className="w-full max-w-md">
            <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
            <CardContent className="flex flex-col items-center gap-4 pt-0 md:flex-row">
                <Skeleton className="h-40 w-40 rounded-full" />
                <div className="flex-1 space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-10 w-3/4" />
                </div>
            </CardContent>
        </Card>
    );
  }

  if (!attendanceInfo) {
    return (
      <Card className="w-full max-w-md p-6 text-center text-muted-foreground">
        No attendance record found.
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md overflow-hidden">
      <CardHeader>
        <CardTitle className="text-2xl">{attendanceInfo.name}</CardTitle>
        <CardDescription>Class: {attendanceInfo.class_id}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex flex-col items-center gap-6 md:flex-row">
          <RadialProgress percentage={attendanceInfo.percentage} colorClass={attendanceInfo.colorClass} />
          <div className="flex-1 space-y-4">
            <div className="flex justify-around">
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
            <div className={`rounded-lg p-3 text-center ${attendanceInfo.colorClass.replace('text-', 'bg-')}/10`}>
              <p className={`font-semibold ${attendanceInfo.colorClass}`}>{attendanceInfo.status} Standing</p>
              <p className="text-xs text-muted-foreground">{attendanceInfo.description}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default StudentAttendanceCard