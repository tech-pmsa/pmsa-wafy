'use client';

import { useEffect, useState, useRef, ChangeEvent, FormEvent, useMemo } from 'react';
import { toast } from 'sonner';

// Shadcn/UI & Icon Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Briefcase, Edit, Loader2, Camera, AlertCircle, View, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface StaffProfile {
    uid: string;
    name: string;
    role: string;
    img_url: string | null;
    designation: string | null;
    email: string | null;
}
interface ClassCouncil {
    uid: string;
    batch: string | null;
    president: string | null;
    secretary: string | null;
    treasurer: string | null;
    auditor: string | null;
    vicepresident: string | null;
    jointsecretary: string | null;
    pro: string | null;
}

// Reusable Staff Card Component
function StaffCard({ staff, onView, onEdit }: { staff: StaffProfile; onView: (staff: StaffProfile) => void; onEdit: (staff: StaffProfile) => void }) {
    return (
        <Card className="flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
            <CardHeader className="flex flex-row items-center gap-4 p-4">
                <Avatar className="h-16 w-16 flex-shrink-0 border-2 border-primary/20">
                    <AvatarImage src={staff.img_url || undefined} alt={staff.name} className="object-cover" />
                    <AvatarFallback><User className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <CardTitle className="truncate" title={staff.name}>{staff.name}</CardTitle>
                    <CardDescription className="capitalize">{staff.role}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{staff.designation || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{staff.email || 'No email provided'}</span>
                </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 mt-auto flex items-center gap-2">
                <Button variant="outline" size="sm" className="w-full" onClick={() => onView(staff)}><View className="mr-2 h-4 w-4" /> View</Button>
                <Button variant="outline" size="sm" className="w-full" onClick={() => onEdit(staff)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
            </CardFooter>
        </Card>
    );
}

function ViewStaffModal({ isOpen, setIsOpen, staff, councilDetails, isLoadingCouncil }: { isOpen: boolean; setIsOpen: (open: boolean) => void; staff: StaffProfile | null; councilDetails: ClassCouncil | null; isLoadingCouncil: boolean; }) {
    if (!staff) return null;

    const councilMembers = [
        { role: 'President', name: councilDetails?.president },
        { role: 'Secretary', name: councilDetails?.secretary },
        { role: 'Treasurer', name: councilDetails?.treasurer },
        { role: 'Auditor', name: councilDetails?.auditor },
        { role: 'Vice President', name: councilDetails?.vicepresident },
        { role: 'Joint Secretary', name: councilDetails?.jointsecretary },
        { role: 'PRO', name: councilDetails?.pro },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader className="flex flex-col items-center text-center">
                    <Avatar className="h-24 w-24 mb-4 border-4 border-primary/20">
                        <AvatarImage src={staff.img_url || undefined} alt={staff.name} className="object-cover" />
                        <AvatarFallback><User className="h-12 w-12" /></AvatarFallback>
                    </Avatar>
                    <DialogTitle className="text-2xl">{staff.name}</DialogTitle>
                    <DialogDescription>{staff.designation || staff.role}</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {isLoadingCouncil ? (
                        <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : councilDetails ? (
                        <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Class Council for {councilDetails.batch}</h3>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border p-4">
                                {councilMembers.map(member => (
                                    <div key={member.role}>
                                        <p className="text-sm text-muted-foreground">{member.role}</p>
                                        <p className="font-medium">{member.name || 'Not Assigned'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground">No additional details to display.</p>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button>Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EditStaffModal({ isOpen, setIsOpen, staff, onSave }: { isOpen: boolean; setIsOpen: (open: boolean) => void; staff: StaffProfile | null; onSave: () => void; }) {
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
            toast.success('Staff profile updated successfully!'); onSave(); setIsOpen(false);
        } catch (err: any) { toast.error('Save failed', { description: err.message }); } finally { setIsSaving(false); }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <form onSubmit={handleSave}>
                    <DialogHeader><DialogTitle>Edit Staff Profile</DialogTitle><DialogDescription>Update the details for {staff?.name}.</DialogDescription></DialogHeader>
                    <div className="py-6 space-y-6">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative group h-32 w-32">
                                <Avatar className="h-full w-full ring-4 ring-primary/20"><AvatarImage src={preview || undefined} alt="Profile Preview" /><AvatarFallback><User className="h-16 w-16 text-muted-foreground" /></AvatarFallback></Avatar>
                                <Label htmlFor="image-upload" className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><Camera className="w-8 h-8" /></Label>
                                <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" ref={fileInputRef} />
                            </div>
                        </div>
                        <div><Label htmlFor="name">Full Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
                    </div>
                    <DialogFooter><DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose><Button type="submit" disabled={isSaving}>{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function ManageStaffPage() {
    const [staffList, setStaffList] = useState<StaffProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [councilDetails, setCouncilDetails] = useState<ClassCouncil | null>(null);
    const [isCouncilLoading, setIsCouncilLoading] = useState(false);

    const fetchStaff = async () => {
        setLoading(true); setError(null);
        try {
            const { data, error } = await supabase.from('profiles').select('*');
            if (error) throw error;
            setStaffList(data || []);
        } catch (err: any) { setError(err.message); toast.error("Failed to fetch staff", { description: err.message }); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchStaff(); }, []);

    const handleEditClick = (staff: StaffProfile) => { setSelectedStaff(staff); setIsEditModalOpen(true); };
    const handleSaveSuccess = () => { fetchStaff(); };

    // --- NEW: Grouping logic for tabs ---
    const groupedStaff = useMemo(() => {
        if (!staffList) return {};
        return staffList.reduce((acc, staff) => {
            let key = staff.designation || staff.role || 'Unassigned';
            if (key.endsWith(' Class')) {
                key = key.replace(' Class', '').trim();
            }
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(staff);
            return acc;
        }, {} as Record<string, StaffProfile[]>);
    }, [staffList]);

    const tabNames = Object.keys(groupedStaff).sort();

    const handleViewClick = async (staff: StaffProfile) => {
        setSelectedStaff(staff);
        setIsViewModalOpen(true);
        setCouncilDetails(null);

        if (staff.designation?.endsWith(' Class')) {
            setIsCouncilLoading(true);
            try {
                const { data, error } = await supabase.from('class_council').select('*').eq('uid', staff.uid).single();
                if (error && error.code !== 'PGRST116') throw error;
                if (data) setCouncilDetails(data);
            } catch (err: any) {
                toast.error("Failed to fetch council details.", { description: err.message });
            } finally {
                setIsCouncilLoading(false);
            }
        }
    };

    return (
        <div className="h-full w-full p-4 md:p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Manage Staff</h1>
                <p className="text-muted-foreground">View staff profiles grouped by designation.</p>
            </div>

            {error && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)}

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Card key={i}><CardHeader className="flex flex-row items-center gap-4 p-4"><Skeleton className="h-16 w-16 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></CardHeader><CardContent className="p-4 pt-0 space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></CardContent><CardFooter className="p-4 pt-0"><Skeleton className="h-9 w-full" /></CardFooter></Card>
                    ))}
                </div>
            ) : (
                <Tabs defaultValue={tabNames[0]} className="w-full">
                    <TabsList className="overflow-x-auto h-auto">
                        {tabNames.map(name => (<TabsTrigger key={name} value={name}>{name}</TabsTrigger>))}
                    </TabsList>
                    {Object.entries(groupedStaff).map(([groupName, staffInGroup]) => (
                        <TabsContent key={groupName} value={groupName} className="mt-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {staffInGroup.map(staff => (
                                    <StaffCard key={staff.uid} staff={staff} onView={handleViewClick} onEdit={handleEditClick} />
                                ))}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            )}

            <ViewStaffModal isOpen={isViewModalOpen} setIsOpen={setIsViewModalOpen} staff={selectedStaff} councilDetails={councilDetails} isLoadingCouncil={isCouncilLoading} />
            <EditStaffModal isOpen={isEditModalOpen} setIsOpen={setIsEditModalOpen} staff={selectedStaff} onSave={handleSaveSuccess} />
        </div>
    );
}
