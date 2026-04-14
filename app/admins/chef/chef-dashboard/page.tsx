'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  AlertCircle,
  ChefHat,
  RefreshCcw,
  Users,
  UtensilsCrossed,
  Sun,
  MoonStar,
  X,
} from 'lucide-react';

type MealTab = 'day' | 'noon' | 'night';

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
  row_position: 'left' | 'middle' | 'right';
  orientation: 'horizontal' | 'vertical';
  active_seat_count: number;
  display_order: number;
}

interface KitchenStudentLite {
  student_uid: string;
  name: string;
  cic: string | null;
  class_id: string;
  day_present: boolean;
  noon_present: boolean;
  night_present: boolean;
}

interface KitchenSeatAssignment {
  id: string;
  student_uid: string;
  kitchen_table_id: string;
  seat_number: number;
}

interface TableSeatView {
  seatNumber: number;
  enabled: boolean;
  student: KitchenStudentLite | null;
  present: boolean | null;
}

interface TableViewData {
  table: KitchenTable;
  seats: TableSeatView[];
  presentCount: number;
  absentCount: number;
  totalNeededPlates: number;
}

function getMealPresence(student: KitchenStudentLite | null, meal: MealTab): boolean | null {
  if (!student) return null;
  if (meal === 'day') return student.day_present;
  if (meal === 'noon') return student.noon_present;
  return student.night_present;
}

