// app/admins/officer/staffregister/page.tsx
'use client'

import { useEffect, useState, useCallback, FormEvent, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserData } from '@/hooks/useUserData'
import { format, startOfMonth, endOfMonth, parse } from 'date-fns'
import { toast } from 'sonner'
import { utils, writeFile } from 'xlsx'
import TimePickerInput from '@/components/TimePickerInput' // Assuming this component exists

// Shadcn/UI & Icon Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { CalendarIcon, UserPlus, Download, Trash2, Loader2, AlertTriangle, Save, Search, Clock, BedDouble } from 'lucide-react'

// Type Definitions
interface StaffMember { id: string; name: string; designation: string | null; }
interface AttendanceRecord { staff_id: string; date: string; time_in: string | null; time_out: string | null; is_staying: boolean; }

// Main Page Component
export default function StaffRegisterPage() {
    const { role, loading: userLoading } = useUserData();
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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
            const recordsMap = (attendanceData || []).reduce((acc, record) => { acc[record.staff_id] = record; return acc; }, {} as Record<string, AttendanceRecord>);
            setAttendanceRecords(recordsMap);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(selectedDate); }, [selectedDate, fetchData]);

    const handleAttendanceChange = (staffId: string, field: 'time_in' | 'time_out' | 'is_staying', value: string | boolean | null) => {
        const existingRecord = attendanceRecords[staffId] || { staff_id: staffId, date: format(selectedDate, 'yyyy-MM-dd'), time_in: null, time_out: null, is_staying: false };
        const updatedRecord = { ...existingRecord, [field]: value };
        setAttendanceRecords(prev => ({ ...prev, [staffId]: updatedRecord }));
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        const recordsToUpsert = Object.values(attendanceRecords);
        if (recordsToUpsert.length === 0) { toast.info("No changes to save."); setIsSaving(false); return; }
        const { error } = await supabase.from('staff_attendance').upsert(recordsToUpsert, { onConflict: 'staff_id,date' });
        if (error) { toast.error("Failed to save attendance", { description: error.message }); }
        else { toast.success("Attendance saved successfully!"); }
        setIsSaving(false);
    };

    const handleAddNewStaff = async (e: FormEvent) => {
        e.preventDefault(); if(!newStaffName) return;
        const { data, error } = await supabase.from('staff').insert({ name: newStaffName, designation: newStaffDesignation }).select().single();
        if(error) { toast.error("Failed to add staff", { description: error.message }); }
        else if (data) {
            toast.success(`${data.name} has been added to the staff list.`);
            setStaffList(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            setNewStaffName(''); setNewStaffDesignation(''); setIsAddStaffOpen(false);
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

    const filteredStaff = useMemo(() => {
        if (!searchQuery) return staffList;
        return staffList.filter(staff => staff.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [staffList, searchQuery]);

    if (userLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    if (role !== 'officer') return <p>Access Denied.</p>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-heading">Staff Register</h1>
                <p className="text-muted-foreground">Manage daily attendance for all staff members.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Controls</CardTitle>
                    <CardDescription>Select a date to view or edit records, and manage staff.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} initialFocus /></PopoverContent>
                    </Popover>
                    <div className="flex-grow" />
                    <div className="flex w-full sm:w-auto gap-2">
                        <Button onClick={() => setIsAddStaffOpen(true)} variant="outline" className="flex-1"><UserPlus className="mr-2 h-4 w-4"/> Add Staff</Button>
                        <Button onClick={handleExport} variant="outline" className="flex-1"><Download className="mr-2 h-4 w-4"/> Export</Button>
                    </div>
                    <Button onClick={handleSaveAll} disabled={isSaving} className="w-full sm:w-auto">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                        {isSaving ? 'Saving...' : 'Save All Changes'}
                    </Button>
                </CardContent>
            </Card>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="Search staff by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full max-w-lg pl-10" />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredStaff.map(staff => {
                        const record = attendanceRecords[staff.id] || {};
                        return (
                            <Card key={staff.id}>
                                <CardHeader className="p-4"><CardTitle>{staff.name}</CardTitle><CardDescription>{staff.designation}</CardDescription></CardHeader>
                                <CardContent className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground"/> IN Time</Label>
                                        <TimePickerInput value={record.time_in || null} onChange={(value) => handleAttendanceChange(staff.id, 'time_in', value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground"/> OUT Time</Label>
                                        <TimePickerInput value={record.time_out || null} onChange={(value) => handleAttendanceChange(staff.id, 'time_out', value)} />
                                    </div>
                                    <div className="flex items-center justify-center space-x-2 pb-2">
                                        <Label htmlFor={`staying-${staff.id}`} className="flex items-center gap-2"><BedDouble className="h-4 w-4 text-muted-foreground"/> Staying</Label>
                                        <Switch id={`staying-${staff.id}`} checked={record.is_staying || false} onCheckedChange={(checked) => handleAttendanceChange(staff.id, 'is_staying', checked)} />
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            <Card className="border-destructive">
                <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/> Danger Zone</CardTitle></CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div>
                            <p className="font-semibold">Delete Month's Records</p>
                            <p className="text-sm text-muted-foreground">Permanently delete all attendance records for {format(selectedDate, 'MMMM yyyy')}.</p>
                        </div>
                        <Button variant="destructive" onClick={() => setIsDeleteModalOpen(true)} className="w-full sm:w-auto"><Trash2 className="mr-2 h-4 w-4" /> Delete Data</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Modals */}
            <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
                <DialogContent><form onSubmit={handleAddNewStaff}><DialogHeader><DialogTitle>Add New Staff Member</DialogTitle></DialogHeader><div className="py-4 space-y-4"><div className="space-y-2"><Label>Staff Name</Label><Input value={newStaffName} onChange={e => setNewStaffName(e.target.value)} required /></div><div className="space-y-2"><Label>Designation</Label><Input value={newStaffDesignation} onChange={e => setNewStaffDesignation(e.target.value)} placeholder="e.g., Principal" /></div></div><DialogFooter><DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose><Button type="submit">Add Staff</Button></DialogFooter></form></DialogContent>
            </Dialog>
            <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete all attendance records for {format(selectedDate, 'MMMM yyyy')}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteMonthData} className="bg-destructive hover:bg-destructive/90">Confirm Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
