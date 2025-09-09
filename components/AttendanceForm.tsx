'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserData } from '@/hooks/useUserData'
import { format } from 'date-fns'
import { toast } from 'sonner'

// Shadcn/UI & Icon Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { CalendarIcon, Check, X, UserCheck, UserX, Lock, Loader2, Save, Search } from 'lucide-react'

//Type Definitions
interface Student { uid: string; name: string; }
interface PeriodDetail {
    status: 'Present' | 'Absent';
    reason?: 'Home' | 'Medical' | 'Cic Related' | 'Wsf Related' | 'Exam Related';
    description?: string;
}
interface AttendanceRecord { [period: string]: PeriodDetail }
const periods = Array.from({ length: 8 }, (_, i) => `period_${i + 1}`);
const absenceReasons = ['Home', 'Medical', 'Cic Related', 'Wsf Related', 'Exam Related'];
const excusedAbsences = ['Cic Related', 'Wsf Related', 'Exam Related'];

//Reason Modal for Marking Absences
function ReasonModal({ isOpen, onClose, onSave, studentName, lastReason }: { isOpen: boolean, onClose: () => void, onSave: (reason: PeriodDetail) => void, studentName: string, lastReason: PeriodDetail | null }) {
    const [reason, setReason] = useState<PeriodDetail['reason']>('Home');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (isOpen) {
            setReason(lastReason?.reason || 'Home');
            setDescription(lastReason?.description || '');
        }
    }, [isOpen, lastReason]);

    const handleSave = () => {
        onSave({ status: 'Absent', reason, description });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Mark Absent for {studentName}</DialogTitle>
                    <DialogDescription>Select a reason and provide a brief description for the absence.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label>Reason for Absence</Label>
                        <Select value={reason} onValueChange={(value) => setReason(value as PeriodDetail['reason'])}>
                            <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
                            <SelectContent>{absenceReasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Description (Optional)</Label>
                        <Textarea placeholder="e.g., Attending family function" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Absence</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function AttendanceForm() {
    const { details, loading: userLoading } = useUserData();
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<{ [uid: string]: AttendanceRecord }>({});
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isLocked, setIsLocked] = useState(false);
    const [isLeaveDay, setIsLeaveDay] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isLocking, setIsLocking] = useState(false);
    const [modalState, setModalState] = useState<{ isOpen: boolean; studentUid: string | null; period: string | null; }>({ isOpen: false, studentUid: null, period: null });
    const [lastReasons, setLastReasons] = useState<{ [uid: string]: PeriodDetail }>({});

    const classId = useMemo(() => details?.designation, [details]);

    const fetchDataForDate = useCallback(async () => {
        if (!classId) return;
        setLoading(true);
        const date = format(selectedDate, 'yyyy-MM-dd');

        const studentsPromise = supabase.from('students').select('uid, name').eq('class_id', classId).order('name');
        const attendancePromise = supabase.from('attendance').select('*').eq('class_id', classId).eq('date', date);

        const [{ data: studentsData, error: studentsError }, { data: attendanceData, error: attendanceError }] = await Promise.all([studentsPromise, attendancePromise]);

        if (studentsError || attendanceError) {
            toast.error("Failed to fetch data.", { description: studentsError?.message || attendanceError?.message });
            setLoading(false);
            return;
        }

        if (studentsData) {
            setStudents(studentsData);
            const initialAttendance: { [uid: string]: AttendanceRecord } = {};
            const initialLastReasons: { [uid: string]: PeriodDetail } = {};
            const isDayLocked = attendanceData?.[0]?.status_locked || false;
            setIsLocked(isDayLocked);
            setIsLeaveDay(attendanceData?.[0]?.is_leave_day || false);

            studentsData.forEach(student => {
                const record = attendanceData?.find(att => att.student_uid === student.uid);
                if (record) {
                    initialAttendance[student.uid] = periods.reduce((acc, p) => ({ ...acc, [p]: record[p] || { status: 'Present' } }), {});
                    const lastReason = periods.map(p => record[p]).find(p => p?.status === 'Absent');
                    if (lastReason) initialLastReasons[student.uid] = lastReason;
                } else {
                    initialAttendance[student.uid] = periods.reduce((acc, p) => ({ ...acc, [p]: { status: 'Present' } }), {});
                }
            });
            setAttendance(initialAttendance);
            setLastReasons(initialLastReasons);
        }
        setLoading(false);
    }, [classId, selectedDate]);

    useEffect(() => { if (!userLoading) fetchDataForDate(); }, [userLoading, fetchDataForDate]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm.trim()) return students;
        const lowercasedFilter = searchTerm.toLowerCase();
        return students.filter(student => student.name.toLowerCase().includes(lowercasedFilter));
    }, [students, searchTerm]);

    const attendanceSummary = useMemo(() => {
        const presentCount = students.filter(student => {
            const studentAttendance = attendance[student.uid];
            return studentAttendance && Object.values(studentAttendance).some(p => p.status === 'Present' || excusedAbsences.includes(p.reason || ''));
        }).length;
        return { present: presentCount, absent: students.length - presentCount };
    }, [attendance, students]);

    const handlePeriodClick = (uid: string, period: string) => {
        if (isLocked || isLeaveDay) return;
        const currentStatus = attendance[uid][period];
        if (currentStatus.status === 'Present') {
            setModalState({ isOpen: true, studentUid: uid, period });
        } else {
            setAttendance(prev => ({ ...prev, [uid]: { ...prev[uid], [period]: { status: 'Present' } } }));
        }
    };

    const handleSaveReason = (reason: PeriodDetail) => {
        const { studentUid, period } = modalState;
        if (!studentUid || !period) return;
        setAttendance(prev => ({ ...prev, [studentUid]: { ...prev[studentUid], [period]: reason } }));
        setLastReasons(prev => ({ ...prev, [studentUid]: reason }));
    };

    const markAll = (uid: string, isPresent: boolean) => {
        if (isLocked || isLeaveDay) return;
        const newRecord: AttendanceRecord = {};
        if (isPresent) {
            periods.forEach(p => newRecord[p] = { status: 'Present' });
        } else {
            setModalState({ isOpen: true, studentUid: uid, period: 'all' });
            return;
        }
        setAttendance(prev => ({ ...prev, [uid]: newRecord }));
    };

    const handleSaveReasonForAll = (reason: PeriodDetail) => {
        const { studentUid } = modalState;
        if (!studentUid) return;
        const newRecord: AttendanceRecord = {};
        periods.forEach(p => newRecord[p] = reason);
        setAttendance(prev => ({ ...prev, [studentUid]: newRecord }));
        setLastReasons(prev => ({ ...prev, [studentUid]: reason }));
    };

    const handleSubmission = async (shouldLock: boolean) => {
        if (!classId) { toast.error("Class ID is missing."); return; }

        if (shouldLock) { setIsLocking(true); } else { setIsUpdating(true); }

        const date = format(selectedDate, 'yyyy-MM-dd');

        const updates = students.map(student => {
            const studentAttendance = attendance[student.uid];
            const record: any = {
                student_uid: student.uid,
                date,
                class_id: classId,
                is_leave_day: isLeaveDay,
                status_locked: shouldLock,
            };
            for (const p of periods) {
                record[p] = studentAttendance[p];
            }
            return record;
        });

        const { error } = await supabase.from("attendance").upsert(updates, { onConflict: "student_uid,date" });

        if (!error) {
            toast.success(`Attendance for ${format(selectedDate, 'PPP')} has been ${shouldLock ? 'locked' : 'updated'}.`);
            if (shouldLock) setIsLocked(true);
        } else {
            toast.error('Submission failed.', { description: error.message });
        }

        if (shouldLock) { setIsLocking(false); } else { setIsUpdating(false); }
    }

    if (userLoading) { return <Skeleton className="h-[60vh] w-full" />; }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>Attendance Controls</CardTitle><CardDescription>Select date, mark attendance, then update or lock.</CardDescription></CardHeader>
                <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Select Date</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} disabled={(date) => date > new Date()} initialFocus /></PopoverContent></Popover></div>
                    <div className="space-y-2"><Label>Day Type</Label><Select value={isLeaveDay ? 'leave' : 'working'} onValueChange={(value) => setIsLeaveDay(value === 'leave')} disabled={isLocked}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="working">Working Day</SelectItem><SelectItem value="leave">Leave Day</SelectItem></SelectContent></Select></div>
                    <div className="grid grid-cols-2 gap-4 sm:col-span-2 md:col-span-1">
                        <div className="flex items-center justify-center p-4 bg-green-50 rounded-lg"><div className="text-center"><UserCheck className="h-6 w-6 mx-auto text-green-600" /><p className="text-2xl font-bold text-green-700">{attendanceSummary.present}</p><p className="text-xs font-medium text-green-600">Present</p></div></div>
                        <div className="flex items-center justify-center p-4 bg-red-50 rounded-lg"><div className="text-center"><UserX className="h-6 w-6 mx-auto text-red-600" /><p className="text-2xl font-bold text-red-700">{attendanceSummary.absent}</p><p className="text-xs font-medium text-red-600">Absent</p></div></div>
                    </div>
                </CardContent>
            </Card>

            {isLocked && <Alert className="border-blue-500/50 bg-blue-50 text-blue-800"><Lock className="h-4 w-4 !text-blue-600" /><AlertTitle>Attendance Locked</AlertTitle><AlertDescription>Attendance for this date has been finalized and cannot be changed.</AlertDescription></Alert>}

            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search for a student..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-lg pl-10"
                    />
                </div>

                {loading ? (<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filteredStudents.map(student => {
                            const studentAttendance = attendance[student.uid];
                            return (
                                <Card key={student.uid} className={`transition-opacity ${isLocked || isLeaveDay ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                    <CardHeader className="flex flex-row items-center justify-between p-4"><h3 className="font-semibold">{student.name}</h3><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => markAll(student.uid, true)} disabled={isLocked || isLeaveDay}><Check className="h-4 w-4 mr-1" /> All Present</Button><Button variant="outline" size="sm" onClick={() => markAll(student.uid, false)} disabled={isLocked || isLeaveDay}><X className="h-4 w-4 mr-1" /> All Absent</Button></div></CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                            {periods.map((period, i) => {
                                                const periodData = studentAttendance?.[period];
                                                const isPresent = periodData?.status === 'Present';
                                                return (
                                                    <Button key={period} variant={isPresent ? 'default' : 'secondary'} className={`h-10 w-full text-xs ${isPresent ? 'bg-green-600 hover:bg-green-700' : 'bg-destructive hover:bg-destructive/90'}`} onClick={() => handlePeriodClick(student.uid, period)} disabled={isLocked || isLeaveDay}>
                                                        P{i + 1}
                                                    </Button>
                                                )
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-4 mt-6">
                <Button size="lg" variant="outline" onClick={() => handleSubmission(false)} disabled={isLocked || isUpdating || isLocking || loading}>
                    {isUpdating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : <><Save className="mr-2 h-4 w-4" /> Update</>}
                </Button>
                <Button size="lg" onClick={() => handleSubmission(true)} disabled={isLocked || isUpdating || isLocking || loading}>
                    {isLocking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Locking...</> : <><Lock className="mr-2 h-4 w-4" /> Lock & Submit</>}
                </Button>
            </div>

            <ReasonModal
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ isOpen: false, studentUid: null, period: null })}
                onSave={modalState.period === 'all' ? handleSaveReasonForAll : handleSaveReason}
                studentName={students.find(s => s.uid === modalState.studentUid)?.name || ''}
                lastReason={modalState.studentUid ? lastReasons[modalState.studentUid] : null}
            />
        </div>
    )
}
