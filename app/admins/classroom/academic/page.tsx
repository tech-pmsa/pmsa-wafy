'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  User,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Award,
  School,
  FileText,
  Loader2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import {
  AcademicRecord,
  ClassOption,
  fetchNonFoundationClasses,
  isFoundationClass,
} from '@/lib/academicUtils';
import { AcademicCard } from '@/components/academic/AcademicCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type StudentWithRecords = {
  uid: string;
  name: string;
  cic: string | null;
  class_id: string | null;
  batch: string | null;
  records: AcademicRecord[];
};

export default function ClassroomAcademicPage() {
  const { role, details, loading: userLoading } = useUserData();

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [activeClass, setActiveClass] = useState<string>('');
  const [classesLoading, setClassesLoading] = useState(true);

  const [students, setStudents] = useState<StudentWithRecords[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [expandedStudentUid, setExpandedStudentUid] = useState<string | null>(null);

  const isClassTeacher = role === 'class';

  // 1. Fetch available non-foundation classes and set initial activeClass
  useEffect(() => {
    let isMounted = true;
    async function initClasses() {
      if (userLoading) return;
      setClassesLoading(true);
      try {
        const classList = await fetchNonFoundationClasses();
        if (!isMounted) return;
        setClasses(classList);

        if (isClassTeacher) {
          const teacherBatch = details?.batch || '';
          const teacherDesig = (details?.designation || '').replace(/\s+Class$/i, '');
          const matched = classList.find(
            (c) =>
              c.id === teacherBatch ||
              c.id === teacherDesig ||
              c.queryKeys.includes(teacherBatch) ||
              c.queryKeys.includes(teacherDesig)
          );
          setActiveClass(matched?.id || teacherBatch || teacherDesig || classList[0]?.id || '');
        } else {
          setActiveClass((prev) => prev || classList[0]?.id || '');
        }
      } catch (err: any) {
        console.error('Failed to load non-foundation classes:', err);
      } finally {
        if (isMounted) setClassesLoading(false);
      }
    }

    initClasses();
    return () => {
      isMounted = false;
    };
  }, [userLoading, isClassTeacher, details?.batch, details?.designation]);

  // 2. Load students and their academic records for activeClass
  const loadClassData = useCallback(async () => {
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
        if (!k || isFoundationClass(k)) return;
        expandedKeys.add(k);
        expandedKeys.add(`${k} Class`);
        expandedKeys.add(k.replace(/\s+Class$/i, ''));
      });
      const keys = Array.from(expandedKeys).filter(Boolean);

      // Fetch students of this class
      const [byBatchRes, byClassRes] = await Promise.all([
        supabase
          .from('students')
          .select('uid, name, cic, class_id, batch')
          .in('batch', keys)
          .order('name'),
        supabase
          .from('students')
          .select('uid, name, cic, class_id, batch')
          .in('class_id', keys)
          .order('name'),
      ]);

      const studentMap = new Map<string, StudentWithRecords>();
      [...(byBatchRes.data || []), ...(byClassRes.data || [])].forEach((s: any) => {
        if (s?.uid && !isFoundationClass(s.class_id) && !isFoundationClass(s.batch)) {
          studentMap.set(s.uid, {
            uid: s.uid,
            name: s.name,
            cic: s.cic,
            class_id: s.class_id,
            batch: s.batch,
            records: [],
          });
        }
      });

      const studentList = Array.from(studentMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      // Fetch academic records for all students in this class
      if (studentList.length > 0) {
        const studentUids = studentList.map((s) => s.uid);
        const { data: recordsData, error: recordsError } = await supabase
          .from('student_academics')
          .select('*')
          .in('student_uid', studentUids)
          .order('created_at', { ascending: false });

        if (recordsError) throw recordsError;

        const recordsByUid = new Map<string, AcademicRecord[]>();
        (recordsData || []).forEach((rec: any) => {
          if (!recordsByUid.has(rec.student_uid)) {
            recordsByUid.set(rec.student_uid, []);
          }
          recordsByUid.get(rec.student_uid)!.push(rec as AcademicRecord);
        });

        studentList.forEach((st) => {
          st.records = recordsByUid.get(st.uid) || [];
        });
      }

      setStudents(studentList);
      if (studentList.length > 0 && !expandedStudentUid) {
        setExpandedStudentUid(studentList[0].uid);
      }
    } catch (err: any) {
      console.error('Failed to load class academics:', err);
      toast.error('Failed to load academic records', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [activeClass, classes, expandedStudentUid]);

  useEffect(() => {
    if (!classesLoading && activeClass) {
      loadClassData();
    }
  }, [classesLoading, activeClass, loadClassData]);

  // Filter students based on search query and academic type filter
  const filteredStudents = useMemo(() => {
    let result = students;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.cic && s.cic.toLowerCase().includes(q))
      );
    }

    if (selectedTypeFilter !== 'all') {
      result = result.filter((s) =>
        s.records.some((r) => r.academic_type === selectedTypeFilter)
      );
    }

    return result;
  }, [students, searchQuery, selectedTypeFilter]);

  if (userLoading || classesLoading || (loading && !students.length)) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-xs text-muted-foreground">Loading academic overview...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Academic Overview</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {isClassTeacher
            ? `Academic records for students in ${activeClass || 'your class'}.`
            : 'View student higher secondary (+1, +2), Degree, and Diploma education history.'}
        </p>
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
                    onClick={() => {
                      setActiveClass(cls.id);
                      setExpandedStudentUid(null);
                    }}
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

      {/* Filter and Search Bar */}
      <Card className="border border-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student by name or CIC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Academic Type Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { key: 'all', label: 'All Levels' },
                { key: '+1', label: '+1' },
                { key: '+2', label: '+2' },
                { key: 'degree', label: 'Degree' },
                { key: 'diploma', label: 'Diploma' },
              ].map((item) => {
                const isActive = selectedTypeFilter === item.key;
                return (
                  <Button
                    key={item.key}
                    type="button"
                    size="sm"
                    variant={isActive ? 'default' : 'outline'}
                    onClick={() => setSelectedTypeFilter(item.key)}
                    className="text-xs h-8 px-2.5"
                  >
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Academic List */}
      {filteredStudents.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-3">
            <Users className="h-10 w-10 text-muted-foreground/60" />
            <h3 className="text-base font-bold text-foreground">No Students Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              No students match the current search or academic level filter in {activeClass}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredStudents.map((st) => {
            const isExpanded = expandedStudentUid === st.uid;
            const displayedRecords =
              selectedTypeFilter === 'all'
                ? st.records
                : st.records.filter((r) => r.academic_type === selectedTypeFilter);

            return (
              <Card
                key={st.uid}
                className="overflow-hidden border border-border shadow-sm transition-all"
              >
                {/* Student Header */}
                <div
                  onClick={() => setExpandedStudentUid(isExpanded ? null : st.uid)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/40 transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{st.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        CIC: {st.cic || '-'} | Class: {st.class_id || st.batch || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {st.records.length} {st.records.length === 1 ? 'Record' : 'Records'}
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded Student Records */}
                {isExpanded && (
                  <CardContent className="p-4 pt-0 border-t border-border space-y-3 bg-muted/10">
                    {displayedRecords.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-3 text-center">
                        No academic records recorded for this student under the selected filter.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                        {displayedRecords.map((rec) => (
                          <AcademicCard key={rec.id} record={rec} canEdit={false} />
                        ))}
                      </div>
                    )}
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
