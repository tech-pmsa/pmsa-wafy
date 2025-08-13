// app/admins/manage-students/page.tsx
'use client';

import { useEffect, useState, useRef, ChangeEvent, FormEvent } from 'react';
import Image from 'next/image';
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
import { User, Phone, Edit, Loader2, Camera, AlertCircle, School, Users, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

// Define types
interface StudentProfile {
    uid: string;
    name: string;
    cic: string | null;
    class_id: string;
    council: string | null;
    batch: string | null;
    phone: string | null;
    guardian: string | null;
    g_phone: string | null;
    address: string | null;
    img_url: string | null;
}

interface AdminProfile {
    uid: string;
    role: string;
    batch: string | null;
}

// Reusable Student Card Component
function StudentCard({ student, onEdit, onDelete }: { student: StudentProfile; onEdit: (student: StudentProfile) => void; onDelete: (student: StudentProfile) => void; }) {
    return (
        <Card className="flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
            <CardHeader className="flex flex-row items-center gap-4 p-4">
                <Avatar className="h-16 w-16 flex-shrink-0 border-2 border-primary/20">
                    <AvatarImage src={student.img_url || undefined} alt={student.name} />
                    <AvatarFallback><User className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <CardTitle className="truncate" title={student.name}>{student.name}</CardTitle>
                    <CardDescription>CIC: {student.cic || 'N/A'}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><School className="h-4 w-4 flex-shrink-0" /><span>{student.class_id}</span></div>
                <div className="flex items-center gap-2"><Users className="h-4 w-4 flex-shrink-0" /><span>{student.council || 'N/A'}</span></div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 flex-shrink-0" /><span>{student.phone || 'N/A'}</span></div>
            </CardContent>
            <CardFooter className="p-4 pt-0 mt-auto flex items-center gap-2">
                <Button variant="outline" size="sm" className="w-full" onClick={() => onEdit(student)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button variant="destructive" size="icon" className="flex-shrink-0" onClick={() => onDelete(student)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );
}

// Edit Modal Component
function EditStudentModal({ isOpen, setIsOpen, student, onSave }: { isOpen: boolean; setIsOpen: (open: boolean) => void; student: StudentProfile | null; onSave: () => void; }) {
    const [formData, setFormData] = useState<Partial<StudentProfile>>({});
    const [preview, setPreview] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (student) {
            setFormData(student);
            setPreview(student.img_url);
        }
    }, [student]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!student) return;
        setIsSaving(true);

        const { uid, ...updateData } = formData;
        let finalUpdateData: any = { ...updateData };

        try {
            if (file) {
                const filePath = `avatars/${student.uid}/${Date.now()}-${file.name}`;
                const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
                if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

                const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
                finalUpdateData.img_url = `${urlData.publicUrl}?t=${new Date().getTime()}`;
            }

            const { error: updateError } = await supabase.from('students').update(finalUpdateData).eq('uid', student.uid);
            if (updateError) throw new Error(`Failed to update student: ${updateError.message}`);

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
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-3xl">
                <form onSubmit={handleSave}>
                    <DialogHeader>
                        <DialogTitle>Edit Student Profile</DialogTitle>
                        <DialogDescription>Update the details for {student?.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="py-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[70vh] overflow-y-auto pr-2">
                        <div className="md:col-span-1 flex flex-col items-center gap-4">
                            <div className="relative group h-32 w-32">
                                <Avatar className="h-full w-full ring-4 ring-primary/20">
                                    <AvatarImage src={preview || undefined} alt="Profile Preview" />
                                    <AvatarFallback><User className="h-16 w-16" /></AvatarFallback>
                                </Avatar>
                                <Label htmlFor="image-upload" className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Camera className="w-8 h-8" />
                                </Label>
                                <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" ref={fileInputRef} />
                            </div>
                        </div>
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><Label htmlFor="name">Full Name</Label><Input id="name" name="name" value={formData.name || ''} onChange={handleChange} /></div>
                            <div><Label htmlFor="cic">CIC</Label><Input id="cic" name="cic" value={formData.cic || ''} onChange={handleChange} /></div>
                            <div><Label htmlFor="class_id">Class ID</Label><Input id="class_id" name="class_id" value={formData.class_id || ''} onChange={handleChange} /></div>
                            <div><Label htmlFor="council">Council</Label><Input id="council" name="council" value={formData.council || ''} onChange={handleChange} /></div>
                            <div><Label htmlFor="batch">Batch</Label><Input id="batch" name="batch" value={formData.batch || ''} onChange={handleChange} /></div>
                            <div><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" value={formData.phone || ''} onChange={handleChange} /></div>
                            <div><Label htmlFor="guardian">Guardian</Label><Input id="guardian" name="guardian" value={formData.guardian || ''} onChange={handleChange} /></div>
                            <div><Label htmlFor="g_phone">Guardian Phone</Label><Input id="g_phone" name="g_phone" value={formData.g_phone || ''} onChange={handleChange} /></div>
                            <div className="sm:col-span-2"><Label htmlFor="address">Address</Label><Textarea id="address" name="address" value={formData.address || ''} onChange={handleChange} /></div>
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

// Confirmation Modal for Deletion
function DeleteConfirmationModal({ isOpen, onClose, onConfirm, title, description, isLoading }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; description: string; isLoading: boolean; }) {
    if (!isOpen) return null;
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : 'Confirm Delete'}
                    </Button>
                </DialogFooter>
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

    // State for modals
    const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [classToDelete, setClassToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchData = async (admin: AdminProfile) => {
        setLoading(true);
        setError(null);
        try {
            let query = supabase.from('students').select('*');
            if (admin.role === 'class' && admin.batch) {
                query = query.eq('batch', admin.batch);
            }

            const { data, error } = await query.order('name', { ascending: true });

            if (error) throw error;
            setStudents(data || []);
        } catch (err: any) {
            setError(err.message);
            toast.error("Failed to fetch students", { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchAdminProfile = async () => {
            if (!authUser) return;
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role, batch')
                    .eq('uid', authUser.id)
                    .single();

                if (error) throw error;
                if (data) {
                    setAdminProfile(data as AdminProfile);
                    fetchData(data as AdminProfile);
                }
            } catch (err: any) {
                setError("Could not load your admin profile. " + err.message);
                setLoading(false);
            }
        };
        if (authUser) fetchAdminProfile();
    }, [authUser]);

    const handleEditClick = (student: StudentProfile) => {
        setSelectedStudent(student);
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (student: StudentProfile) => {
        setSelectedStudent(student);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteClassClick = (classId: string) => {
        setClassToDelete(classId);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            const endpoint = classToDelete ? '/api/delete-class' : '/api/delete-user';
            const body = classToDelete ? { class_id: classToDelete } : { uid: selectedStudent?.uid };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Deletion failed');

            toast.success(classToDelete ? `Successfully deleted all students in ${classToDelete}.` : 'Student deleted successfully.');
            if (adminProfile) fetchData(adminProfile); // Refresh data

        } catch (err: any) {
            toast.error('Deletion failed', { description: err.message });
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
            setSelectedStudent(null);
            setClassToDelete(null);
        }
    };

    const groupedStudents = students.reduce((acc, student) => {
        const key = student.class_id || 'Unassigned';
        if (!acc[key]) acc[key] = [];
        acc[key].push(student);
        return acc;
    }, {} as Record<string, StudentProfile[]>);

    return (
        <div className="h-full w-full p-4 md:p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Manage Students</h1>
                <p className="text-muted-foreground">View, edit, and manage student profiles.</p>
            </div>

            {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-56 w-full" />)}
                </div>
            ) : adminProfile?.role === 'officer' ? (
                <Tabs defaultValue={Object.keys(groupedStudents)[0] || ''} className="w-full">
                    <TabsList className="overflow-x-auto h-auto">
                        {Object.keys(groupedStudents).sort().map(classId => (
                            <TabsTrigger key={classId} value={classId}>{classId}</TabsTrigger>
                        ))}
                    </TabsList>
                    {Object.entries(groupedStudents).map(([classId, studentList]) => (
                        <TabsContent key={classId} value={classId} className="mt-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold">{classId} ({studentList.length} Students)</h3>
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteClassClick(classId)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Class
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {studentList.map(student => <StudentCard key={student.uid} student={student} onEdit={handleEditClick} onDelete={handleDeleteClick} />)}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {students.map(student => <StudentCard key={student.uid} student={student} onEdit={handleEditClick} onDelete={handleDeleteClick} />)}
                </div>
            )}

            <EditStudentModal isOpen={isEditModalOpen} setIsOpen={setIsEditModalOpen} student={selectedStudent} onSave={() => { if(adminProfile) fetchData(adminProfile) }} />
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                isLoading={isDeleting}
                title={classToDelete ? `Delete Class: ${classToDelete}?` : `Delete Student: ${selectedStudent?.name}?`}
                description={classToDelete ? `Are you sure you want to delete all students in this class? This action is irreversible.` : `Are you sure you want to delete this student? This action is irreversible.`}
            />
        </div>
    );
}
