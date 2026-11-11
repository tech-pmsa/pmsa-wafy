'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress as UIProgress } from '@/components/ui/progress';
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Edit2,
  Plus,
  Trash2,
  Loader2,
  FileCheck2,
  Download,
  Calendar,
  Clock,
  Check,
} from 'lucide-react';
import {
  displayDate,
  toDateValue,
  Semester,
} from '@/lib/portionUtils';
import { exportCeWorkPdf } from '@/lib/ceWorkPdfService';
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

type Work = {
  id: string;
  batch: string;
  semester?: string;
  work_name: string;
  subject_name: string;
  teacher_name?: string | null;
  started_date: string;
  submission_date: string;
  mark?: number | null;
};

const blank = {
  work_name: 'المقالة',
  custom_work_name: '',
  subject_name: '',
  teacher_name: '',
  started_date: toDateValue(new Date()),
  submission_date: toDateValue(new Date()),
  mark: '',
};

function batchFrom(details: any) {
  return details?.designation || details?.batch || '';
}

export default function CEWorkPage() {
  const { user, details, loading: userLoading } = useUserData();
  const batch = batchFrom(details);

  const [semester, setSemester] = useState<Semester>('SEM-1');
  const [works, setWorks] = useState<Work[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [workStudents, setWorkStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const loadData = useCallback(async () => {
    if (!batch && !details?.batch && !details?.designation) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const batchKeys = new Set<string>();
      if (batch) {
        batchKeys.add(batch);
        batchKeys.add(batch.replace(/\s+Class$/i, ''));
      }
      if (details?.batch) {
        batchKeys.add(details.batch);
        batchKeys.add(details.batch.replace(/\s+Class$/i, ''));
      }
      if (details?.designation) {
        batchKeys.add(details.designation);
        batchKeys.add(details.designation.replace(/\s+Class$/i, ''));
      }

      const lookupBatch = details?.batch || batch;
      if (lookupBatch) {
        const { data: relatedStudents } = await supabase
          .from('students')
          .select('class_id, batch')
          .or(`batch.eq.${lookupBatch},class_id.eq.${lookupBatch}`);

        (relatedStudents || []).forEach((student: any) => {
          if (student.class_id) {
            batchKeys.add(student.class_id);
            batchKeys.add(`${student.class_id} Class`);
          }
          if (student.batch) {
            batchKeys.add(student.batch);
          }
        });
      }

      const keys = Array.from(batchKeys).filter(Boolean);

      const [worksRes, batchStudentsRes, classStudentsRes] = await Promise.all([
        supabase
          .from('ce_work_items')
          .select('*')
          .in('batch', keys.length ? keys : [batch])
          .or(`semester.eq.${semester},semester.is.null`)
          .order('submission_date', { ascending: false }),
        supabase
          .from('students')
          .select('uid, name, cic')
          .in('batch', keys.length ? keys : [batch])
          .order('name'),
        supabase
          .from('students')
          .select('uid, name, cic')
          .in('class_id', keys.length ? keys : [batch])
          .order('name'),
      ]);

      if (worksRes.error) throw worksRes.error;

      // Unify student sets
      const studentMap = new Map<string, any>();
      [...(batchStudentsRes.data || []), ...(classStudentsRes.data || [])].forEach((student) => {
        studentMap.set(student.uid, student);
      });
      const safeStudents = Array.from(studentMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      const safeWorks = (worksRes.data || []) as Work[];

      setWorks(safeWorks);
      setStudents(safeStudents);
      const workIds = safeWorks.map((work) => work.id);

      if (workIds.length) {
        const { data, error } = await supabase
          .from('ce_work_students')
          .select('*')
          .in('work_id', workIds);
        if (error) throw error;
        setWorkStudents(data || []);
      } else {
        setWorkStudents([]);
      }

      if (safeWorks.length > 0 && !expandedId) {
        setExpandedId(safeWorks[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load CE works', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [batch, details?.batch, details?.designation, semester, expandedId]);

  useEffect(() => {
    if (!userLoading) loadData();
  }, [userLoading, loadData]);

  const studentsByWork = useMemo(() => {
    const map: Record<string, any[]> = {};
    workStudents.forEach((row) => {
      if (!map[row.work_id]) map[row.work_id] = [];
      map[row.work_id].push(row);
    });
    return map;
  }, [workStudents]);

  const toggleStudent = async (row: any) => {
    try {
      const nextStatus = !row.is_submitted;
      // Optimistic update
      setWorkStudents((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, is_submitted: nextStatus } : r))
      );

      const { error } = await supabase
        .from('ce_work_students')
        .update({ is_submitted: nextStatus })
        .eq('id', row.id);
      if (error) throw error;
    } catch (err: any) {
      toast.error('Failed to update submission status', { description: err.message });
      loadData();
    }
  };

  const openAdd = () => {
    setEditingWork(null);
    setForm(blank);
    setModalOpen(true);
  };

  const openEdit = (work: Work) => {
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

  const saveWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch || !user?.id) return;

    const chosenName =
      form.work_name === 'Other'
        ? form.custom_work_name.trim()
        : form.work_name.trim();

    if (!chosenName || !form.subject_name.trim()) {
      toast.error('Work name and subject name are required.');
      return;
    }

    setSaving(true);
    try {
      const targetBatch =
        editingWork?.batch ||
        works[0]?.batch ||
        batch ||
        details?.batch ||
        details?.designation ||
        '';

      const payload = {
        id: editingWork?.id,
        batch: targetBatch,
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

      // Populate student rows for newly added works
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
      loadData();
    } catch (err: any) {
      toast.error('Failed to save CE work', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const deleteWork = async (work: Work) => {
    try {
      const { error } = await supabase.from('ce_work_items').delete().eq('id', work.id);
      if (error) throw error;
      toast.success(`"${work.work_name}" deleted.`);
      loadData();
    } catch (err: any) {
      toast.error('Failed to delete work', { description: err.message });
    }
  };

  const handleExportPdf = async () => {
    if (!works.length) {
      toast.error(`No CE works recorded in ${semester}.`);
      return;
    }
    setExportingPdf(true);
    try {
      await exportCeWorkPdf({
        className: batch,
        semester,
        works,
        workStudents,
      });
      toast.success('Print report window opened.');
    } catch (err: any) {
      toast.error('Failed to generate CE work PDF', { description: err.message });
    } finally {
      setExportingPdf(false);
    }
  };

  if (userLoading || (loading && !works.length)) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-xs text-muted-foreground">Loading CE works...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Continuous Evaluation (CE Work)</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Track student assignments, term papers, and project submissions for {batch}.
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

      {/* Semester Switcher */}
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

      {/* Works List or Empty State */}
      {works.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-3">
            <FileCheck2 className="h-10 w-10 text-muted-foreground/60" />
            <h3 className="text-base font-bold text-foreground">No CE Works in {semester}</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              No continuous evaluation works found for {batch} in {semester}. Click below to add a new work.
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
            const currentRoster = studentsByWork[work.id] || [];
            const submittedCount = currentRoster.filter((r) => r.is_submitted).length;
            const totalCount = currentRoster.length;
            const percent = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;

            return (
              <Card key={work.id} className="overflow-hidden border border-border shadow-sm">
                {/* Header */}
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

                {/* Expanded Details: Dates, Edit/Delete & Submissions Grid */}
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

                    {/* Submissions Grid */}
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Student Submissions ({submittedCount} of {totalCount} Done)
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {currentRoster.map((r) => {
                          const isDone = r.is_submitted;
                          return (
                            <div
                              key={r.id}
                              onClick={() => toggleStudent(r)}
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
              {batch} &bull; {semester}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={saveWork} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Preset CE Work Options */}
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
