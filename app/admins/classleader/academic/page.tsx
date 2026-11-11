'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GraduationCap,
  Plus,
  BookOpen,
  Award,
  School,
  Search,
  User,
  FileQuestion,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import {
  AcademicRecord,
  AcademicType,
  ACADEMIC_TABS,
  isFoundationUser,
} from '@/lib/academicUtils';
import { AcademicCard } from '@/components/academic/AcademicCard';
import { AcademicFormModal } from '@/components/academic/AcademicFormModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type StudentOption = {
  uid: string;
  name: string;
  cic: string | null;
  class_id: string | null;
  batch: string | null;
};

export default function ClassLeaderAcademicPage() {
  const { details, loading: userLoading } = useUserData();

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentUid, setSelectedStudentUid] = useState<string>('');
  const [searchStudent, setSearchStudent] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<AcademicType>('+1');
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AcademicRecord | null>(null);

  const isFoundation = isFoundationUser(details);

  // 1. Fetch all students in the class leader's class/batch
  useEffect(() => {
    let isMounted = true;
    async function loadStudents() {
      if (userLoading || !details) return;
      setStudentsLoading(true);
      try {
        const batchKeys = new Set<string>();
        if (details.batch) {
          batchKeys.add(details.batch);
          batchKeys.add(`${details.batch} Class`);
        }
        if (details.designation) {
          batchKeys.add(details.designation);
          batchKeys.add(details.designation.replace(/\s+Class$/i, ''));
          batchKeys.add(`${details.designation} Class`);
        }

        const keys = Array.from(batchKeys).filter(Boolean);

        const [byBatchRes, byClassRes] = await Promise.all([
          supabase
            .from('students')
            .select('uid, name, cic, class_id, batch')
            .in('batch', keys.length ? keys : [details.batch || ''])
            .order('name'),
          supabase
            .from('students')
            .select('uid, name, cic, class_id, batch')
            .in('class_id', keys.length ? keys : [details.batch || ''])
            .order('name'),
        ]);

        const studentMap = new Map<string, StudentOption>();
        [...(byBatchRes.data || []), ...(byClassRes.data || [])].forEach((s: any) => {
          if (s?.uid) {
            studentMap.set(s.uid, {
              uid: s.uid,
              name: s.name,
              cic: s.cic,
              class_id: s.class_id,
              batch: s.batch,
            });
          }
        });

        const list = Array.from(studentMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        if (!isMounted) return;
        setStudents(list);
        if (list.length > 0) {
          setSelectedStudentUid((prev) => prev || list[0].uid);
        }
      } catch (err: any) {
        console.error('Failed to load class students:', err);
      } finally {
        if (isMounted) setStudentsLoading(false);
      }
    }

    loadStudents();
    return () => {
      isMounted = false;
    };
  }, [userLoading, details]);

  // 2. Fetch academic records for the selected student
  const fetchRecords = useCallback(async () => {
    if (!selectedStudentUid) {
      setRecords([]);
      return;
    }
    setRecordsLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_academics')
        .select('*')
        .eq('student_uid', selectedStudentUid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords((data || []) as AcademicRecord[]);
    } catch (err: any) {
      console.error('Failed to load records for student:', err);
      toast.error('Failed to load academic records', { description: err.message });
    } finally {
      setRecordsLoading(false);
    }
  }, [selectedStudentUid]);

  useEffect(() => {
    fetchRecords();
  }, [selectedStudentUid, fetchRecords]);

  // Selected student object
  const currentStudent = students.find((s) => s.uid === selectedStudentUid) || null;

  // Filter students based on search input
  const filteredStudents = useMemo(() => {
    if (!searchStudent.trim()) return students;
    const q = searchStudent.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.cic && s.cic.toLowerCase().includes(q))
    );
  }, [students, searchStudent]);

  // Current tab records
  const currentTabRecords = records.filter((r) => r.academic_type === activeTab);

  const getTabCount = (type: AcademicType) =>
    records.filter((r) => r.academic_type === type).length;

  const handleDelete = async (rec: AcademicRecord) => {
    if (!rec.id) return;
    try {
      const { error } = await supabase
        .from('student_academics')
        .delete()
        .eq('id', rec.id);

      if (error) throw error;
      toast.success('Academic record deleted.');
      fetchRecords();
    } catch (err: any) {
      toast.error('Delete failed', { description: err.message });
    }
  };

  const openAddModal = () => {
    if (!currentStudent) {
      toast.error('Please select a student first.');
      return;
    }
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rec: AcademicRecord) => {
    setEditingRecord(rec);
    setIsModalOpen(true);
  };

  if (userLoading || studentsLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-xs text-muted-foreground">Loading academic portal...</p>
      </div>
    );
  }

  if (isFoundation) {
    return (
      <Card className="max-w-xl mx-auto my-12 border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-3">
          <FileQuestion className="h-12 w-12 text-muted-foreground/60" />
          <h2 className="text-lg font-bold text-foreground">Academic Not Applicable</h2>
          <p className="text-xs text-muted-foreground max-w-sm">
            Academic records (+1, +2, Degree, Diploma) are not required for Foundation classes.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentTabObj = ACADEMIC_TABS.find((t) => t.key === activeTab);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Class Academic Management</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage +1, +2, Degree, and Diploma records for your class students.
          </p>
        </div>

        <Button
          onClick={openAddModal}
          disabled={!currentStudent}
          className="gap-1.5 text-xs h-9"
        >
          <Plus className="h-4 w-4" />
          Add New Record
        </Button>
      </div>

      {/* Student Selector Card */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search student by name or CIC..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Student selection chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {filteredStudents.map((st) => {
              const isSelected = st.uid === selectedStudentUid;
              return (
                <button
                  key={st.uid}
                  type="button"
                  onClick={() => setSelectedStudentUid(st.uid)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background hover:bg-muted/60 text-foreground border-border'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[120px]">{st.name}</span>
                  {st.cic && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {st.cic}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Student Info Banner */}
      {currentStudent && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">{currentStudent.name}</h3>
            <p className="text-xs text-muted-foreground">
              CIC: {currentStudent.cic || '-'} | Class: {currentStudent.class_id || currentStudent.batch || '-'}
            </p>
          </div>
          <Badge variant="secondary" className="w-fit font-semibold text-xs">
            {records.length} Total Records
          </Badge>
        </div>
      )}

      {/* Main Tabs Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Side: Vertical Tabs */}
        <div className="md:col-span-1 space-y-2">
          {ACADEMIC_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = getTabCount(tab.key);
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-card border-primary text-primary shadow-sm ring-1 ring-primary/20'
                    : 'bg-card/50 hover:bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.key === 'degree' ? (
                      <GraduationCap className="h-4 w-4" />
                    ) : tab.key === 'diploma' ? (
                      <Award className="h-4 w-4" />
                    ) : (
                      <School className="h-4 w-4" />
                    )}
                  </div>
                  <span>{tab.label}</span>
                </div>
                <Badge
                  variant={isActive ? 'default' : 'secondary'}
                  className="text-[11px] h-5 px-1.5"
                >
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Right Side: Tab Records List */}
        <div className="md:col-span-3 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground">
                {currentTabObj?.badgeLabel || activeTab}
              </h2>
              <p className="text-xs text-muted-foreground">
                {currentTabRecords.length}{' '}
                {currentTabRecords.length === 1 ? 'record' : 'records'} found
              </p>
            </div>

            {currentTabRecords.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={openAddModal}
                className="text-xs h-8 gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Record
              </Button>
            )}
          </div>

          {recordsLoading ? (
            <div className="flex h-48 flex-col items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="mt-2 text-xs text-muted-foreground">Loading records...</p>
            </div>
          ) : currentTabRecords.length === 0 ? (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                <BookOpen className="h-10 w-10 text-muted-foreground/60" />
                <h3 className="text-sm font-bold text-foreground">No {activeTab} Records</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  No {activeTab} academic data recorded for {currentStudent?.name || 'this student'}.
                </p>
                <Button size="sm" onClick={openAddModal} className="text-xs gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add {activeTab} Record
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {currentTabRecords.map((record) => (
                <AcademicCard
                  key={record.id}
                  record={record}
                  canEdit={true}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && currentStudent && (
        <AcademicFormModal
          visible={isModalOpen}
          academicType={activeTab}
          record={editingRecord}
          student={{
            uid: currentStudent.uid,
            name: currentStudent.name,
            cic: currentStudent.cic,
            class_id: currentStudent.class_id,
            batch: currentStudent.batch,
          }}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRecord(null);
          }}
          onSaved={() => {
            fetchRecords();
          }}
        />
      )}
    </div>
  );
}
