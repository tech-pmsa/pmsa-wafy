// app/admins/classroom/portions-statistics/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress as UIProgress } from '@/components/ui/progress';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

// Icons & Utilities
import {
  BarChart3,
  CalendarDays,
  User,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Clock,
  ChevronRight,
  Info,
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

function getBatch(details: any) {
  return details?.designation || details?.batch || '';
}

export default function PortionsStatisticsPage() {
  const { details, role, loading: userLoading } = useUserData();
  const batch = getBatch(details);
  const [semester, setSemester] = useState<Semester>('SEM-1');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allProgress, setAllProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);

  const academicYear = getAcademicYearBase();

  // Load calendar exclusions and subjects
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

      if (subjectRows.length > 0) {
        const subjectIds = subjectRows.map((s) => s.id);
        const { data: progressData, error: progressErr } = await supabase
          .from('portion_week_progress')
          .select('*')
          .in('subject_id', subjectIds);
        
        if (progressErr) throw progressErr;
        setAllProgress((progressData || []) as Progress[]);
      } else {
        setAllProgress([]);
      }
    } catch (err: any) {
      toast.error('Failed to load portions statistics', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [batch, semester]);

  useEffect(() => {
    if (!userLoading) loadData();
  }, [userLoading, loadData]);

  // Semester weeks calculations
  const weeks = useMemo(
    () => buildWorkingWeeks(semester, excluded, academicYear),
    [semester, excluded, academicYear]
  );
  const workingDaysCount = weeks.reduce((total, week) => total + week.workingDates.length, 0);

  // Compile calculations for each subject
  const subjectStats = useMemo(() => {
    return subjects.map((subject) => {
      const subjectProgress = allProgress.filter((p) => p.subject_id === subject.id);
      
      const totalPagesCovered = subjectProgress.reduce((sum, p) => sum + n(p.pages_taken), 0);
      const totalPeriodsTaken = subjectProgress.reduce((sum, p) => sum + n(p.period_taken), 0);

      // Expected metrics up to current date or overall semester weeks
      const expectedPagesTotal = weeks.length * n(subject.pages_per_week);
      const expectedPeriodsTotal = weeks.length * n(subject.period_per_week);

      const status = getPortionStatus(totalPagesCovered, expectedPagesTotal);
      
      const pageProgressPercent = subject.total_pages > 0 
        ? Math.min(Math.round((totalPagesCovered / subject.total_pages) * 100), 100)
        : 0;

      const periodProgressPercent = subject.total_period > 0 
        ? Math.min(Math.round((totalPeriodsTaken / subject.total_period) * 100), 100)
        : 0;

      // Map progress rows by week key
      const progressByWeek: Record<string, Progress> = {};
      subjectProgress.forEach((p) => {
        progressByWeek[p.week_key] = p;
      });

      return {
        subject,
        totalPagesCovered,
        totalPeriodsTaken,
        expectedPagesTotal,
        expectedPeriodsTotal,
        status,
        pageProgressPercent,
        periodProgressPercent,
        progressByWeek,
      };
    });
  }, [subjects, allProgress, weeks]);

  // Aggregate stats
  const aggregates = useMemo(() => {
    if (subjectStats.length === 0) return { avgCoverage: 0, behindCount: 0, aheadCount: 0, onTrackCount: 0 };
    
    let totalPercent = 0;
    let behind = 0;
    let ahead = 0;
    let onTrack = 0;

    subjectStats.forEach((s) => {
      totalPercent += s.pageProgressPercent;
      if (s.status === 'behind') behind++;
      else if (s.status === 'ahead') ahead++;
      else onTrack++;
    });

    return {
      avgCoverage: Math.round(totalPercent / subjectStats.length),
      behindCount: behind,
      aheadCount: ahead,
      onTrackCount: onTrack,
    };
  }, [subjectStats]);

  if (userLoading || loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-300">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    );
  }

  const isClassTeacher = role === 'class';
  if (!isClassTeacher) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <Card className="max-w-md w-full border border-destructive/20 bg-destructive/5">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive shadow-inner">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold font-heading text-destructive">Access Denied</CardTitle>
            <CardDescription className="text-destructive-foreground/70 mt-1">
              Classroom Portions Tracking is only accessible to Class Teachers.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Welcome & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold font-heading tracking-tight flex items-center gap-2.5">
            <BarChart3 className="h-8 w-8 text-primary" />
            Portions Statistics
          </h1>
          <p className="text-sm text-muted-foreground font-semibold">
            Portions coverage overview and syllabus tracking for <span className="text-foreground font-bold">{batch}</span>.
          </p>
        </div>

        {/* Semester Selector */}
        <div className="flex gap-1.5 p-1.5 bg-muted rounded-xl w-fit self-start">
          {(['SEM-1', 'SEM-2'] as Semester[]).map((sem) => (
            <Button
              key={sem}
              variant={semester === sem ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSemester(sem)}
              className="rounded-lg font-bold text-xs px-4"
            >
              {sem}
            </Button>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/50 bg-card/40 backdrop-blur-sm shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold font-heading tracking-tight">{aggregates.avgCoverage}%</p>
              <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">Average Coverage</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card/40 backdrop-blur-sm shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold font-heading tracking-tight">{aggregates.onTrackCount + aggregates.aheadCount}</p>
              <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">On Track / Ahead</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card/40 backdrop-blur-sm shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold font-heading tracking-tight text-amber-600">{aggregates.behindCount}</p>
              <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">Syllabus Behind</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card/40 backdrop-blur-sm shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold font-heading tracking-tight">{workingDaysCount} Days</p>
              <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">Semester Calendar</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subjects Coverage List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-heading text-foreground">Syllabus Progress by Subject</h2>
          <span className="text-xs font-semibold text-muted-foreground">Semester Weeks: {weeks.length}</span>
        </div>

        {subjectStats.length > 0 ? (
          <div className="space-y-4">
            {subjectStats.map(({ subject, totalPagesCovered, totalPeriodsTaken, status, pageProgressPercent, periodProgressPercent, progressByWeek }) => (
              <Card key={subject.id} className="border border-border/50 bg-card/25 shadow-sm hover:bg-card/40 transition-colors">
                <CardContent className="p-6">
                  
                  {/* Subject Header & Info */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-extrabold font-heading text-foreground uppercase">
                          {subject.subject_name}
                        </h3>
                        <span
                          className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            status === 'pending'
                              ? 'bg-muted text-muted-foreground border'
                              : status === 'behind'
                              ? 'bg-rose-500/10 text-rose-600'
                              : status === 'ahead'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {statusLabel(status).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-semibold">
                        <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Teacher: {subject.teacher_name}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Timetable: {subject.period_per_week} Periods/Week</span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground md:text-right font-medium">
                      <p>Syllabus Target: <span className="font-bold text-foreground">{subject.total_pages} Pages</span></p>
                      <p>Periods Goal: <span className="font-bold text-foreground">{subject.total_period} Classes</span></p>
                    </div>
                  </div>

                  {/* Progress Bars Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                    {/* Pages Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-muted-foreground flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-primary" /> Pages Coverage</span>
                        <span className="text-foreground">{totalPagesCovered} / {subject.total_pages} Pages ({pageProgressPercent}%)</span>
                      </div>
                      <UIProgress value={pageProgressPercent} className="h-2.5 rounded-full" />
                    </div>

                    {/* Periods Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="h-4 w-4 text-violet-500" /> Periods Taken</span>
                        <span className="text-foreground">{totalPeriodsTaken} / {subject.total_period} Periods ({periodProgressPercent}%)</span>
                      </div>
                      <UIProgress value={periodProgressPercent} className="h-2.5 rounded-full" />
                    </div>
                  </div>

                  {/* Detailed Week Accordion Logs */}
                  <Accordion type="single" collapsible className="w-full border-t border-border/40">
                    <AccordionItem value="weeks-progress" className="border-none">
                      <AccordionTrigger className="py-2.5 text-xs font-bold hover:no-underline text-muted-foreground hover:text-foreground">
                        Show Weekly Progress Logs
                      </AccordionTrigger>
                      <AccordionContent className="pt-2">
                        <div className="relative border-l border-border/80 pl-6 ml-3 space-y-4 py-2">
                          {weeks.map((week) => {
                            const p = progressByWeek[week.key];
                            const wStatus = getPortionStatus(n(p?.pages_taken), n(subject.pages_per_week));
                            
                            return (
                              <div key={week.key} className="relative">
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 bg-background ${
                                  wStatus === 'behind'
                                    ? 'border-rose-500'
                                    : wStatus === 'ahead'
                                    ? 'border-emerald-500'
                                    : wStatus === 'on-track'
                                    ? 'border-primary'
                                    : 'border-muted-foreground/35'
                                }`} />
                                
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-extrabold text-foreground">{week.monthLabel} • Week {week.weekNo}</span>
                                    <span className={`text-[8.5px] font-extrabold px-2 rounded-full scale-90 ${
                                      wStatus === 'behind'
                                        ? 'bg-rose-500/15 text-rose-600'
                                        : wStatus === 'ahead'
                                        ? 'bg-emerald-500/15 text-emerald-600'
                                        : wStatus === 'on-track'
                                        ? 'bg-primary/15 text-primary'
                                        : 'bg-muted text-muted-foreground'
                                    }`}>
                                      {statusLabel(wStatus)}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground font-semibold">
                                    {displayDate(week.dateFrom)} to {displayDate(week.dateTo)}
                                  </p>
                                  <div className="text-xs font-semibold text-foreground/80 pt-1">
                                    <span>Pages covered: <span className="font-bold text-foreground">{n(p?.pages_taken)}</span></span>
                                    <span className="mx-2 text-muted-foreground">|</span>
                                    <span>Periods taken: <span className="font-bold text-foreground">{n(p?.period_taken)}</span></span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed py-16 text-center shadow-none rounded-2xl bg-card/10">
            <CardContent className="flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <BarChart3 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold font-heading">No Portions Set Up</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto font-medium">
                  Syllabus portions and subjects have not yet been configured by the Class Leader for {semester} of {batch}.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
}
