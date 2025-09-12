'use client'

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Shadcn/UI & Icon Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CalendarIcon, Loader2, Unlock } from 'lucide-react';

export default function UnlockAttendance() {
    const [classes, setClasses] = useState<string[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [reason, setReason] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmationText, setConfirmationText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch all unique class IDs to populate the dropdown
    useEffect(() => {
        const fetchClasses = async () => {
            const { data, error } = await supabase
                .from('students')
                .select('class_id');

            if (error) {
                toast.error("Failed to fetch class list.");
            } else if (data) {
                // Get unique, non-null class IDs and sort them
                const uniqueClasses = [...new Set(data.map(item => item.class_id).filter(Boolean))].sort();
                setClasses(uniqueClasses as string[]);
            }
        };
        fetchClasses();
    }, []);

    const handleUnlock = async () => {
        if (!selectedClass || !selectedDate || !reason) {
            toast.error("Please select a class, date, and provide a reason.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/unlock-attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    class_id: selectedClass,
                    date: selectedDate,
                    reason: reason,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to unlock attendance.');
            }

            toast.success(data.message);
            // Reset form state after successful operation
            setSelectedClass('');
            setSelectedDate(undefined);
            setReason('');
            setConfirmationText('');
            setIsModalOpen(false);
        } catch (error: any) {
            toast.error('Operation Failed', { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const confirmationPhrase = `unlock ${selectedClass}`;
    const isConfirmationMatch = confirmationText.toLowerCase() === confirmationPhrase.toLowerCase();

    return (
        <>
            <Card className="border-orange-500/50">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 rounded-lg bg-orange-500/10 p-3">
                            <AlertTriangle className="h-6 w-6 text-orange-500" />
                        </div>
                        <div>
                            <CardTitle>Unlock Attendance Day</CardTitle>
                            <CardDescription>
                                This tool allows you to unlock a specific day's attendance for a class if it was locked by mistake.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="class-select">Select Class</Label>
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger id="class-select"><SelectValue placeholder="Select a class..." /></SelectTrigger>
                                <SelectContent>{classes.map(cls => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Select Date to Unlock</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={(date) => date > new Date()} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="reason">Reason for Unlocking</Label>
                        <Textarea
                            id="reason"
                            placeholder="e.g., 'Class leader marked a working day as a leave day by mistake.'"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="secondary"
                        onClick={() => setIsModalOpen(true)}
                        disabled={!selectedClass || !selectedDate || !reason}
                    >
                        <Unlock className="mr-2 h-4 w-4" />
                        Unlock Selected Day
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                            This will unlock the attendance for <span className="font-bold text-primary">{selectedClass}</span> on <span className="font-bold text-primary">{selectedDate ? format(selectedDate, 'PPP') : ''}</span>. The class leader will be able to edit and re-lock the attendance.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="confirmation">
                            To confirm, type <span className="font-bold text-destructive">{confirmationPhrase}</span> below:
                        </Label>
                        <Input
                            id="confirmation"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            placeholder={confirmationPhrase}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleUnlock}
                            disabled={!isConfirmationMatch || isLoading}
                            variant="destructive"
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            I understand, Unlock
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}