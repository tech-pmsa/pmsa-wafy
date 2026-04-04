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
} from 'lucide-react';

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

  const [savingTableIds, setSavingTableIds] = useState<Record<string, boolean>>({});
  const [deletingTableIds, setDeletingTableIds] = useState<Record<string, boolean>>({});
  const [assignmentLoadingIds, setAssignmentLoadingIds] = useState<Record<string, boolean>>({});
  const [creatingTables, setCreatingTables] = useState(false);
  const [savingAllAssignments, setSavingAllAssignments] = useState(false);

  const [newTableCount, setNewTableCount] = useState('1');
  const [assignmentForm, setAssignmentForm] = useState<Record<string, AssignmentFormState>>({});

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
      ] = await Promise.all([
        supabase
          .from('kitchen_tables')
          .select(
            'id, table_number, table_name, is_active, row_number, row_position, orientation, active_seat_count, display_order'
          )
          .order('row_number', { ascending: true })
          .order('display_order', { ascending: true })
          .order('table_number', { ascending: true }),

        supabase
          .from('kitchen_students')
          .select(
            'student_uid, name, cic, class_id, batch, council, day_present, noon_present, night_present'
          )
          .order('class_id', { ascending: true })
          .order('name', { ascending: true }),

        supabase
          .from('kitchen_seat_assignments')
          .select('id, student_uid, kitchen_table_id, seat_number')
          .order('seat_number', { ascending: true }),
      ]);

      if (tablesError) throw tablesError;
      if (studentsError) throw studentsError;
      if (assignmentsError) throw assignmentsError;

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

  const summary = useMemo(() => {
    return {
      totalTables: tables.length,
      activeTables: tables.filter((t) => t.is_active).length,
      totalStudents: students.length,
      assignedStudents: assignments.length,
    };
  }, [tables, students, assignments]);

  const changedStudentIds = useMemo(() => {
    return students
      .filter((student) => {
        const existing = assignmentsByStudent.get(student.student_uid);
        const form = assignmentForm[student.student_uid] || { tableId: '', seatNumber: '' };

        const existingTableId = existing?.kitchen_table_id || '';
        const existingSeatNumber = existing?.seat_number ? String(existing.seat_number) : '';

        return form.tableId !== existingTableId || form.seatNumber !== existingSeatNumber;
      })
      .map((student) => student.student_uid);
  }, [students, assignmentsByStudent, assignmentForm]);

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

  const validateAssignmentChange = (
    student: KitchenStudent,
    form: AssignmentFormState,
    stagedMap: Map<string, string>
  ): string | null => {
    const tableId = form.tableId || '';
    const seatNumber = Number(form.seatNumber);

    if (!tableId && !form.seatNumber) return null;
    if (!tableId || !form.seatNumber) {
      return `${student.name}: choose both table and seat`;
    }

    const selectedTable = tables.find((t) => t.id === tableId);
    if (!selectedTable) {
      return `${student.name}: selected table not found`;
    }

    if (!selectedTable.is_active) {
      return `${student.name}: selected table is inactive`;
    }

    if (!seatNumber || seatNumber < 1) {
      return `${student.name}: invalid seat number`;
    }

    if (seatNumber > selectedTable.active_seat_count) {
      return `${student.name}: seat ${seatNumber} is not enabled for ${selectedTable.table_name || `Table ${selectedTable.table_number}`}`;
    }

    const seatKey = `${tableId}-${seatNumber}`;
    const alreadyInCurrentBatch = stagedMap.get(seatKey);
    if (alreadyInCurrentBatch && alreadyInCurrentBatch !== student.student_uid) {
      const otherStudent = students.find((s) => s.student_uid === alreadyInCurrentBatch);
      return `${student.name}: same seat also selected for ${otherStudent?.name || 'another student'}`;
    }

    const existingConflict = assignmentsByTableSeat.get(seatKey);
    if (existingConflict && existingConflict.student_uid !== student.student_uid) {
      const otherChangedForm = assignmentForm[existingConflict.student_uid];
      const otherIsMovingAway =
        otherChangedForm &&
        (otherChangedForm.tableId !== existingConflict.kitchen_table_id ||
          otherChangedForm.seatNumber !== String(existingConflict.seat_number));

      if (!otherIsMovingAway) {
        const conflictingStudent = students.find((s) => s.student_uid === existingConflict.student_uid);
        return `${student.name}: seat already used by ${conflictingStudent?.name || 'another student'}`;
      }
    }

    stagedMap.set(seatKey, student.student_uid);
    return null;
  };

  const handleSaveAssignment = async (student: KitchenStudent) => {
    const form = assignmentForm[student.student_uid] || { tableId: '', seatNumber: '' };
    const stagedMap = new Map<string, string>();
    const validationError = validateAssignmentChange(student, form, stagedMap);

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setAssignmentLoading(student.student_uid, true);

    try {
      const existingAssignment = assignmentsByStudent.get(student.student_uid);

      if (!form.tableId && !form.seatNumber) {
        if (existingAssignment) {
          const { error } = await supabase
            .from('kitchen_seat_assignments')
            .delete()
            .eq('id', existingAssignment.id);
          if (error) throw error;
        }

        toast.success(`${student.name} assignment removed`);
        await fetchData();
        return;
      }

      const tableId = form.tableId;
      const seatNumber = Number(form.seatNumber);

      if (existingAssignment) {
        const { error } = await supabase
          .from('kitchen_seat_assignments')
          .update({
            kitchen_table_id: tableId,
            seat_number: seatNumber,
          })
          .eq('id', existingAssignment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('kitchen_seat_assignments').insert({
          student_uid: student.student_uid,
          kitchen_table_id: tableId,
          seat_number: seatNumber,
        });

        if (error) throw error;
      }

      toast.success(`${student.name} seat assignment saved`);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save assignment', { description: err.message });
    } finally {
      setAssignmentLoading(student.student_uid, false);
    }
  };

  const handleSaveAllAssignments = async () => {
    if (changedStudentIds.length === 0) {
      toast.error('No changed assignments to save');
      return;
    }

    setSavingAllAssignments(true);

    try {
      const stagedSeatMap = new Map<string, string>();
      const changedStudents = students.filter((student) => changedStudentIds.includes(student.student_uid));

      for (const student of changedStudents) {
        const form = assignmentForm[student.student_uid] || { tableId: '', seatNumber: '' };
        const errorMessage = validateAssignmentChange(student, form, stagedSeatMap);
        if (errorMessage) {
          toast.error(errorMessage);
          setSavingAllAssignments(false);
          return;
        }
      }

      for (const student of changedStudents) {
        const form = assignmentForm[student.student_uid] || { tableId: '', seatNumber: '' };
        const existingAssignment = assignmentsByStudent.get(student.student_uid);

        const isEmpty = !form.tableId && !form.seatNumber;

        if (isEmpty) {
          if (existingAssignment) {
            const { error } = await supabase
              .from('kitchen_seat_assignments')
              .delete()
              .eq('id', existingAssignment.id);
            if (error) throw error;
          }
          continue;
        }

        const tableId = form.tableId;
        const seatNumber = Number(form.seatNumber);

        if (existingAssignment) {
          const { error } = await supabase
            .from('kitchen_seat_assignments')
            .update({
              kitchen_table_id: tableId,
              seat_number: seatNumber,
            })
            .eq('id', existingAssignment.id);

          if (error) throw error;
        } else {
          const { error } = await supabase.from('kitchen_seat_assignments').insert({
            student_uid: student.student_uid,
            kitchen_table_id: tableId,
            seat_number: seatNumber,
          });

          if (error) throw error;
        }
      }

      toast.success(`${changedStudentIds.length} assignment${changedStudentIds.length > 1 ? 's' : ''} saved successfully`);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save all assignments', { description: err.message });
    } finally {
      setSavingAllAssignments(false);
    }
  };

  const handleRemoveAssignment = async (student: KitchenStudent) => {
    const existingAssignment = assignmentsByStudent.get(student.student_uid);

    if (!existingAssignment) {
      setAssignmentForm((prev) => ({
        ...prev,
        [student.student_uid]: {
          tableId: '',
          seatNumber: '',
        },
      }));
      toast.error('No assignment to remove');
      return;
    }

    setAssignmentLoading(student.student_uid, true);

    try {
      const { error } = await supabase
        .from('kitchen_seat_assignments')
        .delete()
        .eq('id', existingAssignment.id);

      if (error) throw error;

      toast.success(`${student.name} assignment removed`);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to remove assignment', { description: err.message });
    } finally {
      setAssignmentLoading(student.student_uid, false);
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

  const classKeys = useMemo(
    () =>
      Object.keys(groupedStudents).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      ),
    [groupedStudents]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold font-heading">
            <ChefHat className="h-8 w-8 text-primary" />
            Chef Settings
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage table layout, row placement, table names, and student seat assignments.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={fetchData}
          disabled={loading || profileLoading}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
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
              <TabsList className="inline-flex h-auto min-w-max gap-2 rounded-2xl p-1">
                <TabsTrigger value="layout" className="rounded-xl px-4 py-2">
                  Table Layout Settings
                </TabsTrigger>
                <TabsTrigger value="assignments" className="rounded-xl px-4 py-2">
                  Student Seat Assignment
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="layout" className="mt-6 space-y-6">
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Create New Tables
                  </CardTitle>
                  <CardDescription>
                    Add one or more tables. Default tables start with 8 seats and horizontal orientation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="w-full sm:max-w-[220px]">
                      <label className="mb-2 block text-sm font-medium">Number of tables</label>
                      <Input
                        type="number"
                        min={1}
                        value={newTableCount}
                        onChange={(e) => setNewTableCount(e.target.value)}
                        placeholder="Enter count"
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
                        <CardHeader>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <CardTitle className="text-lg">
                                {table.table_name || `Table ${table.table_number}`}
                              </CardTitle>
                              <CardDescription>Table No. {table.table_number}</CardDescription>
                            </div>
                            <Badge variant={table.is_active ? 'default' : 'secondary'}>
                              {table.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-medium">Table Name</label>
                              <Input
                                value={table.table_name || ''}
                                onChange={(e) =>
                                  handleTableFieldChange(table.id, 'table_name', e.target.value)
                                }
                                placeholder={`Table ${table.table_number}`}
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium">Display Order</label>
                              <Input
                                type="number"
                                min={1}
                                value={table.display_order}
                                onChange={(e) =>
                                  handleTableFieldChange(
                                    table.id,
                                    'display_order',
                                    Number(e.target.value || 1)
                                  )
                                }
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium">Row Number</label>
                              <Input
                                type="number"
                                min={1}
                                value={table.row_number}
                                onChange={(e) =>
                                  handleTableFieldChange(
                                    table.id,
                                    'row_number',
                                    Number(e.target.value || 1)
                                  )
                                }
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium">Row Position</label>
                              <Select
                                value={table.row_position}
                                onValueChange={(value) =>
                                  handleTableFieldChange(table.id, 'row_position', value as RowPosition)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select row position" />
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
                                  <SelectValue placeholder="Select orientation" />
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
                              <label className="mb-2 block text-sm font-medium">Active Seat Count</label>
                              <Select
                                value={String(table.active_seat_count)}
                                onValueChange={(value) =>
                                  handleTableFieldChange(table.id, 'active_seat_count', Number(value))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select seat count" />
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

                            <div className="sm:col-span-2">
                              <label className="mb-2 block text-sm font-medium">Table Status</label>
                              <Select
                                value={table.is_active ? 'active' : 'inactive'}
                                onValueChange={(value) =>
                                  handleTableFieldChange(table.id, 'is_active', value === 'active')
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select table status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-2">
                            <Button onClick={() => handleSaveTable(table)} disabled={isSaving || isDeleting}>
                              <Save className="mr-2 h-4 w-4" />
                              Save Table
                            </Button>

                            <Button
                              variant="destructive"
                              onClick={() => handleDeleteTable(table)}
                              disabled={isSaving || isDeleting}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Table
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="assignments" className="mt-6 space-y-6">
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle>Save All Student Assignments</CardTitle>
                      <CardDescription>
                        After selecting table and seat for many students, save all by one click.
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        Changed: {changedStudentIds.length}
                      </Badge>
                      <Button
                        onClick={handleSaveAllAssignments}
                        disabled={savingAllAssignments || changedStudentIds.length === 0}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save All Assignments
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {tables.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <AlertCircle className="mb-4 h-10 w-10 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Create tables first</h3>
                    <p className="mt-1 max-w-md text-sm text-muted-foreground">
                      You need at least one table before assigning students to seats.
                    </p>
                  </CardContent>
                </Card>
              ) : students.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="mb-4 h-10 w-10 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No students found</h3>
                    <p className="mt-1 max-w-md text-sm text-muted-foreground">
                      Make sure student sync to <code>kitchen_students</code> is working.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-8">
                  {classKeys.map((classId) => (
                    <Card key={classId} className="border-border/60 shadow-sm">
                      <CardHeader>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <CardTitle>{classId}</CardTitle>
                            <CardDescription>
                              {groupedStudents[classId].length} students • ordered by CIC ascending
                            </CardDescription>
                          </div>
                          <Badge variant="outline">Class {classId}</Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 xl:hidden">
                          {groupedStudents[classId].map((student) => {
                            const currentAssignment = assignmentsByStudent.get(student.student_uid);
                            const currentForm = assignmentForm[student.student_uid] || {
                              tableId: '',
                              seatNumber: '',
                            };
                            const isLoadingAssignment = !!assignmentLoadingIds[student.student_uid];

                            const selectedTableId = currentForm.tableId || '';
                            const availableSeats = selectedTableId
                              ? getAvailableSeatsForTable(selectedTableId, student.student_uid)
                              : [];

                            const isChanged = changedStudentIds.includes(student.student_uid);

                            return (
                              <Card key={student.student_uid} className="border-border/60">
                                <CardContent className="space-y-4 p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <h4 className="font-semibold">{student.name}</h4>
                                      <p className="text-sm text-muted-foreground">
                                        CIC: {student.cic || '—'}
                                      </p>
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                                      {currentAssignment ? (
                                        <Badge>
                                          {tableNameMap.get(currentAssignment.kitchen_table_id) || 'Table'} • Seat{' '}
                                          {currentAssignment.seat_number}
                                        </Badge>
                                      ) : (
                                        <Badge variant="secondary">Unassigned</Badge>
                                      )}
                                      {isChanged && <Badge variant="outline">Changed</Badge>}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                      <label className="mb-2 block text-sm font-medium">Table</label>
                                      <Select
                                        value={currentForm.tableId || ''}
                                        onValueChange={(value) =>
                                          setAssignmentForm((prev) => ({
                                            ...prev,
                                            [student.student_uid]: {
                                              tableId: value,
                                              seatNumber: '',
                                            },
                                          }))
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select table" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {tables
                                            .filter((t) => t.is_active)
                                            .map((table) => (
                                              <SelectItem key={table.id} value={table.id}>
                                                {table.table_name || `Table ${table.table_number}`}
                                              </SelectItem>
                                            ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div>
                                      <label className="mb-2 block text-sm font-medium">Seat</label>
                                      <Select
                                        value={currentForm.seatNumber || ''}
                                        onValueChange={(value) =>
                                          handleAssignmentFormChange(student.student_uid, 'seatNumber', value)
                                        }
                                        disabled={!selectedTableId}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select seat" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availableSeats.map((seat) => (
                                            <SelectItem key={seat} value={String(seat)}>
                                              Seat {seat}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      onClick={() => handleSaveAssignment(student)}
                                      disabled={isLoadingAssignment || savingAllAssignments}
                                    >
                                      <Save className="mr-2 h-4 w-4" />
                                      Save Assignment
                                    </Button>

                                    <Button
                                      variant="outline"
                                      onClick={() => handleRemoveAssignment(student)}
                                      disabled={isLoadingAssignment || savingAllAssignments || !currentAssignment}
                                    >
                                      <Link2Off className="mr-2 h-4 w-4" />
                                      Remove
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>

                        <div className="hidden overflow-hidden rounded-2xl border xl:block">
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead className="bg-muted/60">
                                <tr className="border-b">
                                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                                  <th className="px-4 py-3 text-left font-semibold">CIC</th>
                                  <th className="px-4 py-3 text-left font-semibold">Current Assignment</th>
                                  <th className="px-4 py-3 text-left font-semibold">Select Table</th>
                                  <th className="px-4 py-3 text-left font-semibold">Select Seat</th>
                                  <th className="px-4 py-3 text-left font-semibold">Changed</th>
                                  <th className="px-4 py-3 text-left font-semibold">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {groupedStudents[classId].map((student) => {
                                  const currentAssignment = assignmentsByStudent.get(student.student_uid);
                                  const currentForm = assignmentForm[student.student_uid] || {
                                    tableId: '',
                                    seatNumber: '',
                                  };
                                  const isLoadingAssignment = !!assignmentLoadingIds[student.student_uid];
                                  const selectedTableId = currentForm.tableId || '';
                                  const availableSeats = selectedTableId
                                    ? getAvailableSeatsForTable(selectedTableId, student.student_uid)
                                    : [];
                                  const isChanged = changedStudentIds.includes(student.student_uid);

                                  return (
                                    <tr key={student.student_uid} className="border-b last:border-b-0">
                                      <td className="px-4 py-3 font-medium">{student.name}</td>
                                      <td className="px-4 py-3 text-muted-foreground">{student.cic || '—'}</td>
                                      <td className="px-4 py-3">
                                        {currentAssignment ? (
                                          <Badge>
                                            {tableNameMap.get(currentAssignment.kitchen_table_id) || 'Table'} • Seat{' '}
                                            {currentAssignment.seat_number}
                                          </Badge>
                                        ) : (
                                          <Badge variant="secondary">Unassigned</Badge>
                                        )}
                                      </td>
                                      <td className="px-4 py-3">
                                        <Select
                                          value={currentForm.tableId || ''}
                                          onValueChange={(value) =>
                                            setAssignmentForm((prev) => ({
                                              ...prev,
                                              [student.student_uid]: {
                                                tableId: value,
                                                seatNumber: '',
                                              },
                                            }))
                                          }
                                        >
                                          <SelectTrigger className="min-w-[180px]">
                                            <SelectValue placeholder="Select table" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {tables
                                              .filter((t) => t.is_active)
                                              .map((table) => (
                                                <SelectItem key={table.id} value={table.id}>
                                                  {table.table_name || `Table ${table.table_number}`}
                                                </SelectItem>
                                              ))}
                                          </SelectContent>
                                        </Select>
                                      </td>
                                      <td className="px-4 py-3">
                                        <Select
                                          value={currentForm.seatNumber || ''}
                                          onValueChange={(value) =>
                                            handleAssignmentFormChange(student.student_uid, 'seatNumber', value)
                                          }
                                          disabled={!selectedTableId}
                                        >
                                          <SelectTrigger className="min-w-[140px]">
                                            <SelectValue placeholder="Select seat" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {availableSeats.map((seat) => (
                                              <SelectItem key={seat} value={String(seat)}>
                                                Seat {seat}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </td>
                                      <td className="px-4 py-3">
                                        {isChanged ? <Badge variant="outline">Changed</Badge> : <span className="text-muted-foreground">—</span>}
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() => handleSaveAssignment(student)}
                                            disabled={isLoadingAssignment || savingAllAssignments}
                                          >
                                            <Save className="mr-2 h-4 w-4" />
                                            Save
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleRemoveAssignment(student)}
                                            disabled={isLoadingAssignment || savingAllAssignments || !currentAssignment}
                                          >
                                            <Link2Off className="mr-2 h-4 w-4" />
                                            Remove
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}