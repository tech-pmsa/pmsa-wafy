'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { format } from 'date-fns'

// ShadCN & Icon Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Search, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Button } from '@/components/ui/button'

// --- Type Definitions ---
interface PeriodDetail { status: 'Present' | 'Absent'; reason?: string; description?: string; }
interface TodaysAttendanceRecord { is_leave_day: boolean; period_1: PeriodDetail; period_2: PeriodDetail; period_3: PeriodDetail; period_4: PeriodDetail; period_5: PeriodDetail; period_6: PeriodDetail; period_7: PeriodDetail; period_8: PeriodDetail; }
interface StudentFullAttendance {
    uid: string;
    name: string;
    class_id: string;
    today_attendance: TodaysAttendanceRecord | null;
}
const periods = Array.from({ length: 8 }, (_, i) => `period_${i + 1}`);
const excusedAbsences = ['Cic Related', 'Wsf Related', 'Exam Related'];

export default function CollegeLiveAttendance() {
    const [allAttendance, setAllAttendance] = useState<StudentFullAttendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [periodFilters, setPeriodFilters] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const todayString = format(new Date(), 'yyyy-MM-dd');

            const { data: studentsData, error: studentsError } = await supabase
                .from('students')
                .select('uid, name, class_id');

            if (studentsError) {
                console.error("Error fetching students:", studentsError);
                setLoading(false);
                return;
            }

            const { data: todayData, error: todayError } = await supabase
                .from('attendance')
                .select('*')
                .eq('date', todayString);

            if (todayError) {
                console.error("Error fetching today's attendance:", todayError);
            }

            if (studentsData) {
                const todayAttendanceMap = new Map();
                if (todayData) {
                    todayData.forEach(rec => { todayAttendanceMap.set(rec.student_uid, rec); });
                }
                const combinedData = studentsData.map(student => ({
                    ...student,
                    today_attendance: todayAttendanceMap.get(student.uid) || null
                }));
                setAllAttendance(combinedData);
            }
            setLoading(false);
        };

        fetchData();

        const channel = supabase.channel('college-live-attendance')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, payload => {
                const updatedRecord = payload.new as any;
                if (updatedRecord.date === format(new Date(), 'yyyy-MM-dd')) {
                    setAllAttendance(prev => prev.map(student =>
                        student.uid === updatedRecord.student_uid
                            ? { ...student, today_attendance: updatedRecord }
                            : student
                    ));
                }
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const groupedAndFilteredStudents = useMemo(() => {
        const filtered = allAttendance.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

        const grouped = filtered.reduce((acc, student) => {
            const key = student.class_id || 'Unassigned';
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(student);
            return acc;
        }, {} as Record<string, StudentFullAttendance[]>);

        return Object.keys(grouped).sort().reduce((obj, key) => {
            obj[key] = grouped[key];
            return obj;
        }, {} as Record<string, StudentFullAttendance[]>);

    }, [allAttendance, searchTerm]);

    if (loading) {
        return <Skeleton className="h-96 w-full" />;
    }

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search for any student across all classes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full md:w-1/3"
                />
            </div>
            <Accordion type="multiple" className="w-full space-y-2">
                {Object.entries(groupedAndFilteredStudents).map(([classId, students]) => {
                    const activeFilter = periodFilters[classId] || 'all';

                    const studentsToDisplay = activeFilter === 'all'
                        ? students
                        : students.filter(student => {
                            const detail = student.today_attendance?.[activeFilter as keyof TodaysAttendanceRecord] as PeriodDetail;
                            return detail?.status !== 'Present';
                        });

                    return (
                        <AccordionItem key={classId} value={classId} className="border rounded-lg bg-background">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-semibold text-lg">{classId}</span>
                                    <Badge variant="secondary">{students.length} Students</Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                                <div className="space-y-4 border-t pt-4">
                                    {/* --- NEW: Period Filter Buttons --- */}
                                    <div className="flex flex-wrap gap-2">
                                        <Button size="sm" variant={activeFilter === 'all' ? 'default' : 'outline'} onClick={() => setPeriodFilters(prev => ({ ...prev, [classId]: 'all' }))}>All Students</Button>
                                        {periods.map((period, i) => (
                                            <Button key={period} size="sm" variant={activeFilter === period ? 'default' : 'outline'} onClick={() => setPeriodFilters(prev => ({ ...prev, [classId]: period }))}>P{i + 1}</Button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {studentsToDisplay.map(student => {
                                            const detail = activeFilter !== 'all' ? student.today_attendance?.[activeFilter as keyof TodaysAttendanceRecord] as PeriodDetail : null;
                                            return (
                                                <Card key={student.uid}>
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-base truncate">{student.name}</CardTitle>
                                                        {activeFilter !== 'all' && (
                                                            <CardDescription className={excusedAbsences.includes(detail?.reason || '') ? 'text-blue-600' : 'text-destructive'}>
                                                                {detail?.reason || 'Absent'}
                                                            </CardDescription>
                                                        )}
                                                    </CardHeader>
                                                    <CardContent>
                                                        {activeFilter === 'all' ? (
                                                            student.today_attendance?.is_leave_day ? (
                                                                <p className="text-sm font-semibold text-blue-600">Leave Day</p>
                                                            ) : student.today_attendance ? (
                                                                <div className="grid grid-cols-4 gap-1">
                                                                    {periods.map((period, i) => {
                                                                        const periodDetail = (student.today_attendance as any)[period] as PeriodDetail;
                                                                        const isPresent = periodDetail?.status === 'Present';
                                                                        const isExcused = excusedAbsences.includes(periodDetail?.reason || '');
                                                                        let Icon = XCircle; let color = "text-destructive";
                                                                        if (isPresent) { Icon = CheckCircle2; color = "text-green-600"; }
                                                                        else if (isExcused) { Icon = AlertCircle; color = "text-blue-600"; }
                                                                        const periodElement = (<div className={`flex flex-col items-center p-1 rounded-md border ${color.replace('text-', 'border-')}/40`}><span className="text-xs font-bold">P{i + 1}</span><Icon className={`h-4 w-4 ${color}`} /></div>);
                                                                        if (isPresent) { return <div key={period}>{periodElement}</div>; }
                                                                        return (<Dialog key={period}><DialogTrigger asChild><button className="w-full text-left">{periodElement}</button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{periodDetail?.reason || "Absent"} - Period {i + 1}</DialogTitle><DialogDescription>Reason for {student.name}'s absence.</DialogDescription></DialogHeader><p className="text-sm text-muted-foreground">{periodDetail?.description || "No description provided."}</p></DialogContent></Dialog>)
                                                                    })}
                                                                </div>
                                                            ) : (<p className="text-sm text-muted-foreground italic">Pending...</p>)
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground italic">{detail?.description || "No description provided."}</p>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            )
                                        })}
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
        </div>
    );
}