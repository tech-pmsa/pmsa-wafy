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

import {
  fetchKitchenAttendanceForDate,
  formatKitchenDateLabel,
  getIstTodayDateValue,
  getKitchenDateOptions,
  KitchenAttendanceStudent,
  KitchenMeal,
  setKitchenAttendanceRange,
} from '@/lib/kitchenAttendance';

type ProfileRole = 'officer' | 'class' | 'class-leader' | 'staff' | string;

interface AdminProfile {
  uid: string;
  role: ProfileRole;
  name: string | null;
  batch: string | null;
  designation: string | null;
}

type KitchenStudent = KitchenAttendanceStudent;

type AttendanceFilter =
  | 'all'
  | 'day_absent'
  | 'noon_absent'
  | 'night_absent'
  | 'whole_day_absent'
  | 'full_present';

const FILTER_OPTIONS: { value: AttendanceFilter; label: string }[] = [
  { value: 'all', label: 'All Students' },
  { value: 'day_absent', label: 'Breakfast Absent' },
  { value: 'noon_absent', label: 'Lunch Absent' },
  { value: 'night_absent', label: 'Dinner Absent' },
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
  const presentCount = [student.day_present, student.noon_present, student.night_present].filter(Boolean).length;

  if (presentCount === 3) {
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
            label="Breakfast"
            icon={<Sun className="h-4 w-4" />}
            loading={loading}
            onClick={() => onToggleMeal(student, 'day_present')}
          />
          <MealToggleButton
            active={student.noon_present}
            label="Lunch"
            icon={<UtensilsCrossed className="h-4 w-4" />}
            loading={loading}
            onClick={() => onToggleMeal(student, 'noon_present')}
          />
          <MealToggleButton
            active={student.night_present}
            label="Dinner"
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
  const [activeTab, setActiveTab] = useState<string>('');

  const [selectedDate, setSelectedDate] = useState(getIstTodayDateValue());
  const [rangeFromDate, setRangeFromDate] = useState(getIstTodayDateValue());
  const [rangeToDate, setRangeToDate] = useState(getIstTodayDateValue());

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

  const fetchKitchenStudents = useCallback(async (currentProfile?: AdminProfile | null, dateValue = selectedDate) => {
    const activeProfile = currentProfile ?? profile;
    if (!activeProfile) return;

    setLoading(true);
    setError(null);

    try {
      let data = await fetchKitchenAttendanceForDate(dateValue);

      if (activeProfile.role === 'class') {
        const teacherClass = getTeacherClassValue(activeProfile);

        if (teacherClass.value) {
          data = data.filter((student) => student.batch === teacherClass.value);
        }
      }

      setStudents(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load kitchen students');
      toast.error('Failed to load kitchen students', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [profile, selectedDate]);

  useEffect(() => {
    if (authUser?.id) {
      fetchProfile();
    }
  }, [authUser?.id, fetchProfile]);

  useEffect(() => {
    if (profile) {
      fetchKitchenStudents(profile, selectedDate);
    }
  }, [profile, selectedDate, fetchKitchenStudents]);

  useEffect(() => {
    setRangeFromDate(selectedDate);
    setRangeToDate(selectedDate);
  }, [selectedDate]);

  const dateOptions = useMemo(() => getKitchenDateOptions(), []);
  const selectedDateLabel = useMemo(() => formatKitchenDateLabel(selectedDate), [selectedDate]);
  
  const rangeLabel = useMemo(() => {
    if (rangeFromDate === rangeToDate) return formatKitchenDateLabel(rangeFromDate);
    return `${formatKitchenDateLabel(rangeFromDate)} to ${formatKitchenDateLabel(rangeToDate)}`;
  }, [rangeFromDate, rangeToDate]);

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

  const classKeys = useMemo(() => Object.keys(groupedStudents).sort(), [groupedStudents]);

  useEffect(() => {
    if (profile?.role === 'officer' && classKeys.length > 0 && (!activeTab || !classKeys.includes(activeTab))) {
      setActiveTab(classKeys[0]);
    }
  }, [classKeys, profile?.role, activeTab]);

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

  const validateAttendanceDateRange = () => {
    if (rangeFromDate > rangeToDate) {
      toast.error('Invalid Range', { description: 'The from date must be before or equal to the to date.' });
      return false;
    }
    return true;
  };

  const handleToggleMeal = async (
    student: KitchenStudent,
    meal: 'day_present' | 'noon_present' | 'night_present'
  ) => {
    if (!validateAttendanceDateRange()) return;

    setRowLoading(student.student_uid, true);

    const nextValue = !student[meal];
    const mealName: KitchenMeal = meal === 'day_present' ? 'day' : meal === 'noon_present' ? 'noon' : 'night';

    try {
      await setKitchenAttendanceRange({
        studentUids: [student.student_uid],
        fromDate: rangeFromDate,
        toDate: rangeToDate,
        meals: [mealName],
        present: nextValue,
      });

      if (selectedDate >= rangeFromDate && selectedDate <= rangeToDate) {
        setStudents((prev) =>
          prev.map((s) => (s.student_uid === student.student_uid ? { ...s, [meal]: nextValue } : s))
        );
      }

      toast.success(
        `${student.name} marked ${nextValue ? 'present' : 'absent'} for ${mealName}`
      );
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update attendance', { description: err.message });
    } finally {
      setRowLoading(student.student_uid, false);
    }
  };

  const handleSetWholeDay = async (student: KitchenStudent, present: boolean) => {
    if (!validateAttendanceDateRange()) return;

    setRowLoading(student.student_uid, true);

    try {
      await setKitchenAttendanceRange({
        studentUids: [student.student_uid],
        fromDate: rangeFromDate,
        toDate: rangeToDate,
        meals: ['day', 'noon', 'night'],
        present,
      });

      if (selectedDate >= rangeFromDate && selectedDate <= rangeToDate) {
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
      }

      toast.success(`${student.name} marked as ${present ? 'full present' : 'full absent'}`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update full-day attendance', { description: err.message });
    } finally {
      setRowLoading(student.student_uid, false);
    }
  };

  const getBulkTargetStudents = (classId?: string) => {
    if (profile?.role === 'officer') {
      return classId ? students.filter((s) => s.class_id === classId) : [];
    }

    if (profile?.role === 'class') {
      const teacherBatch = getTeacherClassValue(profile).value;
      return students.filter((s) => s.batch === teacherBatch);
    }

    return [];
  };

  const getBulkTargetIds = (classId?: string) => {
    return getBulkTargetStudents(classId)
      .map((s) => s.student_uid)
      .filter(Boolean);
  };

  const getBulkScopeLabel = (classId?: string) => {
    if (profile?.role === 'officer') {
      return classId ? `students in ${classId}` : 'students in this class';
    }

    if (profile?.role === 'class') {
      const teacherBatch = getTeacherClassValue(profile).value;
      return teacherBatch ? `all students in ${teacherBatch}` : 'your batch students';
    }

    return 'selected students';
  };

  const handleBulkMealUpdate = async (
    meal: KitchenMeal,
    present: boolean,
    classId?: string
  ) => {
    if (!validateAttendanceDateRange()) return;

    const targetIds = getBulkTargetIds(classId);
    if (targetIds.length === 0) {
      toast.error('No students found for bulk update.');
      return;
    }

    const scopeLabel = getBulkScopeLabel(classId);
    
    const confirmed = window.confirm(
      `Mark ${meal} as ${present ? 'Present' : 'Absent'} for ${scopeLabel} from ${rangeLabel}?`
    );
    if (!confirmed) return;

    setBulkLoading(true);

    try {
      await setKitchenAttendanceRange({
        studentUids: targetIds,
        fromDate: rangeFromDate,
        toDate: rangeToDate,
        meals: [meal],
        present,
      });

      if (selectedDate >= rangeFromDate && selectedDate <= rangeToDate) {
        setStudents((prev) =>
          prev.map((s) =>
            targetIds.includes(s.student_uid)
              ? {
                  ...s,
                  ...(meal === 'day' ? { day_present: present } : {}),
                  ...(meal === 'noon' ? { noon_present: present } : {}),
                  ...(meal === 'night' ? { night_present: present } : {}),
                }
              : s
          )
        );
      }

      toast.success(
        `${classId || 'Class'}: ${meal} marked ${present ? 'present' : 'absent'} for ${targetIds.length} students`
      );
    } catch (err: any) {
      console.error(err);
      toast.error('Bulk update failed', { description: err.message });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkWholeDayUpdate = async (present: boolean, classId?: string) => {
    if (!validateAttendanceDateRange()) return;

    const targetIds = getBulkTargetIds(classId);
    if (targetIds.length === 0) {
      toast.error('No students found for bulk update.');
      return;
    }

    const scopeLabel = getBulkScopeLabel(classId);
    const confirmed = window.confirm(
      `Mark ${scopeLabel} as Full ${present ? 'Present' : 'Absent'} from ${rangeLabel}?`
    );
    if (!confirmed) return;

    setBulkLoading(true);

    try {
      await setKitchenAttendanceRange({
        studentUids: targetIds,
        fromDate: rangeFromDate,
        toDate: rangeToDate,
        meals: ['day', 'noon', 'night'],
        present,
      });

      if (selectedDate >= rangeFromDate && selectedDate <= rangeToDate) {
        setStudents((prev) =>
          prev.map((s) =>
            targetIds.includes(s.student_uid)
              ? {
                  ...s,
                  day_present: present,
                  noon_present: present,
                  night_present: present,
                }
              : s
          )
        );
      }

      toast.success(`${classId || 'Class'} full class marked ${present ? 'present' : 'absent'} (${targetIds.length} students)`);
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
                {classSummary.total} students • Breakfast Absent {classSummary.dayAbsent} • Lunch Absent{' '}
                {classSummary.noonAbsent} • Dinner Absent {classSummary.nightAbsent} • Full Absent{' '}
                {classSummary.fullAbsent}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={bulkLoading}
                onClick={() => handleBulkWholeDayUpdate(true, classId)}
                className="border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                All Present
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkLoading}
                onClick={() => handleBulkWholeDayUpdate(false, classId)}
                className="border-red-600 text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <XCircle className="mr-2 h-4 w-4" />
                All Absent
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-xl bg-muted/30 p-4 border border-border/50">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Attendance Update Range</h3>
              <p className="text-xs text-muted-foreground">
                Student and bulk buttons below update every date in this range.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="w-full sm:w-[200px]">
                <Select value={rangeFromDate} onValueChange={setRangeFromDate}>
                  <SelectTrigger>
                    <SelectValue placeholder="From Date" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-[200px]">
                <Select value={rangeToDate} onValueChange={setRangeToDate}>
                  <SelectTrigger>
                    <SelectValue placeholder="To Date" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={bulkLoading}
              variant="secondary"
              onClick={() => handleBulkMealUpdate('day', true, classId)}
            >
              <Sun className="mr-2 h-4 w-4" />
              Breakfast P
            </Button>
            <Button
              size="sm"
              disabled={bulkLoading}
              variant="destructive"
              onClick={() => handleBulkMealUpdate('day', false, classId)}
            >
              <Sun className="mr-2 h-4 w-4" />
              Breakfast A
            </Button>

            <Button
              size="sm"
              disabled={bulkLoading}
              variant="secondary"
              onClick={() => handleBulkMealUpdate('noon', true, classId)}
            >
              <UtensilsCrossed className="mr-2 h-4 w-4" />
              Lunch P
            </Button>
            <Button
              size="sm"
              disabled={bulkLoading}
              variant="destructive"
              onClick={() => handleBulkMealUpdate('noon', false, classId)}
            >
              <UtensilsCrossed className="mr-2 h-4 w-4" />
              Lunch A
            </Button>

            <Button
              size="sm"
              disabled={bulkLoading}
              variant="secondary"
              onClick={() => handleBulkMealUpdate('night', true, classId)}
            >
              <MoonStar className="mr-2 h-4 w-4" />
              Dinner P
            </Button>
            <Button
              size="sm"
              disabled={bulkLoading}
              variant="destructive"
              onClick={() => handleBulkMealUpdate('night', false, classId)}
            >
              <MoonStar className="mr-2 h-4 w-4" />
              Dinner A
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
                  <th className="px-4 py-3 text-center font-semibold">Breakfast</th>
                  <th className="px-4 py-3 text-center font-semibold">Lunch</th>
                  <th className="px-4 py-3 text-center font-semibold">Dinner</th>
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

  const teacherClassValue = getTeacherClassValue(profile);

  const pageDescription =
    profile?.role === 'class'
      ? `Manage attendance for ${teacherClassValue.value || 'your class'} on ${selectedDateLabel}.`
      : `Manage kitchen attendance for all classes on ${selectedDateLabel}.`;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-3">
            <CheckCircle2 className="h-4 w-4" />
            Kitchen Monitoring
          </div>
          <h1 className="text-3xl font-bold font-heading">Kitchen Attendance</h1>
          <p className="mt-1 text-muted-foreground max-w-2xl">{pageDescription}</p>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fetchKitchenStudents(undefined, selectedDate)}
            disabled={loading || profileLoading}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Attendance Date</h3>
              <p className="text-sm text-muted-foreground">
                Students are present by default. Mark absences or special changes.
              </p>
            </div>
            <div className="w-full sm:w-[260px]">
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Attendance Date" />
                </SelectTrigger>
                <SelectContent>
                  {dateOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, CIC, class..."
            className="pl-9"
          />
        </div>

        <div className="w-full sm:w-56">
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
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {profileLoading || (loading && students.length === 0) ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total"
              value={summary.total}
              description="Filtered students"
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              title="Breakfast Absent"
              value={summary.dayAbsent}
              description="Breakfast absent count"
              icon={<Sun className="h-5 w-5" />}
            />
            <StatCard
              title="Lunch Absent"
              value={summary.noonAbsent}
              description="Lunch absent count"
              icon={<UtensilsCrossed className="h-5 w-5" />}
            />
            <StatCard
              title="Dinner Absent"
              value={summary.nightAbsent}
              description="Dinner absent count"
              icon={<MoonStar className="h-5 w-5" />}
            />
          </div>

          {students.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="mb-4 h-10 w-10 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No students found</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Ensure tables exist and students are synced.
                </p>
              </CardContent>
            </Card>
          ) : profile?.role === 'officer' ? (
            <Tabs value={activeTab || classKeys[0] || ''} onValueChange={setActiveTab} className="w-full">
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