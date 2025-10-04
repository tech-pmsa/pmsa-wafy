// components/admin/manage-students/EditStudentModal.tsx
'use client'

import { useEffect, useState, useRef, ChangeEvent, FormEvent, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// Import types from the main page and other components
import { StudentProfile, FamilyData, Sibling, AcademicEntry } from '@/app/admins/manage-students/page';
import { AdminMarkEditorModal } from './AdminMarkEditorModal';

// UI Components
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, User, Mail, Loader2, Lock, UserCheck, Building, Shield, PlusCircle, Trash2, Camera } from 'lucide-react';

// Reusable Helper Components defined within this file for encapsulation
function ReadOnlyField({ label, value }: { label: string, value: string | null }) {
    return (
        <div className="space-y-2">
            <Label htmlFor={label} className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-3 w-3" /> {label}
            </Label>
            <Input id={label} value={value || ''} readOnly disabled className="cursor-not-allowed" />
        </div>
    );
}

function SiblingFormCard({ type, siblings, onChange }: { type: 'brothers' | 'sisters', siblings: Sibling[], onChange: (type: 'brothers' | 'sisters', updatedSiblings: Sibling[]) => void }) {
    const handleSiblingChange = (index: number, field: keyof Sibling, value: string) => {
        const newSiblings = JSON.parse(JSON.stringify(siblings)); // Deep copy
        if (field === 'education' || field === 'responsibilities') {
            (newSiblings[index] as any)[field] = value.split(',').map(s => s.trim());
        } else {
            (newSiblings[index] as any)[field] = value;
        }
        onChange(type, newSiblings);
    };
    const addSibling = () => {
        if (siblings.length < 5) {
            onChange(type, [...siblings, { name: '', education: [], occupation: '', responsibilities: [] }]);
        }
    };
    const removeSibling = (index: number) => {
        onChange(type, siblings.filter((_, i) => i !== index));
    };
    const singularType = type.slice(0, -1);

    return (
        <Card>
            <CardHeader><CardTitle className="capitalize">{type}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                {siblings.length > 0 ? siblings.map((sibling, i) => (
                    <div key={i} className="relative grid grid-cols-1 gap-4 p-4 border rounded-lg">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSibling(i)} className="absolute top-2 right-2 h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                        <div className="space-y-2"><Label>Name</Label><Input placeholder="Name" value={sibling.name} onChange={e => handleSiblingChange(i, 'name', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Occupation</Label><Input placeholder="Occupation" value={sibling.occupation} onChange={e => handleSiblingChange(i, 'occupation', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Education (comma-separated)</Label><Textarea placeholder="e.g., SSLC, Plus Two" value={(sibling.education || []).join(', ')} onChange={e => handleSiblingChange(i, 'education', e.target.value)} /></div>
                        {type === 'brothers' && <div className="space-y-2"><Label>Responsibilities (comma-separated)</Label><Textarea placeholder="e.g., Public Activist" value={(sibling.responsibilities || []).join(', ')} onChange={e => handleSiblingChange(i, 'responsibilities', e.target.value)} /></div>}
                    </div>
                )) : <p className="text-sm text-muted-foreground">No {type} added yet.</p>}
                <Button type="button" variant="outline" onClick={addSibling} className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Add {singularType.charAt(0).toUpperCase() + singularType.slice(1)}</Button>
            </CardContent>
        </Card>
    );
}

