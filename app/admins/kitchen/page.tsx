'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Search,
  AlertCircle,
  Users,
  Sun,
  UtensilsCrossed,
  MoonStar,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';

type ProfileRole = 'officer' | 'class' | 'class-leader' | 'staff' | string;

interface AdminProfile {
  uid: string;
  role: ProfileRole;
  name: string | null;
  batch: string | null;
  designation: string | null;
}

interface KitchenStudent {
  id: string;
  student_uid: string;
  name: string;
  cic: string | null;
  class_id: string;
  batch: string | null;
  council: string | null;
  phone: string | null;
  guardian: string | null;
  g_phone: string | null;
  address: string | null;
  img_url: string | null;
  day_present: boolean;
  noon_present: boolean;
  night_present: boolean;
  whole_day_present?: boolean;
  created_at?: string;
  updated_at?: string;
}

type AttendanceFilter =
  | 'all'
  | 'day_absent'
  | 'noon_absent'
  | 'night_absent'
  | 'whole_day_absent'
  | 'full_present';

const FILTER_OPTIONS: { value: AttendanceFilter; label: string }[] = [
  { value: 'all', label: 'All Students' },
  { value: 'day_absent', label: 'Day Absent' },
  { value: 'noon_absent', label: 'Noon Absent' },
  { value: 'night_absent', label: 'Night Absent' },
  { value: 'whole_day_absent', label: 'Whole Day Absent' },
  { value: 'full_present', label: 'Full Present' },
];

function getTeacherClassValue(profile: AdminProfile | null): { key: 'batch'; value: string | null } {
  if (!profile) return { key: 'batch', value: null };

  if (profile.batch?.trim()) {
    return { key: 'batch', value: profile.batch.trim() };
  }

  return { key: 'batch', value: null };
}

function getStudentStatus(student: KitchenStudent) {
  const absentCount = [student.day_present, student.noon_present, student.night_present].filter(Boolean).length;

  if (absentCount === 3) {
    return {
      label: 'Full Present',
      variant: 'default' as const,
      className: 'bg-green-600 hover:bg-green-600 text-white',
    };
  }

  if (!student.day_present && !student.noon_present && !student.night_present) {
    return {
      label: 'Full Absent',
      variant: 'destructive' as const,
      className: '',
    };
  }

  return {
    label: 'Partial',
    variant: 'secondary' as const,
    className: '',
  };
}

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold font-heading">{value}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function MealToggleButton({
  active,
  label,
  icon,
  loading,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'destructive'}
      size="sm"
      disabled={loading}
      onClick={onClick}
      className="min-w-[88px] justify-center"
    >
      <span className="mr-1.5">{icon}</span>
      {active ? `${label} P` : `${label} A`}
    </Button>
  );
}

