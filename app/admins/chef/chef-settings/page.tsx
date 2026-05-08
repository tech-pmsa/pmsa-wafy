'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  AlertCircle,
  ChefHat,
  RefreshCcw,
  Save,
  Plus,
  Trash2,
  Users,
  Armchair,
  LayoutGrid,
  Settings2,
  Link2Off,
  Eye,
  Rows3,
  Layers3,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { ChefTablesPdfExport } from '@/components/admin/chef/ChefTablesPdfExport';
import ChefSettingsPasswordGate, { resetChefSettingsAccess } from '@/components/admin/chef/ChefSettingsPasswordGate';
import FoodSelection, {
  FoodItem,
  StudentFoodPreference,
} from '@/components/admin/chef/FoodSelection';

type RowPosition = 'left' | 'middle' | 'right';
type Orientation = 'horizontal' | 'vertical';

interface AdminProfile {
  uid: string;
  role: string;
  name: string | null;
}

interface KitchenTable {
  id: string;
  table_number: number;
  table_name: string | null;
  is_active: boolean;
  row_number: number;
  row_position: RowPosition;
  orientation: Orientation;
  active_seat_count: number;
  display_order: number;
}

interface KitchenStudent {
  student_uid: string;
  name: string;
  cic: string | null;
  class_id: string;
  batch: string | null;
  council: string | null;
  day_present: boolean;
  noon_present: boolean;
  night_present: boolean;
}

interface SeatAssignment {
  id: string;
  student_uid: string;
  kitchen_table_id: string;
  seat_number: number;
}

interface AssignmentFormState {
  tableId: string;
  seatNumber: string;
}

const SEAT_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);
const ROW_POSITIONS: RowPosition[] = ['left', 'middle', 'right'];
const ORIENTATIONS: Orientation[] = ['horizontal', 'vertical'];

