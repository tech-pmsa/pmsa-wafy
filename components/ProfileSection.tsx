'use client'

import { useEffect, useState, useRef, ChangeEvent, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useUserData } from '@/hooks/useUserData'

// --- NEW: Import react-image-crop ---
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
import { Pencil, User, Mail, Phone, Briefcase, Building, Shield, UserCheck, PhoneCall, Home, Loader2, Lock, BookMarked, PlusCircle, Trash2, CropIcon } from 'lucide-react'

// --- Define types for new schema ---
interface SubjectMark { id?: number; subject_name: string; marks_obtained: string; status: boolean; }
interface AcademicEntry { id?: number; title: string; subject_marks: SubjectMark[]; }

function ProfileInfoLine({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | null | undefined }) {
  return ( <div className="flex items-start gap-4"> <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" aria-hidden="true" /> <div> <p className="text-sm text-muted-foreground">{label}</p> <p className="font-medium text-neutral-black">{value || 'Not set'}</p> </div> </div> )
}
function ReadOnlyField({ label, value, icon: Icon }: { label: string, value: string, icon: React.ElementType }) {
  return ( <div className="space-y-2"> <Label htmlFor={label} className="flex items-center gap-2 text-muted-foreground"><Lock className="h-3 w-3" /> {label}</Label> <Input id={label} value={value || ''} readOnly disabled className="cursor-not-allowed" /> </div> )
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
    const handleSave = async (e: FormEvent) => {
        e.preventDefault(); if (!user) return; setIsSaving(true);
        try {
            const { data: entryData, error: entryError } = await supabase.from('academic_entries').upsert({ id: entry?.id, student_uid: user.id, title }).select().single();
            if (entryError) throw entryError;
            const subjectMarksToSave = subjects.map(subject => ({ ...subject, entry_id: entryData.id, }));
            const { error: subjectsError } = await supabase.from('subject_marks').upsert(subjectMarksToSave);
            if (subjectsError) throw subjectsError;
            if (entry) {
                const subjectsToDelete = entry.subject_marks.filter(oldSub => !subjects.some(newSub => newSub.id === oldSub.id));
                if (subjectsToDelete.length > 0) { const { error: deleteError } = await supabase.from('subject_marks').delete().in('id', subjectsToDelete.map(s => s.id!)); if (deleteError) throw deleteError; }
            }
            onSave(); setIsOpen(false);
        } catch (error: any) { console.error("Error saving marks:", error); } finally { setIsSaving(false); }
    };
    return (<Dialog open={isOpen} onOpenChange={setIsOpen}><DialogContent className="max-w-2xl"><form onSubmit={handleSave}><DialogHeader><DialogTitle>{entry?.id ? 'Edit' : 'Add'} Academic Entry</DialogTitle><DialogDescription>Add an exam/semester and its subject marks.</DialogDescription></DialogHeader><div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-4"><div><Label htmlFor="title">Exam / Semester Title</Label><Input id="title" placeholder="e.g., SSLC" value={title} onChange={(e) => setTitle(e.target.value.toUpperCase())} className="uppercase" required /></div><Label>Subjects & Marks</Label><div className="space-y-3">{subjects.map((subject, index) => (<div key={index} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-md"><Input placeholder="Subject Name" value={subject.subject_name} onChange={(e) => handleSubjectChange(index, 'subject_name', e.target.value.toUpperCase())} className="col-span-5 uppercase" required /><Input placeholder="Mark/Grade" value={subject.marks_obtained} onChange={(e) => handleSubjectChange(index, 'marks_obtained', e.target.value.toUpperCase())} className="col-span-3 uppercase" required /><div className="col-span-3 flex items-center justify-center gap-2"><Label htmlFor={`status-${index}`} className={subject.status ? 'text-green-600' : 'text-red-600'}>{subject.status ? 'Pass' : 'Fail'}</Label><Switch id={`status-${index}`} checked={subject.status} onCheckedChange={(checked) => handleSubjectChange(index, 'status', checked)} /></div><Button type="button" variant="ghost" size="icon" onClick={() => removeSubject(index)} className="col-span-1 text-destructive"><Trash2 className="h-4 w-4" /></Button></div>))}</div><Button type="button" variant="outline" onClick={addSubject} className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Add Subject</Button></div><DialogFooter><DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></DialogFooter></form></DialogContent></Dialog>);
}

