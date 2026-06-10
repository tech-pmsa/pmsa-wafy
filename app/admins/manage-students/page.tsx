// app/admins/manage-students/page.tsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { toast } from 'sonner';
import { utils, writeFile } from 'xlsx';

// Import the student subcomponents
import { StudentCard } from '@/components/admin/manage-students/StudentCard';
import { ViewStudentModal } from '@/components/admin/manage-students/ViewStudentModal';
import { EditStudentModal } from '@/components/admin/manage-students/EditStudentModal';
import { PromoteClassModal } from '@/components/admin/manage-students/PromoteClassModal';
import { ArchivedStudentModal } from '@/components/admin/manage-students/ArchivedStudentModal';

// UI Components
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import {
  Search,
  AlertCircle,
  ChevronsRight,
  Trash2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Sparkles,
  Download,
  Archive,
  X,
  Loader2,
  UserCheck,
  Users,
  School,
} from 'lucide-react';

const STUDENT_EXPORT_COLUMNS = [
  'Name',
  'CIC',
  'Class',
  'Council',
  'Batch',
  'Phone',
  'Guardian',
  'Guardian Phone',
  'Address',
  'SSLC',
  'Plus Two',
  'Plus Two Stream',
  'Achievements',
  'Total Family Members',
  'Father Name',
  'Father Occupation',
  'Father Staying Place',
  'Father Responsibilities',
  'Mother Name',
  'Mother Occupation',
  'Brother Count',
  'Brother Details',
  'Sister Count',
  'Sister Details',
  'Chronically Ill Members',
  'House Type',
];

export interface SubjectMark {
  id?: number;
  subject_name: string;
  marks_obtained: string;
  status: boolean;
}

export interface AcademicEntry {
  id?: number;
  title: string;
  subject_marks: SubjectMark[];
}

export interface Sibling {
  name: string;
  education: string[];
  occupation: string;
  responsibilities: string[];
}

export interface FamilyData {
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

export interface StudentProfile {
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
  sslc: string | null;
  plustwo: string | null;
  plustwo_streams: string | null;
}

function valueOrBlank(value: any) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return String(value);
}

function listText(value: any) {
  if (!value) return '';
  if (Array.isArray(value)) return value.map(valueOrBlank).filter(Boolean).join(', ');
  if (typeof value === 'string') return value;
  return String(value);
}

