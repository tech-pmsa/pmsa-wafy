'use client'

import { useState } from 'react'
import { toast } from 'sonner'

// Shadcn/UI & Icon Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, Trash2, AlertTriangle } from 'lucide-react'

// The confirmation phrase to prevent accidental deletion
const CONFIRMATION_PHRASE = 'CLEAR ALL ATTENDANCE'

export default function ClearAttendance() {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [confirmationInput, setConfirmationInput] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)

    const handleClearAttendance = async () => {
        // Double-check the confirmation phrase
        if (confirmationInput !== CONFIRMATION_PHRASE) {
            toast.error('Confirmation phrase does not match.');
            return;
        }

        setIsDeleting(true);
        try {
            const res = await fetch('/api/clear-attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'An unknown error occurred.');
            }

            toast.success('All attendance data has been successfully cleared.');
            setIsDialogOpen(false); // Close the dialog on success
            setConfirmationInput(''); // Reset the input

        } catch (error: any) {
            toast.error('Deletion Failed', {
                description: error.message,
            });
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <Card className="border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                </CardTitle>
                <CardDescription>
                    These actions are permanent and cannot be undone.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border border-destructive/50 p-4">
                    <div>
                        <h3 className="font-semibold">Clear All Attendance Data</h3>
                        <p className="text-sm text-muted-foreground">
                            This will permanently delete all attendance records for all students.
                        </p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="destructive" className="mt-2 sm:mt-0">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Clear Data
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Are you absolutely sure?</DialogTitle>
                                <DialogDescription>
                                    This is a critical action. You are about to permanently delete all attendance records from the database. This cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-2">
                                <Label htmlFor="confirmation">
                                    Please type <strong className="text-foreground">{CONFIRMATION_PHRASE}</strong> to confirm.
                                </Label>
                                <Input
                                    id="confirmation"
                                    value={confirmationInput}
                                    onChange={(e) => setConfirmationInput(e.target.value)}
                                    placeholder={CONFIRMATION_PHRASE}
                                />
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isDeleting}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleClearAttendance}
                                    disabled={isDeleting || confirmationInput !== CONFIRMATION_PHRASE}
                                >
                                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isDeleting ? 'Deleting...' : 'I understand, clear all data'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    );
}
