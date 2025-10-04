// components/admin/manage-staff/ViewStaffModal.tsx
'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, Shield, Loader2 } from 'lucide-react';
import { StaffProfile, ClassCouncil } from '@/app/admins/officer/manage-staff/page';

export function ViewStaffModal({ isOpen, setIsOpen, staff }: { isOpen: boolean; setIsOpen: (open: boolean) => void; staff: StaffProfile | null; }) {
    const [councilDetails, setCouncilDetails] = useState<ClassCouncil | null>(null);
    const [isLoadingCouncil, setIsLoadingCouncil] = useState(false);

    useEffect(() => {
        const handleViewClick = async () => {
            if (!staff) return;
            setCouncilDetails(null);
            if (staff.designation?.endsWith(' Class')) {
                setIsLoadingCouncil(true);
                try {
                    const { data, error } = await supabase.from('class_council').select('*').eq('uid', staff.uid).single();
                    if (error && error.code !== 'PGRST116') throw error;
                    if (data) setCouncilDetails(data);
                } catch (err: any) {
                    toast.error("Failed to fetch council details.", { description: err.message });
                } finally {
                    setIsLoadingCouncil(false);
                }
            }
        };

        if (isOpen) {
            handleViewClick();
        }
    }, [staff, isOpen]);

    if (!staff) return null;

    const councilMembers = [
        { role: 'President', name: councilDetails?.president }, { role: 'Secretary', name: councilDetails?.secretary },
        { role: 'Treasurer', name: councilDetails?.treasurer }, { role: 'Auditor', name: councilDetails?.auditor },
        { role: 'Vice President', name: councilDetails?.vicepresident }, { role: 'Joint Secretary', name: councilDetails?.jointsecretary },
        { role: 'PRO', name: councilDetails?.pro },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader className="flex flex-col items-center text-center pt-4">
                    <Avatar className="h-24 w-24 mb-4 border-4 border-primary/20"><AvatarImage src={staff.img_url || undefined} alt={staff.name} className="object-cover" /><AvatarFallback><User className="h-12 w-12" /></AvatarFallback></Avatar>
                    <DialogTitle className="text-2xl font-heading">{staff.name}</DialogTitle>
                    <DialogDescription>{staff.designation || staff.role}</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {staff.designation?.endsWith(' Class') && (
                        isLoadingCouncil ? (
                            <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                        ) : councilDetails ? (
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Class Council for {councilDetails.batch}</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    {councilMembers.map(member => (
                                        <div key={member.role}><p className="text-sm text-muted-foreground">{member.role}</p><p className="font-medium">{member.name || 'N/A'}</p></div>
                                    ))}
                                </CardContent>
                            </Card>
                        ) : (
                            <p className="text-center text-muted-foreground">No class council data found for this teacher.</p>
                        )
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button>Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}