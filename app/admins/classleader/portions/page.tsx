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
  BookOpen,
  CalendarDays,
  Edit,
  Plus,
  Save,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import {
  Semester,
  SEMESTER_MONTHS,
  buildWorkingWeeks,
  displayDate,
  getAcademicYearBase,
  getPortionStatus,
  getSemesterDates,
  n,
  statusLabel,
} from '@/lib/portionUtils';

type Subject = {
  id: string;
  batch: string;
  semester: Semester;
  subject_name: string;
  teacher_name: string;
  total_pages: number;
  total_period: number;
  period_per_week: number;
  pages_per_day: number;
  pages_per_week: number;
};

type Progress = {
  id?: string;
  subject_id: string;
  week_key: string;
  month_key: string;
  week_no: number;
  date_from: string;
  date_to: string;
  period_taken: number;
  pages_taken: number;
};

const blankForm = {
  subject_name: '',
  teacher_name: '',
  total_pages: '',
  total_period: '',
  period_per_week: '',
};

function getBatch(details: any) {
  return details?.designation || details?.batch || '';
}

export default function ClassLeaderPortionsPage() {
  const { user, details, role, loading: userLoading } = useUserData();
  const batch = getBatch(details);
  const [semester, setSemester] = useState<Semester>('SEM-1');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [progressRows, setProgressRows] = useState<Progress[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [form, setForm] = useState(blankForm);
  const [savingSubject, setSavingSubject] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  const academicYear = getAcademicYearBase();

  const loadData = useCallback(async () => {
    if (!batch) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [excludedRes, subjectsRes] = await Promise.all([
        supabase.from('portion_calendar_exclusions').select('*').eq('semester', semester),
        supabase
          .from('portion_subjects')
          .select('*')
          .eq('batch', batch)
          .eq('semester', semester)
          .order('subject_name'),
      ]);
      if (excludedRes.error) throw excludedRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      const subjectRows = (subjectsRes.data || []) as Subject[];
      setExcluded(new Set((excludedRes.data || []).map((row: any) => row.excluded_date)));
      setSubjects(subjectRows);
      if (subjectRows.length && !subjectRows.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(subjectRows[0].id);
      }
      if (!subjectRows.length) setSelectedSubjectId('');
    } catch (err: any) {
      toast.error('Failed to load portions', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [batch, semester, selectedSubjectId]);

  useEffect(() => {
    if (!userLoading) loadData();
  }, [userLoading, loadData]);

  useEffect(() => {
    const loadProgress = async () => {
      if (!selectedSubjectId) {
        setProgressRows([]);
        return;
      }
      const { data, error } = await supabase
        .from('portion_week_progress')
        .select('*')
        .eq('subject_id', selectedSubjectId);
      if (error) {
        toast.error('Error loading progress', { description: error.message });
      } else {
        setProgressRows((data || []) as Progress[]);
      }
    };
    loadProgress();
  }, [selectedSubjectId]);

  const semesterDates = useMemo(
    () => getSemesterDates(semester, academicYear),
    [semester, academicYear]
  );
  const weeks = useMemo(
    () => buildWorkingWeeks(semester, excluded, academicYear),
    [semester, excluded, academicYear]
  );
  const workingDays = weeks.reduce((total, week) => total + week.workingDates.length, 0);
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId) || null;
  const progressMap = useMemo(() => {
    const map: Record<string, Progress> = {};
    progressRows.forEach((row) => {
      map[row.week_key] = row;
    });
    return map;
  }, [progressRows]);

  const monthSummaries = useMemo(() => {
    if (!selectedSubject) return [];
    return SEMESTER_MONTHS[semester].map((month) => {
      const monthKey = weeks.find((w) => w.monthLabel === month.label)?.monthKey;
      const monthWeeks = monthKey ? weeks.filter((week) => week.monthKey === monthKey) : [];
      const expectedPeriod = monthWeeks.length * n(selectedSubject.period_per_week);
      const expectedPages = monthWeeks.length * n(selectedSubject.pages_per_week);
      const actualPeriod = monthWeeks.reduce((sum, week) => sum + n(progressMap[week.key]?.period_taken), 0);
      const actualPages = monthWeeks.reduce((sum, week) => sum + n(progressMap[week.key]?.pages_taken), 0);
      return { label: month.label, weeks: monthWeeks.length, expectedPeriod, expectedPages, actualPeriod, actualPages };
    }).filter((row) => row.weeks > 0);
  }, [semester, weeks, selectedSubject, progressMap]);

  const semSummary = useMemo(() => {
    return monthSummaries.reduce(
      (acc, row) => ({
        expectedPeriod: acc.expectedPeriod + row.expectedPeriod,
        expectedPages: acc.expectedPages + row.expectedPages,
        actualPeriod: acc.actualPeriod + row.actualPeriod,
        actualPages: acc.actualPages + row.actualPages,
      }),
      { expectedPeriod: 0, expectedPages: 0, actualPeriod: 0, actualPages: 0 }
    );
  }, [monthSummaries]);

  const toggleExcludedDate = async (date: string) => {
    const isExcluded = excluded.has(date);
    const next = new Set(excluded);
    if (isExcluded) next.delete(date);
    else next.add(date);
    setExcluded(next);

    if (isExcluded) {
      const { error } = await supabase
        .from('portion_calendar_exclusions')
        .delete()
        .eq('semester', semester)
        .eq('excluded_date', date);
      if (error) {
        toast.error('Error enabling working date', { description: error.message });
        setExcluded(excluded);
      } else {
        toast.success('Date enabled as working day');
      }
    } else {
      const { error } = await supabase.from('portion_calendar_exclusions').upsert({
        semester,
        excluded_date: date,
        created_by: user?.id || null,
      }, { onConflict: 'semester,excluded_date' });
      if (error) {
        toast.error('Error excluding date', { description: error.message });
        setExcluded(excluded);
      } else {
        toast.success('Date marked as non-working day');
      }
    }
  };

  const openAdd = () => {
    setEditingSubject(null);
    setForm(blankForm);
    setSubjectModalOpen(true);
  };

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setForm({
      subject_name: subject.subject_name,
      teacher_name: subject.teacher_name,
      total_pages: String(subject.total_pages),
      total_period: String(subject.total_period),
      period_per_week: String(subject.period_per_week),
    });
    setSubjectModalOpen(true);
  };

  const saveSubject = async () => {
    if (!batch || !user?.id) return;
    const totalPages = n(form.total_pages);
    const totalPeriod = n(form.total_period);
    const periodPerWeek = n(form.period_per_week);
    const pagesPerDay = totalPeriod > 0 ? totalPages / totalPeriod : 0;
    const pagesPerWeek = pagesPerDay * periodPerWeek;

    if (!form.subject_name.trim() || !form.teacher_name.trim()) {
      toast.warning('Required fields missing', { description: 'Subject and teacher names are required.' });
      return;
    }

    setSavingSubject(true);
    try {
      const payload = {
        id: editingSubject?.id,
        batch,
        semester,
        subject_name: form.subject_name.trim().toUpperCase(),
        teacher_name: form.teacher_name.trim().toUpperCase(),
        total_pages: totalPages,
        total_period: totalPeriod,
        period_per_week: periodPerWeek,
        pages_per_day: pagesPerDay,
        pages_per_week: pagesPerWeek,
        created_by: user.id,
      };

      const { error } = await supabase.from('portion_subjects').upsert(payload);
      if (error) throw error;
      setSubjectModalOpen(false);
      toast.success(editingSubject ? 'Subject updated' : 'Subject created');
      loadData();
    } catch (err: any) {
      toast.error('Error saving subject', { description: err.message });
    } finally {
      setSavingSubject(false);
    }
  };

  const deleteSubject = async (subject: Subject) => {
    if (!confirm(`Are you sure you want to delete ${subject.subject_name}?`)) return;

    try {
      const { error } = await supabase.from('portion_subjects').delete().eq('id', subject.id);
      if (error) throw error;
      toast.success('Subject deleted successfully');
      loadData();
    } catch (err: any) {
      toast.error('Error deleting subject', { description: err.message });
    }
  };

  const updateProgressDraft = (weekKey: string, field: 'period_taken' | 'pages_taken', value: string) => {
    const week = weeks.find((item) => item.key === weekKey);
    if (!selectedSubject || !week) return;
    setProgressRows((prev) => {
      const existing = prev.find((row) => row.week_key === weekKey);
      const nextRow: Progress = {
        ...(existing || {
          subject_id: selectedSubject.id,
          week_key: week.key,
          month_key: week.monthKey,
          week_no: week.weekNo,
          date_from: week.dateFrom,
          date_to: week.dateTo,
          period_taken: 0,
          pages_taken: 0,
        }),
        [field]: n(value),
      };
      return existing ? prev.map((row) => (row.week_key === weekKey ? nextRow : row)) : [...prev, nextRow];
    });
  };

  const saveProgress = async () => {
    if (!selectedSubject || !user?.id) return;
    setSavingProgress(true);
    try {
      const payload = weeks.map((week) => {
        const row = progressMap[week.key];
        return {
          subject_id: selectedSubject.id,
          week_key: week.key,
          month_key: week.monthKey,
          week_no: week.weekNo,
          date_from: week.dateFrom,
          date_to: week.dateTo,
          period_taken: n(row?.period_taken),
          pages_taken: n(row?.pages_taken),
          updated_by: user.id,
        };
      });
      const { error } = await supabase.from('portion_week_progress').upsert(payload, { onConflict: 'subject_id,week_key' });
      if (error) throw error;
      toast.success('Weekly portions progress saved');
    } catch (err: any) {
      toast.error('Error saving progress', { description: err.message });
    } finally {
      setSavingProgress(false);
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
              Portions planning is only accessible to class leaders.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold font-heading text-foreground tracking-tight">Portions</h1>
        <p className="text-muted-foreground mt-1">{batch || 'Class'} portion planning and weekly progress tracking.</p>
      </div>

      {/* Semester Tabs */}
      <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
        {(['SEM-1', 'SEM-2'] as Semester[]).map((sem) => (
          <button
            key={sem}
            onClick={() => setSemester(sem)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              semester === sem
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {sem}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left column: Calendar & Subjects */}
        <div className="xl:col-span-7 space-y-6">
          {/* Calendar Card */}
          <Card className="border border-border/50 shadow-md">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold font-heading">Global Working Calendar</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Tap dates to toggle non-working/programme days. Selected dates are excluded from working calculations.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10">
                <span className="text-sm font-bold text-foreground">Total Working Days</span>
                <span className="text-lg font-extrabold text-primary font-heading">{workingDays} Days</span>
              </div>

              {SEMESTER_MONTHS[semester].map((month) => {
                const monthDates = semesterDates.filter((date) => date.monthLabel === month.label);
                return (
                  <div key={`${semester}-${month.label}`} className="space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground/90 uppercase tracking-wider px-1">{month.label}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {monthDates.map((date) => {
                        const isOff = excluded.has(date.value);
                        return (
                          <button
                            key={date.value}
                            onClick={() => toggleExcludedDate(date.value)}
                            className={`h-9 w-9 text-xs font-semibold rounded-lg border flex items-center justify-center transition-all ${
                              isOff
                                ? 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15'
                                : 'bg-card text-foreground border-border/50 hover:bg-accent'
                            }`}
                          >
                            {date.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Subjects Card */}
          <Card className="border border-border/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b space-y-0">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold font-heading">Subjects</CardTitle>
              </div>
              <Button onClick={openAdd} size="sm" className="gap-1.5 shadow-sm font-semibold rounded-xl">
                <Plus className="h-4 w-4" /> Add Subject
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {subjects.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjects.map((subject, index) => {
                    const subjectStatus = getPortionStatus(
                      progressRows
                        .filter((row) => row.subject_id === subject.id)
                        .reduce((sum, row) => sum + n(row.pages_taken), 0),
                      weeks.length * n(subject.pages_per_week)
                    );

                    return (
                      <div
                        key={subject.id}
                        className="p-4 rounded-2xl border border-border bg-card/40 backdrop-blur-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-extrabold text-sm text-foreground leading-snug">
                              {index + 1}. {subject.subject_name}
                            </h3>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                subjectStatus === 'pending'
                                  ? 'bg-muted text-muted-foreground border'
                                  : subjectStatus === 'behind'
                                  ? 'bg-destructive/10 text-destructive'
                                  : subjectStatus === 'ahead'
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : 'bg-primary/10 text-primary'
                              }`}
                            >
                              {statusLabel(subjectStatus)}
                            </span>
                          </div>
                          <div className="mt-3 space-y-1 text-xs text-muted-foreground font-medium">
                            <p>Teacher: <span className="font-bold text-foreground">{subject.teacher_name}</span></p>
                            <p>Total Pages: <span className="font-bold text-foreground">{subject.total_pages}</span> | Total Period: <span className="font-bold text-foreground">{subject.total_period}</span></p>
                            <p>Period/Wk: <span className="font-bold text-foreground">{subject.period_per_week}</span> | Pages/Wk: <span className="font-bold text-foreground">{subject.pages_per_week.toFixed(1)}</span></p>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2 border-t pt-3">
                          <Button
                            onClick={() => openEdit(subject)}
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1 text-xs font-semibold rounded-xl"
                          >
                            <Edit className="h-3 w-3" /> Edit
                          </Button>
                          <Button
                            onClick={() => deleteSubject(subject)}
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1 text-xs font-semibold rounded-xl text-destructive hover:text-destructive hover:bg-destructive/5"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground font-medium">
                  No subjects configured for {semester} yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Weekly progress & statistics */}
        <div className="xl:col-span-5">
          {subjects.length > 0 ? (
            <Card className="border border-border/50 shadow-md">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg font-bold font-heading">Weekly Status & Progress</CardTitle>
                <CardDescription className="text-xs">
                  Record weekly periods and syllabus page numbers completed.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-5">
                {/* Select Subject */}
                <div className="space-y-1.5">
                  <Label htmlFor="subject-picker" className="text-xs font-bold text-muted-foreground">Select Subject</Label>
                  <select
                    id="subject-picker"
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm font-semibold ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.subject_name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedSubject && (
                  <>
                    {/* Monthly Progress Summaries */}
                    <div className="bg-muted/40 rounded-2xl p-4 border space-y-3">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Month-wise Summary</h4>
                      <div className="space-y-2">
                        {monthSummaries.map((month) => (
                          <div key={month.label} className="flex justify-between text-xs font-semibold py-1 border-b border-muted last:border-b-0">
                            <span className="text-muted-foreground">{month.label}</span>
                            <span className="text-foreground">
                              Pd: <span className="font-bold">{month.actualPeriod}/{month.expectedPeriod}</span> | Pg: <span className="font-bold">{month.actualPages}/{month.expectedPages.toFixed(1)}</span>
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-extrabold pt-2 text-primary">
                          <span>Semester Total</span>
                          <span>
                            Pd: {semSummary.actualPeriod}/{semSummary.expectedPeriod} | Pg: {semSummary.actualPages}/{semSummary.expectedPages.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Weeks Scroll */}
                    <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
                      {weeks.map((week) => {
                        const row = progressMap[week.key];
                        const pageStatus = getPortionStatus(n(row?.pages_taken), n(selectedSubject.pages_per_week));

                        return (
                          <div
                            key={week.key}
                            className="p-3.5 rounded-2xl border border-border bg-card space-y-3 shadow-[0_2px_10px_rgb(0,0,0,0.01)]"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-foreground font-heading">
                                {week.monthLabel} Week {week.weekNo}
                              </span>
                              <span
                                className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                                  pageStatus === 'pending'
                                    ? 'bg-muted text-muted-foreground border'
                                    : pageStatus === 'behind'
                                    ? 'bg-destructive/10 text-destructive'
                                    : pageStatus === 'ahead'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : 'bg-primary/10 text-primary'
                                }`}
                              >
                                {statusLabel(pageStatus)}
                              </span>
                            </div>
                            <span className="block text-[11px] text-muted-foreground font-semibold">
                              {displayDate(week.dateFrom)} to {displayDate(week.dateTo)}
                            </span>

                            <div className="grid grid-cols-2 gap-3.5 pt-1">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground/80">Periods Completed</Label>
                                <Input
                                  value={row?.period_taken !== undefined && row.period_taken !== null ? String(row.period_taken) : ''}
                                  onChange={(e) => updateProgressDraft(week.key, 'period_taken', e.target.value)}
                                  placeholder="0"
                                  type="number"
                                  className="h-8 rounded-lg text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground/80">Pages Covered</Label>
                                <Input
                                  value={row?.pages_taken !== undefined && row.pages_taken !== null ? String(row.pages_taken) : ''}
                                  onChange={(e) => updateProgressDraft(week.key, 'pages_taken', e.target.value)}
                                  placeholder="0"
                                  type="number"
                                  className="h-8 rounded-lg text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Button
                      onClick={saveProgress}
                      disabled={savingProgress}
                      className="w-full gap-2 font-bold shadow-md rounded-xl"
                    >
                      {savingProgress ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Weekly Status
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border/50 shadow-md">
              <CardContent className="py-10 text-center text-sm text-muted-foreground font-medium">
                Add subjects first to record weekly portion progress.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add / Edit Subject Modal */}
      {subjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground border rounded-2xl max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSubjectModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-bold font-heading mb-4 text-foreground">
              {editingSubject ? 'Edit Subject Details' : 'Configure New Subject'}
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sub-name" className="text-xs font-bold text-muted-foreground">Subject Code / Name</Label>
                <Input
                  id="sub-name"
                  value={form.subject_name}
                  onChange={(e) => setForm({ ...form, subject_name: e.target.value })}
                  placeholder="e.g. FIQH"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="teach-name" className="text-xs font-bold text-muted-foreground">Teacher Initials / Name</Label>
                <Input
                  id="teach-name"
                  value={form.teacher_name}
                  onChange={(e) => setForm({ ...form, teacher_name: e.target.value })}
                  placeholder="e.g. MTR"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="tot-pages" className="text-xs font-bold text-muted-foreground">Total Syllabus Pages</Label>
                  <span className="text-[10px] text-muted-foreground italic">Count manually from textbook</span>
                </div>
                <Input
                  id="tot-pages"
                  value={form.total_pages}
                  onChange={(e) => setForm({ ...form, total_pages: e.target.value })}
                  placeholder="Total textbook pages"
                  type="number"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="tot-periods" className="text-xs font-bold text-muted-foreground">Expected Total Periods</Label>
                  <span className="text-[10px] text-muted-foreground italic">Refer to syllabus guidelines</span>
                </div>
                <Input
                  id="tot-periods"
                  value={form.total_period}
                  onChange={(e) => setForm({ ...form, total_period: e.target.value })}
                  placeholder="Total teaching periods"
                  type="number"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="per-week" className="text-xs font-bold text-muted-foreground">Periods Per Week</Label>
                  <span className="text-[10px] text-muted-foreground italic">Verify against timetable</span>
                </div>
                <Input
                  id="per-week"
                  value={form.period_per_week}
                  onChange={(e) => setForm({ ...form, period_per_week: e.target.value })}
                  placeholder="Periods allocated per week"
                  type="number"
                  className="rounded-xl"
                />
              </div>

              <Button
                onClick={saveSubject}
                disabled={savingSubject}
                className="w-full mt-2 gap-2 font-bold shadow-md rounded-xl"
              >
                {savingSubject ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Configuration
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
