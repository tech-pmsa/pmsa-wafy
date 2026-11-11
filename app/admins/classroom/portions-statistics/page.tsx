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

  // Calculate detailed statistics for a subject
  const calculateSubjectStats = useCallback(
    (subject: Subject) => {
      const semWorkingDays = weeks.reduce((sum, w) => sum + w.workingDates.length, 0);
      const pagesPerDay = semWorkingDays > 0 ? n(subject.total_pages) / semWorkingDays : 0;
      const periodPerDay = semWorkingDays > 0 ? n(subject.total_period) / semWorkingDays : 0;

      let totalPagesTaken = 0;
      let totalPeriodsTaken = 0;

      weeks.forEach((w) => {
        const prog = progressMap[subject.id]?.[w.key];
        if (prog) {
          totalPagesTaken += n(prog.pages_taken);
          totalPeriodsTaken += n(prog.period_taken);
        }
      });

      const pagesPercent =
        subject.total_pages > 0
          ? Math.min(100, Math.round((totalPagesTaken / subject.total_pages) * 100))
          : 0;

      const expectedPagesTotal = semWorkingDays * pagesPerDay;
      const status = getPortionStatus(totalPagesTaken, expectedPagesTotal);

      return {
        totalPagesTaken,
        totalPeriodsTaken,
        pagesPercent,
        status,
        pagesPerDay,
        periodPerDay,
        semWorkingDays,
      };
    },
    [weeks, progressMap]
  );

  // Overall status summary count
  const statsOverview = useMemo(() => {
    let aheadCount = 0;
    let onTrackCount = 0;
    let behindCount = 0;

    subjects.forEach((s) => {
      const { status } = calculateSubjectStats(s);
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
  }, [subjects, calculateSubjectStats]);

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
            const stats = calculateSubjectStats(subject);

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
                      <h3 className="text-sm font-bold text-foreground">{subject.subject_name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Teacher: <span className="font-semibold text-foreground">{subject.teacher_name}</span>
                        <span> &bull; Total Pages: {subject.total_pages}</span>
                        <span> &bull; Total Periods: {subject.total_period}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <div className="text-right">
                      <div className="text-xs font-bold text-foreground">
                        {stats.totalPagesTaken} / {subject.total_pages} Pages
                      </div>
                      <div className="w-28 mt-1">
                        <UIProgress value={stats.pagesPercent} className="h-1.5" />
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold ${
                        stats.status === 'ahead'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : stats.status === 'back'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      }`}
                    >
                      {statusLabel(stats.status)}
                    </Badge>

                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded Details: Week Progress Grid */}
                {isOpen && (
                  <CardContent className="p-4 pt-0 border-t border-border space-y-4 bg-muted/10">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-background border border-border">
                        <div className="text-muted-foreground font-medium">Pages Per Day</div>
                        <div className="text-sm font-bold text-foreground mt-0.5">
                          {stats.pagesPerDay.toFixed(1)}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-background border border-border">
                        <div className="text-muted-foreground font-medium">Pages Per Week</div>
                        <div className="text-sm font-bold text-foreground mt-0.5">
                          {subject.pages_per_week?.toFixed(1) || (stats.pagesPerDay * 6).toFixed(1)}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-background border border-border">
                        <div className="text-muted-foreground font-medium">Periods Taken</div>
                        <div className="text-sm font-bold text-foreground mt-0.5">
                          {stats.totalPeriodsTaken} / {subject.total_period}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-background border border-border">
                        <div className="text-muted-foreground font-medium">Working Days</div>
                        <div className="text-sm font-bold text-foreground mt-0.5">
                          {stats.semWorkingDays} Days
                        </div>
                      </div>
                    </div>

                    {/* Weekly Breakdown Table */}
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Weekly Progression ({weeks.length} Weeks)
                      </h4>

                      <div className="overflow-x-auto border border-border rounded-xl bg-background">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
                            <tr>
                              <th className="py-2.5 px-3">Week</th>
                              <th className="py-2.5 px-3">Dates</th>
                              <th className="py-2.5 px-3">Working Days</th>
                              <th className="py-2.5 px-3 text-center">Periods Taken</th>
                              <th className="py-2.5 px-3 text-center">Pages Taken</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {weeks.map((w) => {
                              const prog = progressMap[subject.id]?.[w.key];
                              const periods = prog ? n(prog.period_taken) : 0;
                              const pages = prog ? n(prog.pages_taken) : 0;

                              return (
                                <tr key={w.key} className="hover:bg-muted/20">
                                  <td className="py-2 px-3 font-semibold text-foreground">
                                    {w.monthLabel} - W{w.weekNo}
                                  </td>
                                  <td className="py-2 px-3 text-muted-foreground font-mono text-[11px]">
                                    {displayDate(w.dateFrom)} &rarr; {displayDate(w.dateTo)}
                                  </td>
                                  <td className="py-2 px-3 text-muted-foreground">
                                    {w.workingDates.length} Days
                                  </td>
                                  <td className="py-2 px-3 text-center font-semibold text-foreground">
                                    {periods}
                                  </td>
                                  <td className="py-2 px-3 text-center font-bold text-primary">
                                    {pages}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
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
