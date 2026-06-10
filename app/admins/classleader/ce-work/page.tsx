'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Edit,
  Plus,
  Save,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { displayDate, toDateValue } from '@/lib/portionUtils';

type Work = {
  id: string;
  batch: string;
  work_name: string;
  subject_name: string;
  started_date: string;
  submission_date: string;
};

const blank = {
  work_name: '',
  subject_name: '',
  started_date: toDateValue(new Date()),
  submission_date: toDateValue(new Date()),
};

function batchFrom(details: any) {
  return details?.designation || details?.batch || '';
}

// Convert class designator like "1st Year B.Sc Class" to ID like "1st Year B.Sc"
function classIdFrom(details: any) {
  return details?.designation?.replace(/\s+Class$/i, '') || details?.batch || '';
}

export default function CEWorkPage() {
  const { user, details, role, loading: userLoading } = useUserData();
  const batch = batchFrom(details);
  const classId = classIdFrom(details);
  const [works, setWorks] = useState<Work[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [workStudents, setWorkStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!batch) return;
    setLoading(true);
    try {
      const [worksRes, batchStudentsRes, classStudentsRes] = await Promise.all([
        supabase.from('ce_work_items').select('*').eq('batch', batch).order('submission_date', { ascending: false }),
        supabase.from('students').select('uid, name, cic').eq('batch', batch).order('name'),
        supabase.from('students').select('uid, name, cic').eq('class_id', classId).order('name'),
      ]);
      if (worksRes.error) throw worksRes.error;
      if (batchStudentsRes.error) throw batchStudentsRes.error;
      if (classStudentsRes.error) throw classStudentsRes.error;

      // Unify student sets
      const studentMap = new Map<string, any>();
      [...(batchStudentsRes.data || []), ...(classStudentsRes.data || [])].forEach((student) => {
        studentMap.set(student.uid, student);
      });
      const safeStudents = Array.from(studentMap.values());
      const safeWorks = (worksRes.data || []) as Work[];

      setWorks(safeWorks);
      setStudents(safeStudents);
      const workIds = safeWorks.map((work) => work.id);

      if (workIds.length) {
        const { data, error } = await supabase.from('ce_work_students').select('*').in('work_id', workIds);
        if (error) throw error;
        const existingRows = data || [];
        const existingKeys = new Set(existingRows.map((row: any) => `${row.work_id}-${row.student_uid}`));
        const missingRows = safeWorks.flatMap((work) =>
          safeStudents
            .filter((student) => !existingKeys.has(`${work.id}-${student.uid}`))
            .map((student) => ({
              work_id: work.id,
              student_uid: student.uid,
              student_name: student.name,
              cic: student.cic,
              is_submitted: false,
              is_removed: false,
            }))
        );

        if (missingRows.length) {
          const { error: backfillError } = await supabase
            .from('ce_work_students')
            .upsert(missingRows, { onConflict: 'work_id,student_uid' });
          if (backfillError) throw backfillError;

          const { data: refreshedRows, error: refreshError } = await supabase
            .from('ce_work_students')
            .select('*')
            .in('work_id', workIds);
          if (refreshError) throw refreshError;
          setWorkStudents(refreshedRows || []);
        } else {
          setWorkStudents(existingRows);
        }
      } else {
        setWorkStudents([]);
      }
    } catch (err: any) {
      toast.error('Failed to load CE work items', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [batch, classId]);

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

  const openAdd = () => {
    setEditingWork(null);
    setForm(blank);
    setModalOpen(true);
  };

  const openEdit = (work: Work) => {
    setEditingWork(work);
    setForm({
      work_name: work.work_name,
      subject_name: work.subject_name,
      started_date: work.started_date,
      submission_date: work.submission_date,
    });
    setModalOpen(true);
  };

  const saveWork = async () => {
    if (!batch || !user?.id) return;
    if (!form.work_name.trim() || !form.subject_name.trim()) {
      toast.warning('Required fields missing', { description: 'Work name and subject name are required.' });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('ce_work_items').upsert({
        id: editingWork?.id,
        batch,
        work_name: form.work_name.trim(),
        subject_name: form.subject_name.trim().toUpperCase(),
        started_date: form.started_date,
        submission_date: form.submission_date,
        created_by: user.id,
      }).select().single();
      if (error) throw error;

      if (!editingWork) {
        const rows = students.map((student) => ({
          work_id: data.id,
          student_uid: student.uid,
          student_name: student.name,
          cic: student.cic,
          is_submitted: false,
          is_removed: false,
        }));
        if (rows.length) {
          const { error: studentError } = await supabase.from('ce_work_students').upsert(rows, { onConflict: 'work_id,student_uid' });
          if (studentError) throw studentError;
        }
      }

      setModalOpen(false);
      toast.success(editingWork ? 'CE Work updated successfully' : 'CE Work item created successfully');
      loadData();
    } catch (err: any) {
      toast.error('Error saving CE work', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const deleteWork = async (work: Work) => {
    if (!confirm(`Are you sure you want to delete ${work.work_name}?`)) return;

    try {
      const { error } = await supabase.from('ce_work_items').delete().eq('id', work.id);
      if (error) throw error;
      toast.success('CE Work item deleted successfully');
      loadData();
    } catch (err: any) {
      toast.error('Error deleting CE work', { description: err.message });
    }
  };

  const toggleSubmit = async (row: any) => {
    const nextSubmitted = !row.is_submitted;
    // Optimistic UI Update
    setWorkStudents((prev) =>
      prev.map((item) => (item.id === row.id ? { ...item, is_submitted: nextSubmitted } : item))
    );

    const { error } = await supabase.from('ce_work_students').update({ is_submitted: nextSubmitted }).eq('id', row.id);
    if (error) {
      toast.error('Failed to update submission status');
      // Rollback
      setWorkStudents((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, is_submitted: row.is_submitted } : item))
      );
    } else {
      toast.success(`${row.student_name} marked as ${nextSubmitted ? 'Submitted' : 'Not Submitted'}`);
    }
  };

  const removeStudent = async (row: any) => {
    if (!confirm(`Remove ${row.student_name} from this CE Work list?`)) return;

    try {
      const { error } = await supabase.from('ce_work_students').update({ is_removed: true }).eq('id', row.id);
      if (error) throw error;
      toast.success(`${row.student_name} removed from this CE task`);
      loadData();
    } catch (err: any) {
      toast.error('Failed to remove student', { description: err.message });
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex h-[75vh] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== 'class-leader') {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <Card className="max-w-md w-full border-destructive/20 bg-destructive/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold font-heading text-destructive">Access Denied</CardTitle>
            <CardDescription className="text-destructive-foreground/75 mt-1">
              CE Work management is only accessible to class leaders.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-foreground tracking-tight">CE Work</h1>
          <p className="text-muted-foreground mt-1">{batch || 'Class'} Continuous Evaluation (CE) submission tracking.</p>
        </div>
        <Button onClick={openAdd} className="gap-1.5 shadow-sm font-semibold rounded-xl sm:w-fit self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Add CE Work
        </Button>
      </div>

      <div className="space-y-4">
        {works.length ? (
          works.map((work) => {
            const isOpen = expandedId === work.id;
            const rows = (studentsByWork[work.id] || []).filter((row) => !row.is_removed);
            const totalStudents = rows.length;
            const submittedCount = rows.filter((r) => r.is_submitted).length;
            const percent = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;

            return (
              <Card key={work.id} className="border border-border/50 shadow-sm overflow-hidden transition-all">
                {/* Accordion Trigger Header */}
                <div
                  onClick={() => setExpandedId(isOpen ? null : work.id)}
                  className="flex items-center justify-between p-5 cursor-pointer bg-card/60 hover:bg-card/90 transition-all border-b border-border/40 select-none"
                >
                  <div className="space-y-1 min-w-0 flex-grow pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-extrabold text-foreground tracking-tight leading-snug truncate">
                        {work.work_name}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                        {work.subject_name}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground/90">
                      Duration: {displayDate(work.started_date)} to {displayDate(work.submission_date)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4.5 shrink-0">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-bold text-foreground">
                        Progress: <span className="text-primary font-extrabold">{submittedCount}/{totalStudents}</span> ({percent}%)
                      </span>
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Always visible action utility strip */}
                <div className="px-5 py-3.5 bg-muted/20 border-b flex justify-end gap-2.5">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(work);
                    }}
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs font-semibold rounded-xl"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteWork(work);
                    }}
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs font-semibold rounded-xl text-destructive hover:text-destructive hover:bg-destructive/5"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>

                {/* Collapsible Content Area */}
                {isOpen && (
                  <CardContent className="p-0 animate-in slide-in-from-top-1 duration-200">
                    {rows.length ? (
                      <div className="divide-y divide-border/50">
                        {rows.map((row) => (
                          <div
                            key={row.id}
                            className="flex items-center justify-between p-4 px-5 hover:bg-muted/10 transition-colors"
                          >
                            <div className="min-w-0 flex-grow pr-4">
                              <h4 className="text-sm font-bold text-foreground truncate">{row.student_name}</h4>
                              <p className="text-[10.5px] font-semibold text-muted-foreground/80 mt-0.5">
                                CIC: {row.cic || '-'}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <button
                                onClick={() => toggleSubmit(row)}
                                className={`h-8 px-4 text-xs font-extrabold rounded-xl transition-all border flex items-center justify-center min-w-[110px] ${
                                  row.is_submitted
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15 shadow-sm'
                                    : 'bg-destructive/5 text-destructive border-destructive/10 hover:bg-destructive/10'
                                }`}
                              >
                                {row.is_submitted ? (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="h-3.5 w-3.5" /> Submitted
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <XCircle className="h-3.5 w-3.5" /> Pending
                                  </span>
                                )}
                              </button>

                              <button
                                onClick={() => removeStudent(row)}
                                className="h-8 w-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                                title="Remove student from list"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-sm text-muted-foreground font-semibold">
                        No students linked to this work.
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        ) : (
          <Card className="border border-border/50 shadow-md">
            <CardContent className="py-12 text-center text-muted-foreground font-semibold">
              No CE work tracking records created yet. Click "Add CE Work" to configure one.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add / Edit CE Work Dialog Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground border rounded-2xl max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-bold font-heading mb-4 text-foreground">
              {editingWork ? 'Edit CE Task Details' : 'Configure New CE Work'}
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="work-name" className="text-xs font-bold text-muted-foreground">Work Name / Title</Label>
                <Input
                  id="work-name"
                  value={form.work_name}
                  onChange={(e) => setForm({ ...form, work_name: e.target.value })}
                  placeholder="e.g. Assignment 1 or Seminar"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sub-name" className="text-xs font-bold text-muted-foreground">Subject Name</Label>
                <Input
                  id="sub-name"
                  value={form.subject_name}
                  onChange={(e) => setForm({ ...form, subject_name: e.target.value })}
                  placeholder="e.g. TAFSEER"
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="start-date" className="text-xs font-bold text-muted-foreground">Started Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={form.started_date}
                    onChange={(e) => setForm({ ...form, started_date: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-date" className="text-xs font-bold text-muted-foreground">Submission Date</Label>
                  <Input
                    id="sub-date"
                    type="date"
                    value={form.submission_date}
                    onChange={(e) => setForm({ ...form, submission_date: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <Button
                onClick={saveWork}
                disabled={saving}
                className="w-full mt-2 gap-2 font-bold shadow-md rounded-xl"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save CE Assignment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
