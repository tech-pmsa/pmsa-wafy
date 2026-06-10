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
  Plus,
  Save,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  ClipboardList,
  BarChart3,
  User,
  ArrowUpDown,
  Search,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { displayDate, toDateValue, n } from '@/lib/portionUtils';

const DEFAULT_SUBJECTS = [
  'English',
  'Arabic',
  'SS',
  'Chemistry',
  'Biology',
  'Maths',
  'Physics',
];

type Student = {
  uid: string;
  name: string;
  cic: string | null;
};

type Subject = {
  id: string;
  name: string;
};

type Assignment = {
  id: string;
  batch: string;
  subject_id: string | null;
  subject_name: string;
  homework_date: string;
  total_mark: number;
};

type HomeworkMark = {
  id?: string;
  homework_id: string;
  student_uid: string;
  mark: number;
};

function getBatchNumber(batch?: string | null) {
  const match = batch?.match(/Batch\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function isEligibleBatch(batch?: string | null) {
  const batchNumber = getBatchNumber(batch);
  return !!batchNumber && batchNumber >= 17;
}

export default function HomeworkPage() {
  const { user, details, role, loading: userLoading } = useUserData();
  const eligible = role === 'class' && isEligibleBatch(details?.batch);

  const [activeTab, setActiveTab] = useState<'homework' | 'statistics'>('homework');
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [marks, setMarks] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingMarksId, setSavingMarksId] = useState<string | null>(null);
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedHistoryStudent, setSelectedHistoryStudent] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [homeworkDate, setHomeworkDate] = useState(toDateValue(new Date()));
  const [selectedSubject, setSelectedSubject] = useState(DEFAULT_SUBJECTS[0]);
  const [totalMark, setTotalMark] = useState('');

  const fetchData = useCallback(async () => {
    if (!details?.batch || !eligible || !user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [studentsRes, subjectsRes, assignmentsRes] = await Promise.all([
        supabase
          .from('students')
          .select('uid, name, cic')
          .eq('batch', details.batch)
          .order('cic', { ascending: true }),
        supabase
          .from('homework_subjects')
          .select('*')
          .eq('batch', details.batch)
          .order('name'),
        supabase
          .from('homework_assignments')
          .select('*')
          .eq('batch', details.batch)
          .order('homework_date', { ascending: false })
          .order('created_at', { ascending: false }),
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (subjectsRes.error) throw subjectsRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;

      let subjectRows = (subjectsRes.data || []) as any[];

      if (subjectRows.length === 0) {
        const { error: seedError } = await supabase.from('homework_subjects').upsert(
          DEFAULT_SUBJECTS.map((name) => ({
            batch: details.batch,
            name,
            created_by: user.id,
          })),
          { onConflict: 'batch,name' }
        );

        if (seedError) throw seedError;

        const { data: seededSubjects, error: seededError } = await supabase
          .from('homework_subjects')
          .select('*')
          .eq('batch', details.batch)
          .order('name');

        if (seededError) throw seededError;
        subjectRows = seededSubjects || [];
      }

      const dbSubjects = subjectRows.map((subject) => ({
        id: subject.id,
        name: subject.name,
      }));

      const mergedSubjects = dbSubjects.sort((a, b) => a.name.localeCompare(b.name));

      const assignmentRows = (assignmentsRes.data || []) as Assignment[];
      const assignmentIds = assignmentRows.map((assignment) => assignment.id);
      let marksMap: Record<string, Record<string, string>> = {};

      if (assignmentIds.length) {
        const { data: marksData, error: marksError } = await supabase
          .from('homework_marks')
          .select('*')
          .in('homework_id', assignmentIds);

        if (marksError) throw marksError;

        marksMap = ((marksData || []) as HomeworkMark[]).reduce(
          (acc, mark) => {
            if (!acc[mark.homework_id]) acc[mark.homework_id] = {};
            acc[mark.homework_id][mark.student_uid] = String(mark.mark ?? 0);
            return acc;
          },
          {} as Record<string, Record<string, string>>
        );
      }

      setStudents((studentsRes.data || []) as Student[]);
      setSubjects(mergedSubjects);
      setAssignments(assignmentRows);
      setMarks(marksMap);
      if (!mergedSubjects.some((subject) => subject.name === selectedSubject)) {
        setSelectedSubject(mergedSubjects[0]?.name || DEFAULT_SUBJECTS[0]);
      }
    } catch (err: any) {
      toast.error('Failed to load homework data', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [details?.batch, eligible, selectedSubject, user?.id]);

  useEffect(() => {
    if (!userLoading) fetchData();
  }, [userLoading, fetchData]);

  const selectedSubjectRow = subjects.find((subject) => subject.name === selectedSubject);

  const createHomework = async () => {
    if (!details?.batch || !user?.id) return;
    const mark = n(totalMark);

    if (!selectedSubject || mark <= 0) {
      toast.warning('Invalid input', { description: 'Select a subject and enter a valid total mark.' });
      return;
    }

    setSavingAssignment(true);

    try {
      const { error } = await supabase.from('homework_assignments').insert({
        batch: details.batch,
        subject_id: selectedSubjectRow?.id || null,
        subject_name: selectedSubject,
        homework_date: homeworkDate,
        total_mark: mark,
        created_by: user.id,
      });

      if (error) throw error;

      setTotalMark('');
      toast.success('Homework assignment created successfully');
      await fetchData();
    } catch (err: any) {
      toast.error('Failed to create homework', { description: err.message });
    } finally {
      setSavingAssignment(false);
    }
  };

  const addSubject = async () => {
    if (!details?.batch || !user?.id) return;
    const name = newSubjectName.trim();

    if (!name) {
      toast.warning('Invalid name', { description: 'Please enter a valid subject name.' });
      return;
    }

    try {
      const { error } = await supabase.from('homework_subjects').upsert(
        {
          batch: details.batch,
          name,
          created_by: user.id,
        },
        { onConflict: 'batch,name' }
      );

      if (error) throw error;

      setNewSubjectName('');
      setSelectedSubject(name);
      setSubjectModalOpen(false);
      toast.success('Subject added');
      await fetchData();
    } catch (err: any) {
      toast.error('Failed to add subject', { description: err.message });
    }
  };

  const deleteAssignment = async (assignment: Assignment) => {
    if (!confirm(`Are you sure you want to delete this ${assignment.subject_name} homework assignment? This will delete all marks records linked to it.`)) return;

    try {
      const { error } = await supabase.from('homework_assignments').delete().eq('id', assignment.id);
      if (error) throw error;
      toast.success('Homework deleted');
      await fetchData();
    } catch (err: any) {
      toast.error('Failed to delete homework', { description: err.message });
    }
  };

  const updateMarkDraft = (homeworkId: string, studentUid: string, value: string) => {
    setMarks((prev) => ({
      ...prev,
      [homeworkId]: {
        ...(prev[homeworkId] || {}),
        [studentUid]: value,
      },
    }));
  };

  const saveMarks = async (assignment: Assignment) => {
    setSavingMarksId(assignment.id);
    try {
      const assignmentMarks = marks[assignment.id] || {};
      const payload = students.map((student) => {
        const rawMark = assignmentMarks[student.uid] || '0';
        let parsedVal = n(rawMark);
        if (parsedVal > assignment.total_mark) parsedVal = assignment.total_mark;
        if (parsedVal < 0) parsedVal = 0;

        return {
          homework_id: assignment.id,
          student_uid: student.uid,
          mark: parsedVal,
        };
      });

      const { error } = await supabase.from('homework_marks').upsert(payload, { onConflict: 'homework_id,student_uid' });
      if (error) throw error;
      toast.success(`Marks saved for ${assignment.subject_name} homework`);
      await fetchData();
    } catch (err: any) {
      toast.error('Failed to save marks', { description: err.message });
    } finally {
      setSavingMarksId(null);
    }
  };

  // Memoized Student Statistics Calculation
  const studentStats = useMemo(() => {
    return students.map((student) => {
      let obtained = 0;
      let possible = 0;

      assignments.forEach((assignment) => {
        const studentMark = marks[assignment.id]?.[student.uid];
        if (studentMark !== undefined && studentMark !== null && studentMark !== '') {
          obtained += n(studentMark);
          possible += assignment.total_mark;
        }
      });

      const percent = possible > 0 ? (obtained / possible) * 100 : 0;
      return {
        ...student,
        obtained,
        possible,
        percent,
      };
    }).sort((a, b) => b.percent - a.percent); // Sort by performance rank
  }, [students, assignments, marks]);

  // Memoized Subject Averages Calculation
  const subjectStats = useMemo(() => {
    const map: Record<string, { totalObtained: number; totalPossible: number; count: number }> = {};

    assignments.forEach((assignment) => {
      const sub = assignment.subject_name;
      if (!map[sub]) map[sub] = { totalObtained: 0, totalPossible: 0, count: 0 };

      students.forEach((student) => {
        const studentMark = marks[assignment.id]?.[student.uid];
        if (studentMark !== undefined && studentMark !== null && studentMark !== '') {
          map[sub].totalObtained += n(studentMark);
          map[sub].totalPossible += assignment.total_mark;
          map[sub].count++;
        }
      });
    });

    return Object.entries(map).map(([name, stats]) => {
      const averagePercent = stats.totalPossible > 0 ? (stats.totalObtained / stats.totalPossible) * 100 : 0;
      return {
        name,
        averagePercent,
      };
    }).sort((a, b) => b.averagePercent - a.averagePercent);
  }, [assignments, students, marks]);

  const filteredStudentStats = useMemo(() => {
    if (!searchQuery.trim()) return studentStats;
    return studentStats.filter((student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.cic && student.cic.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [studentStats, searchQuery]);

  if (userLoading || loading) {
    return (
      <div className="flex h-[75vh] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!eligible) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <Card className="max-w-md w-full border-destructive/20 bg-destructive/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold font-heading text-destructive">Access Denied</CardTitle>
            <CardDescription className="text-destructive-foreground/75 mt-1">
              Homework management is restricted to Class Teachers of Batch 17 or higher.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold font-heading text-foreground tracking-tight">Classroom Homework</h1>
        <p className="text-muted-foreground mt-1">
          Record homework marks and analyze batch performance profiles for: <span className="font-bold text-foreground">{details?.batch}</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('homework')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'homework'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ClipboardList className="h-4 w-4" /> Homework Entries
        </button>
        <button
          onClick={() => setActiveTab('statistics')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'statistics'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="h-4 w-4" /> Performance Statistics
        </button>
      </div>

      {activeTab === 'homework' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Homework Creator */}
          <div className="xl:col-span-4">
            <Card className="border border-border/50 shadow-md">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg font-bold font-heading">New Homework Assignment</CardTitle>
                <CardDescription className="text-xs">Configure homework and set max points.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="subject-select" className="text-xs font-bold text-muted-foreground">Subject</Label>
                    <button
                      onClick={() => setSubjectModalOpen(true)}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      + Add Subject
                    </button>
                  </div>
                  <select
                    id="subject-select"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm font-semibold ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.name}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hw-date" className="text-xs font-bold text-muted-foreground">Homework Date</Label>
                  <Input
                    id="hw-date"
                    type="date"
                    value={homeworkDate}
                    onChange={(e) => setHomeworkDate(e.target.value)}
                    className="rounded-xl font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tot-mark" className="text-xs font-bold text-muted-foreground">Total Maximum Mark</Label>
                  <Input
                    id="tot-mark"
                    type="number"
                    value={totalMark}
                    onChange={(e) => setTotalMark(e.target.value)}
                    placeholder="e.g. 10 or 20"
                    className="rounded-xl font-semibold"
                  />
                </div>

                <Button
                  onClick={createHomework}
                  disabled={savingAssignment}
                  className="w-full gap-2 font-bold shadow-md rounded-xl mt-2"
                >
                  {savingAssignment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Create Assignment
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Homework Assignments List */}
          <div className="xl:col-span-8 space-y-4">
            {assignments.length ? (
              assignments.map((assignment) => {
                const isOpen = expandedAssignmentId === assignment.id;
                const assignmentMarks = marks[assignment.id] || {};
                const enteredCount = Object.keys(assignmentMarks).filter((k) => assignmentMarks[k] !== '').length;

                return (
                  <Card key={assignment.id} className="border border-border/50 shadow-sm overflow-hidden transition-all">
                    {/* Header trigger */}
                    <div
                      onClick={() => setExpandedAssignmentId(isOpen ? null : assignment.id)}
                      className="flex items-center justify-between p-4 px-5 cursor-pointer bg-card/60 hover:bg-card/90 transition-all border-b border-border/40 select-none"
                    >
                      <div className="space-y-1 min-w-0 pr-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[15px] font-extrabold text-foreground tracking-tight">
                            {assignment.subject_name}
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            Max {assignment.total_mark} Pts
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          Date: {displayDate(assignment.homework_date)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold text-muted-foreground/90">
                          Grades entered: <span className="text-primary font-extrabold">{enteredCount}/{students.length}</span>
                        </span>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Toolbar strip */}
                    <div className="px-5 py-2.5 bg-muted/10 border-b flex justify-end gap-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAssignment(assignment);
                        }}
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs font-semibold rounded-xl text-destructive hover:text-destructive hover:bg-destructive/5"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete Homework
                      </Button>
                    </div>

                    {/* Grade table list */}
                    {isOpen && (
                      <CardContent className="p-0 animate-in slide-in-from-top-1 duration-200">
                        <div className="max-h-[50vh] overflow-y-auto divide-y divide-border/50">
                          {students.map((student) => {
                            const value = assignmentMarks[student.uid] || '';
                            return (
                              <div
                                key={student.uid}
                                className="flex items-center justify-between p-3.5 px-5 hover:bg-muted/5 transition-colors"
                              >
                                <div className="min-w-0 pr-4">
                                  <h4 className="text-xs font-bold text-foreground truncate">{student.name}</h4>
                                  <p className="text-[10px] font-semibold text-muted-foreground/85">
                                    CIC: {student.cic || '-'}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                  <Input
                                    value={value}
                                    onChange={(e) => updateMarkDraft(assignment.id, student.uid, e.target.value)}
                                    placeholder="0"
                                    type="number"
                                    max={assignment.total_mark}
                                    min={0}
                                    className="h-8 w-20 rounded-lg text-xs font-bold text-center"
                                  />
                                  <span className="text-[11px] font-bold text-muted-foreground">
                                    / {assignment.total_mark}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-4 bg-muted/15 border-t flex justify-end">
                          <Button
                            onClick={() => saveMarks(assignment)}
                            disabled={savingMarksId === assignment.id}
                            className="gap-2 font-bold shadow-md rounded-xl h-9 text-xs"
                          >
                            {savingMarksId === assignment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            Save All Marks
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })
            ) : (
              <Card className="border border-border/50 shadow-md">
                <CardContent className="py-12 text-center text-muted-foreground font-semibold">
                  No homework assignments configured yet. Set one up using the form on the left.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* Statistics Tab */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Subject averages */}
          <div className="xl:col-span-4">
            <Card className="border border-border/50 shadow-md">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg font-bold font-heading">Subject Performance</CardTitle>
                <CardDescription className="text-xs">Class averages sorted by subject ranking.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {subjectStats.length ? (
                  subjectStats.map((sub) => (
                    <div key={sub.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">{sub.name}</span>
                        <span className="text-primary font-bold">{sub.averagePercent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden border">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${sub.averagePercent}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-6 text-xs text-muted-foreground font-semibold">
                    No academic statistics available.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Student Leaderboard list */}
          <div className="xl:col-span-8">
            <Card className="border border-border/50 shadow-md">
              <CardHeader className="pb-3 border-b flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <CardTitle className="text-lg font-bold font-heading">Student Rankings</CardTitle>
                  <CardDescription className="text-xs">Summary of student averages across homework assignments.</CardDescription>
                </div>
                {/* Search */}
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or CIC..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-8 rounded-xl text-xs"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {filteredStudentStats.length ? (
                    filteredStudentStats.map((student, idx) => (
                      <div
                        key={student.uid}
                        onClick={() => setSelectedHistoryStudent(student)}
                        className="flex items-center justify-between p-4 px-5 hover:bg-muted/10 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 pr-4">
                          {/* Rank indicator */}
                          <span className={`flex items-center justify-center h-6.5 w-6.5 shrink-0 rounded-lg text-xs font-extrabold border ${
                            idx === 0
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : idx === 1
                              ? 'bg-slate-400/10 text-slate-600 border-slate-400/20'
                              : idx === 2
                              ? 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                              : 'bg-muted text-muted-foreground border-border/60'
                          }`}>
                            {idx + 1}
                          </span>

                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-foreground truncate">{student.name}</h4>
                            <p className="text-[10px] font-semibold text-muted-foreground/80 mt-0.5">
                              CIC: {student.cic || '-'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs font-extrabold text-foreground">
                            {student.percent.toFixed(1)}%
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {student.obtained} / {student.possible} Pts
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-sm text-muted-foreground font-semibold">
                      No students match your query.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Add Homework Subject Modal */}
      {subjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground border rounded-2xl max-w-sm w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSubjectModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold font-heading mb-4 text-foreground">Create Homework Subject</h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-sub-name" className="text-xs font-bold text-muted-foreground font-semibold">Subject Title</Label>
                <Input
                  id="new-sub-name"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="e.g. History or Quran"
                  className="rounded-xl font-semibold"
                />
              </div>

              <Button
                onClick={addSubject}
                className="w-full gap-2 font-bold shadow-md rounded-xl"
              >
                <Plus className="h-4 w-4" /> Add Subject
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Student Grade Book Modal (History Breakdown) */}
      {selectedHistoryStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground border rounded-2xl max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedHistoryStudent(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b pb-3 mb-3">
              <h3 className="text-lg font-extrabold font-heading text-foreground">{selectedHistoryStudent.name}</h3>
              <p className="text-[11px] font-semibold text-muted-foreground/80 mt-0.5">
                CIC: {selectedHistoryStudent.cic || '-'} | Overall Average: <span className="text-primary font-bold">{selectedHistoryStudent.percent.toFixed(1)}%</span>
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-0.5">Assignment Breakdown</h4>
              {assignments.map((assignment) => {
                const mark = marks[assignment.id]?.[selectedHistoryStudent.uid];
                const hasGrade = mark !== undefined && mark !== null && mark !== '';
                const studentPercent = hasGrade ? (n(mark) / assignment.total_mark) * 100 : 0;

                return (
                  <div key={assignment.id} className="p-3 rounded-xl border bg-muted/20 flex justify-between items-center text-xs">
                    <div>
                      <span className="block font-bold text-foreground">{assignment.subject_name}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">Date: {displayDate(assignment.homework_date)}</span>
                    </div>

                    <div className="flex flex-col items-end">
                      {hasGrade ? (
                        <>
                          <span className="font-extrabold text-foreground">{mark} / {assignment.total_mark} Pts</span>
                          <span className="text-[10px] font-bold text-primary">{studentPercent.toFixed(1)}%</span>
                        </>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic font-semibold">Not graded</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              onClick={() => setSelectedHistoryStudent(null)}
              className="w-full mt-4 font-bold rounded-xl"
            >
              Close Grade Book
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
