'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  GraduationCap,
  Plus,
  BookOpen,
  Award,
  School,
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function StudentAcademicPage() {
  const { user, details, loading: userLoading } = useUserData();

  const [activeTab, setActiveTab] = useState<AcademicType>('+1');
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AcademicRecord | null>(null);

  const isFoundation = isFoundationUser(details);

  const fetchRecords = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_academics')
        .select('*')
        .eq('student_uid', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords((data || []) as AcademicRecord[]);
    } catch (err: any) {
      console.error('Failed to load academic records:', err);
      toast.error('Failed to load academic records', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!userLoading && user?.id) {
      fetchRecords();
    }
  }, [userLoading, user?.id, fetchRecords]);

  // Delete record handler
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
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rec: AcademicRecord) => {
    setEditingRecord(rec);
    setIsModalOpen(true);
  };

  // Filter records for active tab
  const currentTabRecords = records.filter((r) => r.academic_type === activeTab);

  // Tab counts
  const getTabCount = (type: AcademicType) =>
    records.filter((r) => r.academic_type === type).length;

  if (userLoading || (loading && !records.length)) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-xs text-muted-foreground">Loading your academic records...</p>
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
            Academic records (+1, +2, Degree, Diploma) are not required for Foundation students.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentTabObj = ACADEMIC_TABS.find((t) => t.key === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Academic Records</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your +1, +2, Degree, and Diploma education history.
          </p>
        </div>

        <Button onClick={openAddModal} className="gap-1.5 text-xs h-9">
          <Plus className="h-4 w-4" />
          Add New Record
        </Button>
      </div>

      {/* Main Container: Vertical Tabs on Left & Content on Right */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Side: Tabs */}
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

        {/* Right Side: Content Area */}
        <div className="md:col-span-3 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground">
                {currentTabObj?.badgeLabel || activeTab}
              </h2>
              <p className="text-xs text-muted-foreground">
                {currentTabRecords.length}{' '}
                {currentTabRecords.length === 1 ? 'record' : 'records'} recorded
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
                Add
              </Button>
            )}
          </div>

          {/* Cards List or Empty State */}
          {currentTabRecords.length === 0 ? (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                <BookOpen className="h-10 w-10 text-muted-foreground/60" />
                <h3 className="text-sm font-bold text-foreground">No {activeTab} Records</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  You have not added any {activeTab} academic data yet. Click below to add your details.
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

      {/* Form Modal */}
      {isModalOpen && user && (
        <AcademicFormModal
          visible={isModalOpen}
          academicType={activeTab}
          record={editingRecord}
          student={{
            uid: user.id,
            name: details?.name || 'Student',
            cic: details?.cic || null,
            class_id: details?.class_id || null,
            batch: details?.batch || null,
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
