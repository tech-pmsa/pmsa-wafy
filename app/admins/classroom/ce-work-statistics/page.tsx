'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileCheck2,
  Plus,
  Edit2,
  Trash2,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  User,
  Loader2,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import {
  ClassOption,
  Semester,
  fetchClassOptions,
  findMatchingClass,
  displayDate,
  toDateValue,
} from '@/lib/portionUtils';
import { exportCeWorkPdf } from '@/lib/ceWorkPdfService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress as UIProgress } from '@/components/ui/progress';
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

const CE_WORK_OPTIONS = [
  'المقالة',
  'الاستبانة',
  'الأطروحة',
  'الترجمة',
  'مراجعة الكتاب',
  'البحث',
  'تلخيص المقالة',
  'تصميم البوستر',
  'المشروع العملي',
  'Other',
];

interface CEWork {
  id: string;
  batch: string;
  semester?: string;
  work_name: string;
  subject_name: string;
  teacher_name?: string | null;
  started_date: string;
  submission_date: string;
  mark?: number | null;
}

const blankForm = {
  work_name: 'المقالة',
  custom_work_name: '',
  subject_name: '',
  teacher_name: '',
  started_date: toDateValue(new Date()),
  submission_date: toDateValue(new Date()),
  mark: '',
};

export default function CEWorkStatisticsPage() {
  const { user, details, role, loading: userLoading } = useUserData();

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [activeClass, setActiveClass] = useState<string>('');
  const [classesLoading, setClassesLoading] = useState(true);
  const [semester, setSemester] = useState<Semester>('SEM-1');

  const [works, setWorks] = useState<CEWork[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<CEWork | null>(null);
  const [form, setForm] = useState(blankForm);
  const [studentSearch, setStudentSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const isClassTeacher = role === 'class';

  // 1. Fetch available classes and set initial activeClass
  useEffect(() => {
    let isMounted = true;
    async function initClasses() {
      if (userLoading) return;
      setClassesLoading(true);
      try {
        const classList = await fetchClassOptions('ce_work_items');
        if (!isMounted) return;
        setClasses(classList);

        const defaultClass = findMatchingClass(
          classList,
          details?.batch,
          details?.designation
        );
        setActiveClass(defaultClass);
      } catch (err: any) {
        console.error('Failed to load classes for CE work:', err);
      } finally {
        if (isMounted) setClassesLoading(false);
      }
    }

    initClasses();
    return () => {
      isMounted = false;
    };
  }, [userLoading, details?.batch, details?.designation]);

  // 2. Load CE works and student submissions for activeClass & semester
  const load = useCallback(async () => {
    if (!activeClass) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const activeOption = classes.find((c) => c.id === activeClass);
      const keys = activeOption ? activeOption.queryKeys : [activeClass];

      // Fetch students for this class
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

      // Fetch CE works
      let query = supabase
        .from('ce_work_items')
        .select('*')
        .in('batch', keys)
        .order('submission_date', { ascending: false });

      if (semester) {
        query = query.or(`semester.eq.${semester},semester.is.null`);
      }

      const { data: workData, error: workError } = await query;
      if (workError) throw workError;

      const safeWorks = (workData || []) as CEWork[];
      const ids = safeWorks.map((work) => work.id);
      let studentRows: any[] = [];

      if (ids.length) {
        const { data, error } = await supabase
          .from('ce_work_students')
          .select('*')
          .in('work_id', ids)
          .eq('is_removed', false);
        if (error) throw error;
        studentRows = data || [];
      }

      setWorks(safeWorks);
      setRows(studentRows);
      if (safeWorks.length > 0 && !expandedId) {
        setExpandedId(safeWorks[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load CE work statistics', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [activeClass, classes, semester, expandedId]);

  useEffect(() => {
    if (!classesLoading && activeClass) {
      load();
    }
  }, [classesLoading, activeClass, load]);

  const rowsByWork = useMemo(() => {
    const map: Record<string, any[]> = {};
    rows.forEach((row) => {
      if (!map[row.work_id]) map[row.work_id] = [];
      map[row.work_id].push(row);
    });
    return map;
  }, [rows]);

  const summary = useMemo(() => {
    let totalSubmitted = 0;
    let totalPending = 0;
    rows.forEach((r) => {
      if (!r.is_removed) {
        if (r.is_submitted) totalSubmitted += 1;
        else totalPending += 1;
      }
    });
    const totalPossible = totalSubmitted + totalPending;
    const rate = totalPossible > 0 ? Math.round((totalSubmitted / totalPossible) * 100) : 0;
    return {
      totalWorks: works.length,
      totalSubmitted,
      totalPending,
      rate,
    };
  }, [works.length, rows]);

  // Open modal to add new CE work
  const openAdd = () => {
    setEditingWork(null);
    setForm(blankForm);
    setModalOpen(true);
  };

  // Open modal to edit existing CE work
  const openEdit = (work: CEWork) => {
    setEditingWork(work);
    const isCustom = !CE_WORK_OPTIONS.includes(work.work_name);
    setForm({
      work_name: isCustom ? 'Other' : work.work_name,
      custom_work_name: isCustom ? work.work_name : '',
      subject_name: work.subject_name,
      teacher_name: work.teacher_name || '',
      started_date: work.started_date,
      submission_date: work.submission_date,
      mark: work.mark !== undefined && work.mark !== null ? String(work.mark) : '',
    });
    setModalOpen(true);
  };

  // Save new or updated CE work
  const saveWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !user?.id) return;

    const chosenName =
      form.work_name === 'Other'
        ? form.custom_work_name.trim()
        : form.work_name.trim();

    if (!chosenName || !form.subject_name.trim()) {
      toast.error('CE Work Name and Subject Name are required.');
      return;
    }

    setSaving(true);
    try {
      const activeOption = classes.find((c) => c.id === activeClass);
      const targetBatch = activeOption ? activeOption.id : activeClass;

      const payload = {
        id: editingWork?.id,
        batch: editingWork?.batch || targetBatch,
        semester,
        work_name: chosenName,
        subject_name: form.subject_name.trim().toUpperCase(),
        teacher_name: form.teacher_name.trim() || null,
        started_date: form.started_date,
        submission_date: form.submission_date,
        mark: form.mark ? Number(form.mark) : 0,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('ce_work_items')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;

      // Populate student rows for new works
      if (!editingWork && students.length > 0) {
        const studentPayload = students.map((student) => ({
          work_id: data.id,
          student_uid: student.uid,
          student_name: student.name,
          cic: student.cic,
          is_submitted: false,
          is_removed: false,
        }));
        await supabase
          .from('ce_work_students')
          .upsert(studentPayload, { onConflict: 'work_id,student_uid' });
      }

      toast.success(editingWork ? 'CE Work updated!' : 'CE Work created!');
      setModalOpen(false);
      load();
    } catch (err: any) {
      toast.error('Failed to save CE work', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Delete CE work
  const deleteWork = async (work: CEWork) => {
    try {
      const { error } = await supabase.from('ce_work_items').delete().eq('id', work.id);
      if (error) throw error;
      toast.success(`"${work.work_name}" deleted.`);
      load();
    } catch (err: any) {
      toast.error('Failed to delete CE work', { description: err.message });
    }
  };

  // Toggle student submission status
  const toggleSubmit = async (row: any) => {
    try {
      const nextStatus = !row.is_submitted;
      // Optimistic update
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, is_submitted: nextStatus } : r))
      );

      const { error } = await supabase
        .from('ce_work_students')
        .update({ is_submitted: nextStatus })
        .eq('id', row.id);
      if (error) throw error;
    } catch (err: any) {
      toast.error('Failed to update submission status', { description: err.message });
      load();
    }
  };

  // Export modern PDF report
  const handleExportPdf = async () => {
    if (!works.length) {
      toast.error(`No CE works recorded for ${activeClass} in ${semester}.`);
      return;
    }
    setExportingPdf(true);
    try {
      await exportCeWorkPdf({
        className: activeClass,
        semester,
        works,
        workStudents: rows,
      });
      toast.success('Print report window opened.');
    } catch (err: any) {
      toast.error('Failed to generate CE work PDF', { description: err.message });
    } finally {
      setExportingPdf(false);
    }
  };

  if (userLoading || classesLoading || (loading && !works.length)) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-xs text-muted-foreground">Loading CE work statistics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">CE Work Statistics</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {activeClass
              ? `${activeClass} (${semester}) Continuous Evaluation Works & Submissions.`
              : 'Select a class to view continuous evaluation statistics.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={openAdd} className="text-xs h-9 gap-1.5">
            <Plus className="h-4 w-4" />
            Add CE Work
          </Button>

          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={exportingPdf || works.length === 0}
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

      {/* Summary Metrics Strip */}
      {works.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{summary.totalWorks}</div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                Total Works
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {summary.totalSubmitted}
              </div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                Submitted
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {summary.totalPending}
              </div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                Pending
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{summary.rate}%</div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                Completion Rate
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Works List or Empty State */}
      {works.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-3">
            <FileCheck2 className="h-10 w-10 text-muted-foreground/60" />
            <h3 className="text-base font-bold text-foreground">No CE Works in {semester}</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              {activeClass
                ? `No CE works found for ${activeClass} in ${semester}. Click below to add a new CE work.`
                : 'No CE works found.'}
            </p>
            <Button onClick={openAdd} size="sm" className="text-xs gap-1.5">
              <Plus className="h-4 w-4" />
              Add CE Work
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {works.map((work) => {
            const isOpen = expandedId === work.id;
            const studentRows = rowsByWork[work.id] || [];
            const submittedCount = studentRows.filter((r) => r.is_submitted).length;
            const totalCount = studentRows.length;
            const percent = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;

            const filteredRoster = studentSearch.trim()
              ? studentRows.filter(
                  (r) =>
                    r.student_name?.toLowerCase().includes(studentSearch.toLowerCase().trim()) ||
                    r.cic?.toLowerCase().includes(studentSearch.toLowerCase().trim())
                )
              : studentRows;

            return (
              <Card key={work.id} className="overflow-hidden border border-border shadow-sm">
                {/* Header Row */}
                <div
                  onClick={() => setExpandedId(isOpen ? null : work.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-muted/40 transition-colors select-none gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileCheck2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{work.work_name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Subject: <span className="font-semibold text-foreground">{work.subject_name}</span>
                        {work.teacher_name && <span> &bull; Teacher: {work.teacher_name}</span>}
                        {work.mark !== undefined && work.mark !== null && (
                          <span> &bull; Max Mark: {work.mark}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <div className="text-right">
                      <div className="text-xs font-bold text-foreground">
                        {submittedCount} / {totalCount} Submitted
                      </div>
                      <div className="w-28 mt-1">
                        <UIProgress value={percent} className="h-1.5" />
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold ${
                        percent === 100
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : percent > 50
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {percent}%
                    </Badge>

                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded Section: Dates, Actions & Student Submission Table */}
                {isOpen && (
                  <CardContent className="p-4 pt-0 border-t border-border space-y-4 bg-muted/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Started: {displayDate(work.started_date)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span className="font-semibold text-foreground">
                            Due: {displayDate(work.submission_date)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(work)}
                          className="text-xs h-7 px-2.5 gap-1"
                        >
                          <Edit2 className="h-3 w-3 text-primary" />
                          Edit Work
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
                              <AlertDialogTitle>Delete CE Work</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{work.work_name}&quot;? All student
                                submission records for this work will be removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteWork(work)}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Student Submissions List */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Student Submissions ({submittedCount} of {totalCount} Done)
                        </h4>

                        <div className="relative max-w-xs">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Search student..."
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            className="pl-8 h-7 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {filteredRoster.map((r) => {
                          const isDone = r.is_submitted;
                          return (
                            <div
                              key={r.id}
                              onClick={() => toggleSubmit(r)}
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-colors ${
                                isDone
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                                  : 'bg-card border-border hover:bg-muted/40 text-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate pr-2">
                                <div
                                  className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                                    isDone
                                      ? 'bg-emerald-600 border-emerald-600 text-white'
                                      : 'border-muted-foreground/40'
                                  }`}
                                >
                                  {isDone && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                                <span className="font-semibold truncate">{r.student_name}</span>
                              </div>

                              <Badge
                                variant={isDone ? 'default' : 'outline'}
                                className={`text-[10px] shrink-0 font-bold ${
                                  isDone
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {isDone ? 'Submitted' : 'Pending'}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
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
              {editingWork ? 'Edit CE Work' : 'Add CE Work'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {activeClass} &bull; {semester}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={saveWork} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* CE Work Name Options */}
              <div className="space-y-1.5">
                <Label>CE Work Type</Label>
                <div className="flex flex-wrap gap-1.5">
                  {CE_WORK_OPTIONS.map((name) => (
                    <Button
                      key={name}
                      type="button"
                      size="sm"
                      variant={form.work_name === name ? 'default' : 'outline'}
                      onClick={() => setForm({ ...form, work_name: name })}
                      className="text-xs h-7"
                    >
                      {name}
                    </Button>
                  ))}
                </div>
                {form.work_name === 'Other' && (
                  <Input
                    placeholder="Enter custom work name"
                    value={form.custom_work_name}
                    onChange={(e) => setForm({ ...form, custom_work_name: e.target.value })}
                    className="mt-2 text-xs h-9"
                  />
                )}
              </div>

              {/* Subject Name */}
              <div className="space-y-1.5">
                <Label htmlFor="subject_name">Subject Name</Label>
                <Input
                  id="subject_name"
                  required
                  placeholder="e.g. TAFSEER / HADITH / FIQH"
                  value={form.subject_name}
                  onChange={(e) => setForm({ ...form, subject_name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              {/* Teacher Name */}
              <div className="space-y-1.5">
                <Label htmlFor="teacher_name">Teacher Name (Optional)</Label>
                <Input
                  id="teacher_name"
                  placeholder="e.g. Usthad K.V. Mohammed"
                  value={form.teacher_name}
                  onChange={(e) => setForm({ ...form, teacher_name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              {/* Mark */}
              <div className="space-y-1.5">
                <Label htmlFor="mark">Max Mark (Optional)</Label>
                <Input
                  id="mark"
                  type="number"
                  placeholder="e.g. 10, 20"
                  value={form.mark}
                  onChange={(e) => setForm({ ...form, mark: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="started_date">Started Date</Label>
                  <Input
                    id="started_date"
                    type="date"
                    required
                    value={form.started_date}
                    onChange={(e) => setForm({ ...form, started_date: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="submission_date">Submission Due Date</Label>
                  <Input
                    id="submission_date"
                    type="date"
                    required
                    value={form.submission_date}
                    onChange={(e) => setForm({ ...form, submission_date: e.target.value })}
                    className="h-9 text-xs"
                  />
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
                {editingWork ? 'Update Work' : 'Save Work'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
