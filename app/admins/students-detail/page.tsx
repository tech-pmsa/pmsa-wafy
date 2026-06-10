// app/admins/students-detail/page.tsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { toast } from 'sonner';

// Import UI components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentCard } from '@/components/admin/manage-students/StudentCard';
import { ViewStudentModal } from '@/components/admin/manage-students/ViewStudentModal';
import { StudentProfile } from '@/app/admins/manage-students/page';
import {
  GraduationCap,
  Sparkles,
  Layers3,
  Users,
  Search,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

export default function StudentsDetailPage() {
  const { role: authRole, details: authDetails, loading: authLoading } = useUserData();

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeClass, setActiveClass] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('students').select('*');

      // Staff role can see all. If role is 'class', restrict by class leader's batch.
      if (authRole === 'class' && authDetails?.batch) {
        query = query.eq('batch', authDetails.batch);
      }

      const { data, error } = await query
        .order('class_id', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setStudents((data as StudentProfile[]) || []);
    } catch (err: any) {
      toast.error('Failed to load students', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [authRole, authDetails]);

  useEffect(() => {
    if (!authLoading && authRole) {
      fetchData();
    }
  }, [authLoading, authRole, fetchData]);

  const handleViewClick = (student: StudentProfile) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.cic?.toLowerCase().includes(q) ||
        s.class_id?.toLowerCase().includes(q) ||
        s.batch?.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const groupedStudents = useMemo(() => {
    return filteredStudents.reduce((acc: Record<string, StudentProfile[]>, student) => {
      const key = student.class_id || 'Unassigned';
      if (!acc[key]) acc[key] = [];
      acc[key].push(student);
      return acc;
    }, {});
  }, [filteredStudents]);

  const classKeys = useMemo(() => Object.keys(groupedStudents).sort(), [groupedStudents]);

  useEffect(() => {
    if (classKeys.length > 0 && !classKeys.includes(activeClass)) {
      setActiveClass(classKeys[0]);
    }
    if (classKeys.length === 0) {
      setActiveClass('');
    }
  }, [classKeys, activeClass]);

  const summary = useMemo(() => {
    return {
      total: students.length,
      filtered: filteredStudents.length,
      classes: classKeys.length,
    };
  }, [students.length, filteredStudents.length, classKeys.length]);

  const visibleStudents = useMemo(() => {
    if (!activeClass) return [];
    return groupedStudents[activeClass] || [];
  }, [groupedStudents, activeClass]);

  if (authLoading || loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-300">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-8 w-48 rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="flex gap-2 overflow-hidden">
          <Skeleton className="h-10 w-24 rounded-full shrink-0" />
          <Skeleton className="h-10 w-24 rounded-full shrink-0" />
          <Skeleton className="h-10 w-24 rounded-full shrink-0" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Header and navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-border/80 hover:bg-muted/80 transition-colors shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-full text-xs font-bold shadow-sm">
              <Sparkles className="h-3 w-3 shrink-0" />
              <span>Read Only Access</span>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold font-heading tracking-tight flex items-center gap-2.5">
            <GraduationCap className="h-8 w-8 text-primary" />
            Student Details
          </h1>
          <p className="text-sm text-muted-foreground font-semibold">
            Search, browse by class, and view full student profile snapshots.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/60 shadow-sm bg-card/45 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold font-heading tracking-tight">{summary.total}</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Students</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm bg-card/45 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
              <Search className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold font-heading tracking-tight">{summary.filtered}</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Search Results</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm bg-card/45 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 shrink-0">
              <Layers3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold font-heading tracking-tight">{summary.classes}</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Classes Found</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search students by name, CIC registration number, class, or batch..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 rounded-xl border-border/80 bg-background/50 focus-visible:ring-primary font-semibold text-sm shadow-sm"
        />
      </div>

      {classKeys.length > 0 ? (
        <div className="space-y-6">
          {/* Class Navigation Tabs */}
          <div className="flex flex-wrap gap-2 pb-2 border-b border-border/40">
            {classKeys.map((classId) => {
              const isActive = activeClass === classId;
              const count = groupedStudents[classId]?.length || 0;
              return (
                <button
                  key={classId}
                  onClick={() => setActiveClass(classId)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all duration-200 ${
                    isActive
                      ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/25 scale-102'
                      : 'bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>Class {classId}</span>
                  <span
                    className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-extrabold border ${
                      isActive
                        ? 'bg-primary-foreground/20 border-primary-foreground/10 text-primary-foreground'
                        : 'bg-muted border-border text-muted-foreground'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Class Header & Card List */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-muted/40 p-4 rounded-2xl border border-border/40">
              <div>
                <h3 className="text-lg font-bold font-heading text-foreground">
                  Class: {activeClass}
                </h3>
                <p className="text-xs text-muted-foreground font-semibold">
                  Showing {visibleStudents.length} student{visibleStudents.length === 1 ? '' : 's'} assigned to this classroom
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleStudents.map((student) => (
                <StudentCard
                  key={student.uid}
                  student={student}
                  onView={handleViewClick}
                  readOnly
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Card className="border-dashed py-16 text-center shadow-none rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold font-heading">No Students Found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto font-medium">
                We couldn't find any student matches for your current filters or query. Try searching for something else.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Student Modal */}
      <ViewStudentModal
        isOpen={isViewModalOpen}
        setIsOpen={setIsViewModalOpen}
        student={selectedStudent}
      />
    </div>
  );
}
