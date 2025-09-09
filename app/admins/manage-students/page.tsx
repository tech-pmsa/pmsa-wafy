'use client';

import { useEffect, useState, useRef, ChangeEvent, FormEvent, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';

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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from '@/components/ui/badge';
import { User, Phone, Edit, Loader2, Camera, AlertCircle, School, Users, Trash2, Search, View, PlusCircle, Pencil, Briefcase, Home, Shield, Mail, Users as FamilyIcon, ChevronsRight } from 'lucide-react';

// --- Define all necessary types ---
interface SubjectMark { id?: number; subject_name: string; marks_obtained: string; status: boolean; }
interface AcademicEntry { id?: number; title: string; subject_marks: SubjectMark[]; }
interface Sibling { name: string; education: string[]; occupation: string; responsibilities: string[]; }
interface FamilyData {
    student_uid: string; total_family_members: number | null; father_name: string | null; father_occupation: string | null;
    father_staying_place: string | null; father_responsibilities: string[]; mother_name: string | null; mother_occupation: string | null;
    brothers: Sibling[]; sisters: Sibling[]; chronically_ill_members: boolean; house_type: string | null;
}
interface StudentProfile {
    uid: string; name: string; cic: string | null; class_id: string; council: string | null;
    batch: string | null; phone: string | null; guardian: string | null; g_phone: string | null;
    address: string | null; img_url: string | null; sslc: string | null; plustwo: string | null;
    plustwo_streams: string | null;
}
interface AdminProfile { uid: string; role: string; batch: string | null; }

function ProfileInfoLine({ icon: Icon, label, value, isList = false }: { icon: React.ElementType, label: string, value: any, isList?: boolean }) {
    return (<div className="flex items-start gap-4"> <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground mt-1" aria-hidden="true" /> <div> <p className="text-sm text-muted-foreground">{label}</p> {isList && Array.isArray(value) && value.length > 0 ? (<ul className="list-disc pl-5 font-medium text-neutral-black">{value.map((item, i) => <li key={i}>{item}</li>)}</ul>) : (<p className="font-medium text-neutral-black">{value || 'Not set'}</p>)} </div> </div>)
}

// Reusable Student Card Component
function StudentCard({ student, onView, onEdit, onDelete }: { student: StudentProfile; onView: (student: StudentProfile) => void; onEdit: (student: StudentProfile) => void; onDelete: (student: StudentProfile) => void; }) {
    return (
        <Card className="flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
            <CardHeader className="flex flex-row items-center gap-4 p-4">
                <Avatar className="h-16 w-16 flex-shrink-0 border-2 border-primary/20"><AvatarImage src={student.img_url || undefined} alt={student.name} className='object-cover' /><AvatarFallback><User className="h-8 w-8 text-muted-foreground" /></AvatarFallback></Avatar>
                <div className="min-w-0 flex-1"><CardTitle className="truncate" title={student.name}>{student.name}</CardTitle><CardDescription>CIC: {student.cic || 'N/A'}</CardDescription></div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><School className="h-4 w-4 flex-shrink-0" /><span>{student.class_id}</span></div>
                <div className="flex items-center gap-2"><Users className="h-4 w-4 flex-shrink-0" /><span>{student.council || 'N/A'}</span></div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 flex-shrink-0" /><span>{student.phone || 'N/A'}</span></div>
            </CardContent>
            <CardFooter className="p-4 pt-0 mt-auto flex items-center gap-2">
                <Button variant="outline" size="sm" className="w-full" onClick={() => onView(student)}><View className="mr-2 h-4 w-4" /> View</Button>
                <Button variant="outline" size="sm" className="w-full" onClick={() => onEdit(student)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                <Button variant="destructive" size="icon" className="flex-shrink-0" onClick={() => onDelete(student)}><Trash2 className="h-4 w-4" /></Button>
            </CardFooter>
        </Card>
    );
}

// View Details Modal Component
function ViewStudentModal({ isOpen, setIsOpen, student, marks, familyData, isLoadingData }: { isOpen: boolean; setIsOpen: (open: boolean) => void; student: StudentProfile | null; marks: AcademicEntry[]; familyData: Partial<FamilyData>; isLoadingData: boolean; }) {
    if (!student) return null;
    const details = [
        { label: 'CIC', value: student.cic }, { label: 'Class', value: student.class_id }, { label: 'Batch', value: student.batch },
        { label: 'Council', value: student.council }, { label: 'Phone', value: student.phone }, { label: 'Guardian', value: student.guardian },
        { label: 'Guardian Phone', value: student.g_phone }, { label: 'SSLC Board', value: student.sslc }, { label: 'Plus Two Board', value: student.plustwo },
        { label: 'Plus Two Stream', value: student.plustwo_streams }, { label: 'Address', value: student.address, fullWidth: true },
    ];
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="flex flex-col items-center text-center">
                    <Avatar className="h-24 w-24 mb-4 border-4 border-primary/20"><AvatarImage src={student.img_url || undefined} alt={student.name} className='object-cover' /><AvatarFallback><User className="h-12 w-12" /></AvatarFallback></Avatar>
                    <DialogTitle className="text-2xl">{student.name}</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="personal">Personal</TabsTrigger><TabsTrigger value="academics">Academics</TabsTrigger><TabsTrigger value="family">Family</TabsTrigger></TabsList>
                    <TabsContent value="personal"><div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 pr-2">{details.map(item => (<div key={item.label} className={item.fullWidth ? 'sm:col-span-2' : ''}><Label className="text-xs text-muted-foreground">{item.label}</Label><p className="font-medium">{item.value || 'N/A'}</p></div>))}</div></TabsContent>
                    <TabsContent value="academics">
                        <div className="py-4 pr-2">
                            {isLoadingData ? (<Skeleton className="h-24 w-full" />) : marks.length > 0 ? (
                                <Accordion type="single" collapsible className="w-full">
                                    {marks.map(entry => (
                                        <AccordionItem key={entry.id} value={`item-${entry.id}`}>
                                            <AccordionTrigger>{entry.title}</AccordionTrigger>
                                            <AccordionContent>
                                                <ul className="divide-y border rounded-md">
                                                    {entry.subject_marks.map(subject => (<li key={subject.id} className="flex items-center justify-between p-2 text-sm"><p>{subject.subject_name}</p><div className="flex items-center gap-3"><span className="text-muted-foreground">{subject.marks_obtained}</span><Badge variant={subject.status ? "default" : "destructive"} className={subject.status ? "bg-green-600" : ""}>{subject.status ? 'Passed' : 'Failed'}</Badge></div></li>))}
                                                </ul>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            ) : (<p className="text-center text-muted-foreground">No academic marks found.</p>)}
                        </div>
                    </TabsContent>
                    <TabsContent value="family">
                        <div className="py-4 pr-2">
                            {isLoadingData ? <Skeleton className="h-40 w-full" /> : (
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
                                            {familyData.brothers && familyData.brothers.length > 0 && <div><h4 className="font-medium">Brothers</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">{familyData.brothers?.map((bro, i) => <Card key={i}><CardHeader><CardTitle>{bro.name}</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><p><strong>Education:</strong> {(bro.education || []).join(', ')}</p><p><strong>Occupation:</strong> {bro.occupation}</p><p><strong>Responsibilities:</strong> {(bro.responsibilities || []).join(', ')}</p></CardContent></Card>)}</div></div>}
                                            {familyData.sisters && familyData.sisters.length > 0 && <div><h4 className="font-medium">Sisters</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">{familyData.sisters?.map((sis, i) => <Card key={i}><CardHeader><CardTitle>{sis.name}</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><p><strong>Education:</strong> {(sis.education || []).join(', ')}</p><p><strong>Occupation:</strong> {sis.occupation}</p></CardContent></Card>)}</div></div>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
                <DialogFooter><DialogClose asChild><Button>Close</Button></DialogClose></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Admin Mark Editor Modal
function AdminMarkEditorModal({ isOpen, setIsOpen, entry, student_uid, onSave }: { isOpen: boolean; setIsOpen: (open: boolean) => void; entry: AcademicEntry | null; student_uid: string; onSave: () => void; }) {
    const [title, setTitle] = useState('');
    const [subjects, setSubjects] = useState<SubjectMark[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    useEffect(() => { if (isOpen) { if (entry) { setTitle(entry.title); setSubjects(entry.subject_marks); } else { setTitle(''); setSubjects([{ subject_name: '', marks_obtained: '', status: true }]); } } }, [entry, isOpen]);
    const handleSubjectChange = (index: number, field: keyof SubjectMark, value: string | boolean) => { const newSubjects = [...subjects]; (newSubjects[index] as any)[field] = value; setSubjects(newSubjects); };
    const addSubject = () => { setSubjects([...subjects, { subject_name: '', marks_obtained: '', status: true }]); };
    const removeSubject = (index: number) => { setSubjects(subjects.filter((_, i) => i !== index)); };
    const handleSave = async (e: FormEvent) => { e.preventDefault(); if (!student_uid) return; setIsSaving(true); try { const { data: entryData, error: entryError } = await supabase.from('academic_entries').upsert({ id: entry?.id, student_uid, title }).select().single(); if (entryError) throw entryError; const subjectMarksToSave = subjects.map(subject => ({ ...subject, entry_id: entryData.id, })); const { error: subjectsError } = await supabase.from('subject_marks').upsert(subjectMarksToSave); if (subjectsError) throw subjectsError; if (entry) { const subjectsToDelete = entry.subject_marks.filter(oldSub => !subjects.some(newSub => newSub.id === oldSub.id)); if (subjectsToDelete.length > 0) { const { error: deleteError } = await supabase.from('subject_marks').delete().in('id', subjectsToDelete.map(s => s.id!)); if (deleteError) throw deleteError; } } toast.success("Academic record saved successfully!"); onSave(); setIsOpen(false); } catch (error: any) { toast.error("Failed to save record.", { description: error.message }); } finally { setIsSaving(false); } };
    return (<Dialog open={isOpen} onOpenChange={setIsOpen}><DialogContent className="max-w-2xl"><form onSubmit={handleSave}><DialogHeader><DialogTitle>{entry?.id ? 'Edit' : 'Add'} Academic Entry</DialogTitle><DialogDescription>Manage this student's academic records.</DialogDescription></DialogHeader><div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-4"><div><Label htmlFor="title">Exam / Semester Title</Label><Input id="title" placeholder="e.g., SSLC" value={title} onChange={(e) => setTitle(e.target.value.toUpperCase())} className="uppercase" required /></div><Label>Subjects & Marks</Label><div className="space-y-3">{subjects.map((subject, index) => (<div key={index} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-md"><Input placeholder="Subject Name" value={subject.subject_name} onChange={(e) => handleSubjectChange(index, 'subject_name', e.target.value.toUpperCase())} className="col-span-5 uppercase" required /><Input placeholder="Mark/Grade" value={subject.marks_obtained} onChange={(e) => handleSubjectChange(index, 'marks_obtained', e.target.value.toUpperCase())} className="col-span-3 uppercase" required /><div className="col-span-3 flex items-center justify-center gap-2"><Label htmlFor={`status-${index}`} className={subject.status ? 'text-green-600' : 'text-red-600'}>{subject.status ? 'Pass' : 'Fail'}</Label><Switch id={`status-${index}`} checked={subject.status} onCheckedChange={(checked) => handleSubjectChange(index, 'status', checked)} /></div><Button type="button" variant="ghost" size="icon" onClick={() => removeSubject(index)} className="col-span-1 text-destructive"><Trash2 className="h-4 w-4" /></Button></div>))}</div><Button type="button" variant="outline" onClick={addSubject} className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Add Subject</Button></div><DialogFooter><DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></DialogFooter></form></DialogContent></Dialog>);
}

// Edit Modal Component
function EditStudentModal({ isOpen, setIsOpen, student, onSave }: { isOpen: boolean; setIsOpen: (open: boolean) => void; student: StudentProfile | null; onSave: () => void; }) {
    const [personalForm, setPersonalForm] = useState<Partial<StudentProfile>>({});
    const [familyForm, setFamilyForm] = useState<Partial<FamilyData>>({});
    const [academicEntries, setAcademicEntries] = useState<AcademicEntry[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<AcademicEntry | null>(null);
    const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchAllData = async () => {
        if (!student) return;
        const { data: family } = await supabase.from('family_data').select('*').eq('student_uid', student.uid).single();
        if (family) setFamilyForm(family); else setFamilyForm({});
        const { data: academics } = await supabase.from('academic_entries').select('*, subject_marks(*)').eq('student_uid', student.uid);
        if (academics) setAcademicEntries(academics);
    }
    useEffect(() => { if (student) { setPersonalForm(student); setPreview(student.img_url); fetchAllData(); } }, [student, isOpen]);

    const handlePersonalChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setPersonalForm({ ...personalForm, [e.target.name]: e.target.value }); };
    const handleFamilyChange = (field: keyof FamilyData, value: any) => { setFamilyForm(prev => ({ ...prev, [field]: value })) };
    const handleSiblingChange = (type: 'brothers' | 'sisters', index: number, field: keyof Sibling, value: string) => { const newSiblings = [...(familyForm[type] || [])]; if (field === 'education' || field === 'responsibilities') { newSiblings[index][field] = value.split(',').map(s => s.trim().toUpperCase()); } else { (newSiblings[index] as any)[field] = value.toUpperCase(); } handleFamilyChange(type, newSiblings); };
    const addSibling = (type: 'brothers' | 'sisters') => { const siblings = [...(familyForm[type] || [])]; if (siblings.length < 5) { siblings.push({ name: '', education: [], occupation: '', responsibilities: [] }); handleFamilyChange(type, siblings); } };
    const removeSibling = (type: 'brothers' | 'sisters', index: number) => { const siblings = [...(familyForm[type] || [])]; siblings.splice(index, 1); handleFamilyChange(type, siblings); };
    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)); } };
    const handleEntryDelete = async (entryId: number) => { const { error } = await supabase.from('academic_entries').delete().eq('id', entryId); if (!error) fetchAllData(); };

    const handleSave = async () => {
        if (!student) return; setIsSaving(true);
        try {
            // Save personal details
            let finalUpdateData: any = { ...personalForm };
            if (file) {
                const filePath = `avatars/${student.uid}/${Date.now()}-${file.name}`;
                const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true }); if (uploadError) throw uploadError;
                const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
                finalUpdateData.img_url = `${urlData.publicUrl}?t=${new Date().getTime()}`;
            }
            const { error: updateError } = await supabase.from('students').update(finalUpdateData).eq('uid', student.uid);
            if (updateError) throw updateError;

            // Save family details
            const { error: familyError } = await supabase.from('family_data').upsert({ ...familyForm, student_uid: student.uid });
            if (familyError) throw familyError;

            toast.success('Student profile updated successfully!');
            onSave();
            setIsOpen(false);
        } catch (err: any) { toast.error('Save failed', { description: err.message }); } finally { setIsSaving(false); }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="lg:max-w-4xl max-h-[90vh]">
                    <DialogHeader><DialogTitle>Edit {student?.name}</DialogTitle></DialogHeader>
                    <Tabs defaultValue="personal" className="w-full">
                        <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="personal">Personal</TabsTrigger><TabsTrigger value="academics">Academics</TabsTrigger><TabsTrigger value="family">Family</TabsTrigger></TabsList>
                        <TabsContent value="personal" className="overflow-y-auto max-h-[60vh] p-1 pr-4">
                            <div className="py-6 grid grid-cols-1 md:grid-cols-3 gap-6"><div className="md:col-span-1 flex flex-col items-center gap-4"><div className="relative group h-32 w-32"><Avatar className="h-full w-full ring-4 ring-primary/20"><AvatarImage src={preview || undefined} alt="Profile Preview" className='object-cover' /><AvatarFallback><User className="h-16 w-16" /></AvatarFallback></Avatar><Label htmlFor="image-upload" className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><Camera className="w-8 h-8" /></Label><Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" ref={fileInputRef} /></div></div><div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4"><div><Label htmlFor="name">Full Name</Label><Input id="name" name="name" value={personalForm.name || ''} onChange={handlePersonalChange} /></div><div><Label htmlFor="cic">CIC</Label><Input id="cic" name="cic" value={personalForm.cic || ''} onChange={handlePersonalChange} /></div><div><Label htmlFor="class_id">Class ID</Label><Input id="class_id" name="class_id" value={personalForm.class_id || ''} onChange={handlePersonalChange} /></div><div><Label htmlFor="council">Council</Label><Input id="council" name="council" value={personalForm.council || ''} onChange={handlePersonalChange} /></div><div><Label htmlFor="batch">Batch</Label><Input id="batch" name="batch" value={personalForm.batch || ''} onChange={handlePersonalChange} /></div><div><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" value={personalForm.phone || ''} onChange={handlePersonalChange} /></div><div><Label htmlFor="guardian">Guardian</Label><Input id="guardian" name="guardian" value={personalForm.guardian || ''} onChange={handlePersonalChange} /></div><div><Label htmlFor="g_phone">Guardian Phone</Label><Input id="g_phone" name="g_phone" value={personalForm.g_phone || ''} onChange={handlePersonalChange} /></div><div className="sm:col-span-2"><Label htmlFor="address">Address</Label><Textarea id="address" name="address" value={personalForm.address || ''} onChange={handlePersonalChange} /></div></div></div>
                        </TabsContent>
                        <TabsContent value="academics" className="overflow-y-auto max-h-[60vh] p-1 pr-4">
                            <div className="py-6">
                                <div className="flex justify-between items-center mb-4"><div><h3 className="text-lg font-semibold">Academic Records</h3></div><Button type="button" onClick={() => { setSelectedEntry(null); setIsMarkModalOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" /> Add Record</Button></div>
                                <div className="border rounded-md">
                                    {academicEntries.length > 0 ? (
                                        <Accordion type="single" collapsible className="w-full">{academicEntries.map(entry => (
                                            <AccordionItem key={entry.id} value={`item-${entry.id}`}>
                                                <AccordionTrigger className="px-4"><div className="flex items-center justify-between w-full pr-4"><span className="font-semibold">{entry.title}</span><div className="flex items-center gap-2"><Button variant="ghost" size="icon" type="button" onClick={(e) => { e.stopPropagation(); setSelectedEntry(entry); setIsMarkModalOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" type="button" onClick={(e) => { e.stopPropagation(); handleEntryDelete(entry.id!); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div></AccordionTrigger>
                                                <AccordionContent className="px-4 pb-4"><ul className="divide-y border rounded-md">{entry.subject_marks.map(subject => (<li key={subject.id} className="flex items-center justify-between p-2"><span>{subject.subject_name}</span><div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">{subject.marks_obtained}</span><Badge variant={subject.status ? "default" : "destructive"} className={subject.status ? "bg-green-600" : ""}>{subject.status ? 'Passed' : 'Failed'}</Badge></div></li>))}</ul></AccordionContent>
                                            </AccordionItem>
                                        ))}</Accordion>
                                    ) : (<p className="p-8 text-center text-muted-foreground">No academic records found.</p>)}
                                </div>
                            </div>
                        </TabsContent>
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
                    </Tabs>
                    <DialogFooter className="pt-4 border-t"><Button onClick={() => setIsOpen(false)} variant="ghost">Cancel</Button><Button onClick={handleSave} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            {student && <AdminMarkEditorModal isOpen={isMarkModalOpen} setIsOpen={setIsMarkModalOpen} entry={selectedEntry} student_uid={student.uid} onSave={fetchAllData} />}
        </>
    );
}

// Confirmation Modal for Deletion
function DeleteConfirmationModal({ isOpen, onClose, onConfirm, title, description, isLoading }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; description: string; isLoading: boolean; }) {
    if (!isOpen) return null;
    return (<Dialog open={isOpen} onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><DialogFooter><Button variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button><Button variant="destructive" onClick={onConfirm} disabled={isLoading}>{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : 'Confirm Delete'}</Button></DialogFooter></DialogContent></Dialog>);
}

// Promote Class Modal
function PromoteClassModal({ isOpen, onClose, className, onConfirm, isLoading }: { isOpen: boolean; onClose: () => void; className: string; onConfirm: (toClass: string) => void; isLoading: boolean; }) {
    const [toClass, setToClass] = useState('');
    const allClasses = ["TH-1", "TH-2", "AL-1", "AL-2", "AL-3", "AL-4", "Foundation A", "Foundation B"];
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader><DialogTitle>Promote Class: {className}</DialogTitle><DialogDescription>Select the new class to move all students from {className}.</DialogDescription></DialogHeader>
                <div className="py-4"><Label htmlFor="to-class">Promote to Class</Label><Select value={toClass} onValueChange={setToClass}><SelectTrigger id="to-class"><SelectValue placeholder="Select a destination class..." /></SelectTrigger><SelectContent>{allClasses.map(cls => (<SelectItem key={cls} value={cls} disabled={cls === className}>{cls}</SelectItem>))}</SelectContent></Select></div>
                <DialogFooter><Button variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button><Button onClick={() => onConfirm(toClass)} disabled={isLoading || !toClass}>{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Promoting...</> : 'Confirm Promotion'}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Main Page Component
export default function ManageStudentsPage() {
    const { user: authUser } = useUserData();
    const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
    const [academicMarks, setAcademicMarks] = useState<AcademicEntry[]>([]);
    const [familyData, setFamilyData] = useState<Partial<FamilyData>>({});
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [classToDelete, setClassToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
    const [classToPromote, setClassToPromote] = useState('');
    const [isPromoting, setIsPromoting] = useState(false);

    const fetchData = async (admin: AdminProfile) => {
        setLoading(true); setError(null);
        try {
            let query = supabase.from('students').select('*');
            if (admin.role === 'class' && admin.batch) { query = query.eq('batch', admin.batch); }
            const { data, error } = await query.order('name', { ascending: true });
            if (error) throw error;
            setStudents(data || []);
        } catch (err: any) { setError(err.message); toast.error("Failed to fetch students", { description: err.message }); } finally { setLoading(false); }
    };

    useEffect(() => {
        const fetchAdminProfile = async () => {
            if (!authUser) return;
            try {
                const { data, error } = await supabase.from('profiles').select('role, batch').eq('uid', authUser.id).single();
                if (error) throw error;
                if (data) { setAdminProfile(data as AdminProfile); fetchData(data as AdminProfile); }
            } catch (err: any) { setError("Could not load your admin profile. " + err.message); setLoading(false); }
        };
        if (authUser) fetchAdminProfile();
    }, [authUser]);

    const handleViewClick = async (student: StudentProfile) => {
        setSelectedStudent(student);
        setIsViewModalOpen(true);
        setIsLoadingData(true);
        const marksPromise = supabase.from('academic_entries').select('*, subject_marks(*)').eq('student_uid', student.uid);
        const familyPromise = supabase.from('family_data').select('*').eq('student_uid', student.uid).single();
        const [{ data: marksData }, { data: familyDataRes }] = await Promise.all([marksPromise, familyPromise]);
        setAcademicMarks(marksData || []);
        setFamilyData(familyDataRes || {});
        setIsLoadingData(false);
    };

    const handleEditClick = (student: StudentProfile) => { setSelectedStudent(student); setIsEditModalOpen(true); };
    const handleDeleteClick = (student: StudentProfile) => { setSelectedStudent(student); setIsDeleteModalOpen(true); };
    const handleDeleteClassClick = (classId: string) => { setClassToDelete(classId); setIsDeleteModalOpen(true); };
    const handlePromoteClassClick = (classId: string) => { setClassToPromote(classId); setIsPromoteModalOpen(true); };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            const endpoint = classToDelete ? '/api/delete-class' : '/api/delete-user';
            const body = classToDelete ? { class_id: classToDelete } : { uid: selectedStudent?.uid };
            const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Deletion failed');
            toast.success(classToDelete ? `Successfully deleted all students in ${classToDelete}.` : 'Student deleted successfully.');
            if (adminProfile) fetchData(adminProfile);
        } catch (err: any) { toast.error('Deletion failed', { description: err.message }); } finally { setIsDeleting(false); setIsDeleteModalOpen(false); setSelectedStudent(null); setClassToDelete(null); }
    };

    const confirmPromotion = async (toClassId: string) => {
        setIsPromoting(true);
        try {
            const res = await fetch('/api/promote-class', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from_class_id: classToPromote, to_class_id: toClassId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Promotion failed');
            toast.success(data.message || "Class promoted successfully!");
            if (adminProfile) fetchData(adminProfile);
        } catch (err: any) {
            toast.error('Promotion failed', { description: err.message });
        } finally {
            setIsPromoting(false);
            setIsPromoteModalOpen(false);
        }
    };

    const filteredStudents = useMemo(() => {
        if (!searchQuery) return students;
        return students.filter(student => student.name.toLowerCase().includes(searchQuery.toLowerCase()) || student.cic?.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [students, searchQuery]);

    const groupedStudents = filteredStudents.reduce((acc, student) => {
        const key = student.class_id || 'Unassigned';
        if (!acc[key]) acc[key] = [];
        acc[key].push(student);
        return acc;
    }, {} as Record<string, StudentProfile[]>);

    return (
        <div className="h-full w-full p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div><h1 className="text-3xl font-bold">Manage Students</h1><p className="text-muted-foreground">View, edit, and manage student profiles.</p></div>
                <div className="relative w-full sm:w-auto"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="Search by name or CIC..." className="pl-10 w-full sm:w-64" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
            </div>
            {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            {loading ? (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-56 w-full" />)}</div>) : adminProfile?.role === 'officer' ? (<Tabs defaultValue={Object.keys(groupedStudents)[0] || ''} className="w-full"><TabsList className="overflow-x-auto h-auto">{Object.keys(groupedStudents).sort().map(classId => (<TabsTrigger key={classId} value={classId}>{classId}</TabsTrigger>))}</TabsList>{Object.entries(groupedStudents).map(([classId, studentList]) => (<TabsContent key={classId} value={classId} className="mt-4"><div className="flex justify-between items-center mb-4"><h3 className="text-xl font-semibold">{classId} ({studentList.length} Students)</h3><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => handlePromoteClassClick(classId)}><ChevronsRight className="mr-2 h-4 w-4" /> Promote Class</Button><Button variant="destructive" size="sm" onClick={() => handleDeleteClassClick(classId)}><Trash2 className="mr-2 h-4 w-4" /> Delete Class</Button></div></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{studentList.map(student => <StudentCard key={student.uid} student={student} onView={handleViewClick} onEdit={handleEditClick} onDelete={handleDeleteClick} />)}</div></TabsContent>))}</Tabs>) : (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{filteredStudents.map(student => <StudentCard key={student.uid} student={student} onView={handleViewClick} onEdit={handleEditClick} onDelete={handleDeleteClick} />)}</div>)}

            <ViewStudentModal isOpen={isViewModalOpen} setIsOpen={setIsViewModalOpen} student={selectedStudent} marks={academicMarks} familyData={familyData} isLoadingData={isLoadingData} />
            <EditStudentModal isOpen={isEditModalOpen} setIsOpen={setIsEditModalOpen} student={selectedStudent} onSave={() => { if (adminProfile) fetchData(adminProfile) }} />
            <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} isLoading={isDeleting} title={classToDelete ? `Delete Class: ${classToDelete}?` : `Delete Student: ${selectedStudent?.name}?`} description={classToDelete ? `Are you sure you want to delete all students in this class? This action is irreversible.` : `Are you sure you want to delete this student? This action is irreversible.`} />
            <PromoteClassModal isOpen={isPromoteModalOpen} onClose={() => setIsPromoteModalOpen(false)} className={classToPromote} onConfirm={confirmPromotion} isLoading={isPromoting} />
        </div>
    );
}