function getSeatLabelClass(present: boolean | null, hasStudent: boolean) {
  if (!hasStudent) {
    return 'bg-muted text-muted-foreground border-border';
  }

  if (present) {
    return 'bg-green-600 text-white border-green-700';
  }

  return 'bg-red-600 text-white border-red-700';
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
    <Card className="shadow-sm border-border/60">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold font-heading">{value}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SeatInfoModal({
  seat,
  open,
  onClose,
}: {
  seat: TableSeatView | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !seat) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border bg-background p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">Seat {seat.seatNumber}</h3>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {!seat.student ? (
          <div className="text-sm text-muted-foreground">Empty seat</div>
        ) : (
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Name:</span> {seat.student.name}</div>
            <div><span className="font-medium">Class:</span> {seat.student.class_id}</div>
            <div><span className="font-medium">CIC:</span> {seat.student.cic || '—'}</div>
            <div>
              <span className="font-medium">Status:</span>{' '}
              {seat.present ? (
                <span className="text-green-600 font-semibold">Present</span>
              ) : (
                <span className="text-red-600 font-semibold">Absent</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SeatBubble({
  seat,
  onMobileClick,
}: {
  seat: TableSeatView;
  onMobileClick: (seat: TableSeatView) => void;
}) {
  const hasStudent = !!seat.student;
  const labelClass = getSeatLabelClass(seat.present, hasStudent);

  return (
    <>
      <button
        type="button"
        onClick={() => onMobileClick(seat)}
        className={`group relative flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border text-[10px] font-medium shadow-sm transition-transform hover:scale-105 sm:h-14 sm:w-14 ${labelClass}`}
      >
        <div className="text-[10px] opacity-90">S{seat.seatNumber}</div>
        <div className="max-w-[34px] truncate text-center text-[9px] leading-tight sm:max-w-[42px]">
          {seat.student ? seat.student.name.split(' ')[0] : 'Empty'}
        </div>

        {/* Desktop tooltip only */}
        {seat.student && (
          <div className="pointer-events-none absolute bottom-[110%] left-1/2 z-20 hidden w-40 -translate-x-1/2 rounded-xl border bg-background p-2 text-left text-[11px] text-foreground shadow-lg group-hover:block">
            <div className="font-semibold truncate">{seat.student.name}</div>
            <div>Class: {seat.student.class_id}</div>
            <div>CIC: {seat.student.cic || '—'}</div>
            <div className={seat.present ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
              {seat.present ? 'Present' : 'Absent'}
            </div>
          </div>
        )}
      </button>
    </>
  );
}

function getHorizontalSeatLayout(seatMap: Map<number, TableSeatView>, activeSeatCount: number) {
  if (activeSeatCount <= 8) {
    return {
      topSeats: [1, 2, 3, 4].filter((n) => seatMap.has(n)),
      bottomSeats: [5, 6, 7, 8].filter((n) => seatMap.has(n)),
      leftSeats: [],
      rightSeats: [],
    };
  }

  if (activeSeatCount === 9) {
    return {
      topSeats: [1, 2, 3, 4].filter((n) => seatMap.has(n)),
      bottomSeats: [5, 6, 7, 8].filter((n) => seatMap.has(n)),
      leftSeats: [],
      rightSeats: [9].filter((n) => seatMap.has(n)),
    };
  }

  return {
    topSeats: [1, 2, 3, 4].filter((n) => seatMap.has(n)),
    bottomSeats: [5, 6, 7, 8].filter((n) => seatMap.has(n)),
    leftSeats: [10].filter((n) => seatMap.has(n)),
    rightSeats: [9].filter((n) => seatMap.has(n)),
  };
}

function getVerticalSeatLayout(seatMap: Map<number, TableSeatView>, activeSeatCount: number) {
  if (activeSeatCount <= 8) {
    return {
      leftSeats: [1, 2, 3, 4].filter((n) => seatMap.has(n)),
      rightSeats: [5, 6, 7, 8].filter((n) => seatMap.has(n)),
      topSeats: [],
      bottomSeats: [],
    };
  }

  if (activeSeatCount === 9) {
    return {
      leftSeats: [1, 2, 3, 4].filter((n) => seatMap.has(n)),
      rightSeats: [5, 6, 7, 8].filter((n) => seatMap.has(n)),
      topSeats: [9].filter((n) => seatMap.has(n)),
      bottomSeats: [],
    };
  }

  return {
    leftSeats: [1, 2, 3, 4].filter((n) => seatMap.has(n)),
    rightSeats: [5, 6, 7, 8].filter((n) => seatMap.has(n)),
    topSeats: [9].filter((n) => seatMap.has(n)),
    bottomSeats: [10].filter((n) => seatMap.has(n)),
  };
}

function TableCenter({
  tableData,
}: {
  tableData: TableViewData;
}) {
  return (
    <div className="flex min-h-[120px] w-full max-w-[220px] flex-col items-center justify-center rounded-2xl border bg-card px-4 py-4 shadow-inner sm:max-w-[250px]">
      <div className="text-center text-lg font-bold font-heading">
        {tableData.table.table_name || `Table ${tableData.table.table_number}`}
      </div>

      <div className="mt-3 rounded-2xl bg-brand-yellow px-5 py-3 text-center shadow">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-black">
          Plates Needed
        </div>
        <div className="text-3xl font-extrabold text-neutral-black sm:text-4xl">
          {tableData.totalNeededPlates}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Badge className="bg-green-600 hover:bg-green-600 text-white">
          Present {tableData.presentCount}
        </Badge>
        <Badge variant="destructive">
          Absent {tableData.absentCount}
        </Badge>
      </div>
    </div>
  );
}

function HorizontalTableLayout({
  tableData,
  onMobileSeatClick,
}: {
  tableData: TableViewData;
  onMobileSeatClick: (seat: TableSeatView) => void;
}) {
  const seatMap = new Map<number, TableSeatView>(
    tableData.seats.map((seat) => [seat.seatNumber, seat])
  );

  const { topSeats, bottomSeats, leftSeats, rightSeats } = getHorizontalSeatLayout(
    seatMap,
    tableData.table.active_seat_count
  );

  return (
    <div className="flex w-full justify-center overflow-x-auto">
      <div className="flex min-w-fit items-center gap-2 sm:gap-3 py-2">
        <div className="flex flex-col gap-2">
          {leftSeats.length > 0 ? (
            leftSeats.map((n) => (
              <SeatBubble key={n} seat={seatMap.get(n)!} onMobileClick={onMobileSeatClick} />
            ))
          ) : (
            <div className="w-0 sm:w-2" />
          )}
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex justify-center gap-2">
            {topSeats.map((n) => (
              <SeatBubble key={n} seat={seatMap.get(n)!} onMobileClick={onMobileSeatClick} />
            ))}
          </div>

          <TableCenter tableData={tableData} />

          <div className="flex justify-center gap-2">
            {bottomSeats.map((n) => (
              <SeatBubble key={n} seat={seatMap.get(n)!} onMobileClick={onMobileSeatClick} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {rightSeats.length > 0 ? (
            rightSeats.map((n) => (
              <SeatBubble key={n} seat={seatMap.get(n)!} onMobileClick={onMobileSeatClick} />
            ))
          ) : (
            <div className="w-0 sm:w-2" />
          )}
        </div>
      </div>
    </div>
  );
}

function VerticalTableLayout({
  tableData,
  onMobileSeatClick,
}: {
  tableData: TableViewData;
  onMobileSeatClick: (seat: TableSeatView) => void;
}) {
  const seatMap = new Map<number, TableSeatView>(
    tableData.seats.map((seat) => [seat.seatNumber, seat])
  );

  const { leftSeats, rightSeats, topSeats, bottomSeats } = getVerticalSeatLayout(
    seatMap,
    tableData.table.active_seat_count
  );

  return (
    <div className="flex w-full justify-center overflow-x-auto">
      <div className="flex min-w-fit flex-col items-center gap-3 py-2">
        {topSeats.length > 0 && (
          <div className="flex justify-center gap-2">
            {topSeats.map((n) => (
              <SeatBubble key={n} seat={seatMap.get(n)!} onMobileClick={onMobileSeatClick} />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex flex-col gap-2">
            {leftSeats.map((n) => (
              <SeatBubble key={n} seat={seatMap.get(n)!} onMobileClick={onMobileSeatClick} />
            ))}
          </div>

          <TableCenter tableData={tableData} />

          <div className="flex flex-col gap-2">
            {rightSeats.map((n) => (
              <SeatBubble key={n} seat={seatMap.get(n)!} onMobileClick={onMobileSeatClick} />
            ))}
          </div>
        </div>

        {bottomSeats.length > 0 && (
          <div className="flex justify-center gap-2">
            {bottomSeats.map((n) => (
              <SeatBubble key={n} seat={seatMap.get(n)!} onMobileClick={onMobileSeatClick} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TableCard({
  tableData,
  onMobileSeatClick,
}: {
  tableData: TableViewData;
  onMobileSeatClick: (seat: TableSeatView) => void;
}) {
  const sittingOrder = tableData.seats.map((seat) => seat.seatNumber).join(', ');

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-lg">
          <span>{tableData.table.table_name || `Table ${tableData.table.table_number}`}</span>
          <span className="text-xs font-normal text-muted-foreground">
            Sitting Order: {sittingOrder}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {tableData.table.orientation === 'vertical' ? (
          <VerticalTableLayout tableData={tableData} onMobileSeatClick={onMobileSeatClick} />
        ) : (
          <HorizontalTableLayout tableData={tableData} onMobileSeatClick={onMobileSeatClick} />
        )}
      </CardContent>
    </Card>
  );
}

export default function ChefDashboardPage() {
  const { user: authUser } = useUserData();

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [tables, setTables] = useState<KitchenTable[]>([]);
  const [assignments, setAssignments] = useState<KitchenSeatAssignment[]>([]);
  const [students, setStudents] = useState<KitchenStudentLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mealTab, setMealTab] = useState<MealTab>('day');
  const [selectedSeat, setSelectedSeat] = useState<TableSeatView | null>(null);

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
        throw new Error('You are not allowed to access chef dashboard.');
      }

      setProfile(data as AdminProfile);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
      toast.error('Failed to load profile', { description: err.message });
    } finally {
      setProfileLoading(false);
    }
  }, [authUser?.id]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        { data: tablesData, error: tablesError },
        { data: assignmentsData, error: assignmentsError },
        { data: studentsData, error: studentsError },
      ] = await Promise.all([
        supabase
          .from('kitchen_tables')
          .select('id, table_number, table_name, is_active, row_number, row_position, orientation, active_seat_count, display_order')
          .eq('is_active', true)
          .order('row_number', { ascending: true })
          .order('display_order', { ascending: true })
          .order('table_number', { ascending: true }),

        supabase
          .from('kitchen_seat_assignments')
          .select('id, student_uid, kitchen_table_id, seat_number')
          .order('seat_number', { ascending: true }),

        supabase
          .from('kitchen_students')
          .select('student_uid, name, cic, class_id, day_present, noon_present, night_present')
          .order('name', { ascending: true }),
      ]);

      if (tablesError) throw tablesError;
      if (assignmentsError) throw assignmentsError;
      if (studentsError) throw studentsError;

      setTables((tablesData || []) as KitchenTable[]);
      setAssignments((assignmentsData || []) as KitchenSeatAssignment[]);
      setStudents((studentsData || []) as KitchenStudentLite[]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load dashboard data');
      toast.error('Failed to load chef dashboard', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser?.id) {
      fetchProfile();
    }
  }, [authUser?.id, fetchProfile]);

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
    }
  }, [profile, fetchDashboardData]);

  const studentMap = useMemo(() => {
    const map = new Map<string, KitchenStudentLite>();
    students.forEach((student) => {
      map.set(student.student_uid, student);
    });
    return map;
  }, [students]);

  const tableDataList = useMemo<TableViewData[]>(() => {
    return tables.map((table) => {
      const seatNumbers = Array.from({ length: table.active_seat_count }, (_, i) => i + 1);

      const tableAssignments = assignments.filter(
        (assignment) => assignment.kitchen_table_id === table.id
      );

      const seats: TableSeatView[] = seatNumbers.map((seatNumber) => {
        const assignment = tableAssignments.find((a) => a.seat_number === seatNumber);
        const student = assignment ? studentMap.get(assignment.student_uid) || null : null;
        const present = getMealPresence(student, mealTab);

        return {
          seatNumber,
          enabled: seatNumber <= table.active_seat_count,
          student,
          present,
        };
      });

      const assignedSeats = seats.filter((s) => s.student);
      const presentCount = assignedSeats.filter((s) => s.present === true).length;
      const absentCount = assignedSeats.filter((s) => s.present === false).length;

      return {
        table,
        seats,
        presentCount,
        absentCount,
        totalNeededPlates: presentCount,
      };
    });
  }, [tables, assignments, studentMap, mealTab]);

  const groupedRows = useMemo(() => {
    const rows = new Map<number, TableViewData[]>();

    for (const table of tableDataList) {
      const current = rows.get(table.table.row_number) || [];
      current.push(table);
      rows.set(table.table.row_number, current);
    }

    return Array.from(rows.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([rowNumber, rowTables]) => ({
        rowNumber,
        tables: rowTables.sort((a, b) => {
          const orderMap = { left: 1, middle: 2, right: 3 };
          return orderMap[a.table.row_position] - orderMap[b.table.row_position];
        }),
      }));
  }, [tableDataList]);

  const summary = useMemo(() => {
    const assignedStudentIds = new Set(assignments.map((assignment) => assignment.student_uid));
    const uniqueStudents = Array.from(assignedStudentIds)
      .map((studentUid) => studentMap.get(studentUid))
      .filter(Boolean) as KitchenStudentLite[];

    const presentMembers = uniqueStudents.filter((s) => getMealPresence(s, mealTab) === true).length;
    const absentMembers = uniqueStudents.filter((s) => getMealPresence(s, mealTab) === false).length;

    return {
      totalMembers: uniqueStudents.length,
      presentMembers,
      absentMembers,
    };
  }, [assignments, studentMap, mealTab]);

  const mealTitle =
    mealTab === 'day' ? 'Day' : mealTab === 'noon' ? 'Noon' : 'Night';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-primary" />
            Kitchen Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Live table-wise kitchen attendance and plate count for {mealTitle}.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={fetchDashboardData}
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

      <Tabs value={mealTab} onValueChange={(value) => setMealTab(value as MealTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="day">
            <Sun className="mr-2 h-4 w-4" />
            Day
          </TabsTrigger>
          <TabsTrigger value="noon">
            <UtensilsCrossed className="mr-2 h-4 w-4" />
            Noon
          </TabsTrigger>
          <TabsTrigger value="night">
            <MoonStar className="mr-2 h-4 w-4" />
            Night
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {profileLoading || loading ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[340px] w-full rounded-2xl" />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              title="Total Members"
              value={summary.totalMembers}
              description="Members assigned to tables"
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              title="Present Members"
              value={summary.presentMembers}
              description={`${mealTitle} present count`}
              icon={<UtensilsCrossed className="h-5 w-5" />}
            />
            <StatCard
              title="Absent Members"
              value={summary.absentMembers}
              description={`${mealTitle} absent count`}
              icon={<AlertCircle className="h-5 w-5" />}
            />
          </div>

          {groupedRows.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <ChefHat className="mb-4 h-10 w-10 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No kitchen table layout found</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Set up your tables and seat assignments in kitchen settings.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {groupedRows.map((row) => (
                <div key={row.rowNumber} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold font-heading">Row {row.rowNumber}</h2>
                    <Badge variant="outline">
                      {row.tables.length} Table{row.tables.length > 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    {row.tables.map((tableData) => (
                      <TableCard
                        key={tableData.table.id}
                        tableData={tableData}
                        onMobileSeatClick={setSelectedSeat}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <SeatInfoModal
        seat={selectedSeat}
        open={!!selectedSeat}
        onClose={() => setSelectedSeat(null)}
      />
    </div>
  );
}