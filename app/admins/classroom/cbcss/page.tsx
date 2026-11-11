'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Download,
  Users,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import {
  ClassOption,
  Semester,
  fetchClassOptions,
  findMatchingClass,
} from '@/lib/portionUtils';
import { exportCbcssPdf } from '@/lib/cbcssPdfService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type CourseType = 'OFF COURSE' | 'IN COURSE';

interface CbcssRecord {
  id: string;
  batch: string;
  semester: Semester;
  course_type: CourseType;
  course_name: string;
  instead_of: string;
  credits: number;
}

interface CbcssStudent {
  id?: string;
  record_id: string;
  student_uid: string;
  student_name: string;
  cic?: string | null;
}

const blankForm = {
  course_type: 'OFF COURSE' as CourseType,
  course_name: '',
  instead_of: '',
  credits: '',
};

export default function CbcssPage() {
  const { user, details, role, loading: userLoading } = useUserData();

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [activeClass, setActiveClass] = useState<string>('');
  const [classesLoading, setClassesLoading] = useState(true);
  const [semester, setSemester] = useState<Semester>('SEM-1');

  const [records, setRecords] = useState<CbcssRecord[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [recordStudents, setRecordStudents] = useState<CbcssStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CbcssRecord | null>(null);
  const [form, setForm] = useState(blankForm);
  const [selectedStudentUids, setSelectedStudentUids] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const isClassTeacher = role === 'class';

  // 1. Fetch available classes & set default active class
  useEffect(() => {
    let isMounted = true;
    async function initClasses() {
      if (userLoading) return;
      setClassesLoading(true);
      try {
        const classList = await fetchClassOptions('cbcss_records');
        if (!isMounted) return;
        setClasses(classList);

        const defaultClass = findMatchingClass(
          classList,
          details?.batch,
          details?.designation
        );
        setActiveClass(defaultClass);
      } catch (err: any) {
        console.error('Failed to load classes for CBCSS:', err);
      } finally {
        if (isMounted) setClassesLoading(false);
      }
    }

    initClasses();
    return () => {
      isMounted = false;
    };
  }, [userLoading, details?.batch, details?.designation]);

  // 2. Load CBCSS records, enrolled students, and class roster
  const loadData = useCallback(async () => {
    if (!activeClass) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const activeOption = classes.find((c) => c.id === activeClass);
      const keys = activeOption ? activeOption.queryKeys : [activeClass];

      // Fetch CBCSS records
      const { data: recData, error: recError } = await supabase
        .from('cbcss_records')
        .select('*')
        .in('batch', keys)
        .eq('semester', semester)
        .order('created_at', { ascending: false });

      if (recError) throw recError;

      // Fetch class students
      const [batchStudentsRes, classStudentsRes] = await Promise.all([
        supabase.from('students').select('uid, name, cic').in('batch', keys).order('name'),
        supabase.from('students').select('uid, name, cic').in('class_id', keys).order('name'),
      ]);

      const studentMap = new Map<string, any>();
      [...(batchStudentsRes.data || []), ...(classStudentsRes.data || [])].forEach((s) => {
        studentMap.set(s.uid, s);
      });
      const safeStudents = Array.from(studentMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setStudents(safeStudents);

      const safeRecords = (recData || []) as CbcssRecord[];
      const recIds = safeRecords.map((r) => r.id);
      let studentRows: CbcssStudent[] = [];

      if (recIds.length > 0) {
        const { data: junctionData, error: junctionError } = await supabase
          .from('cbcss_students')
          .select('*')
          .in('record_id', recIds);
        if (junctionError) throw junctionError;
        studentRows = (junctionData || []) as CbcssStudent[];
      }

      setRecords(safeRecords);
      setRecordStudents(studentRows);
      if (safeRecords.length > 0 && !expandedId) {
        setExpandedId(safeRecords[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load CBCSS data', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [activeClass, classes, semester, expandedId]);

  useEffect(() => {
    if (!classesLoading && activeClass) {
      loadData();
    }
  }, [classesLoading, activeClass, loadData]);

  // Group enrolled students by record_id
  const studentsByRecord = useMemo(() => {
    const map: Record<string, CbcssStudent[]> = {};
    recordStudents.forEach((row) => {
      if (!map[row.record_id]) map[row.record_id] = [];
      map[row.record_id].push(row);
    });
    return map;
  }, [recordStudents]);

  // Filter student list in modal by search query
  const filteredStudents = useMemo(() => {
    const query = studentSearch.toLowerCase().trim();
    if (!query) return students;
    return students.filter(
      (s) =>
        s.name?.toLowerCase().includes(query) || s.cic?.toLowerCase().includes(query)
    );
  }, [students, studentSearch]);

  // Open modal to add a new course
  const openAdd = () => {
    setEditingRecord(null);
    setForm(blankForm);
    setSelectedStudentUids(new Set());
    setStudentSearch('');
    setModalOpen(true);
  };

  // Open modal to edit existing course
  const openEdit = (rec: CbcssRecord) => {
    setEditingRecord(rec);
    setForm({
      course_type: rec.course_type,
      course_name: rec.course_name,
      instead_of: rec.instead_of,
      credits: rec.credits !== undefined && rec.credits !== null ? String(rec.credits) : '',
    });
    const enrolledUids = new Set(
      (studentsByRecord[rec.id] || []).map((s) => s.student_uid)
    );
    setSelectedStudentUids(enrolledUids);
    setStudentSearch('');
    setModalOpen(true);
  };

  // Toggle selection of all students
  const toggleSelectAll = () => {
    if (selectedStudentUids.size === students.length) {
      setSelectedStudentUids(new Set());
    } else {
      setSelectedStudentUids(new Set(students.map((s) => s.uid)));
    }
  };

  // Toggle single student
  const toggleStudent = (uid: string) => {
    const updated = new Set(selectedStudentUids);
    if (updated.has(uid)) updated.delete(uid);
    else updated.add(uid);
    setSelectedStudentUids(updated);
  };

  // Save CBCSS record and enrolled students
  const saveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !user?.id) return;

    if (!form.course_name.trim()) {
      toast.error('Course Name is required.');
      return;
    }
    if (!form.instead_of.trim()) {
      toast.error("'Instead of' (replaced subject) is required.");
      return;
    }

    setSaving(true);
    try {
      const activeOption = classes.find((c) => c.id === activeClass);
      const targetBatch = activeOption ? activeOption.id : activeClass;

      const payload = {
        id: editingRecord?.id,
        batch: editingRecord?.batch || targetBatch,
        semester,
        course_type: form.course_type,
        course_name: form.course_name.trim(),
        instead_of: form.instead_of.trim(),
        credits: form.credits ? Number(form.credits) : 0,
        created_by: user.id,
      };

      const { data: recordData, error: recordError } = await supabase
        .from('cbcss_records')
        .upsert(payload)
        .select()
        .single();

      if (recordError) throw recordError;

      const recordId = recordData.id;

      // Delete existing junction entries for this record
      await supabase.from('cbcss_students').delete().eq('record_id', recordId);

      // Insert currently selected students
      const selectedList = students.filter((s) => selectedStudentUids.has(s.uid));
      if (selectedList.length > 0) {
        const studentPayload = selectedList.map((s) => ({
          record_id: recordId,
          student_uid: s.uid,
          student_name: s.name,
          cic: s.cic || null,
        }));

        const { error: studentInsertError } = await supabase
          .from('cbcss_students')
          .insert(studentPayload);
        if (studentInsertError) throw studentInsertError;
      }

      toast.success(editingRecord ? 'CBCSS course updated!' : 'CBCSS course added!');
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Failed to save CBCSS record', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Delete CBCSS record
  const deleteRecord = async (rec: CbcssRecord) => {
    try {
      const { error } = await supabase.from('cbcss_records').delete().eq('id', rec.id);
      if (error) throw error;
      toast.success(`"${rec.course_name}" deleted.`);
      loadData();
    } catch (err: any) {
      toast.error('Failed to delete CBCSS record', { description: err.message });
    }
  };

  // Export modern PDF report
  const handleExportPdf = async () => {
    if (!records.length) {
      toast.error(`No CBCSS courses recorded for ${activeClass} in ${semester}.`);
      return;
    }
    setExportingPdf(true);
    try {
      await exportCbcssPdf({
        className: activeClass,
        semester,
        records,
        recordStudents,
      });
      toast.success('Print report window opened.');
    } catch (err: any) {
      toast.error('Failed to generate CBCSS PDF', { description: err.message });
    } finally {
      setExportingPdf(false);
    }
  };

  const inCourseCount = records.filter((r) => r.course_type === 'IN COURSE').length;
  const offCourseCount = records.filter((r) => r.course_type === 'OFF COURSE').length;
  const totalCredits = records.reduce((sum, r) => sum + (Number(r.credits) || 0), 0);

  if (userLoading || classesLoading || (loading && !records.length)) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-xs text-muted-foreground">Loading CBCSS courses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">CBCSS</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {activeClass
              ? `${activeClass} (${semester}) Choice Based Credit Courses.`
              : 'Select a class to view Choice Based Credit Semester System courses.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={openAdd} className="text-xs h-9 gap-1.5">
            <Plus className="h-4 w-4" />
            Add CBCSS Course
          </Button>

          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={exportingPdf || records.length === 0}
            className="text-xs h-9 gap-1.5"
          >
            {exportingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Download className="h-4 w-4 text-primary" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      {/* Class Selector Tabs for Staff & Officer */}
      {!isClassTeacher && classes.length > 0 && (
        <Card className="border border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {classes.map((cls) => {
                const isActive = activeClass === cls.id;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => setActiveClass(cls.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cls.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Semester Switcher Tabs: SEM-1 and SEM-2 */}
      <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-xl w-fit border border-border">
        {(['SEM-1', 'SEM-2'] as Semester[]).map((sem) => {
          const isActive = semester === sem;
          return (
            <button
              key={sem}
              type="button"
              onClick={() => setSemester(sem)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {sem === 'SEM-1' ? 'SEM 1' : 'SEM 2'}
            </button>
          );
        })}
      </div>

      {/* Summary Metric Cards */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{records.length}</div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                Total Courses
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{inCourseCount}</div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                In Course
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{offCourseCount}</div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                Off Course
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalCredits}</div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                Total Credits
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Records List or Empty State */}
      {records.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-3">
            <GraduationCap className="h-10 w-10 text-muted-foreground/60" />
            <h3 className="text-base font-bold text-foreground">No CBCSS Courses in {semester}</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              {activeClass
                ? `No CBCSS courses added for ${activeClass} in ${semester}. Click below to add a course.`
                : 'No CBCSS courses found.'}
            </p>
            <Button onClick={openAdd} size="sm" className="text-xs gap-1.5">
              <Plus className="h-4 w-4" />
              Add CBCSS Course
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => {
            const isOpen = expandedId === rec.id;
            const enrolled = studentsByRecord[rec.id] || [];
            const isOff = rec.course_type === 'OFF COURSE';

            return (
              <Card key={rec.id} className="overflow-hidden border border-border shadow-sm">
                {/* Course Header */}
                <div
                  onClick={() => setExpandedId(isOpen ? null : rec.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-muted/40 transition-colors select-none gap-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isOff
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      }`}
                    >
                      {rec.course_type}
                    </Badge>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{rec.course_name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Instead of: <span className="font-semibold text-foreground">{rec.instead_of}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <Badge variant="secondary" className="font-bold text-xs">
                      {rec.credits} Credits
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {enrolled.length} Students
                    </Badge>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded Course Details */}
                {isOpen && (
                  <CardContent className="p-4 pt-0 border-t border-border space-y-4 bg-muted/10">
                    <div className="space-y-2 pt-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Enrolled Students ({enrolled.length})
                        </h4>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(rec)}
                            className="text-xs h-7 px-2.5 gap-1"
                          >
                            <Edit2 className="h-3 w-3 text-primary" />
                            Edit
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 px-2.5 gap-1 text-destructive hover:bg-destructive/10 border-destructive/20"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete CBCSS Course</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{rec.course_name}&quot;? All student
                                  enrollments for this course will be removed.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteRecord(rec)}
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      {enrolled.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2">
                          No students enrolled in this course yet. Click &quot;Edit&quot; to assign students.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {enrolled.map((st) => (
                            <div
                              key={st.student_uid}
                              className="flex items-center gap-1.5 bg-background border border-border px-2.5 py-1 rounded-lg text-xs font-medium text-foreground shadow-2xs"
                            >
                              <span>{st.student_name}</span>
                              {st.cic && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  ({st.cic})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-lg font-bold">
              {editingRecord ? 'Edit CBCSS Course' : 'Add CBCSS Course'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {activeClass} &bull; {semester}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={saveRecord} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Course Type Toggle */}
              <div className="space-y-1.5">
                <Label>Course Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['OFF COURSE', 'IN COURSE'] as CourseType[]).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={form.course_type === type ? 'default' : 'outline'}
                      onClick={() => setForm({ ...form, course_type: type })}
                      className="text-xs h-9 font-bold"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Course Name */}
              <div className="space-y-1.5">
                <Label htmlFor="course_name">Course Name</Label>
                <Input
                  id="course_name"
                  required
                  placeholder="e.g. Journalism & Mass Communication"
                  value={form.course_name}
                  onChange={(e) => setForm({ ...form, course_name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              {/* Instead Of */}
              <div className="space-y-1.5">
                <Label htmlFor="instead_of">Instead of (Replaced Subject)</Label>
                <Input
                  id="instead_of"
                  required
                  placeholder="e.g. Political Science / Arabic Literature"
                  value={form.instead_of}
                  onChange={(e) => setForm({ ...form, instead_of: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              {/* Credits */}
              <div className="space-y-1.5">
                <Label htmlFor="credits">Course Credits</Label>
                <Input
                  id="credits"
                  type="number"
                  step="0.5"
                  placeholder="e.g. 2, 3, 4"
                  value={form.credits}
                  onChange={(e) => setForm({ ...form, credits: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              {/* Student Selection Section */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold">
                      Enrolled Students ({selectedStudentUids.size} of {students.length})
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Select which students are taking this CBCSS course.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="text-xs h-7 text-primary hover:text-primary"
                  >
                    {selectedStudentUids.size === students.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search student..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2 bg-muted/10 divide-y divide-border/40">
                  {filteredStudents.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-2">
                      No matching students found.
                    </p>
                  ) : (
                    filteredStudents.map((st) => {
                      const isSelected = selectedStudentUids.has(st.uid);
                      return (
                        <div
                          key={st.uid}
                          onClick={() => toggleStudent(st.uid)}
                          className="flex items-center justify-between py-1.5 px-2 hover:bg-muted/40 rounded cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : 'border-muted-foreground/40'
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                            <span className="font-medium text-foreground">{st.name}</span>
                          </div>
                          {st.cic && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {st.cic}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-3 border-t border-border flex items-center justify-end gap-2 bg-muted/20">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="text-xs h-9 min-w-28 gap-1.5">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingRecord ? 'Update Course' : 'Save Course'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