function arrayFromJsonValue(value: any) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatSibling(sibling: any) {
  if (!sibling || typeof sibling !== 'object') return valueOrBlank(sibling);

  return [
    sibling.name ? `Name: ${sibling.name}` : '',
    sibling.education ? `Education: ${listText(sibling.education)}` : '',
    sibling.occupation ? `Occupation: ${sibling.occupation}` : '',
    sibling.responsibilities ? `Responsibilities: ${listText(sibling.responsibilities)}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

function formatSiblingList(siblings: any[]) {
  return siblings
    .map((sibling, index) => {
      const details = formatSibling(sibling);
      return details ? `${index + 1}. ${details}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

function compareByCic(a: any, b: any) {
  const aCic = valueOrBlank(a?.cic).trim();
  const bCic = valueOrBlank(b?.cic).trim();
  const aNumber = Number(aCic);
  const bNumber = Number(bCic);

  if (aCic && bCic && Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
    return aNumber - bNumber;
  }

  if (aCic && !bCic) return -1;
  if (!aCic && bCic) return 1;

  return (
    aCic.localeCompare(bCic, undefined, { numeric: true, sensitivity: 'base' }) ||
    valueOrBlank(a?.name).localeCompare(valueOrBlank(b?.name))
  );
}

function formatArchiveDate(value?: string | null) {
  if (!value) return '';
  const [datePart] = value.split('T');
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return value;
}

export default function ManageStudentsPage() {
  const { role: authRole, details: authDetails, loading: authLoading } = useUserData();

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [oldStudents, setOldStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [oldSearchQuery, setOldSearchQuery] = useState('');
  const [backupMenuOpen, setBackupMenuOpen] = useState(false);
  const [exportingClass, setExportingClass] = useState<string | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [classToPromote, setClassToPromote] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);

  // Archive conversion states
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [classToConvert, setClassToConvert] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  // Archived student viewing states
  const [selectedOldStudent, setSelectedOldStudent] = useState<any | null>(null);
  const [isOldViewModalOpen, setIsOldViewModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('students').select('*');

      if (authRole === 'class' && authDetails?.batch) {
        query = query.eq('batch', authDetails.batch);
      }

      const { data, error } = await query.order('cic', { ascending: true });
      if (error) throw error;

      setStudents((data || []).sort(compareByCic));

      if (authRole === 'officer') {
        const { data: archivedData, error: archivedError } = await supabase
          .from('old_students')
          .select('*')
          .order('archive_class_id', { ascending: false })
          .order('name', { ascending: true });

        if (archivedError) throw archivedError;
        setOldStudents(archivedData || []);
      }
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch students data', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [authRole, authDetails]);

  useEffect(() => {
    if (!authLoading && authRole) fetchData();
  }, [authLoading, authRole, fetchData]);

  const handleViewClick = (student: StudentProfile) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
  };

  const handleEditClick = (student: StudentProfile) => {
    setSelectedStudent(student);
    setIsEditModalOpen(true);
  };

  const handleOldViewClick = (student: any) => {
    setSelectedOldStudent(student);
    setIsOldViewModalOpen(true);
  };

  const handleDeleteClick = (student: StudentProfile) => {
    if (!confirm(`Are you sure you want to permanently delete student ${student.name}? This cannot be undone.`)) return;

    const performDelete = async () => {
      try {
        const { error } = await supabase.functions.invoke('admin-actions', {
          body: { action: 'delete_user', uid: student.uid },
        });
        if (error) throw error;
        toast.success('Student deleted successfully');
        fetchData();
      } catch (err: any) {
        toast.error('Failed to delete student', { description: err.message });
      }
    };
    performDelete();
  };

  const handleDeleteClassClick = (classId: string) => {
    if (!confirm(`Are you sure you want to delete ALL students in class ${classId}? This will remove all their accounts permanently!`)) return;

    const performClassDelete = async () => {
      try {
        const { error } = await supabase.functions.invoke('admin-actions', {
          body: { action: 'delete_class', class_id: classId },
        });
        if (error) throw error;
        toast.success(`Class ${classId} deleted successfully`);
        fetchData();
      } catch (err: any) {
        toast.error('Failed to delete class', { description: err.message });
      }
    };
    performClassDelete();
  };

  const handlePromoteClassClick = (classId: string) => {
    setClassToPromote(classId);
    setIsPromoteModalOpen(true);
  };

  const handleConfirmPromotion = async (toClassId: string) => {
    setIsPromoting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'promote_class', from_class: classToPromote, to_class: toClassId },
      });
      if (error) throw error;
      toast.success(data?.message || `Successfully promoted all students in ${classToPromote} to ${toClassId}`);
      setIsPromoteModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error('Class promotion failed', { description: err.message });
    } finally {
      setIsPromoting(false);
    }
  };

  const handleConvertClassClick = (classId: string) => {
    setClassToConvert(classId);
    setStartYear('');
    setEndYear('');
    setIsConvertModalOpen(true);
  };

  const handleConfirmConvert = async () => {
    if (!classToConvert || isConverting) return;

    if (!/^\d{4}$/.test(startYear.trim()) || !/^\d{4}$/.test(endYear.trim())) {
      toast.warning('Invalid years', { description: 'Please enter both years in 4-digit format.' });
      return;
    }

    const previewClass = `${startYear.trim()}-${endYear.trim().slice(2)}`;

    if (!confirm(`Are you absolutely sure you want to convert ${classToConvert} to archived old students as ${previewClass}? Live student accounts will be deleted.`)) return;

    setIsConverting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'convert_old_students',
          class_id: classToConvert,
          start_year: startYear.trim(),
          end_year: endYear.trim(),
          archived_by: authDetails?.uid || null,
        },
      });

      if (error) throw error;

      toast.success(data?.message || `${classToConvert} converted successfully to old students.`);
      setIsConvertModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error('Conversion failed', { description: err.message });
    } finally {
      setIsConverting(false);
    }
  };

  const handleOldDeleteClick = (student: any) => {
    if (!confirm(`Are you sure you want to permanently delete archived record for ${student.name}? This cannot be undone.`)) return;

    const performOldDelete = async () => {
      try {
        const { error } = await supabase.from('old_students').delete().eq('id', student.id);
        if (error) throw error;
        toast.success('Archived student record deleted');
        fetchData();
      } catch (err: any) {
        toast.error('Failed to delete archived student', { description: err.message });
      }
    };
    performOldDelete();
  };

  const handleBackupClass = async (classId: string) => {
    if (exportingClass) return;

    const classStudents = students.filter((s) => (s.class_id || 'Unassigned') === classId);

    if (classStudents.length === 0) {
      toast.error('Backup failed', { description: 'No students found in this class.' });
      return;
    }

    setExportingClass(classId);

    try {
      const studentUids = classStudents.map((s) => s.uid);

      const [{ data: achievementsData, error: achievementsError }, { data: familyData, error: familyError }] =
        await Promise.all([
          supabase.from('achievements').select('student_uid,title').in('student_uid', studentUids),
          supabase.from('family_data').select('*').in('student_uid', studentUids),
        ]);

      if (achievementsError) throw achievementsError;
      if (familyError) throw familyError;

      const achievementsByStudent = (achievementsData || []).reduce((acc: Record<string, string[]>, val: any) => {
        if (!acc[val.student_uid]) acc[val.student_uid] = [];
        if (val.title) acc[val.student_uid].push(val.title);
        return acc;
      }, {});

      const familyByStudent = (familyData || []).reduce((acc: Record<string, any>, val: any) => {
        acc[val.student_uid] = val;
        return acc;
      }, {});

      const exportRows = classStudents.map((student) => {
        const family = familyByStudent[student.uid] || {};
        const brothers = arrayFromJsonValue(family.brothers);
        const sisters = arrayFromJsonValue(family.sisters);

        return {
          Name: valueOrBlank(student.name),
          CIC: valueOrBlank(student.cic),
          Class: valueOrBlank(student.class_id),
          Council: valueOrBlank(student.council),
          Batch: valueOrBlank(student.batch),
          Phone: valueOrBlank(student.phone),
          Guardian: valueOrBlank(student.guardian),
          'Guardian Phone': valueOrBlank(student.g_phone),
          Address: valueOrBlank(student.address),
          SSLC: valueOrBlank(student.sslc),
          'Plus Two': valueOrBlank(student.plustwo),
          'Plus Two Stream': valueOrBlank(student.plustwo_streams),
          Achievements: listText(achievementsByStudent[student.uid]),
          'Total Family Members': valueOrBlank(family.total_family_members),
          'Father Name': valueOrBlank(family.father_name),
          'Father Occupation': valueOrBlank(family.father_occupation),
          'Father Staying Place': valueOrBlank(family.father_staying_place),
          'Father Responsibilities': listText(family.father_responsibilities),
          'Mother Name': valueOrBlank(family.mother_name),
          'Mother Occupation': valueOrBlank(family.mother_occupation),
          'Brother Count': brothers.length,
          'Brother Details': formatSiblingList(brothers),
          'Sister Count': sisters.length,
          'Sister Details': formatSiblingList(sisters),
          'Chronically Ill Members': valueOrBlank(family.chronically_ill_members),
          'House Type': valueOrBlank(family.house_type),
        };
      });

      const worksheet = utils.json_to_sheet(exportRows, { header: STUDENT_EXPORT_COLUMNS });
      worksheet['!cols'] = STUDENT_EXPORT_COLUMNS.map((header) => ({
        wch:
          header.includes('Details') || header.includes('Responsibilities')
            ? 44
            : header.includes('Address') || header.includes('Achievements')
            ? 34
            : 20,
      }));
      worksheet['!autofilter'] = {
        ref: utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: exportRows.length, c: STUDENT_EXPORT_COLUMNS.length - 1 },
        }),
      };

      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, classId.slice(0, 31));

      writeFile(workbook, `Student_Backup_${classId}.xlsx`);
      toast.success(`Backup created successfully for class ${classId}`);
      setBackupMenuOpen(false);
    } catch (err: any) {
      toast.error('Backup creation failed', { description: err.message });
    } finally {
      setExportingClass(null);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.cic?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const groupedStudents = useMemo(() => {
    return filteredStudents.reduce((acc, student) => {
      const key = student.class_id || 'Unassigned';
      if (!acc[key]) acc[key] = [];
      acc[key].push(student);
      return acc;
    }, {} as Record<string, StudentProfile[]>);
  }, [filteredStudents]);

  const classIds = useMemo(() => {
    return Array.from(new Set(students.map((student) => student.class_id || 'Unassigned'))).sort();
  }, [students]);

  const groupedOldStudents = useMemo(() => {
    return oldStudents
      .filter((student: any) => {
        const q = oldSearchQuery.trim().toLowerCase();
        if (!q) return true;
        return (
          student.name?.toLowerCase().includes(q) ||
          student.cic?.toLowerCase().includes(q) ||
          student.archive_class_id?.toLowerCase().includes(q) ||
          student.phone?.toLowerCase().includes(q) ||
          student.guardian?.toLowerCase().includes(q)
        );
      })
      .reduce((acc: Record<string, any[]>, student: any) => {
        const key = student.archive_class_id || 'Old Students';
        if (!acc[key]) acc[key] = [];
        acc[key].push(student);
        return acc;
      }, {} as Record<string, any[]>);
  }, [oldStudents, oldSearchQuery]);

  if (authLoading || loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-60 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-foreground tracking-tight flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" /> Manage Students
          </h1>
          <p className="text-muted-foreground mt-1">View, edit, promote, and archive student profiles.</p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {authRole === 'officer' && (
            <div className="relative">
              <Button
                onClick={() => setBackupMenuOpen(!backupMenuOpen)}
                disabled={!!exportingClass}
                className="w-full sm:w-auto gap-1.5 shadow-md font-bold rounded-xl h-10 px-4"
              >
                {exportingClass ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>{exportingClass ? `Backing Up...` : 'Backup Data'}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>

              {backupMenuOpen && (
                <div className="absolute left-0 md:left-auto md:right-0 mt-2 w-56 rounded-xl border bg-popover text-popover-foreground shadow-lg z-50 overflow-hidden divide-y divide-border/40">
                  {classIds.length ? (
                    classIds.map((classId) => (
                      <button
                        key={classId}
                        onClick={() => handleBackupClass(classId)}
                        className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-muted text-xs font-semibold text-left transition-colors"
                      >
                        <span className="truncate">{classId}</span>
                        <span className="bg-muted px-2 py-0.5 rounded-full text-[10px] text-muted-foreground">
                          {students.filter((s) => (s.class_id || 'Unassigned') === classId).length}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs text-muted-foreground italic text-center">
                      No classes configured.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Search Active */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search active students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl text-xs font-semibold w-full bg-background"
            />
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/50 bg-card/45 backdrop-blur-sm shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold font-heading tracking-tight">{students.length}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Students</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card/45 backdrop-blur-sm shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
              <School className="h-6 w-6 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-extrabold font-heading tracking-tight">{classIds.length}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Classrooms</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card/45 backdrop-blur-sm shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Archive className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold font-heading tracking-tight">{oldStudents.length}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Archived Dossiers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Student Directory tabs */}
      {authRole === 'officer' ? (
        <Tabs defaultValue={Object.keys(groupedStudents)[0] || ''} className="w-full">
          <div className="w-full overflow-x-auto pb-2 border-b border-border/40">
            <TabsList className="h-auto p-1 bg-muted rounded-xl flex gap-1 w-max">
              {Object.keys(groupedStudents)
                .sort()
                .map((classId) => (
                  <TabsTrigger
                    key={classId}
                    value={classId}
                    className="rounded-lg text-xs font-bold py-2 px-4 whitespace-nowrap"
                  >
                    {classId}
                  </TabsTrigger>
                ))}
            </TabsList>
          </div>

          {Object.entries(groupedStudents).map(([classId, studentList]) => (
            <TabsContent key={classId} value={classId} className="mt-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/20 border rounded-2xl">
                <div>
                  <h3 className="text-lg font-extrabold font-heading text-foreground">{classId}</h3>
                  <p className="text-xs text-muted-foreground font-semibold mt-0.5">{studentList.length} Active Student Accounts</p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <Button
                    onClick={() => handlePromoteClassClick(classId)}
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1 text-xs font-bold rounded-xl"
                  >
                    <ChevronsRight className="h-4 w-4 text-primary" /> Promote Class
                  </Button>
                  <Button
                    onClick={() => handleConvertClassClick(classId)}
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1 text-xs font-bold rounded-xl text-warning hover:text-warning hover:bg-warning/5 border-warning/20"
                  >
                    <Archive className="h-4 w-4 text-warning" /> Convert to Old Students
                  </Button>
                  <Button
                    onClick={() => handleDeleteClassClick(classId)}
                    variant="destructive"
                    size="sm"
                    className="h-9 gap-1 text-xs font-bold rounded-xl shadow-sm"
                  >
                    <Trash2 className="h-4 w-4" /> Delete Class
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {studentList.map((student) => (
                  <StudentCard
                    key={student.uid}
                    student={student}
                    onView={handleViewClick}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStudents.map((student) => (
            <StudentCard
              key={student.uid}
              student={student}
              onView={handleViewClick}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Archived / Old Students Accordion Grid */}
      {authRole === 'officer' && oldStudents.length > 0 && (
        <div className="border-t pt-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold font-heading text-foreground tracking-tight">Old Students</h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
                Graduated and archived student profiles. Completely separated from live database nodes.
              </p>
            </div>
            {/* Old Student Search */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search archived students..."
                value={oldSearchQuery}
                onChange={(e) => setOldSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl text-xs font-semibold bg-background"
              />
            </div>
          </div>

          {Object.keys(groupedOldStudents).length === 0 ? (
            <Card className="border border-border/50 shadow-sm py-10 text-center">
              <CardDescription className="font-semibold text-sm">
                No archived students match your search filters.
              </CardDescription>
            </Card>
          ) : (
            <Accordion type="multiple" className="w-full space-y-4">
              {Object.entries(groupedOldStudents)
                .sort()
                .map(([classId, studentList]) => (
                  <AccordionItem
                    key={classId}
                    value={classId}
                    className="border border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden"
                  >
                    <AccordionTrigger className="px-5 py-4 font-bold text-foreground text-sm hover:no-underline bg-muted/5 border-b border-border/20">
                      <div className="flex items-center gap-2.5">
                        <Archive className="h-4 w-4 text-muted-foreground" />
                        <span>{classId}</span>
                        <span className="bg-muted px-2 py-0.5 rounded-full text-[10px] font-extrabold text-muted-foreground">
                          {studentList.length} Archived
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {studentList.map((student) => (
                          <div
                            key={student.id}
                            className="p-4 rounded-2xl border border-border bg-card/40 backdrop-blur-sm flex flex-col justify-between"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="flex items-center justify-center h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary font-bold text-sm">
                                {student.name?.charAt(0)?.toUpperCase() || 'S'}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-extrabold text-foreground truncate">{student.name}</h4>
                                <p className="text-[10px] font-semibold text-muted-foreground/80 mt-0.5 truncate">
                                  CIC: {student.cic || '-'} • Batch {student.batch || 'N/A'}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex gap-2 border-t pt-3">
                              <Button
                                onClick={() => handleOldViewClick(student)}
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs font-bold rounded-xl h-8"
                              >
                                View Snapshot
                              </Button>
                              <Button
                                onClick={() => handleOldDeleteClick(student)}
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 rounded-xl border border-destructive/10 text-destructive hover:bg-destructive/5 flex items-center justify-center p-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
          )}
        </div>
      )}

      {/* Active student dialogs */}
      <ViewStudentModal
        isOpen={isViewModalOpen}
        setIsOpen={setIsViewModalOpen}
        student={selectedStudent}
      />
      <EditStudentModal
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
        student={selectedStudent}
        onSave={fetchData}
      />
      <PromoteClassModal
        isOpen={isPromoteModalOpen}
        onClose={() => setIsPromoteModalOpen(false)}
        className={classToPromote}
        onConfirm={handleConfirmPromotion}
        isLoading={isPromoting}
      />

      {/* Archived student dialog */}
      <ArchivedStudentModal
        isOpen={isOldViewModalOpen}
        onClose={() => setIsOldViewModalOpen(false)}
        student={selectedOldStudent}
      />

      {/* Convert Class Dialog Modal */}
      {isConvertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground border rounded-2xl max-w-sm w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsConvertModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              disabled={isConverting}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-lg font-bold font-heading text-foreground flex items-center gap-2">
                <Archive className="h-5 w-5 text-warning" /> Archive Class
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Convert {classToConvert} into an archived old student batch.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="start-yr" className="text-xs font-semibold text-muted-foreground">Start Year</Label>
                  <Input
                    id="start-yr"
                    value={startYear}
                    onChange={(e) => setStartYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="e.g. 2022"
                    type="number"
                    className="rounded-xl font-bold h-9 text-xs text-center"
                    disabled={isConverting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-yr" className="text-xs font-semibold text-muted-foreground">End Year</Label>
                  <Input
                    id="end-yr"
                    value={endYear}
                    onChange={(e) => setEndYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="e.g. 2026"
                    type="number"
                    className="rounded-xl font-bold h-9 text-xs text-center"
                    disabled={isConverting}
                  />
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border border-border/40 text-center space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Resulting Archive Class ID
                </span>
                <span className="block text-sm font-extrabold text-foreground font-heading">
                  {/^\d{4}$/.test(startYear) && /^\d{4}$/.test(endYear)
                    ? `${startYear}-${endYear.slice(2)}`
                    : '----'}
                </span>
              </div>

              <Button
                onClick={handleConfirmConvert}
                disabled={isConverting}
                className="w-full gap-2 font-bold shadow-md rounded-xl"
              >
                {isConverting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                {isConverting ? 'Archiving Class...' : 'Confirm Conversion'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}