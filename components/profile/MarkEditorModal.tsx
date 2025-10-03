// components/profile/MarkEditorModal.tsx
'use client'

import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { toast } from 'sonner';

// Import types from the main ProfileSection component
import { AcademicEntry, SubjectMark } from '@/components/ProfileSection';

// UI Components
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';

interface MarkEditorModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    entry: AcademicEntry | null;
    onSave: () => void;
}

export function MarkEditorModal({ isOpen, setIsOpen, entry, onSave }: MarkEditorModalProps) {
    const { user } = useUserData();
    const [title, setTitle] = useState('');
    const [subjects, setSubjects] = useState<SubjectMark[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (entry) {
                setTitle(entry.title);
                // Create a deep copy to avoid direct state mutation on the original prop
                setSubjects(JSON.parse(JSON.stringify(entry.subject_marks || [])));
            } else {
                // Reset for a new entry
                setTitle('');
                setSubjects([{ subject_name: '', marks_obtained: '', status: true }]);
            }
        }
    }, [entry, isOpen]);

    const handleSubjectChange = (index: number, field: keyof SubjectMark, value: string | boolean) => {
        const newSubjects = [...subjects];
        (newSubjects[index] as any)[field] = value;
        setSubjects(newSubjects);
    };

    const addSubject = () => {
        if (subjects.length < 15) {
            setSubjects([...subjects, { subject_name: '', marks_obtained: '', status: true }]);
        } else {
            toast.warning("You have reached the maximum limit of 15 subjects per entry.");
        }
    };

    const removeSubject = (index: number) => {
        setSubjects(subjects.filter((_, i) => i !== index));
    };

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast.error("User not found. Please log in again.");
            return;
        }
        setIsSaving(true);
        try {
            const { data: entryData, error: entryError } = await supabase.from('academic_entries')
                .upsert({ id: entry?.id, student_uid: user.id, title: title.toUpperCase() })
                .select()
                .single();
            if (entryError) throw entryError;

            const subjectMarksToSave = subjects.map(subject => ({
                ...subject,
                entry_id: entryData.id,
                subject_name: subject.subject_name.toUpperCase(),
                marks_obtained: subject.marks_obtained.toUpperCase(),
            }));

            const { error: subjectsError } = await supabase.from('subject_marks').upsert(subjectMarksToSave, { onConflict: 'id' });
            if (subjectsError) throw subjectsError;

            if (entry && entry.subject_marks) {
                const subjectsToDelete = entry.subject_marks.filter(oldSub => oldSub.id && !subjects.some(newSub => newSub.id === oldSub.id));
                if (subjectsToDelete.length > 0) {
                    const { error: deleteError } = await supabase.from('subject_marks').delete().in('id', subjectsToDelete.map(s => s.id!));
                    if (deleteError) throw deleteError;
                }
            }

            toast.success("Academic record saved successfully!");
            onSave();
            setIsOpen(false);
        } catch (error: any) {
            toast.error("Failed to save record.", { description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl">
                <form onSubmit={handleSave}>
                    <DialogHeader>
                        <DialogTitle>{entry?.id ? 'Edit' : 'Add'} Academic Entry</DialogTitle>
                        <DialogDescription>Add or edit an exam/semester and its subject marks.</DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Exam / Semester Title</Label>
                            <Input id="title" placeholder="e.g., SSLC Examination" value={title} onChange={(e) => setTitle(e.target.value)} className="uppercase" required />
                        </div>

                        <Label>Subjects & Marks</Label>
                        <div className="space-y-3">
                            {subjects.map((subject, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-md bg-muted/50">
                                    <Input placeholder="Subject Name" value={subject.subject_name} onChange={(e) => handleSubjectChange(index, 'subject_name', e.target.value)} className="col-span-5 uppercase" required />
                                    <Input placeholder="Mark/Grade" value={subject.marks_obtained} onChange={(e) => handleSubjectChange(index, 'marks_obtained', e.target.value)} className="col-span-3 uppercase" required />
                                    <div className="col-span-3 flex items-center justify-center gap-2">
                                        <Label htmlFor={`status-${index}`} className={subject.status ? 'text-green-600' : 'text-destructive'}>{subject.status ? 'Pass' : 'Fail'}</Label>
                                        <Switch id={`status-${index}`} checked={subject.status} onCheckedChange={(checked) => handleSubjectChange(index, 'status', checked)} />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSubject(index)} className="col-span-1 text-destructive hover:bg-destructive/10">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <Button type="button" variant="outline" onClick={addSubject} className="w-full">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Subject
                        </Button>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}