// Main Modal Component
export function EditStudentModal({ isOpen, setIsOpen, student, onSave }: { isOpen: boolean; setIsOpen: (open: boolean) => void; student: StudentProfile | null; onSave: () => void; }) {
    const [personalForm, setPersonalForm] = useState<Partial<StudentProfile>>({});
    const [familyForm, setFamilyForm] = useState<Partial<FamilyData>>({});
    const [academicEntries, setAcademicEntries] = useState<AcademicEntry[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<AcademicEntry | null>(null);
    const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchAllData = useCallback(async () => {
        if (!student) return;
        const { data: family } = await supabase.from('family_data').select('*').eq('student_uid', student.uid).single();
        setFamilyForm(family || {});
        const { data: academics } = await supabase.from('academic_entries').select('*, subject_marks(*)').eq('student_uid', student.uid).order('created_at');
        setAcademicEntries(academics || []);
    }, [student]);

    useEffect(() => {
        if (student && isOpen) {
            setPersonalForm(student);
            setPreview(student.img_url);
            fetchAllData();
        }
    }, [student, isOpen, fetchAllData]);

    const handlePersonalChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setPersonalForm({ ...personalForm, [e.target.name]: e.target.value }); };
    const handleFamilyChange = (field: keyof FamilyData, value: any) => { setFamilyForm(prev => ({ ...prev, [field]: value })) };
    const handleSiblingsUpdate = (type: 'brothers' | 'sisters', updatedSiblings: Sibling[]) => { handleFamilyChange(type, updatedSiblings); };
    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)); } };
    const handleEntryDelete = async (entryId: number) => { const { error } = await supabase.from('academic_entries').delete().eq('id', entryId); if (!error) { fetchAllData(); toast.success("Academic record deleted."); } else { toast.error("Failed to delete record.", { description: error.message }); } };

    const handleSave = async () => {
        if (!student) return;
        setIsSaving(true);
        try {
            let finalUpdateData: any = { ...personalForm };
            if (file) {
                const filePath = `avatars/${student.uid}/${Date.now()}-${file.name}`;
                const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
                if (uploadError) throw uploadError;
                const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
                finalUpdateData.img_url = `${urlData.publicUrl}?t=${new Date().getTime()}`;
            }
            delete finalUpdateData.uid;

            const { error: updateError } = await supabase.from('students').update(finalUpdateData).eq('uid', student.uid);
            if (updateError) throw updateError;
            const { error: familyError } = await supabase.from('family_data').upsert({ ...familyForm, student_uid: student.uid });
            if (familyError) throw familyError;

            toast.success('Student profile updated successfully!');
            onSave();
            setIsOpen(false);
        } catch (err: any) {
            toast.error('Save failed', { description: err.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="lg:max-w-4xl w-[95vw] max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Edit Profile: {student?.name}</DialogTitle>
                        <DialogDescription>Update the student's information across all sections.</DialogDescription>
                    </DialogHeader>
                    <Tabs defaultValue="personal" className="w-full flex-1 flex flex-col overflow-hidden">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="personal">Personal</TabsTrigger>
                            <TabsTrigger value="academics">Academics</TabsTrigger>
                            <TabsTrigger value="family">Family</TabsTrigger>
                        </TabsList>

                        <TabsContent value="personal" className="overflow-y-auto mt-4 pr-4">
                            <div className="flex flex-col md:flex-row gap-8 py-4">
                                <div className="md:w-1/3 flex flex-col items-center gap-4 pt-4 md:border-r md:pr-8">
                                    <div className="relative group h-32 w-32">
                                        <Avatar className="h-full w-full ring-4 ring-primary/20"><AvatarImage src={preview || undefined} alt="Profile Preview" className='object-cover' /><AvatarFallback><User className="h-16 w-16" /></AvatarFallback></Avatar>
                                        <Label htmlFor="image-upload" className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><Camera className="w-8 h-8" /></Label>
                                        <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" ref={fileInputRef} />
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">Click photo to change</p>
                                </div>
                                <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2 sm:col-span-2"><Label htmlFor="name">Full Name</Label><Input id="name" name="name" value={personalForm.name || ''} onChange={handlePersonalChange} /></div>
                                    <div className="space-y-2"><Label htmlFor="class_id">Class ID</Label><Input id="class_id" name="class_id" value={personalForm.class_id || ''} onChange={handlePersonalChange} /></div>
                                    <div className="space-y-2"><Label htmlFor="batch">Batch</Label><Input id="batch" name="batch" value={personalForm.batch || ''} onChange={handlePersonalChange} /></div>
                                    <div className="space-y-2"><Label htmlFor="council">Council</Label><Input id="council" name="council" value={personalForm.council || ''} onChange={handlePersonalChange} /></div>
                                    <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" value={personalForm.phone || ''} onChange={handlePersonalChange} /></div>
                                    <div className="space-y-2"><Label htmlFor="guardian">Guardian</Label><Input id="guardian" name="guardian" value={personalForm.guardian || ''} onChange={handlePersonalChange} /></div>
                                    <div className="space-y-2"><Label htmlFor="g_phone">Guardian Phone</Label><Input id="g_phone" name="g_phone" value={personalForm.g_phone || ''} onChange={handlePersonalChange} /></div>
                                    <div className="sm:col-span-2 space-y-2"><Label htmlFor="address">Address</Label><Textarea id="address" name="address" value={personalForm.address || ''} onChange={handlePersonalChange} /></div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="academics" className="overflow-y-auto mt-4 pr-4">
                             <div className="py-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">Academic Records</h3>
                                    <Button type="button" onClick={() => { setSelectedEntry(null); setIsMarkModalOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" /> Add Record</Button>
                                </div>
                                <div className="border rounded-md">
                                    {academicEntries.length > 0 ? (
                                        <Accordion type="single" collapsible className="w-full">{academicEntries.map(entry => (
                                            <AccordionItem key={entry.id} value={`item-${entry.id}`}><AccordionTrigger className="px-4 text-base font-semibold hover:no-underline"><div className="flex items-center justify-between w-full pr-4"><span>{entry.title}</span><div className="flex items-center gap-2"><Button variant="ghost" size="icon" type="button" onClick={(e) => { e.stopPropagation(); setSelectedEntry(entry); setIsMarkModalOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" type="button" onClick={(e) => { e.stopPropagation(); handleEntryDelete(entry.id!); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div></AccordionTrigger><AccordionContent className="px-2 pb-2"><Table><TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Mark/Grade</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader><TableBody>{entry.subject_marks.map(subject => (<TableRow key={subject.id}><TableCell className="font-medium uppercase">{subject.subject_name}</TableCell><TableCell className="uppercase">{subject.marks_obtained}</TableCell><TableCell className="text-right"><Badge variant={subject.status ? "default" : "destructive"} className={subject.status ? "bg-green-600/80" : ""}>{subject.status ? 'Passed' : 'Failed'}</Badge></TableCell></TableRow>))}</TableBody></Table></AccordionContent></AccordionItem>
                                        ))}</Accordion>
                                    ) : (<p className="p-8 text-center text-muted-foreground">No academic records found.</p>)}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="family" className="overflow-y-auto mt-4 pr-4 space-y-6">
                            <Card><CardHeader><CardTitle>Household</CardTitle></CardHeader><CardContent className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Total Family Members</Label><Input type="number" value={familyForm.total_family_members || ''} onChange={e => handleFamilyChange('total_family_members', parseInt(e.target.value) || null)} /></div>
                                <div className="space-y-2"><Label>House Type</Label><Select value={familyForm.house_type || ''} onValueChange={value => handleFamilyChange('house_type', value)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="Own House">Own House</SelectItem><SelectItem value="Rented House">Rented House</SelectItem><SelectItem value="Living with Family">Living with Family</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
                                <div className="flex items-center space-x-2 sm:col-span-2 pt-2"><Switch id="chronically-ill" checked={familyForm.chronically_ill_members} onCheckedChange={checked => handleFamilyChange('chronically_ill_members', checked)} /><Label htmlFor="chronically-ill">Are there chronically ill members in the house?</Label></div>
                            </CardContent></Card>
                            <Card><CardHeader><CardTitle>Parent Details</CardTitle></CardHeader><CardContent className="space-y-4">
                                <div className="grid sm:grid-cols-2 gap-4"><div className="space-y-2"><Label>Father's Name</Label><Input value={familyForm.father_name || ''} onChange={e => handleFamilyChange('father_name', e.target.value)} /></div><div className="space-y-2"><Label>Father's Occupation</Label><Input value={familyForm.father_occupation || ''} onChange={e => handleFamilyChange('father_occupation', e.target.value)} /></div></div>
                                <div className="space-y-2"><Label>Father's Staying Place</Label><Input value={familyForm.father_staying_place || ''} onChange={e => handleFamilyChange('father_staying_place', e.target.value)} /></div>
                                <div className="space-y-2"><Label>Father's Responsibilities (comma-separated)</Label><Textarea value={(familyForm.father_responsibilities || []).join(', ')} onChange={e => handleFamilyChange('father_responsibilities', e.target.value.split(',').map(s => s.trim()))} /></div>
                                <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t"><div className="space-y-2"><Label>Mother's Name</Label><Input value={familyForm.mother_name || ''} onChange={e => handleFamilyChange('mother_name', e.target.value)} /></div><div className="space-y-2"><Label>Mother's Occupation</Label><Input value={familyForm.mother_occupation || ''} onChange={e => handleFamilyChange('mother_occupation', e.target.value)} /></div></div>
                            </CardContent></Card>
                            <SiblingFormCard type="brothers" siblings={familyForm.brothers || []} onChange={handleSiblingsUpdate} />
                            <SiblingFormCard type="sisters" siblings={familyForm.sisters || []} onChange={handleSiblingsUpdate} />
                        </TabsContent>
                </Tabs>
                <DialogFooter className="pt-4 mt-auto border-t"><Button onClick={() => setIsOpen(false)} variant="ghost">Cancel</Button><Button onClick={handleSave} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button></DialogFooter>
            </DialogContent>
        </Dialog>
        {student && <AdminMarkEditorModal isOpen={isMarkModalOpen} setIsOpen={setIsMarkModalOpen} entry={selectedEntry} student_uid={student.uid} onSave={fetchAllData} />}
      </>
    );
}