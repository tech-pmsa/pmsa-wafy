'use client'

import { useEffect, useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabaseClient'

// ShadCN & Icon Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Users, Percent } from 'lucide-react'

// Define the data structure for student attendance
interface StudentAttendance {
  class_id: string
  total_present: number
  total_days: number
}

// Reusable card for displaying key statistics
function StatCard({ title, value, icon: Icon, footer, colorClass = 'text-primary' }: { title: string; value: string; icon: React.ElementType; footer: string; colorClass?: string; }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-muted-foreground ${colorClass}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{footer}</p>
      </CardContent>
    </Card>
  )
}

// A specific tooltip for the officer's class-based chart
const ClassTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">Class</span>
            <span className="font-bold">{label}</span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">Avg. Attendance</span>
            <span className="font-bold text-primary">{`${payload[0].value.toFixed(1)}%`}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function CollegeAttendanceOverview() {
  const [allAttendance, setAllAttendance] = useState<StudentAttendance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('students_with_attendance')
        .select('class_id, total_present, total_days')

      if (error) {
        console.error("Error fetching attendance data:", error)
      } else if (data) {
        setAllAttendance(data)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const collegeData = useMemo(() => {
    const classMap = new Map<string, { totalPercentage: number, studentCount: number }>()

    allAttendance.forEach(s => {
      if (!s.class_id) return; // Skip if class_id is null or empty
      const percentage = s.total_days > 0 ? (s.total_present / s.total_days) * 100 : 0
      if (!classMap.has(s.class_id)) {
        classMap.set(s.class_id, { totalPercentage: 0, studentCount: 0 })
      }
      const current = classMap.get(s.class_id)!
      current.totalPercentage += percentage
      current.studentCount += 1
    })

    const chartData = Array.from(classMap.entries()).map(([class_id, data]) => ({
      name: class_id,
      average_attendance: data.studentCount > 0 ? data.totalPercentage / data.studentCount : 0,
    })).sort((a, b) => b.average_attendance - a.average_attendance)

    const overallAverage = chartData.reduce((sum, c) => sum + c.average_attendance, 0) / (chartData.length || 1)

    return {
      chartData,
      overallAverage,
      topClass: chartData[0],
      bottomClass: chartData[chartData.length - 1],
    }
  }, [allAttendance])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Overall College Average" value={`${collegeData.overallAverage.toFixed(1)}%`} icon={Percent} footer="Average of all class percentages" />
        <StatCard title="Top Performing Class" value={collegeData.topClass?.name || 'N/A'} icon={TrendingUp} footer={`${collegeData.topClass?.average_attendance.toFixed(1) || 0}% Average`} colorClass="text-brand-green" />
        <StatCard title="Lowest Performing Class" value={collegeData.bottomClass?.name || 'N/A'} icon={TrendingDown} footer={`${collegeData.bottomClass?.average_attendance.toFixed(1) || 0}% Average`} colorClass="text-destructive" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class Performance Comparison</CardTitle>
          <CardDescription>Average attendance percentage for each class.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collegeData.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} hide={collegeData.chartData.length > 10} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip content={<ClassTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="average_attendance" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}