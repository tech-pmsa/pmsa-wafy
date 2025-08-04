'use client'

import { useEffect, useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { supabase } from '@/lib/supabaseClient'

// Shadcn/UI & Icon Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Users, BarChart2, List } from 'lucide-react'

// Define the structure for a student
interface Student {
  uid: string
  name: string
  class_id: string
  batch: string
  council: string
  total_present: number
  total_days: number
}

// A reusable card for displaying key attendance stats
function StatCard({
  title,
  value,
  icon: Icon,
  footer,
}: {
  title: string
  value: string
  icon: React.ElementType
  footer: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{footer}</p>
      </CardContent>
    </Card>
  )
}

// A custom tooltip for the bar chart for a cleaner look
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">Student</span>
            <span className="font-bold">{label}</span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">Attendance</span>
            <span className="font-bold text-primary">{`${payload[0].value.toFixed(1)}%`}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function ClassAttendanceChart() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'chart' | 'details'>('chart')

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return setLoading(false)

      const { data: profile } = await supabase
        .from('profiles')
        .select('designation, role')
        .eq('uid', user.id)
        .single()

      if (!profile || profile.role !== 'class') {
        return setLoading(false)
      }

      const classId = profile.designation.replace(' Class', '')
      const { data, error } = await supabase
        .from('students_with_attendance')
        .select('*')
        .eq('class_id', classId)

      if (error) {
        console.error('Error fetching students', error)
      } else if (data) {
        setStudents(data as Student[])
      }
      setLoading(false)
    }
    fetchStudents()
  }, [])

  // Memoize calculations for performance
  const attendanceData = useMemo(() => {
    const processed = students.map((s) => ({
      name: s.name,
      percentage: s.total_days > 0 ? (s.total_present / s.total_days) * 100 : 0,
      total: `${s.total_present} / ${s.total_days}`,
    })).sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending

    const totalPercentage = processed.reduce((sum, s) => sum + s.percentage, 0)
    const average = processed.length > 0 ? totalPercentage / processed.length : 0
    const topPerformer = processed[0]
    const lowPerformer = processed[processed.length - 1]

    return {
      chartData: processed,
      average,
      topPerformer,
      lowPerformer,
    }
  }, [students])

  if (loading) {
    return (
        <div className="p-4 md:p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No student attendance data found for your class.
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Average Attendance"
          value={`${attendanceData.average.toFixed(1)}%`}
          icon={Users}
          footer="Average for the entire class"
        />
        <StatCard
          title="Top Performer"
          value={attendanceData.topPerformer?.name || 'N/A'}
          icon={TrendingUp}
          footer={`${attendanceData.topPerformer?.percentage.toFixed(1)}% Attendance`}
        />
        <StatCard
          title="Lowest Performer"
          value={attendanceData.lowPerformer?.name || 'N/A'}
          icon={TrendingDown}
          footer={`${attendanceData.lowPerformer?.percentage.toFixed(1)}% Attendance`}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Attendance Overview</CardTitle>
            <CardDescription>
              {view === 'chart' ? 'Visual summary of student attendance' : 'Detailed list of all students'}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setView(view === 'chart' ? 'details' : 'chart')}>
            {view === 'chart' ? <List className="mr-2 h-4 w-4" /> : <BarChart2 className="mr-2 h-4 w-4" />}
            {view === 'chart' ? 'Detailed View' : 'Chart View'}
          </Button>
        </CardHeader>
        <CardContent>
          {view === 'chart' ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={attendanceData.chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="percentage" fill="url(#colorUv)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <TableRow>
                    <TableHead className="w-[200px]">Student Name</TableHead>
                    <TableHead>Attendance (%)</TableHead>
                    <TableHead className="text-right">Present / Total Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.chartData.map((student) => (
                    <TableRow key={student.name}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4">
                           <Progress value={student.percentage} className="w-full md:w-40 h-2" />
                           <span className="text-sm font-medium text-muted-foreground hidden md:inline">
                            {student.percentage.toFixed(1)}%
                           </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{student.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}