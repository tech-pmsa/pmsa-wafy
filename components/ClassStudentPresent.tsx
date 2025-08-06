'use client'

import { useEffect, useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabaseClient'

// ShadCN & Icon Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Users, BarChart2, List, AlertTriangle } from 'lucide-react'

// Define the data structure for student attendance
interface StudentAttendance {
  uid: string
  name: string
  class_id: string
  total_present: number
  total_days: number
}

// Reusable card for displaying key statistics
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

// A more structured custom tooltip for the bar chart
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

export default function ClassAttendanceDashboard() {
  const [allAttendance, setAllAttendance] = useState<StudentAttendance[]>([])
  const [classIds, setClassIds] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [view, setView] = useState<'chart' | 'details'>('chart')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('students_with_attendance')
        .select('uid, name, class_id, total_present, total_days')

      if (error) {
        console.error("Error fetching attendance data:", error)
      } else if (data) {
        setAllAttendance(data)
        const uniqueClasses = [...new Set(data.map(d => d.class_id))].sort()
        setClassIds(uniqueClasses)
        if (uniqueClasses.length > 0) {
          setSelectedClass(uniqueClasses[0])
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const classData = useMemo(() => {
    const filtered = allAttendance.filter(s => s.class_id === selectedClass)
    const processed = filtered.map(s => ({
      name: s.name,
      percentage: s.total_days > 0 ? (s.total_present / s.total_days) * 100 : 0,
      total: `${s.total_present} / ${s.total_days}`,
    })).sort((a, b) => b.percentage - a.percentage)

    const totalPercentage = processed.reduce((sum, s) => sum + s.percentage, 0)
    const average = processed.length > 0 ? totalPercentage / processed.length : 0
    const belowThreshold = processed.filter(s => s.percentage < 75).length

    return {
      students: processed,
      average,
      topPerformer: processed[0],
      belowThreshold,
    }
  }, [selectedClass, allAttendance])

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-10 w-full" />
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
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">College Attendance</h1>
        <p className="text-muted-foreground">
          Select a class to view its attendance summary.
        </p>
      </div>

      {classIds.length > 0 && (
        <div className="w-full overflow-x-auto pb-1">
          <Tabs value={selectedClass} onValueChange={setSelectedClass} className="w-max">
            <TabsList>
              {classIds.map(classId => (
                <TabsTrigger key={classId} value={classId}>
                  {classId}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {classData.students.length === 0 ? (
        <div className="text-center text-muted-foreground pt-8">
          No attendance data available for {selectedClass}.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             <StatCard title="Class Average" value={`${classData.average.toFixed(1)}%`} icon={Users} footer={`Average attendance for ${selectedClass}`}/>
             <StatCard title="Top Performer" value={classData.topPerformer?.name || 'N/A'} icon={TrendingUp} footer={`${classData.topPerformer?.percentage.toFixed(1)}% Attendance`}/>
             <StatCard title="Below 75% Attendance" value={classData.belowThreshold.toString()} icon={AlertTriangle} footer={`Students needing attention`}/>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Attendance Overview for {selectedClass}</CardTitle>
                <CardDescription>Toggle between chart and detailed list view.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setView(view === 'chart' ? 'details' : 'chart')}>
                {view === 'chart' ? <List className="mr-2 h-4 w-4" /> : <BarChart2 className="mr-2 h-4 w-4" />}
                {view === 'chart' ? 'Detailed View' : 'Chart View'}
              </Button>
            </CardHeader>
            <CardContent>
              {view === 'chart' ? (
                // ======================================================
                // START OF UPDATED CHART SECTION
                // ======================================================
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[600px] h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classData.students}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="#888888"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          // Hide labels if there are too many bars to prevent overlap
                          hide={classData.students.length > 8}
                        />
                        <YAxis
                          stroke="#888888"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip
                          content={<CustomTooltip />} // Use our modern tooltip
                          cursor={{ fill: 'hsl(var(--muted))' }}
                        />
                        <Bar dataKey="percentage" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                // ======================================================
                // END OF UPDATED CHART SECTION
                // ======================================================
              ) : (
                <div className="overflow-auto max-h-[400px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="w-[250px]">Student Name</TableHead>
                        <TableHead>Attendance (%)</TableHead>
                        <TableHead className="text-right">Present / Total Days</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classData.students.map((student) => (
                        <TableRow key={student.name}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-4">
                              <Progress value={student.percentage} className="w-full md:w-48 h-2" />
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
        </>
      )}
    </div>
  )
}