// components/admin/manage-students/PromoteClassModal.tsx
'use client'

import { useState } from 'react';

// Shadcn/UI & Icon Components
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from '@/components/ui/label';
import { Loader2, ChevronsRight } from "lucide-react"

interface PromoteClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    className: string;
    onConfirm: (toClass: string) => void;
    isLoading: boolean;
}

// Data for the dropdown, can be moved to a constants file if needed
const allClasses = ["TH-1", "TH-2", "AL-1", "AL-2", "AL-3", "AL-4", "Foundation A", "Foundation B", "Graduated"];

export function PromoteClassModal({
    isOpen,
    onClose,
    className,
    onConfirm,
    isLoading
}: PromoteClassModalProps) {
    const [toClass, setToClass] = useState('');

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ChevronsRight className="h-6 w-6 text-primary" />
                        Promote Class: {className}
                    </DialogTitle>
                    <DialogDescription>
                        Select the new class to move all students from {className}. This action will update the class ID for every student in this group.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="to-class">Promote to Class</Label>
                    <Select value={toClass} onValueChange={setToClass}>
                        <SelectTrigger id="to-class">
                            <SelectValue placeholder="Select a destination class..." />
                        </SelectTrigger>
                        <SelectContent>
                            {allClasses.map(cls => (
                                <SelectItem key={cls} value={cls} disabled={cls === className}>
                                    {cls}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={() => onConfirm(toClass)} disabled={isLoading || !toClass}>
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Promoting...</>
                        ) : (
                            'Confirm Promotion'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}