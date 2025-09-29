'use client'

import { useEffect, useState, useMemo, useCallback, FormEvent } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserData } from '@/hooks/useUserData'
import { format, startOfMonth, endOfMonth, parse } from 'date-fns'
import { toast } from 'sonner'
import { utils, writeFile } from 'xlsx'
import TimePickerInput from '@/components/TimePickerInput' // --- NEW: Import the custom time picker ---

// Shadcn/UI & Icon Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { CalendarIcon, UserPlus, Download, Trash2, Loader2, AlertTriangle, Save } from 'lucide-react'

// Type Definitions
interface StaffMember { id: string; name: string; designation: string | null; }
interface AttendanceRecord {
    staff_id: string;
    date: string;
    time_in: string | null;
    time_out: string | null;
    is_staying: boolean;
}

// Main Page Component
export default function StaffRegisterPage() {
    const { role, loading: userLoading } = useUserData();
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState(true);

    const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [newStaffName, setNewStaffName] = useState('');
    const [newStaffDesignation, setNewStaffDesignation] = useState('');

    const fetchData = useCallback(async (date: Date) => {
        setLoading(true);
        const formattedDate = format(date, 'yyyy-MM-dd');
        const staffPromise = supabase.from('staff').select('*').eq('is_active', true).order('name');
        const attendancePromise = supabase.from('staff_attendance').select('*').eq('date', formattedDate);
        const [{ data: staffData, error: staffError }, { data: attendanceData, error: attendanceError }] = await Promise.all([staffPromise, attendancePromise]);

        if (staffError || attendanceError) {
            toast.error("Failed to load data", { description: staffError?.message || attendanceError?.message });
        } else {
            setStaffList(staffData || []);
            const recordsMap = (attendanceData || []).reduce((acc, record) => {
                acc[record.staff_id] = record;
                return acc;
            }, {} as Record<string, AttendanceRecord>);
            setAttendanceRecords(recordsMap);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData(selectedDate);
    }, [selectedDate, fetchData]);

    // --- EDITED: Simplified handler. Just updates the record. ---
    const handleAttendanceChange = (staffId: string, field: 'time_in' | 'time_out' | 'is_staying', value: string | boolean | null) => {
        const existingRecord = attendanceRecords[staffId] || { staff_id: staffId, date: format(selectedDate, 'yyyy-MM-dd'), time_in: null, time_out: null, is_staying: false };
        const updatedRecord = { ...existingRecord, [field]: value };
        setAttendanceRecords(prev => ({ ...prev, [staffId]: updatedRecord }));
    };

    const handleSaveAll = async () => {
        const recordsToUpsert = Object.values(attendanceRecords);
        if (recordsToUpsert.length === 0) {
            toast.info("No changes to save.");
            return;
        }
        const { error } = await supabase.from('staff_attendance').upsert(recordsToUpsert, { onConflict: 'staff_id,date' });
        if (error) {
            toast.error("Failed to save attendance", { description: error.message });
        } else {
            toast.success("Attendance saved successfully!");
        }
    };

    const handleAddNewStaff = async (e: FormEvent) => {
        e.preventDefault();
        if(!newStaffName) return;
        const { data, error } = await supabase.from('staff').insert({ name: newStaffName, designation: newStaffDesignation }).select().single();
        if(error) {
            toast.error("Failed to add staff", { description: error.message });
        } else if (data) {
            toast.success(`${data.name} has been added to the staff list.`);
            setStaffList(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            setNewStaffName('');
            setNewStaffDesignation('');
            setIsAddStaffOpen(false);
        }
    };

    const handleExport = async () => {
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        const { data, error } = await supabase.from('staff_attendance').select('date, time_in, time_out, is_staying, staff(name, designation)').gte('date', format(monthStart, 'yyyy-MM-dd')).lte('date', format(monthEnd, 'yyyy-MM-dd')).order('date', { ascending: true });
        if (error || !data || data.length === 0) {
            toast.error("No data available to export for this month.");
            return;
        }
        // --- EDITED: Use a helper to format 24-hour time to 12-hour for the export ---
        const formatTimeForExport = (time: string | null, isStaying: boolean) => {
            if (time) return format(parse(time, 'HH:mm:ss', new Date()), 'hh:mm a');
            if (isStaying) return 'Staying';
            return '';
        };
        const exportData = data.map(rec => ({ Date: format(new Date(rec.date), 'dd-MM-yyyy'), Name: (rec.staff as any).name, Designation: (rec.staff as any).designation, "Time In": formatTimeForExport(rec.time_in, rec.is_staying), "Time Out": formatTimeForExport(rec.time_out, rec.is_staying) }));
        const worksheet = utils.json_to_sheet(exportData);
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, 'Attendance');
        writeFile(workbook, `Staff_Attendance_${format(selectedDate, 'MMM_yyyy')}.xlsx`);
    };

    const handleDeleteMonthData = async () => {
        setIsDeleteModalOpen(false);
        toast.info("Delete functionality to be implemented.");
    };

    if (userLoading) return <Skeleton className="h-96 w-full" />;
    if (role !== 'officer') return <p>Access Denied.</p>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Staff Attendance Register</CardTitle>
                    <CardDescription>Mark the daily IN/OUT times for all staff members.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full md:w-auto justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <div className="flex-grow" />
                    <Button onClick={() => setIsAddStaffOpen(true)}><UserPlus className="mr-2 h-4 w-4"/> Add Staff</Button>
                    <Button onClick={handleExport} variant="outline"><Download className="mr-2 h-4 w-4"/> Export Month</Button>
                    <Button onClick={handleSaveAll}><Save className="mr-2 h-4 w-4"/> Save All Changes</Button>
                </CardContent>
            </Card>

            {loading ? <Skeleton className="h-96 w-full" /> : (
                <div className="overflow-x-auto border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[250px]">Staff Name</TableHead>
                                <TableHead>IN Time</TableHead>
                                <TableHead>OUT Time</TableHead>
                                <TableHead className="text-center">Staying</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staffList.map(staff => {
                                const record = attendanceRecords[staff.id] || {};
                                return (
                                <TableRow key={staff.id}>
                                    <TableCell className="font-medium">{staff.name}</TableCell>
                                    {/* --- EDITED: Replaced Input with the new TimePickerInput --- */}
                                    <TableCell>
                                        <TimePickerInput
                                            value={record.time_in || null}
                                            onChange={(value) => handleAttendanceChange(staff.id, 'time_in', value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TimePickerInput
                                            value={record.time_out || null}
                                            onChange={(value) => handleAttendanceChange(staff.id, 'time_out', value)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-center"><Switch checked={record.is_staying || false} onCheckedChange={(checked) => handleAttendanceChange(staff.id, 'is_staying', checked)} /></TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Card className="border-destructive">
                <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle/> Danger Zone</CardTitle></CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold">Delete Month's Records</p>
                            <p className="text-sm text-muted-foreground">Permanently delete all attendance records for {format(selectedDate, 'MMMM yyyy')}.</p>
                        </div>
                        <Button variant="destructive" onClick={() => setIsDeleteModalOpen(true)}>Delete Data</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Modals */}
            <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
                <DialogContent><form onSubmit={handleAddNewStaff}><DialogHeader><DialogTitle>Add New Staff Member</DialogTitle></DialogHeader><div className="py-4 space-y-4"><Input placeholder="Staff Name" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} required /><Input placeholder="Designation (e.g., Principal)" value={newStaffDesignation} onChange={e => setNewStaffDesignation(e.target.value)} /></div><DialogFooter><DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose><Button type="submit">Add Staff</Button></DialogFooter></form></DialogContent>
            </Dialog>
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent><DialogHeader><DialogTitle>Are you sure?</DialogTitle><DialogDescription>This will permanently delete all attendance records for {format(selectedDate, 'MMMM yyyy')}. This action cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleDeleteMonthData}>Confirm Delete</Button></DialogFooter></DialogContent>
            </Dialog>
        </div>
    );
}
