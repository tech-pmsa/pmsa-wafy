'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { displayDate } from '@/lib/portionUtils';

function batchFrom(details: any) {
  return details?.batch || details?.designation || '';
}

function classIdFrom(details: any) {
  return details?.designation?.replace(/\s+Class$/i, '') || '';
}

export default function CEWorkStatisticsPage() {
  const { details, loading: userLoading } = useUserData();
  const batch = batchFrom(details);
  const classId = classIdFrom(details);
  const [queryBatches, setQueryBatches] = useState<string[]>([]);
  const [works, setWorks] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!batch) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const batchKeys = new Set<string>([batch]);
      if (classId) {
        batchKeys.add(classId);
        batchKeys.add(`${classId} Class`);
      }

      const { data: relatedStudents, error: relatedStudentsError } = await supabase
        .from('students')
        .select('class_id')
        .eq('batch', batch);

      if (relatedStudentsError) throw relatedStudentsError;

      (relatedStudents || []).forEach((student: any) => {
        if (student.class_id) {
          batchKeys.add(student.class_id);
          batchKeys.add(`${student.class_id} Class`);
        }
      });

      const keys = Array.from(batchKeys).filter(Boolean);
      setQueryBatches(keys);

      const { data: workData, error: workError } = await supabase
        .from('ce_work_items')
        .select('*')
        .in('batch', keys)
        .order('submission_date', { ascending: false });
      if (workError) throw workError;

      const ids = (workData || []).map((work: any) => work.id);
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
      setWorks(workData || []);
      setRows(studentRows);
    } catch (err: any) {
      toast.error('Failed to load statistics', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [batch, classId]);

  useEffect(() => {
    if (!userLoading) load();
  }, [userLoading, load]);

  const rowsByWork = useMemo(() => {
    const map: Record<string, any[]> = {};
    rows.forEach((row) => {
      if (!map[row.work_id]) map[row.work_id] = [];
      map[row.work_id].push(row);
    });
    return map;
  }, [rows]);

  if (userLoading || loading) {
    return (
      <div className="flex h-[75vh] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold font-heading text-foreground tracking-tight">CE Work Statistics</h1>
        <p className="text-muted-foreground mt-1">
          Submission overview for: <span className="font-bold text-foreground">{queryBatches.join(', ') || batch}</span>
        </p>
      </div>

      <div className="space-y-6">
        {!works.length ? (
          <Card className="border border-border/50 shadow-md">
            <CardContent className="py-12 text-center text-muted-foreground font-semibold">
              No Continuous Evaluation (CE) tasks have been configured by the class leader yet.
            </CardContent>
          </Card>
        ) : (
          works.map((work) => {
            const workRows = rowsByWork[work.id] || [];
            const submitted = workRows.filter((row) => row.is_submitted);
            const pending = workRows.filter((row) => !row.is_submitted);
            const total = workRows.length;
            const percent = total > 0 ? Math.round((submitted.length / total) * 100) : 0;

            return (
              <Card key={work.id} className="border border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/15 border-b pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-bold font-heading">{work.work_name}</CardTitle>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                          {work.subject_name}
                        </span>
                      </div>
                      <CardDescription className="text-xs font-semibold">
                        Duration: {displayDate(work.started_date)} to {displayDate(work.submission_date)}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-center">
                      <span className="text-xs font-bold text-foreground">
                        Progress: <span className="text-primary font-extrabold">{submitted.length}/{total}</span> ({percent}%)
                      </span>
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-5 space-y-5">
                  {/* Status Box Totals */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/10">
                      <CheckCircle className="h-6 w-6 text-emerald-600" />
                      <div>
                        <span className="block text-2xl font-extrabold font-heading text-emerald-600 leading-tight">
                          {submitted.length}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700/80 uppercase tracking-wide">Submitted</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 rounded-xl border bg-destructive/5 border-destructive/10">
                      <XCircle className="h-6 w-6 text-destructive" />
                      <div>
                        <span className="block text-2xl font-extrabold font-heading text-destructive leading-tight">
                          {pending.length}
                        </span>
                        <span className="text-[11px] font-bold text-destructive/80 uppercase tracking-wide">Pending</span>
                      </div>
                    </div>
                  </div>

                  {/* Students Breakdowns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Submitted List */}
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider px-1">
                        Submitted ({submitted.length})
                      </h4>
                      <div className="p-4 rounded-xl border bg-muted/20 min-h-[100px] max-h-[200px] overflow-y-auto">
                        {submitted.length ? (
                          <p className="text-xs font-semibold text-foreground/80 leading-relaxed">
                            {submitted.map((row) => row.student_name).join(', ')}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No submissions recorded.</p>
                        )}
                      </div>
                    </div>

                    {/* Pending List */}
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold text-destructive uppercase tracking-wider px-1">
                        Not Submitted ({pending.length})
                      </h4>
                      <div className="p-4 rounded-xl border bg-muted/20 min-h-[100px] max-h-[200px] overflow-y-auto">
                        {pending.length ? (
                          <p className="text-xs font-semibold text-foreground/80 leading-relaxed">
                            {pending.map((row) => row.student_name).join(', ')}
                          </p>
                        ) : (
                          <p className="text-xs text-emerald-600 italic font-semibold">All students have submitted!</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
