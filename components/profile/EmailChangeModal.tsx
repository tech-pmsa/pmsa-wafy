// components/profile/EmailChangeModal.tsx
'use client'

import { useState, FormEvent } from 'react';
import { toast } from 'sonner';

// Shadcn/UI & Icon Components
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, KeyRound, Mail, AlertTriangle } from 'lucide-react';

export function EmailChangeModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChangeEmail = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/update-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_email: newEmail, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success("Verification Email Sent!", {
                description: "Please check your new email address for a confirmation link to complete the change.",
                duration: 8000,
            });
            setIsOpen(false);
            setNewEmail('');
            setPassword('');
        } catch (error: any) {
            toast.error("Update Failed", { description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                    <Mail className="mr-2 h-4 w-4" /> Change Email
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleChangeEmail}>
                    <DialogHeader>
                        <DialogTitle>Change Your Email Address</DialogTitle>
                        <DialogDescription>
                            Enter your new email and current password. A confirmation link will be sent to the new address.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-email">New Email Address</Label>
                            <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="current-password">Current Password (for verification)</Label>
                            <Input id="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Security Warning</AlertTitle>
                            <AlertDescription>
                                Changing your email address will change how you log in. Please ensure you have access to the new email address.
                            </AlertDescription>
                        </Alert>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Email
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}