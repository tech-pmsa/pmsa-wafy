// components/admin/CollegeAttendanceOverview.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts'
import { supabase } from '@/lib/supabaseClient'
import { format } from 'date-fns'

// ShadCN & Icon Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { TrendingUp, TrendingDown, Users, Percent, CheckCircle2, XCircle, AlertCircle, AlertTriangle, Search } from 'lucide-react'

// Type Definitions
interface PeriodDetail { status: 'Present' | 'Absent'; reason?: string; description?: string; }
interface TodaysAttendanceRecord { is_leave_day: boolean; [key: string]: any; }
interface StudentFullAttendance { uid: string; name: string; class_id: string; total_present: number; total_days: number; today_attendance: TodaysAttendanceRecord | null; }
const periods = Array.from({ length: 8 }, (_, i) => `period_${i + 1}`);
const excusedAbsences = ['Cic Related', 'Wsf Related', 'Exam Related'];

// Reusable Components
function StatCard({ title, value, icon: Icon, footer, colorClass = 'text-primary' }: { title: string; value: string; icon: React.ElementType; footer: string; colorClass?: string; }) {
    return (<Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle><Icon className={`h-4 w-4 text-muted-foreground ${colorClass}`} /></CardHeader><CardContent><div className="text-2xl font-bold">{value}</div><p className="text-xs text-muted-foreground">{footer}</p></CardContent></Card>)
}

const ClassTooltip = ({ active, payload, label }: any) => { if (active && payload && payload.length) { return (<div className="rounded-lg border bg-background p-2 shadow-sm"><div className="grid grid-cols-2 gap-2"><div className="flex flex-col space-y-1"><span className="text-[0.70rem] uppercase text-muted-foreground">Class</span><span className="font-bold">{label}</span></div><div className="flex flex-col space-y-1"><span className="text-[0.70rem] uppercase text-muted-foreground">Avg. Attendance</span><span className="font-bold text-primary">{`${payload[0].value.toFixed(1)}%`}</span></div></div></div>); } return null; };

