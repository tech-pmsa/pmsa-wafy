'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  School,
  Calendar,
  MapPin,
  BookOpen,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Award,
  Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { AcademicRecord, ACADEMIC_SCHEMES } from '@/lib/academicUtils';

interface AcademicCardProps {
  record: AcademicRecord;
  showStudent?: boolean;
  canEdit?: boolean;
  onEdit?: (record: AcademicRecord) => void;
  onDelete?: (record: AcademicRecord) => void;
}

export function AcademicCard({
  record,
  showStudent = false,
  canEdit = false,
  onEdit,
  onDelete,
}: AcademicCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isDegree = record.academic_type === 'degree';
  const title = isDegree
    ? `${record.course_name || 'Degree'}${
        record.course_specialisation ? ` - ${record.course_specialisation}` : ''
      }`
    : record.stream
    ? `${record.stream} Stream`
    : record.course_name || record.academic_type.toUpperCase();

  const institutionName = record.school_name || record.university || 'Not Specified';
  const location = record.school_location;

  const resultStatus = (record.result || record.degree_status || '').toLowerCase();
  const isPassed = resultStatus === 'passed' || resultStatus === 'completed';
  const isFailed =
    resultStatus === 'failed' ||
    resultStatus === 'arrear/backlog' ||
    resultStatus === 'discontinued';
  const isAppearing =
    resultStatus === 'appearing' ||
    resultStatus === 'studying' ||
    resultStatus === 'result awaited';

  const schemeInfo = ACADEMIC_SCHEMES.find((s) => s.value === record.academic_scheme);

  return (
    <Card className="overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Student Banner (Optional) */}
        {showStudent && (
          <div className="flex items-center justify-between bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-semibold">
            <span>{record.student_name}</span>
            {record.student_cic && <span>CIC: {record.student_cic}</span>}
          </div>
        )}

        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {isDegree ? (
                <GraduationCap className="h-5 w-5" />
              ) : record.academic_type === 'diploma' ? (
                <Award className="h-5 w-5" />
              ) : (
                <School className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground leading-snug">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {record.academic_type === '+1'
                  ? 'Higher Secondary (+1)'
                  : record.academic_type === '+2'
                  ? 'Higher Secondary (+2)'
                  : record.academic_type === 'degree'
                  ? `${record.degree_level || 'Degree'} Programme`
                  : 'Diploma / Certificate Course'}
              </p>
            </div>
          </div>

          {/* Result Badge */}
          <div>
            <Badge
              variant="outline"
              className={
                isPassed
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold'
                  : isFailed
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-semibold'
                  : isAppearing
                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 font-semibold'
                  : 'bg-muted text-muted-foreground font-semibold'
              }
            >
              {(record.result || record.degree_status || 'Recorded').toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Key Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-3 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-2 truncate">
            <School className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-foreground font-medium">{institutionName}</span>
          </div>

          {location && (
            <div className="flex items-center gap-2 truncate">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}

          {(record.academic_year || record.admission_year) && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>
                {isDegree
                  ? `Adm Year: ${record.admission_year || '-'}`
                  : `Year: ${record.academic_year || '-'}`}
              </span>
            </div>
          )}

          {(record.board || record.university) && (
            <div className="flex items-center gap-2 truncate">
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{record.board || record.university}</span>
            </div>
          )}

          {record.study_mode && (
            <div className="flex items-center gap-2">
              <Award className="h-3.5 w-3.5 shrink-0" />
              <span>Mode: {record.study_mode}</span>
            </div>
          )}

          {record.school_type && (
            <div className="flex items-center gap-2">
              <School className="h-3.5 w-3.5 shrink-0" />
              <span>Type: {record.school_type}</span>
            </div>
          )}

          {isDegree && record.academic_scheme && (
            <div className="flex items-center gap-2 sm:col-span-2 text-primary font-medium">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>Scheme: {record.academic_scheme}</span>
            </div>
          )}
        </div>

        {/* Scheme Description (Degree) */}
        {isDegree && schemeInfo?.desc && (
          <div className="bg-primary/5 border-l-4 border-primary p-2.5 rounded-md text-xs text-muted-foreground leading-relaxed">
            {schemeInfo.desc}
          </div>
        )}

        {/* Expand / Collapse Button */}
        {((!isDegree && (record.subjects?.length ?? 0) > 0) ||
          (isDegree && (record.semester_data?.length ?? 0) > 0)) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-primary hover:bg-primary/5 py-1.5 h-auto rounded-lg"
          >
            <span>
              {expanded
                ? 'Hide Details'
                : isDegree
                ? `View Semesters (${record.semester_data?.length || 0})`
                : `View Subjects (${record.subjects?.length || 0})`}
            </span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}

        {/* Expanded Content */}
        {expanded && (
          <div className="space-y-4 pt-2">
            {/* Non-Degree Subjects */}
            {!isDegree && record.subjects && record.subjects.length > 0 && (
              <div className="bg-muted/40 rounded-xl p-3 border border-border/60 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Subjects & Marks
                </h4>
                <div className="divide-y divide-border/60">
                  {record.subjects.map((sub, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{sub.subject_name}</p>
                        <p className="text-muted-foreground text-[11px]">
                          Mark/Grade: {sub.grade_or_mark || 'N/A'}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          sub.status === 'passed'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[10px]'
                        }
                      >
                        {sub.status.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Degree Semesters */}
            {isDegree && record.semester_data && record.semester_data.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Semester Breakdown
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {record.semester_data.map((sem, sIdx) => (
                    <div
                      key={sIdx}
                      className="bg-muted/30 border border-border/70 rounded-xl p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          Semester {sem.semester_no}
                        </span>
                        {sem.cgpa && (
                          <Badge variant="secondary" className="text-[11px] font-bold text-primary">
                            CGPA: {sem.cgpa}
                          </Badge>
                        )}
                      </div>

                      {sem.subjects && sem.subjects.length > 0 ? (
                        <div className="divide-y divide-border/40 pt-1">
                          {sem.subjects.map((sub, subIdx) => (
                            <div
                              key={subIdx}
                              className="flex items-center justify-between py-1.5 text-xs"
                            >
                              <span className="truncate pr-2 text-muted-foreground font-medium">
                                {sub.subject_name}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-semibold text-foreground text-[11px]">
                                  {sub.grade_or_mark || '-'}
                                </span>
                                <span
                                  className={`inline-flex items-center justify-center h-4 w-4 rounded text-[9px] font-bold ${
                                    sub.status === 'passed'
                                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {sub.status === 'passed' ? 'P' : 'F'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">
                          No subjects recorded for this semester.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions Row */}
        {canEdit && (
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit?.(record)}
              className="text-xs h-8 px-3 gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5 text-primary" />
              <span>Edit</span>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-3 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Academic Record</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to permanently delete this {record.academic_type} academic
                    record for {record.student_name}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete?.(record)}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    Delete Record
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
