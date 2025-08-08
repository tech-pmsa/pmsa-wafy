'use client'

import { useEffect, useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabaseClient'
import { useUserData } from '@/hooks/useUserData'

// ShadCN & Icon Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, Users, AlertTriangle, BarChart2, List } from 'lucide-react'

interface StudentAttendance {
  name: string
  total_present: number
  total_days: number
}

function StatCard({ title, value, icon: Icon, footer }: { title: string; value: string; icon: React.ElementType; footer: string; }) {
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1"><span className="text-[0.70rem] uppercase text-muted-foreground">Student</span><span className="font-bold">{label}</span></div>
          <div className="flex flex-col space-y-1"><span className="text-[0.70rem] uppercase text-muted-foreground">Attendance</span><span className="font-bold text-primary">{`${payload[0].value.toFixed(1)}%`}</span></div>
        </div>
      </div>
    );
  }
  return null;
};

export default function ClassAttendanceDashboard() {
  const { details, loading: userLoading } = useUserData();
  const [classAttendance, setClassAttendance] = useState<StudentAttendance[]>([])
  const [view, setView] = useState<'chart' | 'details'>('chart')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const classId = details?.designation?.replace(' Class', '');
    if (userLoading || !classId) {
        if (!userLoading) setLoading(false);
        return;
    }

    const fetchData = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('students_with_attendance')
        .select('name, total_present, total_days')
        .eq('class_id', classId)

      if (error) console.error("Error fetching attendance data:", error)
      else setClassAttendance(data || [])
      setLoading(false)
    }
    fetchData()
  }, [details, userLoading])

  const classData = useMemo(() => {
    const processed = classAttendance.map(s => ({
      name: s.name,
      percentage: s.total_days > 0 ? (s.total_present / s.total_days) * 100 : 0,
      total: `${s.total_present} / ${s.total_days}`,
    })).sort((a, b) => b.percentage - a.percentage)

    const totalPercentage = processed.reduce((sum, s) => sum + s.percentage, 0)
    const average = processed.length > 0 ? totalPercentage / processed.length : 0
    const belowThreshold = processed.filter(s => s.percentage < 75).length

    return { students: processed, average, topPerformer: processed[0], belowThreshold }
  }, [classAttendance])

  if (loading || userLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  if (classAttendance.length === 0) {
    return <Card><CardHeader><CardTitle>Class Attendance</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">No attendance data is available for your class yet.</p></CardContent></Card>
  }

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Class Average" value={`${classData.average.toFixed(1)}%`} icon={Users} footer="Average attendance for all students" />
            <StatCard title="Top Performer" value={classData.topPerformer?.name || 'N/A'} icon={TrendingUp} footer={`${classData.topPerformer?.percentage.toFixed(1)}% Attendance`} />
            <StatCard title="Below 75% Attendance" value={classData.belowThreshold.toString()} icon={AlertTriangle} footer="Students needing attention" />
        </div>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Student Performance</CardTitle><CardDescription>Toggle between chart and detailed list view.</CardDescription></div>
                <Button variant="outline" size="sm" onClick={() => setView(view === 'chart' ? 'details' : 'chart')}>
                    {view === 'chart' ? <List className="mr-2 h-4 w-4" /> : <BarChart2 className="mr-2 h-4 w-4" />}
                    {view === 'chart' ? 'Details' : 'Chart'}
                </Button>
            </CardHeader>
            <CardContent>
                {view === 'chart' ? (
                    <div className="h-[400px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={classData.students}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} hide={classData.students.length > 8} /><YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} /><Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} /><Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
                ) : (
                    <div className="overflow-auto max-h-[400px] border rounded-md"><Table><TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm"><TableRow><TableHead className="w-[250px]">Student Name</TableHead><TableHead>Attendance (%)</TableHead><TableHead className="text-right">Present / Total Days</TableHead></TableRow></TableHeader><TableBody>{classData.students.map((student) => (<TableRow key={student.name}><TableCell className="font-medium">{student.name}</TableCell><TableCell><div className="flex items-center gap-4"><Progress value={student.percentage} className="w-full md:w-48 h-2" /> <span className="text-sm font-medium text-muted-foreground hidden md:inline">{student.percentage.toFixed(1)}%</span></div></TableCell><TableCell className="text-right font-mono">{student.total}</TableCell></TableRow>))}</TableBody></Table></div>
                )}
            </CardContent>
        </Card>
    </div>
  )
}