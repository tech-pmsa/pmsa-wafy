'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  X,
  Plus,
  Trash2,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AcademicRecord,
  AcademicType,
  SubjectItem,
  SemesterData,
  SCHOOL_TYPES,
  STUDY_MODES,
  DIPLOMA_STUDY_MODES,
  BOARDS,
  STREAMS,
  RESULTS,
  DEGREE_STATUSES,
  DEGREE_LEVELS,
  UG_COURSES,
  PG_COURSES,
  INTEGRATED_COURSES,
  SPECIALISATIONS,
  ACADEMIC_SCHEMES,
  TOTAL_SEMESTER_OPTIONS,
} from '@/lib/academicUtils';

interface AcademicFormModalProps {
  visible: boolean;
  academicType: AcademicType;
  record?: AcademicRecord | null;
  student: {
    uid: string;
    name: string;
    cic?: string | null;
    class_id?: string | null;
    batch?: string | null;
  };
  onClose: () => void;
  onSaved: () => void;
}

export function AcademicFormModal({
  visible,
  academicType,
  record,
  student,
  onClose,
  onSaved,
}: AcademicFormModalProps) {
  const [loading, setLoading] = useState(false);

  // Common / +1 / +2 / Diploma fields
  const [academicYear, setAcademicYear] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolLocation, setSchoolLocation] = useState('');
  const [schoolType, setSchoolType] = useState<string>('Govt');
  const [studyMode, setStudyMode] = useState<string>('Regular');
  const [board, setBoard] = useState<string>('Kerala State Board');
  const [stream, setStream] = useState<string>('Science');
  const [result, setResult] = useState<string>('passed');
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  // Degree fields
  const [degreeStatus, setDegreeStatus] = useState<string>('Completed');
  const [degreeLevel, setDegreeLevel] = useState<string>('UG');
  const [courseName, setCourseName] = useState<string>('BA');
  const [customCourse, setCustomCourse] = useState('');
  const [courseSpecialisation, setCourseSpecialisation] = useState<string>('English');
  const [customSpecialisation, setCustomSpecialisation] = useState('');
  const [academicScheme, setAcademicScheme] = useState<string>('FYUGP');
  const [university, setUniversity] = useState('');
  const [admissionYear, setAdmissionYear] = useState('');
  const [totalSemesters, setTotalSemesters] = useState<number>(6);
  const [semesterData, setSemesterData] = useState<SemesterData[]>([]);

  // Expanded semester index in degree form
  const [expandedSem, setExpandedSem] = useState<number | null>(1);

  // Reset or Populate form on open
  useEffect(() => {
    if (!visible) return;

    if (record) {
      // Editing existing record
      setAcademicYear(record.academic_year || '');
      setSchoolName(record.school_name || '');
      setSchoolLocation(record.school_location || '');
      setSchoolType(record.school_type || 'Govt');
      setStudyMode(record.study_mode || 'Regular');
      setBoard(record.board || 'Kerala State Board');
      setStream(record.stream || 'Science');
      setResult(record.result || 'passed');
      setSubjects(record.subjects || []);

      setDegreeStatus(record.degree_status || 'Completed');
      setDegreeLevel(record.degree_level || 'UG');
      const isKnownCourse = [...UG_COURSES, ...PG_COURSES, ...INTEGRATED_COURSES].includes(
        (record.course_name || '') as any
      );
      if (isKnownCourse) {
        setCourseName(record.course_name || 'BA');
        setCustomCourse('');
      } else {
        setCourseName('Other');
        setCustomCourse(record.course_name || '');
      }

      const isKnownSpec = (SPECIALISATIONS as readonly string[]).includes(
        record.course_specialisation || ''
      );
      if (isKnownSpec) {
        setCourseSpecialisation(record.course_specialisation || 'English');
        setCustomSpecialisation('');
      } else {
        setCourseSpecialisation('Other');
        setCustomSpecialisation(record.course_specialisation || '');
      }

      setAcademicScheme(record.academic_scheme || 'FYUGP');
      setUniversity(record.university || '');
      setAdmissionYear(record.admission_year || '');
      setTotalSemesters(record.total_semesters || 6);
      setSemesterData(record.semester_data || []);
      setExpandedSem(1);
    } else {
      // Creating new record
      setAcademicYear('');
      setSchoolName('');
      setSchoolLocation('');
      setSchoolType('Govt');
      setStudyMode('Regular');
      setBoard('Kerala State Board');
      setStream('Science');
      setResult('passed');
      setSubjects([]);

      setDegreeStatus('Completed');
      setDegreeLevel('UG');
      setCourseName('BA');
      setCustomCourse('');
      setCourseSpecialisation('English');
      setCustomSpecialisation('');
      setAcademicScheme('FYUGP');
      setUniversity('');
      setAdmissionYear('');
      setTotalSemesters(6);

      const initialSemesters: SemesterData[] = Array.from({ length: 6 }, (_, i) => ({
        semester_no: i + 1,
        cgpa: '',
        subjects: [],
      }));
      setSemesterData(initialSemesters);
      setExpandedSem(1);
    }
  }, [visible, record, academicType]);

  // Adjust semesterData when totalSemesters changes
  const handleTotalSemestersChange = (semCount: number) => {
    setTotalSemesters(semCount);
    setSemesterData((prev) => {
      const updated: SemesterData[] = [];
      for (let i = 1; i <= semCount; i++) {
        const existing = prev.find((s) => s.semester_no === i);
        if (existing) {
          updated.push(existing);
        } else {
          updated.push({ semester_no: i, cgpa: '', subjects: [] });
        }
      }
      return updated;
    });
  };

  // Add / remove subjects for non-degree
  const addSubject = () => {
    setSubjects((prev) => [...prev, { subject_name: '', grade_or_mark: '', status: 'passed' }]);
  };

  const updateSubject = (index: number, field: keyof SubjectItem, val: any) => {
    setSubjects((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const removeSubject = (index: number) => {
    setSubjects((prev) => prev.filter((_, i) => i !== index));
  };

  // Add / remove subjects for degree semesters
  const addSemesterSubject = (semIndex: number) => {
    setSemesterData((prev) => {
      const next = [...prev];
      const currentSubjects = next[semIndex].subjects || [];
      next[semIndex] = {
        ...next[semIndex],
        subjects: [...currentSubjects, { subject_name: '', grade_or_mark: '', status: 'passed' }],
      };
      return next;
    });
  };

  const updateSemesterSubject = (
    semIndex: number,
    subIndex: number,
    field: keyof SubjectItem,
    val: any
  ) => {
    setSemesterData((prev) => {
      const next = [...prev];
      const subs = [...next[semIndex].subjects];
      subs[subIndex] = { ...subs[subIndex], [field]: val };
      next[semIndex] = { ...next[semIndex], subjects: subs };
      return next;
    });
  };

  const removeSemesterSubject = (semIndex: number, subIndex: number) => {
    setSemesterData((prev) => {
      const next = [...prev];
      const subs = next[semIndex].subjects.filter((_, i) => i !== subIndex);
      next[semIndex] = { ...next[semIndex], subjects: subs };
      return next;
    });
  };

  const updateSemesterCgpa = (semIndex: number, val: string) => {
    setSemesterData((prev) => {
      const next = [...prev];
      next[semIndex] = { ...next[semIndex], cgpa: val };
      return next;
    });
  };

  // Course options
  const courseOptions =
    degreeLevel === 'UG' ? UG_COURSES : degreeLevel === 'PG' ? PG_COURSES : INTEGRATED_COURSES;

  const currentScheme = ACADEMIC_SCHEMES.find((s) => s.value === academicScheme);
  const isDegree = academicType === 'degree';

  // Save handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!student?.uid) {
      toast.error('Student identification is missing.');
      return;
    }

    if (isDegree) {
      if (!university.trim()) {
        toast.error('Please enter the University name.');
        return;
      }
    } else {
      if (!schoolName.trim()) {
        toast.error('Please enter the School / Institution name.');
        return;
      }
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const finalCourseName = courseName === 'Other' ? customCourse.trim() : courseName;
      const finalSpecialisation =
        courseSpecialisation === 'Other' ? customSpecialisation.trim() : courseSpecialisation;

      const payload: Partial<AcademicRecord> = {
        student_uid: student.uid,
        student_name: student.name,
        student_cic: student.cic || null,
        class_id: student.class_id || null,
        batch: student.batch || null,
        academic_type: academicType,
        created_by: user?.id || null,
        updated_at: new Date().toISOString(),

        // +1 / +2 / Diploma
        academic_year: academicYear.trim(),
        school_name: schoolName.trim(),
        school_location: schoolLocation.trim(),
        school_type: schoolType,
        study_mode: studyMode,
        board: isDegree ? null : board,
        stream: isDegree ? null : stream,
        result: isDegree ? null : result,
        subjects: isDegree ? [] : subjects,

        // Degree
        degree_status: isDegree ? degreeStatus : null,
        degree_level: isDegree ? degreeLevel : null,
        course_name: isDegree ? finalCourseName : courseName.trim(),
        course_specialisation: isDegree ? finalSpecialisation : null,
        academic_scheme: isDegree ? academicScheme : null,
        university: isDegree ? university.trim() : null,
        admission_year: isDegree ? admissionYear.trim() : null,
        total_semesters: isDegree ? totalSemesters : null,
        semester_data: isDegree ? semesterData : [],
      };

      if (record?.id) {
        // Update
        const { error } = await supabase
          .from('student_academics')
          .update(payload)
          .eq('id', record.id);
        if (error) throw error;
        toast.success('Academic record updated successfully!');
      } else {
        // Insert
        const { error } = await supabase.from('student_academics').insert([payload]);
        if (error) throw error;
        toast.success('Academic record added successfully!');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      toast.error('Save failed', { description: err.message || 'Failed to save record.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-lg font-bold">
            {record ? 'Edit' : 'Add'} {academicType.toUpperCase()} Academic Record
          </DialogTitle>
          <DialogDescription className="text-xs">
            Student: <span className="font-semibold text-foreground">{student.name}</span>
            {student.cic ? ` (CIC: ${student.cic})` : ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* Non-Degree (+1, +2, Diploma) */}
            {!isDegree && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="academicYear">Academic Year</Label>
                    <Input
                      id="academicYear"
                      placeholder="e.g. 2023–2024, 2024–2025"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="schoolName">
                      {academicType === 'diploma'
                        ? 'Institution / Polytechnic Name'
                        : 'School Name'}
                    </Label>
                    <Input
                      id="schoolName"
                      required
                      placeholder="e.g. KYHSS Athavanad"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="schoolLocation">School / Institution Location</Label>
                    <Input
                      id="schoolLocation"
                      placeholder="e.g. Athavanad, Malappuram"
                      value={schoolLocation}
                      onChange={(e) => setSchoolLocation(e.target.value)}
                    />
                  </div>
                </div>

                {/* School Type */}
                <div className="space-y-2">
                  <Label>School Type</Label>
                  <div className="flex flex-wrap gap-2">
                    {SCHOOL_TYPES.map((type) => (
                      <Button
                        key={type}
                        type="button"
                        size="sm"
                        variant={schoolType === type ? 'default' : 'outline'}
                        onClick={() => setSchoolType(type)}
                        className="text-xs h-8"
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Study Mode */}
                <div className="space-y-2">
                  <Label>Study Mode</Label>
                  <div className="flex flex-wrap gap-2">
                    {(academicType === 'diploma' ? DIPLOMA_STUDY_MODES : STUDY_MODES).map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        size="sm"
                        variant={studyMode === mode ? 'default' : 'outline'}
                        onClick={() => setStudyMode(mode)}
                        className="text-xs h-8"
                      >
                        {mode}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Board */}
                {academicType !== 'diploma' && (
                  <div className="space-y-2">
                    <Label>Board</Label>
                    <div className="flex flex-wrap gap-2">
                      {BOARDS.map((b) => (
                        <Button
                          key={b}
                          type="button"
                          size="sm"
                          variant={board === b ? 'default' : 'outline'}
                          onClick={() => setBoard(b)}
                          className="text-xs h-8"
                        >
                          {b}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stream */}
                {academicType !== 'diploma' && (
                  <div className="space-y-2">
                    <Label>Stream</Label>
                    <div className="flex flex-wrap gap-2">
                      {STREAMS.map((s) => (
                        <Button
                          key={s}
                          type="button"
                          size="sm"
                          variant={stream === s ? 'default' : 'outline'}
                          onClick={() => setStream(s)}
                          className="text-xs h-8"
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Result */}
                <div className="space-y-2">
                  <Label>Result Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {RESULTS.map((r) => (
                      <Button
                        key={r}
                        type="button"
                        size="sm"
                        variant={result === r ? 'default' : 'outline'}
                        onClick={() => setResult(r)}
                        className="text-xs h-8 uppercase font-semibold"
                      >
                        {r}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Subjects & Marks */}
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Subjects & Marks</h4>
                      <p className="text-xs text-muted-foreground">
                        Add subjects, grades, and pass/fail statuses.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addSubject}
                      className="text-xs h-8 gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Subject
                    </Button>
                  </div>

                  {subjects.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground bg-muted/20">
                      No subjects added yet. Click &quot;Add Subject&quot; to include individual marks.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {subjects.map((sub, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-border bg-muted/20 space-y-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <Input
                                placeholder="Subject Name (e.g. Physics / English)"
                                value={sub.subject_name}
                                onChange={(e) => updateSubject(idx, 'subject_name', e.target.value)}
                                className="h-9 text-xs"
                              />
                            </div>
                            <div className="w-28">
                              <Input
                                placeholder="Mark / Grade"
                                value={sub.grade_or_mark}
                                onChange={(e) => updateSubject(idx, 'grade_or_mark', e.target.value)}
                                className="h-9 text-xs"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSubject(idx)}
                              className="h-9 w-9 text-destructive hover:bg-destructive/10 shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground font-medium">Status:</span>
                            <Button
                              type="button"
                              size="sm"
                              variant={sub.status === 'passed' ? 'default' : 'outline'}
                              onClick={() => updateSubject(idx, 'status', 'passed')}
                              className={`h-7 px-2.5 text-[11px] ${
                                sub.status === 'passed' ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                              }`}
                            >
                              Passed
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={sub.status === 'failed' ? 'destructive' : 'outline'}
                              onClick={() => updateSubject(idx, 'status', 'failed')}
                              className="h-7 px-2.5 text-[11px]"
                            >
                              Failed
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Degree Form */}
            {isDegree && (
              <>
                {/* Degree Status */}
                <div className="space-y-2">
                  <Label>Degree Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {DEGREE_STATUSES.map((status) => (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={degreeStatus === status ? 'default' : 'outline'}
                        onClick={() => setDegreeStatus(status)}
                        className="text-xs h-8"
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Degree Level */}
                <div className="space-y-2">
                  <Label>Degree Level</Label>
                  <div className="flex flex-wrap gap-2">
                    {DEGREE_LEVELS.map((level) => (
                      <Button
                        key={level}
                        type="button"
                        size="sm"
                        variant={degreeLevel === level ? 'default' : 'outline'}
                        onClick={() => {
                          setDegreeLevel(level);
                          if (level === 'UG') setCourseName('BA');
                          else if (level === 'PG') setCourseName('MA');
                          else setCourseName('Integrated MA');
                        }}
                        className="text-xs h-8"
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Course Name */}
                <div className="space-y-2">
                  <Label>Course</Label>
                  <div className="flex flex-wrap gap-2">
                    {courseOptions.map((c) => (
                      <Button
                        key={c}
                        type="button"
                        size="sm"
                        variant={courseName === c ? 'default' : 'outline'}
                        onClick={() => setCourseName(c)}
                        className="text-xs h-8"
                      >
                        {c}
                      </Button>
                    ))}
                  </div>
                  {courseName === 'Other' && (
                    <Input
                      placeholder="Enter custom course name (e.g. B.Tech, LL.B)"
                      value={customCourse}
                      onChange={(e) => setCustomCourse(e.target.value)}
                      className="mt-2 text-xs"
                    />
                  )}
                </div>

                {/* Course Specialisation */}
                <div className="space-y-2">
                  <Label>Specialisation / Major</Label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALISATIONS.map((spec) => (
                      <Button
                        key={spec}
                        type="button"
                        size="sm"
                        variant={courseSpecialisation === spec ? 'default' : 'outline'}
                        onClick={() => setCourseSpecialisation(spec)}
                        className="text-xs h-8"
                      >
                        {spec}
                      </Button>
                    ))}
                  </div>
                  {courseSpecialisation === 'Other' && (
                    <Input
                      placeholder="Enter custom specialisation (e.g. Psychology, History)"
                      value={customSpecialisation}
                      onChange={(e) => setCustomSpecialisation(e.target.value)}
                      className="mt-2 text-xs"
                    />
                  )}
                </div>

                {/* Academic Scheme */}
                <div className="space-y-2">
                  <Label>Academic Scheme</Label>
                  <div className="flex flex-wrap gap-2">
                    {ACADEMIC_SCHEMES.map((scheme) => (
                      <Button
                        key={scheme.value}
                        type="button"
                        size="sm"
                        variant={academicScheme === scheme.value ? 'default' : 'outline'}
                        onClick={() => setAcademicScheme(scheme.value)}
                        className="text-xs h-8"
                      >
                        {scheme.value}
                      </Button>
                    ))}
                  </div>

                  {currentScheme && (
                    <div className="bg-primary/5 border-l-4 border-primary p-3 rounded-md text-xs space-y-1 mt-2">
                      <div className="flex items-center gap-1.5 font-bold text-primary">
                        <Info className="h-4 w-4 shrink-0" />
                        <span>{currentScheme.title}</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{currentScheme.desc}</p>
                    </div>
                  )}
                </div>

                {/* University & Admission Year */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="university">University</Label>
                    <Input
                      id="university"
                      required
                      placeholder="e.g. Calicut, Kannur, Kerala"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="admissionYear">Admission Year</Label>
                    <Input
                      id="admissionYear"
                      placeholder="e.g. 2023, 2024"
                      value={admissionYear}
                      onChange={(e) => setAdmissionYear(e.target.value)}
                    />
                  </div>
                </div>

                {/* Total Semesters */}
                <div className="space-y-2">
                  <Label>Total Semesters</Label>
                  <div className="flex flex-wrap gap-2">
                    {TOTAL_SEMESTER_OPTIONS.map((num) => (
                      <Button
                        key={num}
                        type="button"
                        size="sm"
                        variant={totalSemesters === num ? 'default' : 'outline'}
                        onClick={() => handleTotalSemestersChange(num)}
                        className="h-8 w-8 p-0 text-xs font-bold"
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Semester-wise breakdown */}
                <div className="space-y-3 pt-3 border-t border-border">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Semester Marks & CGPA</h4>
                    <p className="text-xs text-muted-foreground">
                      Enter CGPA or total marks and subjects for each semester.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {semesterData.map((sem, sIdx) => {
                      const isExpanded = expandedSem === sem.semester_no;
                      return (
                        <div
                          key={sem.semester_no}
                          className="rounded-xl border border-border overflow-hidden bg-muted/20"
                        >
                          <div
                            onClick={() => setExpandedSem(isExpanded ? null : sem.semester_no)}
                            className="flex items-center justify-between p-3 cursor-pointer bg-card hover:bg-muted/40 transition-colors select-none"
                          >
                            <span className="text-xs font-bold text-foreground">
                              Semester {sem.semester_no}
                            </span>
                            <div className="flex items-center gap-2">
                              {sem.cgpa && (
                                <Badge variant="secondary" className="text-[11px] font-bold text-primary">
                                  CGPA: {sem.cgpa}
                                </Badge>
                              )}
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-3 border-t border-border space-y-3 bg-muted/10">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Semester CGPA / Total Marks</Label>
                                <Input
                                  placeholder="e.g. 8.4 CGPA or 450/500"
                                  value={sem.cgpa}
                                  onChange={(e) => updateSemesterCgpa(sIdx, e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>

                              <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-semibold">Semester Subjects</Label>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addSemesterSubject(sIdx)}
                                    className="text-[11px] h-7 px-2 gap-1"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Add Subject
                                  </Button>
                                </div>

                                {(sem.subjects || []).length === 0 ? (
                                  <p className="text-[11px] text-muted-foreground italic">
                                    No subjects added for Semester {sem.semester_no}.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {sem.subjects.map((sub, subIdx) => (
                                      <div
                                        key={subIdx}
                                        className="p-2 rounded-lg border border-border/80 bg-card space-y-2"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Input
                                            placeholder="Subject Name (e.g. Core English)"
                                            value={sub.subject_name}
                                            onChange={(e) =>
                                              updateSemesterSubject(
                                                sIdx,
                                                subIdx,
                                                'subject_name',
                                                e.target.value
                                              )
                                            }
                                            className="h-8 text-xs flex-1"
                                          />
                                          <Input
                                            placeholder="Mark/Grade"
                                            value={sub.grade_or_mark}
                                            onChange={(e) =>
                                              updateSemesterSubject(
                                                sIdx,
                                                subIdx,
                                                'grade_or_mark',
                                                e.target.value
                                              )
                                            }
                                            className="h-8 text-xs w-24"
                                          />
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeSemesterSubject(sIdx, subIdx)}
                                            className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>

                                        <div className="flex items-center gap-2 text-[11px]">
                                          <span className="text-muted-foreground font-medium">
                                            Status:
                                          </span>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={sub.status === 'passed' ? 'default' : 'outline'}
                                            onClick={() =>
                                              updateSemesterSubject(sIdx, subIdx, 'status', 'passed')
                                            }
                                            className={`h-6 px-2 text-[10px] ${
                                              sub.status === 'passed'
                                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                                : ''
                                            }`}
                                          >
                                            Passed
                                          </Button>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={
                                              sub.status === 'failed' ? 'destructive' : 'outline'
                                            }
                                            onClick={() =>
                                              updateSemesterSubject(sIdx, subIdx, 'status', 'failed')
                                            }
                                            className="h-6 px-2 text-[10px]"
                                          >
                                            Failed
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="px-6 py-3 border-t border-border flex items-center justify-end gap-2 bg-muted/20">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="text-xs h-9 min-w-28 gap-1.5">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {record ? 'Update Record' : 'Save Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
