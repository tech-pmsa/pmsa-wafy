'use client'

import { useEffect, useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabaseClient'
import { useUserData } from '@/hooks/useUserData'
import { format } from 'date-fns'

// ShadCN & Icon Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { TrendingUp, Users, AlertTriangle, BarChart2, List, CheckCircle2, XCircle, AlertCircle, Search, Clock } from 'lucide-react'

// --- Type Definitions ---
interface StudentAttendanceData {
    uid: string;
    name: string;
    total_present: number;
    total_days: number;
    today_attendance: TodaysAttendanceRecord | null;
}
interface PeriodDetail { status: 'Present' | 'Absent'; reason?: string; description?: string }
interface TodaysAttendanceRecord { is_leave_day: boolean; period_1: PeriodDetail; period_2: PeriodDetail; period_3: PeriodDetail; period_4: PeriodDetail; period_5: PeriodDetail; period_6: PeriodDetail; period_7: PeriodDetail; period_8: PeriodDetail; }
const periods = Array.from({ length: 8 }, (_, i) => `period_${i + 1}`);
const excusedAbsences = ['Cic Related', 'Wsf Related', 'Exam Related'];

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

function TodayStatusGrid({ students }: { students: StudentAttendanceData[] }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map(student => (
                <Card key={student.uid}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base truncate">{student.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {student.today_attendance?.is_leave_day ? (
                            <p className="text-sm font-semibold text-blue-600">Leave Day</p>
                        ) : student.today_attendance ? (
                            <div className="grid grid-cols-4 gap-1">
                                {periods.map((period, i) => {
                                    const detail = (student.today_attendance as any)[period] as PeriodDetail;
                                    const isPresent = detail?.status === 'Present';
                                    const isExcused = excusedAbsences.includes(detail?.reason || '');
                                    let Icon = XCircle;
                                    let color = "text-destructive";
                                    if (isPresent) { Icon = CheckCircle2; color = "text-green-600"; }
                                    else if (isExcused) { Icon = AlertCircle; color = "text-blue-600"; }

                                    const periodElement = (
                                        <div className={`flex flex-col items-center p-1 rounded-md border ${color.replace('text-', 'border-')}/40`}>
                                            <span className="text-xs font-bold">P{i + 1}</span>
                                            <Icon className={`h-4 w-4 ${color}`} />
                                        </div>
                                    );

                                    if (isPresent) {
                                        return <div key={period}>{periodElement}</div>;
                                    }

                                    return (
                                        <Dialog key={period}>
                                            <DialogTrigger asChild>
                                                <button className="w-full text-left">{periodElement}</button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>{detail?.reason || "Absent"} - Period {i + 1}</DialogTitle>
                                                    <DialogDescription>
                                                        Reason for {student.name}'s absence.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <p className="text-sm text-muted-foreground">{detail?.description || "No description provided."}</p>
                                            </DialogContent>
                                        </Dialog>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">Pending...</p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

export default function ClassAttendanceDashboard() {
  const { details, loading: userLoading } = useUserData();
  const [classAttendance, setClassAttendance] = useState<StudentAttendanceData[]>([])
  const [view, setView] = useState<'chart' | 'details' | 'status'>('chart')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const classId = details?.designation?.replace(' Class', '');
    if (userLoading || !classId) {
        if (!userLoading) setLoading(false);
        return;
    }

    const fetchData = async () => {
      setLoading(true);
      const todayString = format(new Date(), 'yyyy-MM-dd');

      const summaryPromise = supabase.from('students_with_attendance').select('uid, name, total_present, total_days').eq('class_id', classId);
      const todayPromise = supabase.from('attendance').select('*').eq('class_id', classId).eq('date', todayString);

      const [{ data: summaryData, error: summaryError }, { data: todayData, error: todayError }] = await Promise.all([summaryPromise, todayPromise]);

      if (summaryError) console.error("Error fetching attendance data:", summaryError);
      if (todayError) console.error("Error fetching today's data:", todayError);

      if (summaryData) {
        const todayAttendanceMap = new Map();
        if(todayData) {
            todayData.forEach(rec => { todayAttendanceMap.set(rec.student_uid, rec); });
        }
        const combinedData = summaryData.map(student => ({
            ...student,
            today_attendance: todayAttendanceMap.get(student.uid) || null
        }));
        setClassAttendance(combinedData);
      }
      setLoading(false);
    }
    fetchData();

    const todayString = format(new Date(), 'yyyy-MM-dd');
    const channel = supabase.channel(`class-attendance-${classId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `class_id=eq.${classId}`},
        (payload) => {
            const updatedRecord = payload.new as any;
            if(updatedRecord.date === todayString) {
                setClassAttendance(prev => prev.map(student =>
                    student.uid === updatedRecord.student_uid
                    ? { ...student, today_attendance: updatedRecord }
                    : student
                ));
            }
        }).subscribe();

    return () => { supabase.removeChannel(channel); };

  }, [details, userLoading]);

  const filteredStudents = useMemo(() => {
    return classAttendance.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [classAttendance, searchTerm]);

  const classData = useMemo(() => {
    const processed = filteredStudents.map(s => {
      const total_absent = s.total_days - s.total_present;
      const points_deducted = Math.floor(total_absent / 2) * 2;
      const points = Math.max(0, 20 - points_deducted);
      return {
        ...s,
        percentage: s.total_days > 0 ? (s.total_present / s.total_days) * 100 : 0,
        total: `${s.total_present} / ${s.total_days}`,
        points,
      }
    }).sort((a, b) => b.percentage - a.percentage);

    const totalPercentage = processed.reduce((sum, s) => sum + s.percentage, 0);
    const average = processed.length > 0 ? totalPercentage / processed.length : 0;
    const belowThreshold = processed.filter(s => s.percentage < 75).length;

    return { students: processed, average, topPerformer: processed[0], belowThreshold };
  }, [filteredStudents]);

  if (loading || userLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  if (classAttendance.length === 0) {
    return <Card><CardHeader><CardTitle>Class Attendance</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">No attendance data is available for your class yet.</p></CardContent></Card>
  }

  const toggleView = () => {
    if (view === 'chart') setView('details');
    else if (view === 'details') setView('status');
    else setView('chart');
  }

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Class Average" value={`${classData.average.toFixed(1)}%`} icon={Users} footer="Average attendance for all students" />
            <StatCard title="Top Performer" value={classData.topPerformer?.name || 'N/A'} icon={TrendingUp} footer={`${classData.topPerformer?.percentage.toFixed(1)}% Attendance`} />
            <StatCard title="Below 75% Attendance" value={classData.belowThreshold.toString()} icon={AlertTriangle} footer="Students needing attention" />
        </div>
        <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div><CardTitle>Student Performance</CardTitle><CardDescription>Toggle between chart, list, and live status views.</CardDescription></div>
                <div className="flex w-full md:w-auto items-center gap-2">
                    <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search students..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" /></div>
                    <Button variant="outline" size="sm" onClick={toggleView}>
                        {view === 'chart' && <><List className="mr-2 h-4 w-4" />Details</>}
                        {view === 'details' && <><Clock className="mr-2 h-4 w-4" />Live Status</>}
                        {view === 'status' && <><BarChart2 className="mr-2 h-4 w-4" />Chart</>}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {view === 'chart' && (
                    <div className="h-[400px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={classData.students}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} hide={classData.students.length > 8} /><YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} /><Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} /><Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
                )}
                {view === 'details' && (
                    <div className="overflow-hidden border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead className="hidden md:table-cell">Attendance</TableHead>
                                    <TableHead className="hidden md:table-cell text-center">Days</TableHead>
                                    <TableHead className="text-right">Points</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {classData.students.map(student => (
                                    <TableRow key={student.uid}>
                                        <TableCell className="font-medium">{student.name}</TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <div className="flex items-center gap-2">
                                                <Progress value={student.percentage} className="w-24 h-2" />
                                                <span className="text-sm font-semibold text-muted-foreground">{student.percentage.toFixed(1)}%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-sm hidden md:table-cell">{student.total}</TableCell>
                                        <TableCell className={`text-right font-bold text-lg ${student.points < 10 ? 'text-destructive' : 'text-primary'}`}>{student.points} <span className="text-xs font-medium text-muted-foreground">/ 20</span></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
                {view === 'status' && (
                    <TodayStatusGrid students={classData.students} />
                )}
            </CardContent>
        </Card>
    </div>
  )
}
