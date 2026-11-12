'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

// UI Components
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress as UIProgress } from '@/components/ui/progress';

// Icons & Utilities
import {
  BarChart3,
  CalendarDays,
  User,
  BookOpen,
  Loader2,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  Printer,
} from 'lucide-react';
import {
  ClassOption,
  Semester,
  allocateIntegerTotal,
  buildWorkingWeeks,
  displayDate,
  fetchClassOptions,
  findMatchingClass,
  getAcademicYearBase,
  getPortionStatus,
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

export default function PortionsStatisticsPage() {
  const { details, role, loading: userLoading } = useUserData();

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [activeClass, setActiveClass] = useState<string>('');
  const [classesLoading, setClassesLoading] = useState(true);

  const [semester, setSemester] = useState<Semester>('SEM-1');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allProgress, setAllProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const academicYear = getAcademicYearBase();
  const isClassTeacher = role === 'class';

  // 1. Fetch available classes and set initial activeClass
  useEffect(() => {
    let isMounted = true;
    async function initClasses() {
      if (userLoading) return;
      setClassesLoading(true);
      try {
        const classList = await fetchClassOptions('portion_subjects');
        if (!isMounted) return;
        setClasses(classList);

        const defaultClass = findMatchingClass(
          classList,
          details?.batch,
          details?.designation
        );
        setActiveClass((prev) => prev || defaultClass || classList[0]?.id || '');
      } catch (err: any) {
        console.error('Failed to load classes for portion statistics:', err);
      } finally {
        if (isMounted) setClassesLoading(false);
      }
    }

    initClasses();
    return () => {
      isMounted = false;
    };
  }, [userLoading, details?.batch, details?.designation]);

  // 2. Load calendar exclusions, subjects, and progress for activeClass
  const loadData = useCallback(async () => {
    if (!activeClass) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const activeOption = classes.find((c) => c.id === activeClass);
      const baseKeys = activeOption ? activeOption.queryKeys : [activeClass];
      const expandedKeys = new Set<string>();
      baseKeys.forEach((k) => {
        if (!k) return;
        expandedKeys.add(k);
        expandedKeys.add(`${k} Class`);
        expandedKeys.add(k.replace(/\s+Class$/i, ''));
      });
      const keys = Array.from(expandedKeys).filter(Boolean);

      const [excludedRes, subjectsRes] = await Promise.all([
        supabase.from('portion_calendar_exclusions').select('*').eq('semester', semester),
        supabase
          .from('portion_subjects')
          .select('*')
          .in('batch', keys.length ? keys : [activeClass])
          .eq('semester', semester)
          .order('subject_name'),
      ]);

      if (excludedRes.error) throw excludedRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      const subjectRows = (subjectsRes.data || []) as Subject[];
      setSubjects(subjectRows);
      setExcluded(
        new Set((excludedRes.data || []).map((row: any) => row.excluded_date))
      );

      if (subjectRows.length) {
        const { data: progressData, error: progressError } = await supabase
          .from('portion_week_progress')
          .select('*')
          .in('subject_id', subjectRows.map((s) => s.id));

        if (progressError) throw progressError;
        setAllProgress(progressData || []);
        if (!expandedId) setExpandedId(subjectRows[0].id);
      } else {
        setAllProgress([]);
      }
    } catch (err: any) {
      toast.error('Failed to load portion statistics', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [activeClass, classes, semester, expandedId]);

  useEffect(() => {
    if (!classesLoading && activeClass) {
      loadData();
    }
  }, [classesLoading, activeClass, loadData]);

  // Working weeks calculation
  const weeks = useMemo(
    () => buildWorkingWeeks(semester, excluded, academicYear),
    [semester, excluded, academicYear]
  );

  const progressMap = useMemo(() => {
    const map: Record<string, Record<string, Progress>> = {};
    allProgress.forEach((p) => {
      if (!map[p.subject_id]) map[p.subject_id] = {};
      map[p.subject_id][p.week_key] = p;
    });
    return map;
  }, [allProgress]);

  const subjectRows = (subject: Subject) => {
    const rows: any[] = [];
    const totalPeriod = n(subject.total_period);
    const totalPages = n(subject.total_pages);
    const pagesPerPeriod = totalPeriod > 0 ? totalPages / totalPeriod : 0;

    const monthKeys = Array.from(new Set(weeks.map((week) => week.monthKey)));
    const monthGroups = monthKeys.map((monthKey) => {
      const monthWeeks = weeks.filter((week) => week.monthKey === monthKey);
      const month = monthWeeks[0]?.monthLabel || monthKey;
      const monthWorkingDays = monthWeeks.reduce((sum, w) => sum + w.workingDates.length, 0);
      return { monthKey, month, monthWeeks, monthWorkingDays };
    });

    const monthDaysList = monthGroups.map((m) => m.monthWorkingDays);
    const allocatedMonthPeriods = allocateIntegerTotal(totalPeriod, monthDaysList);

    const sem = { expP: 0, actP: 0, expPg: 0, actPg: 0 };

    monthGroups.forEach((mg, idx) => {
      const expP = allocatedMonthPeriods[idx] || 0; // Pure integer
      const expPg = expP * pagesPerPeriod;           // Decimal pages

      // Allocate week periods
      const weekDays = mg.monthWeeks.map((w) => w.workingDates.length);
      const allocatedWeekPeriods = allocateIntegerTotal(expP, weekDays);
      const weekAllocations: Record<string, { expP: number; expPg: number }> = {};

      mg.monthWeeks.forEach((w, wIdx) => {
        const wExpP = allocatedWeekPeriods[wIdx] || 0;
        const wExpPg = wExpP * pagesPerPeriod;
        weekAllocations[w.key] = { expP: wExpP, expPg: wExpPg };
      });

      const actP = mg.monthWeeks.reduce(
        (sum, week) => sum + n(progressMap[subject.id]?.[week.key]?.period_taken),
        0
      );
      const actPg = mg.monthWeeks.reduce(
        (sum, week) => sum + n(progressMap[subject.id]?.[week.key]?.pages_taken),
        0
      );

      sem.expP += expP;
      sem.actP += actP;
      sem.expPg += expPg;
      sem.actPg += actPg;

      rows.push({
        month: mg.month,
        monthWeeks: mg.monthWeeks,
        monthWorkingDays: mg.monthWorkingDays,
        expP,
        expPg,
        actP,
        actPg,
        sem: { ...sem },
        weekAllocations,
        pagesPerPeriod,
      });
    });

    return rows;
  };

  // Overall status summary count
  const statsOverview = useMemo(() => {
    let aheadCount = 0;
    let onTrackCount = 0;
    let behindCount = 0;

    subjects.forEach((s) => {
      const rows = subjectRows(s);
      const lastRow = rows[rows.length - 1];
      const status = lastRow ? getPortionStatus(lastRow.sem.actPg, lastRow.sem.expPg) : 'same';
      if (status === 'ahead') aheadCount++;
      else if (status === 'back') behindCount++;
      else onTrackCount++;
    });

    return {
      totalSubjects: subjects.length,
      aheadCount,
      onTrackCount,
      behindCount,
    };
  }, [subjects, weeks, progressMap]);

  const handlePrint = () => {
    window.print();
  };

  if (userLoading || classesLoading || (loading && !subjects.length)) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-xs text-muted-foreground">Loading portion statistics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Portions Statistics</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {activeClass
              ? `${activeClass} (${semester}) syllabus progress tracking & completion metrics.`
              : 'Class syllabus coverage and portion completion analysis.'}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handlePrint}
          disabled={subjects.length === 0}
          className="text-xs h-9 gap-1.5"
        >
          <Printer className="h-4 w-4 text-primary" />
          Print Report
        </Button>
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

      {/* Semester Switcher Tabs */}
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

      {/* Summary Metrics */}
      {subjects.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{statsOverview.totalSubjects}</div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                Total Subjects
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {statsOverview.aheadCount}
              </div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                Ahead
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {statsOverview.onTrackCount}
              </div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                On Track
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {statsOverview.behindCount}
              </div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                Behind
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subjects List or Empty State */}
      {subjects.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-3">
            <BookOpen className="h-10 w-10 text-muted-foreground/60" />
            <h3 className="text-base font-bold text-foreground">No Portions in {semester}</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              {activeClass
                ? `No syllabus subjects added for ${activeClass} in ${semester}.`
                : 'No subjects found.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subjects.map((subject) => {
            const isOpen = expandedId === subject.id;
            const rows = subjectRows(subject);
            const lastRow = rows[rows.length - 1];
            const subjectStatus = lastRow
              ? getPortionStatus(lastRow.sem.actPg, lastRow.sem.expPg)
              : 'same';

            const displayTitle = subject.teacher_name?.trim()
              ? `${subject.subject_name} - ${subject.teacher_name.trim()}`
              : subject.subject_name;

            return (
              <Card key={subject.id} className="overflow-hidden border border-border shadow-sm">
                {/* Header */}
                <div
                  onClick={() => setExpandedId(isOpen ? null : subject.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-muted/40 transition-colors select-none gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {displayTitle}
                      </h3>
                      {(() => {
                        const subPagesPerPeriod = n(subject.total_period) > 0 ? n(subject.total_pages) / n(subject.total_period) : 0;
                        const subPagesPerWeek = n(subject.period_per_week) * subPagesPerPeriod;
                        return (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            TR {subject.teacher_name} | TPgS {subject.total_pages} | TLP {subject.total_period} | TLP/W {subject.period_per_week} | TPg/W {subPagesPerWeek.toFixed(2)} | TPg/P {subPagesPerPeriod.toFixed(2)}
                          </p>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold ${
                        subjectStatus === 'ahead'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : subjectStatus === 'back'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      }`}
                    >
                      {statusLabel(subjectStatus)}
                    </Badge>

                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded Details: Exactly as in App */}
                {isOpen && (
                  <CardContent className="p-4 pt-0 border-t border-border space-y-4 bg-muted/10">
                    <div className="space-y-3 pt-3">
                      {rows.map((row) => {
                        const pageStatus = getPortionStatus(row.actPg, row.expPg);

                        return (
                          <div
                            key={row.month}
                            className="p-3.5 rounded-xl border border-border bg-card space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between pb-1 border-b border-border/60">
                              <span className="font-extrabold text-sm text-foreground">{row.month}</span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${
                                  pageStatus === 'ahead'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : pageStatus === 'back'
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                }`}
                              >
                                {statusLabel(pageStatus)}
                              </Badge>
                            </div>

                            <p className="text-muted-foreground font-medium">
                              Month Period TL/STS: <span className="font-semibold text-foreground">{row.expP}/{row.actP}</span> | Page TL/STS: <span className="font-semibold text-foreground">{row.expPg.toFixed(2)}/{row.actPg}</span>
                            </p>

                            <p className="text-muted-foreground font-medium">
                              Sem Period TL/STS: <span className="font-semibold text-foreground">{row.sem.expP}/{row.sem.actP}</span> | Sem Page TL/STS: <span className="font-semibold text-foreground">{row.sem.expPg.toFixed(2)}/{row.sem.actPg}</span>
                            </p>

                            <div className="space-y-1 pt-1.5 border-t border-dashed border-border/80">
                              {row.monthWeeks.map((week: any) => {
                                const rec = progressMap[subject.id]?.[week.key];
                                const wAlloc = row.weekAllocations[week.key] || { expP: 0, expPg: 0 };

                                return (
                                  <div
                                    key={week.key}
                                    className="flex flex-wrap items-center justify-between text-[11px] py-0.5 text-muted-foreground"
                                  >
                                    <span className="font-medium text-foreground">
                                      WK-{week.weekNo} ({week.workingDates.length}d):
                                    </span>
                                    <span>
                                      P.STS <strong className="text-foreground">{n(rec?.period_taken)}/{wAlloc.expP}</strong> | Pg.STS <strong className="text-primary">{n(rec?.pages_taken)}/{wAlloc.expPg.toFixed(1)}</strong>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
