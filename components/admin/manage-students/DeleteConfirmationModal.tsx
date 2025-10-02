// components/admin/manage-students/DeleteConfirmationModal.tsx
'use client'

// Shadcn/UI & Icon Components
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Loader2, AlertTriangle } from "lucide-react"

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    isLoading: boolean;
}

export function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    isLoading
}: DeleteConfirmationModalProps) {

    // We don't render anything if the dialog is not open
    if (!isOpen) return null;

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <AlertDialogTitle className="text-center text-xl font-heading">
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                    <AlertDialogCancel onClick={onClose} disabled={isLoading}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
                        ) : (
                            'Confirm Delete'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}