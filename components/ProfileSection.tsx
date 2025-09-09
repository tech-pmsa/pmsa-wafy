'use client'

import { useEffect, useState, useRef, ChangeEvent, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useUserData } from '@/hooks/useUserData'
import ReactCrop, { type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

// Shadcn/UI & Icon Components
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, User, Mail, Phone, Briefcase, Building, Shield, UserCheck, PhoneCall, Home, Loader2, Lock, BookMarked, PlusCircle, Trash2, CropIcon, Users as FamilyIcon } from 'lucide-react'

interface SubjectMark { id?: number; subject_name: string; marks_obtained: string; status: boolean; }
interface AcademicEntry { id?: number; title: string; subject_marks: SubjectMark[]; }
interface Sibling {
    name: string;
    education: string[];
    occupation: string;
    responsibilities: string[];
}
interface FamilyData {
    student_uid: string;
    total_family_members: number | null;
    father_name: string | null;
    father_occupation: string | null;
    father_staying_place: string | null;
    father_responsibilities: string[];
    mother_name: string | null;
    mother_occupation: string | null;
    brothers: Sibling[];
    sisters: Sibling[];
    chronically_ill_members: boolean;
    house_type: string | null;
}

function ProfileInfoLine({ icon: Icon, label, value, isList = false }: { icon: React.ElementType, label: string, value: any, isList?: boolean }) {
    return (<div className="flex items-start gap-4"> <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground mt-1" aria-hidden="true" /> <div> <p className="text-sm text-muted-foreground">{label}</p> {isList && Array.isArray(value) && value.length > 0 ? (<ul className="list-disc pl-5 font-medium text-neutral-black">{value.map((item, i) => <li key={i}>{item}</li>)}</ul>) : (<p className="font-medium text-neutral-black">{value || 'Not set'}</p>)} </div> </div>)
}
function ReadOnlyField({ label, value, icon: Icon }: { label: string, value: string, icon: React.ElementType }) {
    return (<div className="space-y-2"> <Label htmlFor={label} className="flex items-center gap-2 text-muted-foreground"><Lock className="h-3 w-3" /> {label}</Label> <Input id={label} value={value || ''} readOnly disabled className="cursor-not-allowed" /> </div>)
}
function MarkEditorModal({ isOpen, setIsOpen, entry, onSave }: { isOpen: boolean; setIsOpen: (open: boolean) => void; entry: AcademicEntry | null; onSave: () => void; }) {
    const { user } = useUserData();
    const [title, setTitle] = useState('');
    const [subjects, setSubjects] = useState<SubjectMark[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    useEffect(() => { if (isOpen) { if (entry) { setTitle(entry.title); setSubjects(entry.subject_marks); } else { setTitle(''); setSubjects([{ subject_name: '', marks_obtained: '', status: true }]); } } }, [entry, isOpen]);
    const handleSubjectChange = (index: number, field: keyof SubjectMark, value: string | boolean) => { const newSubjects = [...subjects]; (newSubjects[index] as any)[field] = value; setSubjects(newSubjects); };
    const addSubject = () => { setSubjects([...subjects, { subject_name: '', marks_obtained: '', status: true }]); };
    const removeSubject = (index: number) => { setSubjects(subjects.filter((_, i) => i !== index)); };
    const handleSave = async (e: FormEvent) => { e.preventDefault(); if (!user) return; setIsSaving(true); try { const { data: entryData, error: entryError } = await supabase.from('academic_entries').upsert({ id: entry?.id, student_uid: user.id, title }).select().single(); if (entryError) throw entryError; const subjectMarksToSave = subjects.map(subject => ({ ...subject, entry_id: entryData.id, })); const { error: subjectsError } = await supabase.from('subject_marks').upsert(subjectMarksToSave); if (subjectsError) throw subjectsError; if (entry) { const subjectsToDelete = entry.subject_marks.filter(oldSub => !subjects.some(newSub => newSub.id === oldSub.id)); if (subjectsToDelete.length > 0) { const { error: deleteError } = await supabase.from('subject_marks').delete().in('id', subjectsToDelete.map(s => s.id!)); if (deleteError) throw deleteError; } } onSave(); setIsOpen(false); } catch (error: any) { console.error("Error saving marks:", error); } finally { setIsSaving(false); } };
    return (<Dialog open={isOpen} onOpenChange={setIsOpen}><DialogContent className="max-w-2xl"><form onSubmit={handleSave}><DialogHeader><DialogTitle>{entry?.id ? 'Edit' : 'Add'} Academic Entry</DialogTitle><DialogDescription>Add an exam/semester and its subject marks.</DialogDescription></DialogHeader><div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-4"><div><Label htmlFor="title">Exam / Semester Title</Label><Input id="title" placeholder="e.g., SSLC" value={title} onChange={(e) => setTitle(e.target.value.toUpperCase())} className="uppercase" required /></div><Label>Subjects & Marks</Label><div className="space-y-3">{subjects.map((subject, index) => (<div key={index} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-md"><Input placeholder="Subject Name" value={subject.subject_name} onChange={(e) => handleSubjectChange(index, 'subject_name', e.target.value.toUpperCase())} className="col-span-5 uppercase" required /><Input placeholder="Mark/Grade" value={subject.marks_obtained} onChange={(e) => handleSubjectChange(index, 'marks_obtained', e.target.value.toUpperCase())} className="col-span-3 uppercase" required /><div className="col-span-3 flex items-center justify-center gap-2"><Label htmlFor={`status-${index}`} className={subject.status ? 'text-green-600' : 'text-red-600'}>{subject.status ? 'Pass' : 'Fail'}</Label><Switch id={`status-${index}`} checked={subject.status} onCheckedChange={(checked) => handleSubjectChange(index, 'status', checked)} /></div><Button type="button" variant="ghost" size="icon" onClick={() => removeSubject(index)} className="col-span-1 text-destructive"><Trash2 className="h-4 w-4" /></Button></div>))}</div><Button type="button" variant="outline" onClick={addSubject} className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Add Subject</Button></div><DialogFooter><DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></DialogFooter></form></DialogContent></Dialog>);
}

