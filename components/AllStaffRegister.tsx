'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { utils, writeFile } from 'xlsx'

// Shadcn/UI & Icon Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { CalendarIcon, Download, Check, X, BedDouble, Search } from 'lucide-react'

// Type Definitions
interface StaffMember {
    id: string;
    name: string;
    designation: string | null;
}
interface AttendanceRecord {
    date: string;
    time_in: string | null;
    time_out: string | null;
    is_staying: boolean;
}

// Helper to format 12-hour time for display
const formatTime12 = (time24: string | null): string => {
    if (!time24) return '-';
    try {
        const date = new Date(`1970-01-01T${time24}`);
        return format(date, 'hh:mm a');
    } catch {
        return 'Invalid Time';
    }
};

export default function AllStaffRegister() {
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchDataForDate = async () => {
            setLoading(true);
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');

            const staffPromise = supabase.from('staff').select('*').eq('is_active', true).order('name');
            const attendancePromise = supabase.from('staff_attendance').select('*').eq('date', formattedDate);

            const [{ data: staffData, error: staffError }, { data: attendanceData, error: attendanceError }] = await Promise.all([staffPromise, attendancePromise]);

            if (staffError || attendanceError) {
                toast.error("Failed to load staff register data.");
            } else {
                setStaffList(staffData || []);
                const recordsMap = (attendanceData || []).reduce((acc, record) => {
                    acc[record.staff_id] = record;
                    return acc;
                }, {} as Record<string, AttendanceRecord>);
                setRecords(recordsMap);
            }
            setLoading(false);
        };

        fetchDataForDate();
    }, [selectedDate]);

    const filteredStaff = useMemo(() => {
        if (!searchTerm) return staffList;
        return staffList.filter(staff => staff.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [staffList, searchTerm]);

    const handleExport = () => {
        if (filteredStaff.length === 0) {
            toast.error("No data to export for the selected day.");
            return;
        }

        const exportData = filteredStaff.map(staff => {
            const record = records[staff.id];
            return {
                Name: staff.name,
                Designation: staff.designation || 'N/A',
                "Time In": record ? formatTime12(record.time_in) : 'Absent',
                "Time Out": record ? formatTime12(record.time_out) : 'Absent',
                Status: record?.is_staying ? 'Staying' : (record ? 'Present' : 'Absent'),
            };
        });

        const worksheet = utils.json_to_sheet(exportData);
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, `Attendance ${format(selectedDate, 'yyyy-MM-dd')}`);
        writeFile(workbook, `Staff_Register_${format(selectedDate, 'yyyy-MM-dd')}.xlsx`);
    };

    return (
        <Card>
            <CardHeader className="flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Daily Staff Register</CardTitle>
                    <CardDescription>An overview of staff attendance for the selected day.</CardDescription>
                </div>
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
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
                    <Button onClick={handleExport} variant="outline" className="w-full md:w-auto">
                        <Download className="mr-2 h-4 w-4"/> Export Day
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search staff by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-full md:w-1/3"
                    />
                </div>
                {loading ? (
                    <Skeleton className="h-64 w-full" />
                ) : (
                    <div className="border rounded-md max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                                <TableRow>
                                    <TableHead>Staff Member</TableHead>
                                    <TableHead>Time In</TableHead>
                                    <TableHead>Time Out</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStaff.length > 0 ? filteredStaff.map(staff => {
                                    const record = records[staff.id];
                                    let statusBadge = <Badge variant="destructive" className="w-20 justify-center"><X className="h-4 w-4 mr-1"/>Absent</Badge>;
                                    if (record?.is_staying) {
                                        statusBadge = <Badge className="w-20 justify-center bg-purple-600"><BedDouble className="h-4 w-4 mr-1"/>Staying</Badge>;
                                    } else if (record?.time_in || record?.time_out) {
                                        statusBadge = <Badge variant="default" className="w-20 justify-center bg-green-600"><Check className="h-4 w-4 mr-1"/>Present</Badge>;
                                    }

                                    return (
                                        <TableRow key={staff.id}>
                                            <TableCell>
                                                <div className="font-medium">{staff.name}</div>
                                                <div className="text-xs text-muted-foreground">{staff.designation}</div>
                                            </TableCell>
                                            <TableCell>{formatTime12(record?.time_in)}</TableCell>
                                            <TableCell>{formatTime12(record?.time_out)}</TableCell>
                                            <TableCell className="text-center">{statusBadge}</TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No staff found for your search.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