function sortByCicAsc(a: KitchenStudent, b: KitchenStudent) {
  const aNum = Number(a.cic);
  const bNum = Number(b.cic);
  const aValid = Number.isFinite(aNum);
  const bValid = Number.isFinite(bNum);

  if (aValid && bValid) return aNum - bNum;
  if (aValid) return -1;
  if (bValid) return 1;

  return (a.cic || '').localeCompare(b.cic || '', undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function normalizeForm(value?: AssignmentFormState | null) {
  return {
    tableId: value?.tableId || '',
    seatNumber: value?.seatNumber || '',
  };
}

function isSameForm(a?: AssignmentFormState | null, b?: AssignmentFormState | null) {
  const aa = normalizeForm(a);
  const bb = normalizeForm(b);
  return aa.tableId === bb.tableId && aa.seatNumber === bb.seatNumber;
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

function MiniTablePreview({ table }: { table: KitchenTable }) {
  const seatCount = table.active_seat_count;

  return (
    <div className="rounded-2xl border bg-card p-3 shadow-sm">
      <div className="mb-2 text-center">
        <div className="text-sm font-semibold">{table.table_name || `Table ${table.table_number}`}</div>
        <div className="text-xs text-muted-foreground">
          {table.orientation} • {seatCount} seats
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        {table.row_position === 'left' && <div className="h-2 w-2 rounded-full bg-primary" />}
        <div className="flex h-14 w-24 items-center justify-center rounded-xl border bg-muted/40 text-xs font-medium">
          T{table.table_number}
        </div>
        {table.row_position === 'right' && <div className="h-2 w-2 rounded-full bg-primary" />}
      </div>

      <div className="mt-2 text-center text-[11px] text-muted-foreground">
        Row {table.row_number} • {table.row_position}
      </div>
    </div>
  );
}

function RowLayoutPreview({ tables }: { tables: KitchenTable[] }) {
  const groupedRows = useMemo(() => {
    const rows = new Map<number, KitchenTable[]>();

    for (const table of tables.filter((t) => t.is_active)) {
      const current = rows.get(table.row_number) || [];
      current.push(table);
      rows.set(table.row_number, current);
    }

    return Array.from(rows.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([rowNumber, rowTables]) => ({
        rowNumber,
        tables: rowTables.sort((a, b) => {
          const orderMap = { left: 1, middle: 2, right: 3 };
          return orderMap[a.row_position] - orderMap[b.row_position];
        }),
      }));
  }, [tables]);

  if (groupedRows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No active table layout to preview.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Visual Row Layout Preview
        </CardTitle>
        <CardDescription>
          This preview helps you see how tables are placed by row and position.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {groupedRows.map((row) => {
          const left = row.tables.find((t) => t.row_position === 'left');
          const middle = row.tables.find((t) => t.row_position === 'middle');
          const right = row.tables.find((t) => t.row_position === 'right');

          return (
            <div key={row.rowNumber} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Row {row.rowNumber}</Badge>
                <span className="text-sm text-muted-foreground">
                  {row.tables.length} table{row.tables.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  {left ? (
                    <MiniTablePreview table={left} />
                  ) : (
                    <div className="h-full rounded-2xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                      Left Empty
                    </div>
                  )}
                </div>
                <div>
                  {middle ? (
                    <MiniTablePreview table={middle} />
                  ) : (
                    <div className="h-full rounded-2xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                      Middle Empty
                    </div>
                  )}
                </div>
                <div>
                  {right ? (
                    <MiniTablePreview table={right} />
                  ) : (
                    <div className="h-full rounded-2xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                      Right Empty
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function ChefSettingsPage() {
  const { user: authUser } = useUserData();

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [tables, setTables] = useState<KitchenTable[]>([]);
  const [students, setStudents] = useState<KitchenStudent[]>([]);
  const [assignments, setAssignments] = useState<SeatAssignment[]>([]);

  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gateKey, setGateKey] = useState(0);

  const [savingTableIds, setSavingTableIds] = useState<Record<string, boolean>>({});
  const [deletingTableIds, setDeletingTableIds] = useState<Record<string, boolean>>({});
  const [assignmentLoadingIds, setAssignmentLoadingIds] = useState<Record<string, boolean>>({});
  const [creatingTables, setCreatingTables] = useState(false);
  
  const [bulkSaving, setBulkSaving] = useState(false);
  const [clearingVisible, setClearingVisible] = useState(false);
  const [activeAssignmentClass, setActiveAssignmentClass] = useState<string>('');

  const [newTableCount, setNewTableCount] = useState('1');
  const [assignmentForm, setAssignmentForm] = useState<Record<string, AssignmentFormState>>({});
  const [initialAssignmentForm, setInitialAssignmentForm] = useState<Record<string, AssignmentFormState>>({});

  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [foodPreferences, setFoodPreferences] = useState<StudentFoodPreference[]>([]);

  const setTableSaving = (tableId: string, value: boolean) => {
    setSavingTableIds((prev) => ({ ...prev, [tableId]: value }));
  };

  const setTableDeleting = (tableId: string, value: boolean) => {
    setDeletingTableIds((prev) => ({ ...prev, [tableId]: value }));
  };

  const setAssignmentLoading = (studentUid: string, value: boolean) => {
    setAssignmentLoadingIds((prev) => ({ ...prev, [studentUid]: value }));
  };

  const fetchProfile = useCallback(async () => {
    if (!authUser?.id) return;

    setProfileLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('uid, role, name')
        .eq('uid', authUser.id)
        .single();

      if (error) throw error;

      if (!data || !['chef', 'officer'].includes(data.role)) {
        throw new Error('You are not allowed to access chef settings.');
      }

      setProfile(data as AdminProfile);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load profile');
      toast.error('Failed to load profile', { description: err.message });
    } finally {
      setProfileLoading(false);
    }
  }, [authUser?.id]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        { data: tablesData, error: tablesError },
        { data: studentsData, error: studentsError },
        { data: assignmentsData, error: assignmentsError },
        { data: foodsData, error: foodsError },
        { data: prefsData, error: prefsError },
      ] = await Promise.all([
        supabase
          .from('kitchen_tables')
          .select('*')
          .order('row_number', { ascending: true })
          .order('display_order', { ascending: true })
          .order('table_number', { ascending: true }),

        supabase
          .from('kitchen_students')
          .select('*')
          .order('class_id', { ascending: true })
          .order('name', { ascending: true }),

        supabase
          .from('kitchen_seat_assignments')
          .select('*')
          .order('seat_number', { ascending: true }),

        supabase
          .from('food_items')
          .select('*')
          .order('display_order', { ascending: true })
          .order('name', { ascending: true }),

        supabase
          .from('student_food_preferences')
          .select('*'),
      ]);

      if (tablesError) throw tablesError;
      if (studentsError) throw studentsError;
      if (assignmentsError) throw assignmentsError;
      if (foodsError) throw foodsError;
      if (prefsError) throw prefsError;

      setFoods((foodsData || []) as FoodItem[]);
      setFoodPreferences((prefsData || []) as StudentFoodPreference[]);

      const safeTables = (tablesData || []) as KitchenTable[];
      const safeStudents = ((studentsData || []) as KitchenStudent[]).sort((a, b) => {
        const classCompare = a.class_id.localeCompare(b.class_id, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
        if (classCompare !== 0) return classCompare;
        return sortByCicAsc(a, b);
      });
      const safeAssignments = (assignmentsData || []) as SeatAssignment[];

      setTables(safeTables);
      setStudents(safeStudents);
      setAssignments(safeAssignments);

      const nextForm: Record<string, AssignmentFormState> = {};
      for (const student of safeStudents) {
        const existing = safeAssignments.find((a) => a.student_uid === student.student_uid);
        nextForm[student.student_uid] = {
          tableId: existing?.kitchen_table_id || '',
          seatNumber: existing?.seat_number ? String(existing.seat_number) : '',
        };
      }
      setAssignmentForm(nextForm);
      setInitialAssignmentForm(nextForm);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load chef settings data');
      toast.error('Failed to load chef settings', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser?.id) fetchProfile();
  }, [authUser?.id, fetchProfile]);

  useEffect(() => {
    if (profile) fetchData();
  }, [profile, fetchData]);

  const studentClasses = useMemo(() => Array.from(new Set(students.map((s) => s.class_id || 'Unassigned'))).sort(), [students]);
  
  useEffect(() => { 
    if (studentClasses.length > 0 && !studentClasses.includes(activeAssignmentClass)) {
      setActiveAssignmentClass(studentClasses[0]); 
    }
  }, [studentClasses, activeAssignmentClass]);

  const groupedStudents = useMemo(() => {
    const grouped: Record<string, KitchenStudent[]> = {};

    for (const student of students) {
      const key = student.class_id || 'Unassigned';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(student);
    }

    Object.keys(grouped).forEach((classId) => {
      grouped[classId].sort(sortByCicAsc);
    });

    return grouped;
  }, [students]);

  const visibleAssignmentStudents = useMemo(() => {
    return groupedStudents[activeAssignmentClass] || [];
  }, [groupedStudents, activeAssignmentClass]);

  const visibleDirtyCount = useMemo(() => {
    return visibleAssignmentStudents.filter(
      (student) => !isSameForm(assignmentForm[student.student_uid], initialAssignmentForm[student.student_uid])
    ).length;
  }, [visibleAssignmentStudents, assignmentForm, initialAssignmentForm]);

  const assignmentsByStudent = useMemo(() => {
    const map = new Map<string, SeatAssignment>();
    assignments.forEach((assignment) => {
      map.set(assignment.student_uid, assignment);
    });
    return map;
  }, [assignments]);

  const assignmentsByTableSeat = useMemo(() => {
    const map = new Map<string, SeatAssignment>();
    assignments.forEach((assignment) => {
      map.set(`${assignment.kitchen_table_id}-${assignment.seat_number}`, assignment);
    });
    return map;
  }, [assignments]);

  const tableNameMap = useMemo(() => {
    const map = new Map<string, string>();
    tables.forEach((table) => {
      map.set(table.id, table.table_name || `Table ${table.table_number}`);
    });
    return map;
  }, [tables]);

  const handleTableFieldChange = (
    tableId: string,
    field: keyof KitchenTable,
    value: string | number | boolean
  ) => {
    setTables((prev) =>
      prev.map((table) =>
        table.id === tableId
          ? {
            ...table,
            [field]: value,
          }
          : table
      )
    );
  };

  const handleSaveTable = async (table: KitchenTable) => {
    setTableSaving(table.id, true);

    try {
      const payload = {
        table_name: table.table_name?.trim() || `Table ${table.table_number}`,
        is_active: table.is_active,
        row_number: Number(table.row_number) || 1,
        row_position: table.row_position,
        orientation: table.orientation,
        active_seat_count: Number(table.active_seat_count) || 8,
        display_order: Number(table.display_order) || table.table_number,
      };

      const { error } = await supabase.from('kitchen_tables').update(payload).eq('id', table.id);

      if (error) throw error;

      toast.success(`${payload.table_name} updated successfully`);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save table', { description: err.message });
    } finally {
      setTableSaving(table.id, false);
    }
  };

  const handleDeleteTable = async (table: KitchenTable) => {
    const ok = window.confirm(
      `Delete ${table.table_name || `Table ${table.table_number}`}?\n\nThis will also remove seat assignments connected to this table.`
    );
    if (!ok) return;

    setTableDeleting(table.id, true);

    try {
      const { error } = await supabase.from('kitchen_tables').delete().eq('id', table.id);
      if (error) throw error;

      toast.success(`${table.table_name || `Table ${table.table_number}`} deleted`);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete table', { description: err.message });
    } finally {
      setTableDeleting(table.id, false);
    }
  };

  const handleCreateTables = async () => {
    const count = Number(newTableCount);

    if (!Number.isInteger(count) || count <= 0) {
      toast.error('Enter a valid number of tables');
      return;
    }

    setCreatingTables(true);

    try {
      const maxTableNumber = tables.length ? Math.max(...tables.map((t) => t.table_number)) : 0;
      const maxDisplayOrder = tables.length ? Math.max(...tables.map((t) => t.display_order)) : 0;
      const currentMaxRow = tables.length ? Math.max(...tables.map((t) => t.row_number)) : 1;

      const payload = Array.from({ length: count }, (_, i) => {
        const tableNumber = maxTableNumber + i + 1;
        return {
          table_number: tableNumber,
          is_active: true,
          row_number: currentMaxRow,
          row_position: (['left', 'right'][i % 2] || 'left') as RowPosition,
          orientation: 'horizontal' as Orientation,
          active_seat_count: 8,
          display_order: maxDisplayOrder + i + 1,
        };
      });

      const { error } = await supabase.from('kitchen_tables').insert(payload);
      if (error) throw error;

      toast.success(`${count} table${count > 1 ? 's' : ''} created`);
      setNewTableCount('1');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to create tables', { description: err.message });
    } finally {
      setCreatingTables(false);
    }
  };

  const handleAssignmentFormChange = (
    studentUid: string,
    field: keyof AssignmentFormState,
    value: string
  ) => {
    setAssignmentForm((prev) => ({
      ...prev,
      [studentUid]: {
        ...(prev[studentUid] || { tableId: '', seatNumber: '' }),
        [field]: value,
      },
    }));
  };

  const saveAssignmentForStudent = async (studentUid: string) => {
    const form = normalizeForm(assignmentForm[studentUid]);
    const existing = assignments.find((a) => a.student_uid === studentUid);
    
    if (assignmentLoadingIds[studentUid]) return;

    try {
      setAssignmentLoading(studentUid, true);

      if (!form.tableId || !form.seatNumber) {
        if (existing) {
          const { error } = await supabase.from('kitchen_seat_assignments').delete().eq('id', existing.id);
          if (error) throw error;
        }
      } else {
        const payload = { kitchen_table_id: form.tableId, seat_number: Number(form.seatNumber), student_uid: studentUid };
        if (existing) {
          const { error } = await supabase.from('kitchen_seat_assignments').update(payload).eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('kitchen_seat_assignments').insert(payload);
          if (error) throw error;
        }
      }

      setInitialAssignmentForm((prev) => ({ ...prev, [studentUid]: form }));
      await fetchData();
      toast.success('Assignment saved successfully');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save assignment', { description: err.message });
    } finally {
      setAssignmentLoading(studentUid, false);
    }
  };

  const handleSaveAllVisible = async () => {
    if (visibleAssignmentStudents.length === 0) return;
    if (visibleDirtyCount === 0) {
      toast.info('No unsaved changes in this class.');
      return;
    }

    try {
      setBulkSaving(true);
      
      for (const student of visibleAssignmentStudents) {
        const currentForm = normalizeForm(assignmentForm[student.student_uid]);
        const initialForm = normalizeForm(initialAssignmentForm[student.student_uid]);
        if (isSameForm(currentForm, initialForm)) continue;
        
        const existing = assignments.find((a) => a.student_uid === student.student_uid);

        if (!currentForm.tableId || !currentForm.seatNumber) {
          if (existing) await supabase.from('kitchen_seat_assignments').delete().eq('id', existing.id);
        } else {
          const payload = { kitchen_table_id: currentForm.tableId, seat_number: Number(currentForm.seatNumber), student_uid: student.student_uid };
          if (existing) await supabase.from('kitchen_seat_assignments').update(payload).eq('id', existing.id);
          else await supabase.from('kitchen_seat_assignments').insert(payload);
        }
      }

      toast.success(`Saved ${visibleDirtyCount} updated assignment(s).`);
      await fetchData();
    } catch (err: any) {
      toast.error('Error', { description: err.message });
    } finally {
      setBulkSaving(false);
    }
  };

  const handleClearVisible = () => {
    if (visibleAssignmentStudents.length === 0) return;
    
    if (!window.confirm(`Clear form values for all students in ${activeAssignmentClass}?`)) {
      return;
    }

    setClearingVisible(true);
    setAssignmentForm((prev) => {
      const next = { ...prev };
      visibleAssignmentStudents.forEach((student) => {
        next[student.student_uid] = { tableId: '', seatNumber: '' };
      });
      return next;
    });
    setClearingVisible(false);
  };

  const handleLockSettings = () => {
    if (window.confirm('Do you want to lock chef settings now?')) {
      resetChefSettingsAccess();
      setGateKey((prev) => prev + 1);
    }
  };

  const getAvailableSeatsForTable = (tableId: string, currentStudentUid?: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return [];

    return SEAT_OPTIONS.filter((seat) => {
      if (seat > table.active_seat_count) return false;

      const usedByDb = assignments.find(
        (a) =>
          a.kitchen_table_id === tableId &&
          a.seat_number === seat &&
          a.student_uid !== currentStudentUid
      );

      const usedByForm = students.some((student) => {
        if (student.student_uid === currentStudentUid) return false;
        const form = assignmentForm[student.student_uid];
        return form?.tableId === tableId && Number(form?.seatNumber) === seat;
      });

      return !usedByDb && !usedByForm;
    });
  };

  return (
    <ChefSettingsPasswordGate key={gateKey}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between bg-card p-6 rounded-2xl border shadow-sm">
          <div className="flex gap-4 items-start">
            <div className="bg-primary/10 p-3 text-primary rounded-2xl shrink-0 hidden md:block">
              <ChefHat className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-accent text-accent-foreground hover:bg-accent/80 mb-2">
                Kitchen Configuration
              </div>
              <h1 className="text-3xl font-bold font-heading">
                Chef Settings
              </h1>
              <p className="mt-1 text-muted-foreground">
                Manage layout, seats, assignments, and food types.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ChefTablesPdfExport
              tables={tables}
              students={students}
              assignments={assignments}
            />

            <Button
              type="button"
              variant="outline"
              onClick={fetchData}
              disabled={loading || profileLoading}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleLockSettings}
            >
              <Lock className="mr-2 h-4 w-4" />
              Lock Settings
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-[520px] w-full rounded-2xl" />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Tables"
                value={tables.length}
                description="All created kitchen tables"
                icon={<LayoutGrid className="h-5 w-5" />}
              />
              <StatCard
                title="Active Tables"
                value={tables.filter((t) => t.is_active).length}
                description="Tables visible in dashboard"
                icon={<Armchair className="h-5 w-5" />}
              />
              <StatCard
                title="Students"
                value={students.length}
                description="Students from kitchen students table"
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                title="Assigned Seats"
                value={assignments.length}
                description="Students assigned to seats"
                icon={<Settings2 className="h-5 w-5" />}
              />
            </div>

            <Tabs defaultValue="layout" className="w-full">
              <div className="overflow-x-auto pb-2">
                <TabsList className="inline-flex h-auto min-w-max gap-2 rounded-2xl p-1 bg-card border shadow-sm">
                  <TabsTrigger value="layout" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Layout
                  </TabsTrigger>
                  <TabsTrigger value="assignments" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Assignments
                  </TabsTrigger>
                  <TabsTrigger value="foods" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Foods
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="layout" className="mt-6 space-y-6 animate-in fade-in duration-500">
                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Create New Tables
                    </CardTitle>
                    <CardDescription>
                      Default tables start with 8 seats horizontally.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="w-full sm:max-w-[220px]">
                        <label className="mb-2 block text-sm font-medium">Count</label>
                        <Input
                          type="number"
                          min={1}
                          value={newTableCount}
                          onChange={(e) => setNewTableCount(e.target.value)}
                          placeholder="Count"
                        />
                      </div>

                      <Button onClick={handleCreateTables} disabled={creatingTables}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Tables
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <RowLayoutPreview tables={tables} />

                {tables.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <Rows3 className="mb-4 h-10 w-10 text-muted-foreground" />
                      <h3 className="text-lg font-semibold">No tables created yet</h3>
                      <p className="mt-1 max-w-md text-sm text-muted-foreground">
                        Add tables first, then configure row number, position, orientation, and active seats.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    {tables.map((table) => {
                      const isSaving = !!savingTableIds[table.id];
                      const isDeleting = !!deletingTableIds[table.id];

                      return (
                        <Card key={table.id} className="border-border/60 shadow-sm">
                          <CardHeader className="pb-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <CardTitle className="text-lg">
                                  {table.table_name || `Table ${table.table_number}`}
                                </CardTitle>
                                <CardDescription>Configure row, position, orientation, and seats</CardDescription>
                              </div>
                              <Button
                                variant={table.is_active ? "default" : "secondary"}
                                size="sm"
                                className="h-7 text-xs rounded-full"
                                onClick={() => handleTableFieldChange(table.id, 'is_active', !table.is_active)}
                              >
                                {table.is_active ? 'Active' : 'Inactive'}
                              </Button>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-sm font-medium">Name</label>
                                <Input
                                  value={table.table_name || ''}
                                  onChange={(e) =>
                                    handleTableFieldChange(table.id, 'table_name', e.target.value)
                                  }
                                  placeholder={`Table ${table.table_number}`}
                                />
                              </div>

                              <div>
                                <label className="mb-2 block text-sm font-medium">Row Number</label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={table.row_number}
                                  onChange={(e) =>
                                    handleTableFieldChange(table.id, 'row_number', Number(e.target.value || 1))
                                  }
                                />
                              </div>

                              <div>
                                <label className="mb-2 block text-sm font-medium">Position</label>
                                <Select
                                  value={table.row_position}
                                  onValueChange={(value) =>
                                    handleTableFieldChange(table.id, 'row_position', value as RowPosition)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Position" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ROW_POSITIONS.map((pos) => (
                                      <SelectItem key={pos} value={pos}>
                                        {pos.charAt(0).toUpperCase() + pos.slice(1)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <label className="mb-2 block text-sm font-medium">Orientation</label>
                                <Select
                                  value={table.orientation}
                                  onValueChange={(value) =>
                                    handleTableFieldChange(table.id, 'orientation', value as Orientation)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Orientation" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ORIENTATIONS.map((orientation) => (
                                      <SelectItem key={orientation} value={orientation}>
                                        {orientation.charAt(0).toUpperCase() + orientation.slice(1)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <label className="mb-2 block text-sm font-medium">Seats</label>
                                <Select
                                  value={String(table.active_seat_count)}
                                  onValueChange={(value) =>
                                    handleTableFieldChange(table.id, 'active_seat_count', Number(value))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seats" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SEAT_OPTIONS.map((seat) => (
                                      <SelectItem key={seat} value={String(seat)}>
                                        {seat} Seats
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2 border-t mt-4">
                              <Button onClick={() => handleSaveTable(table)} disabled={isSaving || isDeleting} className="flex-1 sm:flex-none">
                                <Save className="mr-2 h-4 w-4" />
                                Save
                              </Button>

                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDeleteTable(table)}
                                disabled={isSaving || isDeleting}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="assignments" className="mt-6 space-y-6 animate-in fade-in duration-500">
                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle>Assignment by Class</CardTitle>
                    <CardDescription>
                      Open one class at a time for faster editing.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
                      {studentClasses.map((classId) => (
                        <button
                          key={classId}
                          onClick={() => setActiveAssignmentClass(classId)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors border ${
                            activeAssignmentClass === classId
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-card text-muted-foreground border-border hover:bg-muted/50'
                          }`}
                        >
                          <Layers3 className="w-4 h-4" />
                          {classId}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/40 p-4 rounded-xl border flex flex-col justify-center items-center text-center">
                        <span className="text-2xl font-bold font-heading">{visibleAssignmentStudents.length}</span>
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Visible Students</span>
                      </div>
                      <div className="bg-primary/10 border-primary/20 p-4 rounded-xl border flex flex-col justify-center items-center text-center">
                        <span className="text-2xl font-bold text-primary font-heading">{visibleDirtyCount}</span>
                        <span className="text-xs text-primary/80 font-medium uppercase tracking-wider">Unsaved Changes</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button
                        onClick={handleSaveAllVisible}
                        disabled={bulkSaving || visibleDirtyCount === 0}
                        className="flex-1"
                      >
                        {bulkSaving ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        {bulkSaving ? 'Saving...' : 'Save All Visible'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleClearVisible}
                        disabled={clearingVisible}
                        className="flex-1 sm:flex-none text-muted-foreground"
                      >
                        <Link2Off className="w-4 h-4 mr-2" />
                        Clear Visible
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {visibleAssignmentStudents.map((student) => {
                    const form = assignmentForm[student.student_uid] || { tableId: '', seatNumber: '' };
                    const initialForm = initialAssignmentForm[student.student_uid] || { tableId: '', seatNumber: '' };
                    const isDirty = !isSameForm(form, initialForm);
                    const isSaving = !!assignmentLoadingIds[student.student_uid];
                    const assignedTable = tables.find((t) => t.id === form.tableId);
                    
                    const availableSeats = form.tableId
                      ? getAvailableSeatsForTable(form.tableId, student.student_uid)
                      : [];

                    // If seat is selected and not in available list but it IS the currently selected seat in form, add it back to options
                    const optionsToShow = [...availableSeats];
                    if (form.seatNumber && !optionsToShow.includes(Number(form.seatNumber))) {
                      optionsToShow.push(Number(form.seatNumber));
                      optionsToShow.sort((a, b) => a - b);
                    }

                    return (
                      <Card key={student.student_uid} className="border-border/60 shadow-sm flex flex-col justify-between">
                        <div className="p-4 sm:p-5 flex items-start justify-between border-b bg-muted/20">
                          <div>
                            <h4 className="font-semibold text-foreground">{student.name}</h4>
                            <p className="text-xs text-muted-foreground">{student.class_id} • CIC: {student.cic || '—'}</p>
                          </div>
                          <Badge variant={isDirty ? "default" : "outline"} className={isDirty ? "bg-accent hover:bg-accent text-accent-foreground" : "text-muted-foreground"}>
                            {isDirty ? "Edited" : "Saved"}
                          </Badge>
                        </div>

                        <div className="p-4 sm:p-5 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-semibold mb-1.5 block text-muted-foreground uppercase tracking-wider">Select Table</label>
                              <Select
                                value={form.tableId}
                                onValueChange={(val) => setAssignmentForm((prev) => ({ ...prev, [student.student_uid]: { tableId: val, seatNumber: '' } }))}
                              >
                                <SelectTrigger className="bg-background">
                                  <SelectValue placeholder="Choose Table" />
                                </SelectTrigger>
                                <SelectContent>
                                  {tables.filter(t => t.is_active).map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.table_name || `Table ${t.table_number}`}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs font-semibold mb-1.5 block text-muted-foreground uppercase tracking-wider">Select Seat</label>
                              <Select
                                disabled={!form.tableId}
                                value={form.seatNumber}
                                onValueChange={(val) => setAssignmentForm((prev) => ({ ...prev, [student.student_uid]: { ...prev[student.student_uid], seatNumber: val } }))}
                              >
                                <SelectTrigger className="bg-background">
                                  <SelectValue placeholder="Choose Seat" />
                                </SelectTrigger>
                                <SelectContent>
                                  {optionsToShow.map(seat => (
                                    <SelectItem key={seat} value={String(seat)}>Seat {seat}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setAssignmentForm((prev) => ({ ...prev, [student.student_uid]: { tableId: '', seatNumber: '' } }))}
                              className="text-muted-foreground"
                            >
                              <Link2Off className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => saveAssignmentForStudent(student.student_uid)} 
                              disabled={!isDirty || isSaving}
                              className="w-24"
                            >
                              {isSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                              {isSaving ? 'Saving' : 'Save'}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="foods" className="mt-6 space-y-6">
                <FoodSelection
                  foods={foods}
                  students={students}
                  preferences={foodPreferences}
                  onRefresh={fetchData}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </ChefSettingsPasswordGate>
  );
}