function EditProfileDialog({ isOpen, setIsOpen, personalForm, setPersonalForm, familyData, onSave, isSaving, preview, onFileChange }: any) {
    const { role } = useUserData();
    const isStudent = role === 'student';
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [familyForm, setFamilyForm] = useState<Partial<FamilyData>>({});

    useEffect(() => { if (isOpen) { setFamilyForm(familyData); } }, [familyData, isOpen]);

    const handleFamilyChange = (field: keyof FamilyData, value: any) => { setFamilyForm(prev => ({ ...prev, [field]: value })) };
    const handleSiblingChange = (type: 'brothers' | 'sisters', index: number, field: keyof Sibling, value: string) => {
        const newSiblings = [...(familyForm[type] || [])];
        if (field === 'education' || field === 'responsibilities') {
            newSiblings[index][field] = value.split(',').map(s => s.trim().toUpperCase());
        } else {
            (newSiblings[index] as any)[field] = value.toUpperCase();
        }
        handleFamilyChange(type, newSiblings);
    };
    const addSibling = (type: 'brothers' | 'sisters') => { const siblings = [...(familyForm[type] || [])]; if (siblings.length < 5) { siblings.push({ name: '', education: [], occupation: '', responsibilities: [] }); handleFamilyChange(type, siblings); } };
    const removeSibling = (type: 'brothers' | 'sisters', index: number) => { const siblings = [...(familyForm[type] || [])]; siblings.splice(index, 1); handleFamilyChange(type, siblings); };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button variant="outline"><Pencil className="w-4 h-4 mr-2" /> Edit Profile</Button></DialogTrigger>
            <DialogContent className="lg:max-w-4xl max-h-[90vh]">
                <DialogHeader><DialogTitle>Edit Your Profile</DialogTitle><DialogDescription>Make changes and click save.</DialogDescription></DialogHeader>
                <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="personal">Personal</TabsTrigger>{isStudent && <TabsTrigger value="family">Family</TabsTrigger>}</TabsList>
                    <TabsContent value="personal" className="overflow-y-auto max-h-[60vh] p-1 pr-4">
                        <div className="flex flex-col md:flex-row gap-8 py-4">
                            <div className="flex flex-col items-center gap-4 pt-4 md:w-1/3 md:border-r md:pr-8">
                                <Avatar className="h-32 w-32"><AvatarImage src={preview} alt="Avatar Preview" className='object-cover' /><AvatarFallback><User className="h-16 w-16" /></AvatarFallback></Avatar>
                                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Change Photo</Button>
                                <Input type="file" accept="image/*" onChange={onFileChange} ref={fileInputRef} className="hidden" />
                            </div>
                            <div className="grid gap-4 md:w-2/3 sm:grid-cols-2">
                                {isStudent ? (
                                    <>
                                        <div className="space-y-2 sm:col-span-2"><Label htmlFor="name">Full Name</Label><Input id="name" value={personalForm.name || ''} onChange={(e) => setPersonalForm({ ...personalForm, name: e.target.value })} /></div>
                                        <ReadOnlyField label="CIC" value={personalForm.cic} icon={UserCheck} />
                                        <ReadOnlyField label="Class" value={personalForm.class_id} icon={Building} />
                                        <ReadOnlyField label="Batch" value={personalForm.batch} icon={Shield} />
                                        <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" value={personalForm.phone || ''} onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })} /></div>
                                        <div className="space-y-2"><Label htmlFor="guardian">Guardian Name</Label><Input id="guardian" value={personalForm.guardian || ''} onChange={(e) => setPersonalForm({ ...personalForm, guardian: e.target.value })} /></div>
                                        <div className="space-y-2"><Label htmlFor="g_phone">Guardian Phone</Label><Input id="g_phone" value={personalForm.g_phone || ''} onChange={(e) => setPersonalForm({ ...personalForm, g_phone: e.target.value })} /></div>
                                        <div className="space-y-2 sm:col-span-2"><Label htmlFor="address">Address</Label><Input id="address" value={personalForm.address || ''} onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })} /></div>
                                    </>
                                ) : (
                                    <>
                                        <ReadOnlyField label="Email" value={personalForm.email} icon={Mail} />
                                        <ReadOnlyField label='Designation' value={personalForm.designation} icon={Shield} />
                                        <div className="space-y-2"><Label htmlFor="relation">Related to</Label><Input id="relation" value={personalForm.batch || ''} onChange={(e) => setPersonalForm({ ...personalForm, batch: e.target.value })} /></div>
                                    </>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                    {isStudent && (
                        <TabsContent value="family" className="overflow-y-auto max-h-[60vh] p-1 pr-4 space-y-4">
                            <div><Label>Total Family Members</Label><Input type="number" value={familyForm.total_family_members || ''} onChange={e => handleFamilyChange('total_family_members', parseInt(e.target.value) || null)} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Father's Name</Label><Input value={familyForm.father_name || ''} onChange={e => handleFamilyChange('father_name', e.target.value)} /></div>
                                <div><Label>Father's Occupation</Label><Input value={familyForm.father_occupation || ''} onChange={e => handleFamilyChange('father_occupation', e.target.value)} /></div>
                            </div>
                            <div><Label>Father's Staying Place</Label><Input value={familyForm.father_staying_place || ''} onChange={e => handleFamilyChange('father_staying_place', e.target.value)} /></div>
                            <div><Label>Father's Public Responsibilities (comma-separated)</Label><Textarea value={(familyForm.father_responsibilities || []).join(', ')} onChange={e => handleFamilyChange('father_responsibilities', e.target.value.split(',').map(s => s.trim()))} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Mother's Name</Label><Input value={familyForm.mother_name || ''} onChange={e => handleFamilyChange('mother_name', e.target.value)} /></div>
                                <div><Label>Mother's Occupation</Label><Input value={familyForm.mother_occupation || ''} onChange={e => handleFamilyChange('mother_occupation', e.target.value)} /></div>
                            </div>
                            <div className="space-y-2"><Label>Brothers</Label>{(familyForm.brothers || []).map((bro, i) => (<div key={i} className="grid grid-cols-1 gap-2 p-2 border rounded-md items-center"><Input placeholder="Name" value={bro.name} onChange={e => handleSiblingChange('brothers', i, 'name', e.target.value)} /><Textarea placeholder="Education (comma-separated)" value={(bro.education || []).join(', ')} onChange={e => handleSiblingChange('brothers', i, 'education', e.target.value)} /><Input placeholder="Occupation" value={bro.occupation} onChange={e => handleSiblingChange('brothers', i, 'occupation', e.target.value)} /><Textarea placeholder="Responsibilities (comma-separated)" value={(bro.responsibilities || []).join(', ')} onChange={e => handleSiblingChange('brothers', i, 'responsibilities', e.target.value)} /><Button type="button" variant="ghost" size="sm" onClick={() => removeSibling('brothers', i)} className="text-destructive w-full">Remove Brother</Button></div>))}<Button type="button" variant="outline" onClick={() => addSibling('brothers')} className="mt-2 w-full">+ Add Brother</Button></div>
                            <div className="space-y-2"><Label>Sisters</Label>{(familyForm.sisters || []).map((sis, i) => (<div key={i} className="grid grid-cols-1 gap-2 p-2 border rounded-md items-center"><Input placeholder="Name" value={sis.name} onChange={e => handleSiblingChange('sisters', i, 'name', e.target.value)} /><Textarea placeholder="Education (comma-separated)" value={(sis.education || []).join(', ')} onChange={e => handleSiblingChange('sisters', i, 'education', e.target.value)} /><Input placeholder="Occupation" value={sis.occupation} onChange={e => handleSiblingChange('sisters', i, 'occupation', e.target.value)} /><Button type="button" variant="ghost" size="sm" onClick={() => removeSibling('sisters', i)} className="text-destructive w-full">Remove Sister</Button></div>))}<Button type="button" variant="outline" onClick={() => addSibling('sisters')} className="mt-2 w-full">+ Add Sister</Button></div>
                            <div className="flex items-center space-x-2"><Switch id="chronically-ill" checked={familyForm.chronically_ill_members} onCheckedChange={checked => handleFamilyChange('chronically_ill_members', checked)} /><Label htmlFor="chronically-ill">Are there chronically ill members in the house?</Label></div>
                            <div><Label>House Type</Label><Select value={familyForm.house_type || ''} onValueChange={value => handleFamilyChange('house_type', value)}><SelectTrigger><SelectValue placeholder="Select house type..." /></SelectTrigger><SelectContent><SelectItem value="Own House">Own House</SelectItem><SelectItem value="Rented House">Rented House</SelectItem><SelectItem value="Living with Family">Living with Family</SelectItem><SelectItem value="Company Provided Quarters">Company Provided Quarters</SelectItem><SelectItem value="Leased House">Leased House</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
                        </TabsContent>
                    )}
                </Tabs>
                <DialogFooter className="pt-4 border-t"><Button onClick={() => setIsOpen(false)} variant="ghost">Cancel</Button><Button onClick={() => onSave(familyForm)} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [imgSrc, setImgSrc] = useState('');
    const [crop, setCrop] = useState<Crop>();
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    const fetchAcademicData = async () => { if (!user) return; const { data } = await supabase.from('academic_entries').select('*, subject_marks(*)').eq('student_uid', user.id).order('created_at'); if (data) setAcademicEntries(data); };
    const fetchFamilyData = async () => { if (!user) return; const { data } = await supabase.from('family_data').select('*').eq('student_uid', user.id).single(); if (data) setFamilyData(data); };

    useEffect(() => {
        if (details) { setPersonalForm(details); setPreview(details.img_url); }
        if (role === 'student') { fetchAcademicData(); fetchFamilyData(); }
    }, [details, role, user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const reader = new FileReader(); reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || '')); reader.readAsDataURL(f); setIsCropperOpen(true); if (fileInputRef.current) fileInputRef.current.value = ""; }
    const handleCropAndSave = () => { if (!imgRef.current || !previewCanvasRef.current || !crop) return; const image = imgRef.current; const canvas = previewCanvasRef.current; const scaleX = image.naturalWidth / image.width; const scaleY = image.naturalHeight / image.height; const ctx = canvas.getContext('2d'); if (!ctx) return; const pixelRatio = window.devicePixelRatio; canvas.width = crop.width * pixelRatio * scaleX; canvas.height = crop.height * pixelRatio * scaleY; ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, crop.width * scaleX, crop.height * scaleY); canvas.toBlob((blob) => { if (!blob) return; const croppedFile = new File([blob], "cropped_avatar.png", { type: "image/png" }); setFile(croppedFile); setPreview(URL.createObjectURL(croppedFile)); }, 'image/png'); setIsCropperOpen(false); }

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
                const { data: urlData } = await supabase.storage.from('avatars').getPublicUrl(filePath);
                updatedData.img_url = `${urlData.publicUrl}?t=${new Date().getTime()}`;
            }

            const { error: updateError } = await supabase.from(table).update(updatedData).eq('uid', user.id);
            if (updateError) throw updateError;

            if (isStudent) {
                const { error: familyError } = await supabase.from('family_data').upsert({ ...familyFormData, student_uid: user.id });
                if (familyError) throw familyError;
            }

            router.refresh(); setEditOpen(false);
        } catch (error: any) { console.error("Save Error:", error); }
        finally { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; setIsSaving(false); }
    }

    const handleEntryDelete = async (entryId: number) => { const { error } = await supabase.from('academic_entries').delete().eq('id', entryId); if (!error) fetchAcademicData(); };

    if (loading) { return (<Card><CardHeader><Skeleton className="h-8 w-48" /></CardHeader><CardContent className="flex flex-col md:flex-row gap-8"><div className="flex flex-col items-center md:w-1/4"><Skeleton className="h-32 w-32 rounded-full" /><Skeleton className="h-6 w-3/4 mt-4" /><Skeleton className="h-5 w-1/2 mt-2" /></div><div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></CardContent></Card>); }
    if (!details) { return <p className="text-center mt-10 text-muted-foreground">Could not load user profile.</p> }
    const isStudent = role === 'student';

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div><CardTitle className="text-2xl">Your Profile</CardTitle><CardDescription>View and manage your personal information.</CardDescription></div>
                    <EditProfileDialog
                        isOpen={editOpen}
                        setIsOpen={setEditOpen}
                        personalForm={personalForm}
                        setPersonalForm={setPersonalForm}
                        familyData={familyData}
                        onSave={handleSave}
                        isSaving={isSaving}
                        preview={preview}
                        onFileChange={handleFileChange}
                    />
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="personal">
                        <TabsList>
                            <TabsTrigger value="personal">Personal Info</TabsTrigger>
                            {isStudent && <TabsTrigger value="academics">Academics</TabsTrigger>}
                            {isStudent && <TabsTrigger value="family">Family Data</TabsTrigger>}
                        </TabsList>
                        <TabsContent value="personal" className="pt-6">
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex flex-col items-center text-center gap-2 md:w-1/4">
                                    <Avatar className="w-32 h-32 border-4 border-background shadow-md"><AvatarImage src={details.img_url} alt={details.name} className='object-cover' /><AvatarFallback><User className="h-16 w-16" /></AvatarFallback></Avatar>
                                    <h2 className="text-2xl font-bold mt-2">{details.name}</h2>
                                    <Badge variant="secondary" className="capitalize">{details.role}</Badge>
                                    <p className="text-sm text-muted-foreground">{isStudent ? details.batch : details.email}</p>
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
                                            <ProfileInfoLine icon={Mail} label="Email" value={details.email} />
                                            <ProfileInfoLine icon={Building} label="Related to" value={details.batch} />
                                        </>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                        {isStudent && (
                            <TabsContent value="academics" className="pt-6">
                                <div className="flex justify-between items-center mb-4"><div><h3 className="text-lg font-semibold">Academic Records</h3><p className="text-sm text-muted-foreground">A record of your academic performance.</p></div><Button onClick={() => { setSelectedEntry(null); setIsMarkModalOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" /> Add Record</Button></div>
                                <div className="border rounded-md">
                                    {academicEntries.length > 0 ? (
                                        <Accordion type="single" collapsible className="w-full">{academicEntries.map(entry => (
                                            <AccordionItem key={entry.id} value={`item-${entry.id}`}>
                                                <AccordionTrigger className="px-4"><div className="flex items-center justify-between w-full pr-4"><span className="font-semibold">{entry.title}</span><div className="flex items-center gap-2"><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedEntry(entry); setIsMarkModalOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEntryDelete(entry.id!); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div></AccordionTrigger>
                                                <AccordionContent className="px-4 pb-4"><ul className="divide-y border rounded-md uppercase">{entry.subject_marks.map(subject => (<li key={subject.id} className="flex items-center justify-between p-2"><span>{subject.subject_name}</span><div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">{subject.marks_obtained}</span><Badge variant={subject.status ? "default" : "destructive"} className={subject.status ? "bg-green-600" : ""}>{subject.status ? 'Passed' : 'Failed'}</Badge></div></li>))}</ul></AccordionContent>
                                            </AccordionItem>
                                        ))}</Accordion>
                                    ) : (<p className="p-8 text-center text-muted-foreground">No academic records have been added yet.</p>)}
                                </div>
                            </TabsContent>
                        )}
                        {isStudent && (
                            <TabsContent value="family" className="pt-6">
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <ProfileInfoLine icon={FamilyIcon} label="Total Family Members" value={familyData.total_family_members} />
                                        <ProfileInfoLine icon={User} label="Father's Name" value={familyData.father_name} />
                                        <ProfileInfoLine icon={Briefcase} label="Father's Occupation" value={familyData.father_occupation} />
                                        <ProfileInfoLine icon={Home} label="Father's Staying Place" value={familyData.father_staying_place} />
                                        <ProfileInfoLine icon={User} label="Mother's Name" value={familyData.mother_name} />
                                        <ProfileInfoLine icon={Briefcase} label="Mother's Occupation" value={familyData.mother_occupation} />
                                        <ProfileInfoLine icon={FamilyIcon} label="Chronically Ill Members" value={familyData.chronically_ill_members ? 'Yes' : 'No'} />
                                        <ProfileInfoLine icon={Home} label="House Type" value={familyData.house_type} />
                                        <ProfileInfoLine icon={Shield} label="Father's Public Responsibilities" value={familyData.father_responsibilities} isList />
                                    </div>
                                    <div><h3 className="font-semibold text-lg mb-2">Siblings</h3>
                                        <div className="space-y-4">
                                            {familyData.brothers && familyData.brothers.length > 0 && <div><h4 className="font-medium">Brothers</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">{familyData.brothers.map((bro, i) => <Card key={i}><CardHeader><CardTitle>{bro.name}</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><p><strong>Education:</strong> {(bro.education || []).join(', ')}</p><p><strong>Occupation:</strong> {bro.occupation}</p><p><strong>Responsibilities:</strong> {(bro.responsibilities || []).join(', ')}</p></CardContent></Card>)}</div></div>}
                                            {familyData.sisters && familyData.sisters.length > 0 && <div><h4 className="font-medium">Sisters</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">{familyData.sisters.map((sis, i) => <Card key={i}><CardHeader><CardTitle>{sis.name}</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><p><strong>Education:</strong> {(sis.education || []).join(', ')}</p><p><strong>Occupation:</strong> {sis.occupation}</p></CardContent></Card>)}</div></div>}
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        )}
                    </Tabs>
                </CardContent>
            </Card>

            <MarkEditorModal isOpen={isMarkModalOpen} setIsOpen={setIsMarkModalOpen} entry={selectedEntry} onSave={fetchAcademicData} />
            <canvas ref={previewCanvasRef} style={{ display: 'none', width: 0, height: 0 }} />
            <Dialog open={isCropperOpen} onOpenChange={setIsCropperOpen}><DialogContent><DialogHeader><DialogTitle>Crop Profile Picture</DialogTitle></DialogHeader><div className="my-4">{imgSrc && (<ReactCrop crop={crop} onChange={c => setCrop(c)} aspect={1} circularCrop><img ref={imgRef} src={imgSrc} alt="Source" style={{ maxHeight: '70vh' }} /></ReactCrop>)}</div><DialogFooter><Button variant="ghost" onClick={() => setIsCropperOpen(false)}>Cancel</Button><Button onClick={handleCropAndSave}><CropIcon className="mr-2 h-4 w-4" /> Crop & Save</Button></DialogFooter></DialogContent></Dialog>
        </>
    )
}