export default function ProfileSection() {
  const router = useRouter();
  const { user, details, role, loading } = useUserData();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [academicEntries, setAcademicEntries] = useState<AcademicEntry[]>([]);
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AcademicEntry | null>(null);

  // --- NEW: State and refs for the image cropper ---
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const fetchAcademicData = async () => { if (!user) return; const { data } = await supabase.from('academic_entries').select('*, subject_marks(*)').eq('student_uid', user.id).order('created_at'); if (data) setAcademicEntries(data); };
  useEffect(() => { if (details) { setForm(details); setPreview(details.img_url); } if (role === 'student') fetchAcademicData(); }, [details, role, user]);

  // --- EDITED: This now opens the cropper modal instead of setting state directly ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
    reader.readAsDataURL(f);
    setIsCropperOpen(true);
    // Clear input so the same file can be selected again
    if(fileInputRef.current) fileInputRef.current.value = "";
  }

  // --- NEW: Function to perform the crop and update the preview ---
  const handleCropAndSave = () => {
    if (!imgRef.current || !previewCanvasRef.current || !crop) {
        return;
    }
    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixelRatio = window.devicePixelRatio;
    canvas.width = crop.width * pixelRatio * scaleX;
    canvas.height = crop.height * pixelRatio * scaleY;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      crop.x * scaleX, crop.y * scaleY,
      crop.width * scaleX, crop.height * scaleY,
      0, 0,
      crop.width * scaleX, crop.height * scaleY
    );

    // Convert canvas to a file blob for upload
    canvas.toBlob((blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], "cropped_avatar.png", { type: "image/png" });
        setFile(croppedFile);
        setPreview(URL.createObjectURL(croppedFile));
    }, 'image/png');

    setIsCropperOpen(false);
  }

  const handleSave = async () => {
    if (!user || !role) return; setIsSaving(true);
    const isStudent = role === 'student'; const table = isStudent ? 'students' : 'profiles';
    const { name, phone, guardian, g_phone, address, designation, batch } = form;
    let updatedData: any = isStudent ? { name, phone, guardian, g_phone, address } : { name, designation, batch };
    if (file) {
      const filePath = `avatars/${user.id}/${Date.now()}-cropped.png`; // Save as png
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) { console.error("Upload Error:", uploadError); setIsSaving(false); return; }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      updatedData.img_url = `${urlData.publicUrl}?t=${new Date().getTime()}`;
    }
    const { error: updateError } = await supabase.from(table).update(updatedData).eq('uid', user.id);
    if (updateError) { console.error("Update Error:", updateError); } else { router.refresh(); setEditOpen(false); }
    setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; setIsSaving(false);
  }

  const handleEntryDelete = async (entryId: number) => { const { error } = await supabase.from('academic_entries').delete().eq('id', entryId); if (!error) fetchAcademicData(); };
  if (loading) { return ( <Card><CardHeader><Skeleton className="h-8 w-48" /></CardHeader><CardContent className="flex flex-col md:flex-row gap-8"><div className="flex flex-col items-center md:w-1/4"><Skeleton className="h-32 w-32 rounded-full" /><Skeleton className="h-6 w-3/4 mt-4" /><Skeleton className="h-5 w-1/2 mt-2" /></div><div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></CardContent></Card> ); }
  if (!details) { return <p className="text-center mt-10 text-muted-foreground">Could not load user profile.</p> }
  const isStudent = role === 'student';

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle className="text-2xl">Your Profile</CardTitle><CardDescription>View and manage your personal information.</CardDescription></div>
        <Dialog open={editOpen} onOpenChange={setEditOpen}><DialogTrigger asChild><Button variant="outline"><Pencil className="w-4 h-4 mr-2" /> Edit Profile</Button></DialogTrigger><DialogContent className="lg:max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit Your Profile</DialogTitle><DialogDescription>Make changes to your profile here. Click save when you're done.</DialogDescription></DialogHeader><div className="flex flex-col md:flex-row gap-8 py-4"><div className="flex flex-col items-center gap-4 pt-4 md:w-1/3 md:border-r md:pr-8"><Avatar className="h-32 w-32"><AvatarImage src={preview || details.img_url} alt="Avatar Preview" className='object-cover' /><AvatarFallback><User className="h-16 w-16" /></AvatarFallback></Avatar><Button variant="outline" onClick={() => fileInputRef.current?.click()}>Change Photo</Button><Input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" /></div><div className="grid gap-4 md:w-2/3 sm:grid-cols-2">{isStudent ? (<><ReadOnlyField label="CIC" value={form.cic} icon={UserCheck} /><ReadOnlyField label="Class" value={form.class_id} icon={Building} /><ReadOnlyField label="Batch" value={form.batch} icon={Shield} /><div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="guardian">Guardian Name</Label><Input id="guardian" value={form.guardian || ''} onChange={(e) => setForm({ ...form, guardian: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="g_phone">Guardian Phone</Label><Input id="g_phone" value={form.g_phone || ''} onChange={(e) => setForm({ ...form, g_phone: e.target.value })} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="address">Address</Label><Input id="address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div></>) : (<><ReadOnlyField label="Email" value={details.email} icon={Mail} /><ReadOnlyField label='Designation' value={details.designation} icon={Shield}/><div className="space-y-2"><Label htmlFor="relation">Related to</Label><Input id="relation" value={form.batch || ''} onChange={(e) => setForm({ ...form, batch: e.target.value })} /></div></>)}</div></div><DialogFooter><Button onClick={() => setEditOpen(false)} variant="ghost">Cancel</Button><Button onClick={handleSave} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button></DialogFooter></DialogContent></Dialog>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="personal">
            <TabsList><TabsTrigger value="personal">Personal Info</TabsTrigger>{isStudent && <TabsTrigger value="academics">Academics</TabsTrigger>}</TabsList>
            <TabsContent value="personal" className="pt-6">
                <div className="flex flex-col md:flex-row gap-8"><div className="flex flex-col items-center text-center gap-2 md:w-1/4"><Avatar className="w-32 h-32 border-4 border-background shadow-md"><AvatarImage src={details.img_url} alt={details.name} className='object-cover' /><AvatarFallback><User className="h-16 w-16" /></AvatarFallback></Avatar><h2 className="text-2xl font-bold mt-2">{details.name}</h2><Badge variant="secondary" className="capitalize">{details.role}</Badge><p className="text-sm text-muted-foreground">{isStudent ? details.batch : details.email}</p></div><div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8 border-t md:border-t-0 md:border-l pl-0 md:pl-8 pt-6 md:pt-0">{isStudent ? (<><ProfileInfoLine icon={UserCheck} label="CIC Number" value={details.cic} /><ProfileInfoLine icon={Building} label="Class" value={details.class_id} /><ProfileInfoLine icon={Shield} label="Council" value={details.council} /><ProfileInfoLine icon={Phone} label="Phone" value={details.phone} /><ProfileInfoLine icon={User} label="Guardian" value={details.guardian} /><ProfileInfoLine icon={PhoneCall} label="Guardian Phone" value={details.g_phone} /><ProfileInfoLine icon={BookMarked} label="SSLC Board" value={details.sslc} /><ProfileInfoLine icon={BookMarked} label="Plus Two Board" value={details.plustwo} /><ProfileInfoLine icon={BookMarked} label="Plus Two Stream" value={details.plustwo_streams} /><ProfileInfoLine icon={Home} label="Address" value={details.address} /></>) : (<><ProfileInfoLine icon={Briefcase} label="Designation" value={details.designation} /><ProfileInfoLine icon={Mail} label="Email" value={details.email} /><ProfileInfoLine icon={Building} label="Related to" value={details.batch} /></>)}</div></div>
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
        </Tabs>
      </CardContent>
    </Card>

    <MarkEditorModal isOpen={isMarkModalOpen} setIsOpen={setIsMarkModalOpen} entry={selectedEntry} onSave={fetchAcademicData} />

    {/* --- NEW: Hidden canvas for generating the cropped image blob --- */}
    <canvas ref={previewCanvasRef} style={{ display: 'none', width: 0, height: 0 }} />

    {/* --- NEW: Modal for the image cropper UI --- */}
    <Dialog open={isCropperOpen} onOpenChange={setIsCropperOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Crop Your Profile Picture</DialogTitle><DialogDescription>Adjust the selection to crop your image. A square works best.</DialogDescription></DialogHeader>
            <div className="my-4">
                {imgSrc && (
                    <ReactCrop crop={crop} onChange={c => setCrop(c)} aspect={1} circularCrop>
                        <img ref={imgRef} src={imgSrc} alt="Source" style={{ maxHeight: '70vh' }} />
                    </ReactCrop>
                )}
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsCropperOpen(false)}>Cancel</Button>
                <Button onClick={handleCropAndSave}><CropIcon className="mr-2 h-4 w-4" /> Crop & Save</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  )
}
