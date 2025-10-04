// app/admins/manage-students/page.tsx
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { toast } from 'sonner';

// Import the new, separated components
import { StudentCard } from '@/components/admin/manage-students/StudentCard';
import { ViewStudentModal } from '@/components/admin/manage-students/ViewStudentModal';
import { EditStudentModal } from '@/components/admin/manage-students/EditStudentModal';
import { DeleteConfirmationModal } from '@/components/admin/manage-students/DeleteConfirmationModal';
import { PromoteClassModal } from '@/components/admin/manage-students/PromoteClassModal';

// UI Components
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Search, AlertCircle, ChevronsRight, Trash2 } from 'lucide-react';

// Type Definitions
export interface SubjectMark { id?: number; subject_name: string; marks_obtained: string; status: boolean; }
export interface AcademicEntry { id?: number; title: string; subject_marks: SubjectMark[]; }
export interface Sibling { name: string; education: string[]; occupation: string; responsibilities: string[]; }
export interface FamilyData { student_uid: string; total_family_members: number | null; father_name: string | null; father_occupation: string | null; father_staying_place: string | null; father_responsibilities: string[]; mother_name: string | null; mother_occupation: string | null; brothers: Sibling[]; sisters: Sibling[]; chronically_ill_members: boolean; house_type: string | null; }
export interface StudentProfile { uid: string; name: string; cic: string | null; class_id: string; council: string | null; batch: string | null; phone: string | null; guardian: string | null; g_phone: string | null; address: string | null; img_url: string | null; sslc: string | null; plustwo: string | null; plustwo_streams: string | null; }
interface AdminProfile { role: string; batch: string | null; }

export default function ManageStudentsPage() {
    const { user: authUser } = useUserData();
    const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [classToDelete, setClassToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
    const [classToPromote, setClassToPromote] = useState('');
    const [isPromoting, setIsPromoting] = useState(false);

    const fetchData = useCallback(async (admin: AdminProfile) => {
        setLoading(true); setError(null);
        try {
            let query = supabase.from('students').select('*');
            if (admin.role === 'class' && admin.batch) { query = query.eq('batch', admin.batch); }
            const { data, error } = await query.order('name', { ascending: true });
            if (error) throw error;
            setStudents(data || []);
        } catch (err: any) { setError(err.message); toast.error("Failed to fetch students", { description: err.message }); } finally { setLoading(false); }
    }, []);

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
    }, [authUser, fetchData]);

    const handleViewClick = (student: StudentProfile) => { setSelectedStudent(student); setIsViewModalOpen(true); };
    const handleEditClick = (student: StudentProfile) => { setSelectedStudent(student); setIsEditModalOpen(true); };
    const handleDeleteClick = (student: StudentProfile) => { setSelectedStudent(student); setClassToDelete(null); setIsDeleteModalOpen(true); };
    const handleDeleteClassClick = (classId: string) => { setClassToDelete(classId); setSelectedStudent(null); setIsDeleteModalOpen(true); };
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

    const groupedStudents = useMemo(() => filteredStudents.reduce((acc, student) => {
        const key = student.class_id || 'Unassigned';
        if (!acc[key]) acc[key] = [];
        acc[key].push(student);
        return acc;
    }, {} as Record<string, StudentProfile[]>), [filteredStudents]);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-heading">Manage Students</h1>
                    <p className="text-muted-foreground">View, edit, and manage all student profiles.</p>
                </div>
                <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="Search by name or CIC..." className="pl-10 w-full sm:w-64" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
            </div>

            {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-60 w-full" />)}
                </div>
            ) : adminProfile?.role === 'officer' ? (
                <Tabs defaultValue={Object.keys(groupedStudents)[0] || ''} className="w-full">
                    <div className="w-full overflow-x-auto pb-2"><TabsList>{Object.keys(groupedStudents).sort().map(classId => (<TabsTrigger key={classId} value={classId}>{classId}</TabsTrigger>))}</TabsList></div>
                    {Object.entries(groupedStudents).map(([classId, studentList]) => (
                        <TabsContent key={classId} value={classId} className="mt-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                                <h3 className="text-xl font-semibold">{classId} <span className="text-base text-muted-foreground">({studentList.length} Students)</span></h3>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handlePromoteClassClick(classId)}><ChevronsRight className="mr-2 h-4 w-4" /> Promote Class</Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteClassClick(classId)}><Trash2 className="mr-2 h-4 w-4" /> Delete Class</Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {studentList.map(student => <StudentCard key={student.uid} student={student} onView={handleViewClick} onEdit={handleEditClick} onDelete={handleDeleteClick} />)}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredStudents.map(student => <StudentCard key={student.uid} student={student} onView={handleViewClick} onEdit={handleEditClick} onDelete={handleDeleteClick} />)}
                </div>
            )}

            <ViewStudentModal isOpen={isViewModalOpen} setIsOpen={setIsViewModalOpen} student={selectedStudent} />
            <EditStudentModal isOpen={isEditModalOpen} setIsOpen={setIsEditModalOpen} student={selectedStudent} onSave={() => { if (adminProfile) fetchData(adminProfile) }} />
            <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} isLoading={isDeleting} title={classToDelete ? `Delete Class: ${classToDelete}?` : `Delete Student: ${selectedStudent?.name}?`} description={classToDelete ? `This will delete all ${groupedStudents[classToDelete || '']?.length || ''} students in this class. This action is irreversible.` : `Are you sure you want to delete this student? This action is irreversible.`} />
            <PromoteClassModal isOpen={isPromoteModalOpen} onClose={() => setIsPromoteModalOpen(false)} className={classToPromote} onConfirm={confirmPromotion} isLoading={isPromoting} />
        </div>
    );
}