function KitchenStudentCard({
  student,
  loading,
  onToggleMeal,
  onSetWholeDay,
}: {
  student: KitchenStudent;
  loading: boolean;
  onToggleMeal: (student: KitchenStudent, meal: 'day_present' | 'noon_present' | 'night_present') => Promise<void>;
  onSetWholeDay: (student: KitchenStudent, present: boolean) => Promise<void>;
}) {
  const status = getStudentStatus(student);

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-base sm:text-lg">{student.name}</CardTitle>
            <CardDescription className="mt-1 flex flex-wrap gap-2 text-xs sm:text-sm">
              <span>{student.cic || 'No CIC'}</span>
              <span>•</span>
              <span>{student.class_id}</span>
            </CardDescription>
          </div>
          <Badge variant={status.variant} className={status.className}>
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <MealToggleButton
            active={student.day_present}
            label="Day"
            icon={<Sun className="h-4 w-4" />}
            loading={loading}
            onClick={() => onToggleMeal(student, 'day_present')}
          />
          <MealToggleButton
            active={student.noon_present}
            label="Noon"
            icon={<UtensilsCrossed className="h-4 w-4" />}
            loading={loading}
            onClick={() => onToggleMeal(student, 'noon_present')}
          />
          <MealToggleButton
            active={student.night_present}
            label="Night"
            icon={<MoonStar className="h-4 w-4" />}
            loading={loading}
            onClick={() => onToggleMeal(student, 'night_present')}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onSetWholeDay(student, true)}
            className="border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Full Present
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onSetWholeDay(student, false)}
            className="border-red-600 text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Full Absent
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function KitchenAttendancePage() {
  const { user: authUser } = useUserData();

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [students, setStudents] = useState<KitchenStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<AttendanceFilter>('all');

  const [rowLoadingMap, setRowLoadingMap] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);

  const setRowLoading = (studentUid: string, value: boolean) => {
    setRowLoadingMap((prev) => ({ ...prev, [studentUid]: value }));
  };

  const fetchProfile = useCallback(async () => {
    if (!authUser?.id) return;

    setProfileLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('uid, role, name, batch, designation')
        .eq('uid', authUser.id)
        .single();

      if (error) throw error;

      setProfile(data as AdminProfile);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load profile');
      toast.error('Failed to load profile', { description: err.message });
    } finally {
      setProfileLoading(false);
    }
  }, [authUser?.id]);

  const fetchKitchenStudents = useCallback(async (currentProfile?: AdminProfile | null) => {
    const activeProfile = currentProfile ?? profile;
    if (!activeProfile) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('kitchen_students')
        .select('*')
        .order('name', { ascending: true });

      if (activeProfile.role === 'class') {
        const teacherClass = getTeacherClassValue(activeProfile);

        if (teacherClass.value) {
          query = query.eq(teacherClass.key, teacherClass.value);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      setStudents((data || []) as KitchenStudent[]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load kitchen students');
      toast.error('Failed to load kitchen students', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (authUser?.id) {
      fetchProfile();
    }
  }, [authUser?.id, fetchProfile]);

  useEffect(() => {
    if (profile) {
      fetchKitchenStudents(profile);
    }
  }, [profile, fetchKitchenStudents]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !q ||
        student.name.toLowerCase().includes(q) ||
        student.cic?.toLowerCase().includes(q) ||
        student.class_id.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      switch (filter) {
        case 'day_absent':
          return !student.day_present;
        case 'noon_absent':
          return !student.noon_present;
        case 'night_absent':
          return !student.night_present;
        case 'whole_day_absent':
          return !student.day_present && !student.noon_present && !student.night_present;
        case 'full_present':
          return student.day_present && student.noon_present && student.night_present;
        default:
          return true;
      }
    });
  }, [students, searchQuery, filter]);

  const groupedStudents = useMemo(() => {
    return filteredStudents.reduce<Record<string, KitchenStudent[]>>((acc, student) => {
      const key = student.class_id || 'Unassigned';
      if (!acc[key]) acc[key] = [];
      acc[key].push(student);
      return acc;
    }, {});
  }, [filteredStudents]);

  const summary = useMemo(() => {
    const base = filteredStudents.length ? filteredStudents : students;

    return {
      total: base.length,
      dayAbsent: base.filter((s) => !s.day_present).length,
      noonAbsent: base.filter((s) => !s.noon_present).length,
      nightAbsent: base.filter((s) => !s.night_present).length,
      fullAbsent: base.filter((s) => !s.day_present && !s.noon_present && !s.night_present).length,
      fullPresent: base.filter((s) => s.day_present && s.noon_present && s.night_present).length,
    };
  }, [filteredStudents, students]);

  const handleToggleMeal = async (
    student: KitchenStudent,
    meal: 'day_present' | 'noon_present' | 'night_present'
  ) => {
    setRowLoading(student.student_uid, true);

    const nextValue = !student[meal];

    try {
      const { error } = await supabase
        .from('kitchen_students')
        .update({ [meal]: nextValue })
        .eq('student_uid', student.student_uid);

      if (error) throw error;

      setStudents((prev) =>
        prev.map((s) => (s.student_uid === student.student_uid ? { ...s, [meal]: nextValue } : s))
      );

      toast.success(
        `${student.name} marked ${nextValue ? 'present' : 'absent'} for ${meal.replace('_present', '')}`
      );
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update attendance', { description: err.message });
    } finally {
      setRowLoading(student.student_uid, false);
    }
  };

  const handleSetWholeDay = async (student: KitchenStudent, present: boolean) => {
    setRowLoading(student.student_uid, true);

    try {
      const { error } = await supabase.rpc('set_student_whole_day_attendance', {
        p_student_uid: student.student_uid,
        p_present: present,
      });

      if (error) throw error;

      setStudents((prev) =>
        prev.map((s) =>
          s.student_uid === student.student_uid
            ? {
                ...s,
                day_present: present,
                noon_present: present,
                night_present: present,
              }
            : s
        )
      );

      toast.success(`${student.name} marked as ${present ? 'full present' : 'full absent'}`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update full-day attendance', { description: err.message });
    } finally {
      setRowLoading(student.student_uid, false);
    }
  };

  const handleClassMealBulk = async (
    classId: string,
    meal: 'day' | 'noon' | 'night',
    present: boolean
  ) => {
    setBulkLoading(true);

    try {
      const { error } = await supabase.rpc('set_class_meal_attendance', {
        p_class_id: classId,
        p_meal: meal,
        p_present: present,
      });

      if (error) throw error;

      setStudents((prev) =>
        prev.map((student) =>
          student.class_id === classId
            ? {
                ...student,
                ...(meal === 'day' ? { day_present: present } : {}),
                ...(meal === 'noon' ? { noon_present: present } : {}),
                ...(meal === 'night' ? { night_present: present } : {}),
              }
            : student
        )
      );

      toast.success(
        `${classId}: ${meal} marked ${present ? 'present' : 'absent'} for all students`
      );
    } catch (err: any) {
      console.error(err);
      toast.error('Bulk update failed', { description: err.message });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleClassWholeDayBulk = async (classId: string, present: boolean) => {
    setBulkLoading(true);

    try {
      const { error } = await supabase.rpc('set_class_whole_day_attendance', {
        p_class_id: classId,
        p_present: present,
      });

      if (error) throw error;

      setStudents((prev) =>
        prev.map((student) =>
          student.class_id === classId
            ? {
                ...student,
                day_present: present,
                noon_present: present,
                night_present: present,
              }
            : student
        )
      );

      toast.success(`${classId}: full class marked ${present ? 'present' : 'absent'}`);
    } catch (err: any) {
      console.error(err);
      toast.error('Bulk full-day update failed', { description: err.message });
    } finally {
      setBulkLoading(false);
    }
  };

  const renderClassSection = (classId: string, classStudents: KitchenStudent[]) => {
    const classSummary = {
      total: classStudents.length,
      dayAbsent: classStudents.filter((s) => !s.day_present).length,
      noonAbsent: classStudents.filter((s) => !s.noon_present).length,
      nightAbsent: classStudents.filter((s) => !s.night_present).length,
      fullAbsent: classStudents.filter((s) => !s.day_present && !s.noon_present && !s.night_present).length,
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold font-heading">{classId}</h2>
              <p className="text-sm text-muted-foreground">
                {classSummary.total} students • Day Absent {classSummary.dayAbsent} • Noon Absent{' '}
                {classSummary.noonAbsent} • Night Absent {classSummary.nightAbsent} • Full Absent{' '}
                {classSummary.fullAbsent}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={bulkLoading}
                onClick={() => handleClassWholeDayBulk(classId, true)}
                className="border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Full Present
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkLoading}
                onClick={() => handleClassWholeDayBulk(classId, false)}
                className="border-red-600 text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Full Absent
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={bulkLoading}
              variant="secondary"
              onClick={() => handleClassMealBulk(classId, 'day', true)}
            >
              <Sun className="mr-2 h-4 w-4" />
              Day Present
            </Button>
            <Button
              size="sm"
              disabled={bulkLoading}
              variant="destructive"
              onClick={() => handleClassMealBulk(classId, 'day', false)}
            >
              <Sun className="mr-2 h-4 w-4" />
              Day Absent
            </Button>

            <Button
              size="sm"
              disabled={bulkLoading}
              variant="secondary"
              onClick={() => handleClassMealBulk(classId, 'noon', true)}
            >
              <UtensilsCrossed className="mr-2 h-4 w-4" />
              Noon Present
            </Button>
            <Button
              size="sm"
              disabled={bulkLoading}
              variant="destructive"
              onClick={() => handleClassMealBulk(classId, 'noon', false)}
            >
              <UtensilsCrossed className="mr-2 h-4 w-4" />
              Noon Absent
            </Button>

            <Button
              size="sm"
              disabled={bulkLoading}
              variant="secondary"
              onClick={() => handleClassMealBulk(classId, 'night', true)}
            >
              <MoonStar className="mr-2 h-4 w-4" />
              Night Present
            </Button>
            <Button
              size="sm"
              disabled={bulkLoading}
              variant="destructive"
              onClick={() => handleClassMealBulk(classId, 'night', false)}
            >
              <MoonStar className="mr-2 h-4 w-4" />
              Night Absent
            </Button>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="grid grid-cols-1 gap-4 lg:hidden">
          {classStudents.map((student) => (
            <KitchenStudentCard
              key={student.student_uid}
              student={student}
              loading={!!rowLoadingMap[student.student_uid]}
              onToggleMeal={handleToggleMeal}
              onSetWholeDay={handleSetWholeDay}
            />
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-sm lg:block">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/60">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-semibold">Student</th>
                  <th className="px-4 py-3 text-left font-semibold">CIC</th>
                  <th className="px-4 py-3 text-left font-semibold">Class</th>
                  <th className="px-4 py-3 text-center font-semibold">Day</th>
                  <th className="px-4 py-3 text-center font-semibold">Noon</th>
                  <th className="px-4 py-3 text-center font-semibold">Night</th>
                  <th className="px-4 py-3 text-center font-semibold">Whole Day</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map((student) => {
                  const status = getStudentStatus(student);
                  const isLoading = !!rowLoadingMap[student.student_uid];

                  return (
                    <tr key={student.student_uid} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-medium">{student.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{student.cic || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{student.class_id}</td>

                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant={student.day_present ? 'secondary' : 'destructive'}
                          disabled={isLoading}
                          onClick={() => handleToggleMeal(student, 'day_present')}
                        >
                          {student.day_present ? 'Present' : 'Absent'}
                        </Button>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant={student.noon_present ? 'secondary' : 'destructive'}
                          disabled={isLoading}
                          onClick={() => handleToggleMeal(student, 'noon_present')}
                        >
                          {student.noon_present ? 'Present' : 'Absent'}
                        </Button>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant={student.night_present ? 'secondary' : 'destructive'}
                          disabled={isLoading}
                          onClick={() => handleToggleMeal(student, 'night_present')}
                        >
                          {student.night_present ? 'Present' : 'Absent'}
                        </Button>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isLoading}
                            onClick={() => handleSetWholeDay(student, true)}
                            className="border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                          >
                            Present
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isLoading}
                            onClick={() => handleSetWholeDay(student, false)}
                            className="border-red-600 text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            Absent
                          </Button>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <Badge variant={status.variant} className={status.className}>
                          {status.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const classKeys = useMemo(() => Object.keys(groupedStudents).sort(), [groupedStudents]);
  const teacherClassValue = getTeacherClassValue(profile);

  const pageDescription =
    profile?.role === 'class'
      ? `Manage day, noon, and night attendance for your class${
          teacherClassValue.value ? ` (${teacherClassValue.value})` : ''
        }.`
      : 'Manage kitchen attendance for all classes with class-wise bulk controls.';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading">Kitchen Attendance</h1>
          <p className="mt-1 text-muted-foreground">{pageDescription}</p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, CIC, class..."
              className="pl-9"
            />
          </div>

          <div className="w-full sm:w-[220px]">
            <Select value={filter} onValueChange={(value) => setFilter(value as AttendanceFilter)}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Filter" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => fetchKitchenStudents()}
            disabled={loading || profileLoading}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {profileLoading || loading ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 w-full rounded-2xl" />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              title="Total Students"
              value={summary.total}
              description="Current filtered or loaded students"
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              title="Day Absent"
              value={summary.dayAbsent}
              description="Breakfast absent count"
              icon={<Sun className="h-5 w-5" />}
            />
            <StatCard
              title="Noon Absent"
              value={summary.noonAbsent}
              description="Meal absent count"
              icon={<UtensilsCrossed className="h-5 w-5" />}
            />
            <StatCard
              title="Night Absent"
              value={summary.nightAbsent}
              description="Dinner absent count"
              icon={<MoonStar className="h-5 w-5" />}
            />
            <StatCard
              title="Full Absent"
              value={summary.fullAbsent}
              description="Absent in all three times"
              icon={<XCircle className="h-5 w-5" />}
            />
          </div>

          {students.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="mb-4 h-10 w-10 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No kitchen students found</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Check whether your kitchen tables were created and whether student data was synced
                  into <code>kitchen_students</code>.
                </p>
              </CardContent>
            </Card>
          ) : profile?.role === 'officer' ? (
            <Tabs defaultValue={classKeys[0] || ''} className="w-full">
              <div className="overflow-x-auto pb-2">
                <TabsList className="inline-flex h-auto min-w-max gap-2 rounded-2xl p-1">
                  {classKeys.map((classId) => (
                    <TabsTrigger key={classId} value={classId} className="rounded-xl px-4 py-2">
                      {classId}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {classKeys.map((classId) => (
                <TabsContent key={classId} value={classId} className="mt-6">
                  {renderClassSection(classId, groupedStudents[classId])}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            renderClassSection(teacherClassValue.value || 'My Class', filteredStudents)
          )}
        </>
      )}
    </div>
  );
}