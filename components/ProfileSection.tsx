// components/ProfileSection.tsx
'use client'

import { useEffect, useState, useRef, ChangeEvent, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useUserData } from '@/hooks/useUserData'
import { toast } from 'sonner'
import ReactCrop, { type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

// Import the new, separated components
import { AcademicsTab } from '@/components/profile/AcademicsTab'
import { EditProfileDialog } from '@/components/profile/EditProfileDialog'
import { FamilyDataTab } from '@/components/profile/FamilyDataTab'
import { MarkEditorModal } from '@/components/profile/MarkEditorModal'
import { ProfileInfoLine } from '@/components/profile/ProfileInfoLine'

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { User, Mail, Briefcase, Building, Shield, UserCheck, Phone, PhoneCall, Home, BookMarked, CropIcon } from 'lucide-react'

// Type Definitions
export interface SubjectMark { id?: number; subject_name: string; marks_obtained: string; status: boolean; }
export interface AcademicEntry { id?: number; title: string; subject_marks: SubjectMark[]; created_at: string; }
export interface Sibling { name: string; education: string[]; occupation: string; responsibilities: string[]; }
export interface FamilyData { student_uid: string; total_family_members: number | null; father_name: string | null; father_occupation: string | null; father_staying_place: string | null; father_responsibilities: string[]; mother_name: string | null; mother_occupation: string | null; brothers: Sibling[]; sisters: Sibling[]; chronically_ill_members: boolean; house_type: string | null; }

export default function ProfileSection() {
    const router = useRouter();
    const { user, details, role, loading } = useUserData();

    const [editOpen, setEditOpen] = useState(false);
    const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
    const [personalForm, setPersonalForm] = useState<any>({});
    const [familyData, setFamilyData] = useState<Partial<FamilyData>>({});
    const [academicEntries, setAcademicEntries] = useState<AcademicEntry[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<AcademicEntry | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [imgSrc, setImgSrc] = useState('');
    const [crop, setCrop] = useState<Crop>();
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    const fetchAcademicData = useCallback(async () => { if (!user) return; const { data } = await supabase.from('academic_entries').select('*, subject_marks(*)').eq('student_uid', user.id).order('created_at'); if (data) setAcademicEntries(data); }, [user]);
    const fetchFamilyData = useCallback(async () => { if (!user) return; const { data } = await supabase.from('family_data').select('*').eq('student_uid', user.id).single(); if (data) setFamilyData(data); }, [user]);

    useEffect(() => {
        if (details) { setPersonalForm(details); setPreview(details.img_url); }
        if (role === 'student' && user) { fetchAcademicData(); fetchFamilyData(); }
    }, [details, role, user, fetchAcademicData, fetchFamilyData]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const reader = new FileReader(); reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || '')); reader.readAsDataURL(f); setIsCropperOpen(true); };
    const handleCropAndSave = () => { if (!imgRef.current || !previewCanvasRef.current || !crop) return; const image = imgRef.current; const canvas = previewCanvasRef.current; const scaleX = image.naturalWidth / image.width; const scaleY = image.naturalHeight / image.height; const ctx = canvas.getContext('2d'); if (!ctx) return; const pixelRatio = window.devicePixelRatio; canvas.width = crop.width * pixelRatio * scaleX; canvas.height = crop.height * pixelRatio * scaleY; ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, crop.width * scaleX, crop.height * scaleY); canvas.toBlob((blob) => { if (!blob) return; const croppedFile = new File([blob], "cropped_avatar.png", { type: "image/png" }); setFile(croppedFile); setPreview(URL.createObjectURL(croppedFile)); }, 'image/png'); setIsCropperOpen(false); };
    const handleSave = async (familyFormData: Partial<FamilyData>) => {
        if (!user || !role) return; setIsSaving(true);
        const isStudent = role === 'student'; const table = isStudent ? 'students' : 'profiles';
        const { name, phone, guardian, g_phone, address, designation, batch } = personalForm;
        let updatedData: any = isStudent ? { name, phone, guardian, g_phone, address } : { name, designation, batch };
        try {
            if (file) {
                const filePath = `avatars/${user.id}/${Date.now()}-cropped.png`;
                const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
                if (uploadError) throw uploadError;
                const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
                updatedData.img_url = `${urlData.publicUrl}?t=${new Date().getTime()}`;
            }
            const { error: updateError } = await supabase.from(table).update(updatedData).eq('uid', user.id);
            if (updateError) throw updateError;
            if (isStudent) {
                const { error: familyError } = await supabase.from('family_data').upsert({ ...familyFormData, student_uid: user.id });
                if (familyError) throw familyError;
            }
            toast.success("Profile changes saved successfully!");
            router.refresh(); setEditOpen(false);
        } catch (error: any) { console.error("Save Error:", error); toast.error("Save failed", { description: error.message }); }
        finally { setFile(null); setIsSaving(false); }
    };
    const handleEntryDelete = async (entryId: number) => { const { error } = await supabase.from('academic_entries').delete().eq('id', entryId); if (!error) { fetchAcademicData(); toast.success("Academic record deleted."); } else { toast.error("Failed to delete record."); } };

    if (loading) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64" /></div>
                    <Skeleton className="h-10 w-24" />
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-8 pt-6">
                    <div className="flex flex-col items-center text-center gap-2 md:w-1/4"><Skeleton className="h-32 w-32 rounded-full" /><Skeleton className="h-6 w-3/4 mt-2" /><Skeleton className="h-5 w-1/2 mt-1" /></div>
                    <div className="flex-1 border-t md:border-t-0 md:border-l pl-0 md:pl-8 pt-6 md:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-6"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                </CardContent>
            </Card>
        );
    }
    if (!details) { return <p className="text-center mt-10 text-muted-foreground">Could not load user profile.</p> }

    const isStudent = role === 'student';

    return (
        <>
            <Card>
                <CardHeader className="flex-col items-start sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="text-2xl font-heading">Your Profile</CardTitle>
                        <CardDescription>View and manage your personal information.</CardDescription>
                    </div>
                    <EditProfileDialog
                        isOpen={editOpen}
                        setIsOpen={setEditOpen}
                        personalForm={details} // Pass details directly
                        setPersonalForm={() => {}} // This can be handled internally or via a more robust state manager
                        familyData={familyData}

                        onSave={(updatedFamilyData: Partial<FamilyData>) => handleSave(updatedFamilyData)}
                        isSaving={isSaving}
                        preview={preview}
                        onFileChange={(e: ChangeEvent<HTMLInputElement>) => handleFileChange(e)}
                        academicEntries={academicEntries}
                        onEntryDelete={(id: number) => handleEntryDelete(id)}
                        onEntryEdit={(entry: AcademicEntry) => { setSelectedEntry(entry); setIsMarkModalOpen(true); }}
                        onEntryAdd={() => { setSelectedEntry(null); setIsMarkModalOpen(true); }}
                    />
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="personal" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex h-auto">
                            <TabsTrigger value="personal" className="py-2">Personal Info</TabsTrigger>
                            {isStudent && <TabsTrigger value="academics" className="py-2">Academics</TabsTrigger>}
                            {isStudent && <TabsTrigger value="family" className="py-2">Family Data</TabsTrigger>}
                        </TabsList>

                        <TabsContent value="personal" className="pt-6">
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex flex-col items-center text-center gap-2 md:w-1/4">
                                    <Avatar className="w-32 h-32 border-4 border-background shadow-md"><AvatarImage src={details.img_url} alt={details.name} className='object-cover' /><AvatarFallback><User className="h-16 w-16" /></AvatarFallback></Avatar>
                                    <h2 className="text-2xl font-bold mt-2">{details.name}</h2>
                                    <Badge variant="secondary" className="capitalize">{details.role}</Badge>
                                    <p className="text-sm text-muted-foreground">{details.email}</p>
                                </div>
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8 border-t md:border-t-0 md:border-l pl-0 md:pl-8 pt-6 md:pt-0">
                                    {isStudent ? (
                                        <>
                                            <ProfileInfoLine icon={UserCheck} label="CIC Number" value={details.cic} />
                                            <ProfileInfoLine icon={Building} label="Class" value={details.class_id} />
                                            <ProfileInfoLine icon={Shield} label="Council" value={details.council} />
                                            <ProfileInfoLine icon={Phone} label="Phone" value={details.phone} />
                                            <ProfileInfoLine icon={User} label="Guardian" value={details.guardian} />
                                            <ProfileInfoLine icon={PhoneCall} label="Guardian Phone" value={details.g_phone} />
                                            <ProfileInfoLine icon={BookMarked} label="SSLC Board" value={details.sslc} />
                                            <ProfileInfoLine icon={BookMarked} label="Plus Two Board" value={details.plustwo} />
                                            <ProfileInfoLine icon={BookMarked} label="Plus Two Stream" value={details.plustwo_streams} />
                                            <ProfileInfoLine icon={Home} label="Address" value={details.address} />
                                        </>
                                    ) : (
                                        <>
                                            <ProfileInfoLine icon={Briefcase} label="Designation" value={details.designation} />
                                            <ProfileInfoLine icon={Building} label="Related to" value={details.batch} />
                                        </>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        {isStudent && <TabsContent value="academics" className="pt-6"><AcademicsTab entries={academicEntries} onAdd={() => { setSelectedEntry(null); setIsMarkModalOpen(true); }} onEdit={(entry) => { setSelectedEntry(entry); setIsMarkModalOpen(true); }} onDelete={handleEntryDelete} /></TabsContent>}
                        {isStudent && <TabsContent value="family" className="pt-6"><FamilyDataTab data={familyData} /></TabsContent>}
                    </Tabs>
                </CardContent>
            </Card>

            <MarkEditorModal isOpen={isMarkModalOpen} setIsOpen={setIsMarkModalOpen} entry={selectedEntry} onSave={fetchAcademicData} />
            <canvas ref={previewCanvasRef} style={{ display: 'none' }} />
            <Dialog open={isCropperOpen} onOpenChange={setIsCropperOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Crop Profile Picture</DialogTitle></DialogHeader>
                    <div className="my-4 flex justify-center">{imgSrc && (<ReactCrop crop={crop} onChange={c => setCrop(c)} aspect={1} circularCrop><img ref={imgRef} src={imgSrc} alt="Source" style={{ maxHeight: '70vh' }} /></ReactCrop>)}</div>
                    <DialogFooter><Button variant="ghost" onClick={() => setIsCropperOpen(false)}>Cancel</Button><Button onClick={handleCropAndSave}><CropIcon className="mr-2 h-4 w-4" /> Crop & Save</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}