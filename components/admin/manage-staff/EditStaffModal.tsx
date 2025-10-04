// components/admin/manage-staff/EditStaffModal.tsx
'use client'

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User, Camera } from 'lucide-react';
import { StaffProfile } from '@/app/admins/officer/manage-staff/page';

export function EditStaffModal({ isOpen, setIsOpen, staff, onSave }: { isOpen: boolean; setIsOpen: (open: boolean) => void; staff: StaffProfile | null; onSave: () => void; }) {
    const [name, setName] = useState('');
    const [preview, setPreview] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (staff) { setName(staff.name); setPreview(staff.img_url); } }, [staff]);

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => { const selectedFile = e.target.files?.[0]; if (selectedFile) { setFile(selectedFile); setPreview(URL.createObjectURL(selectedFile)); } };

    const handleSave = async (e: FormEvent) => {
        e.preventDefault(); if (!staff) return; setIsSaving(true);
        let updatedData: { name: string; img_url?: string } = { name };
        try {
            if (file) {
                const filePath = `avatars/${staff.uid}/${Date.now()}-${file.name}`;
                const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
                if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
                const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
                updatedData.img_url = `${urlData.publicUrl}?t=${new Date().getTime()}`;
            }
            const { error: updateError } = await supabase.from('profiles').update(updatedData).eq('uid', staff.uid);
            if (updateError) throw new Error(`Failed to update profile: ${updateError.message}`);

            toast.success('Staff profile updated successfully!');
            onSave();
            setIsOpen(false);
        } catch (err: any) {
            toast.error('Save failed', { description: err.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <form onSubmit={handleSave}>
                    <DialogHeader>
                        <DialogTitle>Edit Staff Profile</DialogTitle>
                        <DialogDescription>Update the details for {staff?.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-6">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative group h-32 w-32">
                                <Avatar className="h-full w-full ring-4 ring-primary/20"><AvatarImage src={preview || undefined} alt="Profile Preview" /><AvatarFallback><User className="h-16 w-16 text-muted-foreground" /></AvatarFallback></Avatar>
                                <Label htmlFor="image-upload-staff" className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><Camera className="w-8 h-8" /></Label>
                                <Input id="image-upload-staff" type="file" accept="image/*" onChange={handleImageChange} className="hidden" ref={fileInputRef} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}