// Redesigned, Fully Responsive Modal Component
function ClassDetailModal({ isOpen, onClose, classId, students }: { isOpen: boolean; onClose: () => void; classId: string; students: StudentFullAttendance[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredStudents = useMemo(() => students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())), [students, searchTerm]);

    const classData = useMemo(() => {
        const processed = filteredStudents.map(s => {
            const total_absent = s.total_days - s.total_present;
            const points_deducted = Math.floor(total_absent / 2) * 2;
            const points = Math.max(0, 20 - points_deducted);
            return { ...s, percentage: s.total_days > 0 ? (s.total_present / s.total_days) * 100 : 0, total: `${s.total_present}/${s.total_days}`, points };
        }).sort((a, b) => b.percentage - a.percentage);
        const totalPercentage = processed.reduce((sum, s) => sum + s.percentage, 0);
        const average = processed.length > 0 ? totalPercentage / processed.length : 0;
        const belowThreshold = processed.filter(s => s.percentage < 75).length;
        return { students: processed, average, belowThreshold };
    }, [filteredStudents]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Class Overview: {classId}</DialogTitle>
                    <DialogDescription>Detailed attendance metrics and live status for this class.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 md:grid-cols-3 my-2">
                    <StatCard title="Class Average" value={`${classData.average.toFixed(1)}%`} icon={Users} footer={`${students.length} students in class`} />
                    <StatCard title="Below 75%" value={classData.belowThreshold.toString()} icon={AlertTriangle} footer="Students needing attention" />
                    <div className="relative md:col-span-1 self-end"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search student..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div>
                </div>
                <Tabs defaultValue="details" className="w-full flex-1 flex flex-col mt-2 overflow-hidden">
                    <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="details">Detailed List</TabsTrigger><TabsTrigger value="status">Today's Live Status</TabsTrigger></TabsList>
                    <TabsContent value="details" className="mt-4 flex-1 overflow-y-auto pr-2">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10"><TableRow><TableHead>Student</TableHead><TableHead className="hidden sm:table-cell">Attendance</TableHead><TableHead className="hidden md:table-cell text-center">Days</TableHead><TableHead className="text-right">Points</TableHead></TableRow></TableHeader>
                            <TableBody>{classData.students.map(s => (<TableRow key={s.uid}><TableCell className="font-medium">{s.name}</TableCell><TableCell className="hidden sm:table-cell"><div className="flex items-center gap-2"><Progress value={s.percentage} className="w-24 h-2" /><span className="text-sm font-semibold text-muted-foreground">{s.percentage.toFixed(1)}%</span></div></TableCell><TableCell className="text-center font-mono text-sm hidden md:table-cell">{s.total}</TableCell><TableCell className={`text-right font-bold text-lg ${s.points < 10 ? 'text-destructive' : 'text-primary'}`}>{s.points} <span className="text-xs font-medium text-muted-foreground">/ 20</span></TableCell></TableRow>))}</TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="status" className="mt-4 flex-1 overflow-y-auto pr-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {classData.students.map(student => (
                                <Card key={student.uid}>
                                    <CardHeader className="pb-2"><CardTitle className="text-base truncate">{student.name}</CardTitle></CardHeader>
                                    <CardContent>
                                        {student.today_attendance?.is_leave_day ? (<p className="text-sm font-semibold text-blue-600">Leave Day</p>) : student.today_attendance ? (
                                            <div className="grid grid-cols-4 gap-1.5">{periods.map((period, i) => {
                                                const detail = (student.today_attendance as any)[period] as PeriodDetail;
                                                const isPresent = detail?.status === 'Present';
                                                const isExcused = excusedAbsences.includes(detail?.reason || '');
                                                let Icon = XCircle; let color = "text-destructive";
                                                if (isPresent) { Icon = CheckCircle2; color = "text-green-500"; }
                                                else if (isExcused) { Icon = AlertCircle; color = "text-blue-500"; }
                                                const periodElement = (<div className={`flex flex-col items-center p-1 rounded-md border text-center ${color.replace('text-', 'border-')}/40`}><span className="text-xs font-bold">P{i + 1}</span><Icon className={`h-4 w-4 ${color}`} /></div>);
                                                if (isPresent) { return <div key={period}>{periodElement}</div>; }
                                                return (<Dialog key={period}><DialogTrigger asChild><button className="w-full text-left">{periodElement}</button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{detail?.reason || "Absent"} - Period {i + 1}</DialogTitle><DialogDescription>Reason for {student.name}'s absence.</DialogDescription></DialogHeader><p className="text-sm text-muted-foreground">{detail?.description || "No reason provided."}</p></DialogContent></Dialog>)
                                            })}</div>
                                        ) : (<p className="text-sm text-muted-foreground italic">Attendance not yet submitted.</p>)}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

// Main Component
export default function CollegeAttendanceOverview() {
    const [allAttendance, setAllAttendance] = useState<StudentFullAttendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

    // Your data fetching and real-time subscription logic is preserved.
    useEffect(() => {
        const fetchDataAndSubscribe = async () => {
            setLoading(true);
            const todayString = format(new Date(), 'yyyy-MM-dd');
            const { data: summaryData, error: summaryError } = await supabase.from('students_with_attendance').select('uid, name, class_id, total_present, total_days');
            const { data: todayData, error: todayError } = await supabase.from('attendance').select('*').eq('date', todayString);

            if (summaryError || todayError) { console.error("Error fetching data:", summaryError || todayError); setLoading(false); return; }
            if (summaryData) {
                const todayAttendanceMap = new Map(todayData?.map(rec => [rec.student_uid, rec]));
                const combinedData = summaryData.map(student => ({ ...student, today_attendance: todayAttendanceMap.get(student.uid) || null }));
                setAllAttendance(combinedData);
            }
            setLoading(false);

            const channel = supabase.channel('college-attendance').on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, payload => {
                const updatedRecord = payload.new as any;
                if (updatedRecord.date === todayString) {
                    setAllAttendance(prev => prev.map(student => student.uid === updatedRecord.student_uid ? { ...student, today_attendance: updatedRecord } : student));
                }
            }).subscribe();
            return () => { supabase.removeChannel(channel); };
        };
        const cleanup = fetchDataAndSubscribe();
        return () => { cleanup.then(cb => cb && cb()); };
    }, []);

    const collegeData = useMemo(() => {
        const classMap = new Map<string, { totalPercentage: number, studentCount: number, students: StudentFullAttendance[] }>();
        allAttendance.forEach(s => {
            if (!s.class_id) return;
            const percentage = s.total_days > 0 ? (s.total_present / s.total_days) * 100 : 0;
            if (!classMap.has(s.class_id)) { classMap.set(s.class_id, { totalPercentage: 0, studentCount: 0, students: [] }); }
            const current = classMap.get(s.class_id)!;
            current.totalPercentage += percentage;
            current.studentCount += 1;
            current.students.push(s);
        });
        const chartData = Array.from(classMap.entries()).map(([class_id, data]) => ({ name: class_id, average_attendance: data.studentCount > 0 ? data.totalPercentage / data.studentCount : 0, students: data.students })).sort((a, b) => b.average_attendance - a.average_attendance);
        const overallAverage = chartData.reduce((sum, c) => sum + c.average_attendance, 0) / (chartData.length || 1);
        return { chartData, overallAverage, topClass: chartData[0], bottomClass: chartData[chartData.length - 1] };
    }, [allAttendance]);

    if (loading) {
         return (
            <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div>
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>College Attendance Overview</CardTitle>
                <CardDescription>A high-level summary of attendance across all classes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <StatCard title="Overall College Average" value={`${collegeData.overallAverage.toFixed(1)}%`} icon={Percent} footer="Average of all class percentages" />
                    <StatCard title="Top Performing Class" value={collegeData.topClass?.name || 'N/A'} icon={TrendingUp} footer={`${collegeData.topClass?.average_attendance.toFixed(1) || 0}% Average`} colorClass="text-green-600" />
                    <StatCard title="Lowest Performing Class" value={collegeData.bottomClass?.name || 'N/A'} icon={TrendingDown} footer={`${collegeData.bottomClass?.average_attendance.toFixed(1) || 0}% Average`} colorClass="text-destructive" />
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Class Performance Comparison</CardTitle>
                        <CardDescription>Average attendance for each class. Click a bar for details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={collegeData.chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                                <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={80} />
                                <Tooltip content={<ClassTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                <Bar dataKey="average_attendance" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} className="cursor-pointer" onClick={(data) => setSelectedClassId(data.name || null)}>
                                    <LabelList dataKey="name" position="insideLeft" offset={10} fill="#fff" className="font-semibold text-xs hidden sm:block" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                {selectedClassId && (
                    <ClassDetailModal isOpen={!!selectedClassId} onClose={() => setSelectedClassId(null)} classId={selectedClassId} students={collegeData.chartData.find(c => c.name === selectedClassId)?.students || []} />
                )}
            </CardContent>
        </Card>
    )
}