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
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import {
  fetchKitchenAttendanceForDate,
  formatKitchenDateLabel,
  getIstTodayDateValue,
} from '@/lib/kitchenAttendance';

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
  isTemporary: boolean;
  temporaryKind: 'present' | 'absent' | null;
}

interface TableViewData {
  table: KitchenTable;
  seats: TableSeatView[];
  presentCount: number;
  absentCount: number;
  totalNeededPlates: number;
}

interface SelectedSeatState {
  tableId: string;
  seatNumber: number;
}

interface TempOverride {
  present: boolean;
  expiresAt: number;
}

interface StudentFoodPreference {
  student_uid: string;
  food_item_id: string;
  is_needed: boolean;
}

const TEMP_OVERRIDE_STORAGE_KEY = "chef_dashboard_temp_presence_overrides_v1";
const TEMP_OVERRIDE_DURATION_MS = 2 * 60 * 60 * 1000;

function getMealPresence(student: KitchenStudentLite | null, meal: MealTab): boolean | null {
  if (!student) return null;
  if (meal === 'day') return student.day_present;
  if (meal === 'noon') return student.noon_present;
  return student.night_present;
}

function getOverrideKey(studentUid: string, meal: MealTab) {
  return `${studentUid}__${meal}`;
}

function cleanExpiredOverrides(input: Record<string, TempOverride>) {
  const now = Date.now();
  const cleaned: Record<string, TempOverride> = {};

  Object.entries(input).forEach(([key, value]) => {
    if (value.expiresAt > now) {
      cleaned[key] = value;
    }
  });

  return cleaned;
}

function getEffectiveSeatPresence(
  student: KitchenStudentLite | null,
  meal: MealTab,
  overrides: Record<string, TempOverride>
): {
  present: boolean | null;
  isTemporary: boolean;
  temporaryKind: 'present' | 'absent' | null;
} {
  if (!student) {
    return {
      present: null,
      isTemporary: false,
      temporaryKind: null,
    };
  }

  const override = overrides[getOverrideKey(student.student_uid, meal)];

  if (override && override.expiresAt > Date.now()) {
    return {
      present: override.present,
      isTemporary: true,
      temporaryKind: override.present ? 'present' : 'absent',
    };
  }

  return {
    present: getMealPresence(student, meal),
    isTemporary: false,
    temporaryKind: null,
  };
}

function formatTimeLeft(expiresAt: number) {
  const diff = Math.max(0, expiresAt - Date.now());
  const totalMinutes = Math.ceil(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes} min`;
  return `${hours} hr ${minutes} min`;
}

function isFoodNeeded(
  studentUid: string,
  selectedFood: string | null,
  preferences: StudentFoodPreference[],
  mealTab: 'day' | 'noon' | 'night'
) {
  if (mealTab !== 'day') return true; 
  if (!selectedFood) return true;

  const pref = preferences.find(
    (p) =>
      p.student_uid === studentUid &&
      p.food_item_id === selectedFood
  );

  return pref ? pref.is_needed : true;
}

function getSeatLabelClass(
  hasStudent: boolean,
  seat: TableSeatView,
  selectedFood: string | null,
  foodPreferences: StudentFoodPreference[],
  mealTab: 'day' | 'noon' | 'night'
) {
  if (!hasStudent) {
    return 'bg-muted text-muted-foreground border-border';
  }

  const needed = seat.student ? isFoodNeeded(seat.student.student_uid, selectedFood, foodPreferences, mealTab) : true;

  if (mealTab === "day" && !needed && seat.present === true) {
    return 'bg-[#FACC15] text-black border-[#FACC15] shadow-md shadow-[#FACC15]/20';
  } else if (seat.isTemporary && seat.present === false) {
    return 'bg-[#F59E0B] text-white border-[#F59E0B] shadow-md shadow-[#F59E0B]/20';
  } else if (seat.isTemporary && seat.present === true) {
    return 'bg-[#0073cf] text-white border-[#0073cf] shadow-md shadow-[#0073cf]/20';
  } else if (seat.present) {
    return 'bg-green-600 text-white border-green-700';
  } else {
    return 'bg-red-600 text-white border-red-700';
  }
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
  seatData,
  selectedSeatOverride,
  open,
  onClose,
  setTemporarySeatStatus,
}: {
  seatData: TableSeatView | null;
  selectedSeatOverride: TempOverride | null;
  open: boolean;
  onClose: () => void;
  setTemporarySeatStatus: (uid: string, present: boolean) => void;
}) {
  if (!open || !seatData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl border bg-background p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold font-heading">Seat {seatData.seatNumber}</h3>
          <Button size="icon" variant="ghost" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {!seatData.student ? (
          <div className="py-4 text-center text-sm text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
            Empty seat
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 text-sm bg-muted/20 p-4 rounded-xl border">
              <div><span className="font-medium text-foreground">Name:</span> {seatData.student.name}</div>
              <div><span className="font-medium text-foreground">Class:</span> {seatData.student.class_id}</div>
              <div><span className="font-medium text-foreground">CIC:</span> {seatData.student.cic || '—'}</div>
              <div className="pt-2 flex items-center gap-2">
                <span className="font-medium text-foreground">Status:</span>
                <Badge 
                  variant="outline" 
                  className={
                    seatData.isTemporary && seatData.present === false ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20' :
                    seatData.isTemporary && seatData.present === true ? 'bg-[#0073cf]/10 text-[#0073cf] border-[#0073cf]/20' :
                    seatData.present ? 'bg-green-600/10 text-green-600 border-green-600/20' : 
                    'bg-red-600/10 text-red-600 border-red-600/20'
                  }
                >
                  {seatData.isTemporary
                    ? seatData.present
                      ? "Temporary Present"
                      : "Temporary Absent"
                    : seatData.present
                      ? "Present"
                      : "Absent"}
                </Badge>
              </div>
            </div>

            {selectedSeatOverride && (
              <div className="rounded-xl bg-primary/5 p-3 border border-primary/20 flex items-center gap-3 text-sm">
                <AlertCircle className="w-4 h-4 text-primary shrink-0" />
                <span className="text-primary font-medium">
                  Override active for {formatTimeLeft(selectedSeatOverride.expiresAt)}.
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button 
                className="w-full bg-[#0073cf] hover:bg-[#0073cf]/90 text-white rounded-xl" 
                onClick={() => {
                  setTemporarySeatStatus(seatData.student!.student_uid, true);
                  onClose();
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Present
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10 rounded-xl" 
                onClick={() => {
                  setTemporarySeatStatus(seatData.student!.student_uid, false);
                  onClose();
                }}
              >
                <XCircle className="w-4 h-4 mr-2" /> Absent
              </Button>
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
  selectedFood,
  foodPreferences,
  mealTab,
}: {
  seat: TableSeatView;
  onMobileClick: (seat: TableSeatView) => void;
  selectedFood: string | null;
  foodPreferences: StudentFoodPreference[];
  mealTab: 'day' | 'noon' | 'night';
}) {
  const hasStudent = !!seat.student;
  const labelClass = getSeatLabelClass(hasStudent, seat, selectedFood, foodPreferences, mealTab);

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
              {seat.isTemporary ? (seat.present ? 'Temp Present' : 'Temp Absent') : (seat.present ? 'Present' : 'Absent')}
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
  selectedFood,
  foodPreferences,
  mealTab,
}: {
  tableData: TableViewData;
  onMobileSeatClick: (seat: TableSeatView) => void;
  selectedFood: string | null;
  foodPreferences: StudentFoodPreference[];
  mealTab: 'day' | 'noon' | 'night';
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
              <SeatBubble key={n} seat={seatMap.get(n)!} onMobileClick={onMobileSeatClick} selectedFood={selectedFood} foodPreferences={foodPreferences} mealTab={mealTab} />
            ))
          ) : (
            <div className="w-0 sm:w-2" />
          )}
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex justify-center gap-2">
            {topSeats.map((n) => (
              <SeatBubble key={n} seat={seatMap.get(n)!} onMobileClick={onMobileSeatClick} selectedFood={selectedFood} foodPreferences={foodPreferences} mealTab={mealTab} />
            ))}
          </div>

          <TableCenter tableData={tableData} />

          <div className="flex justify-center gap-2">
            {bottomSeats.map((n) => (
              <SeatBubble key={n} seat={seatMap.get(n)!} onMobileClick={onMobileSeatClick} selectedFood={selectedFood} foodPreferences={foodPreferences} mealTab={mealTab} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {rightSeats.length > 0 ? (
            rightSeats.map((n) => (
              <SeatBubble key={n} seat={seatMap.get(n)!} onMobileClick={onMobileSeatClick} selectedFood={selectedFood} foodPreferences={foodPreferences} mealTab={mealTab} />
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
  selectedFood,
  foodPreferences,
  mealTab,
}: {
  tableData: TableViewData;
  onMobileSeatClick: (seat: TableSeatView) => void;
  selectedFood: string | null;
  foodPreferences: StudentFoodPreference[];
  mealTab: 'day' | 'noon' | 'night';
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
              <SeatBubble key={n} seat={seatMap.get(n)!} onMobileClick={onMobileSeatClick} selectedFood={selectedFood} foodPreferences={foodPreferences} mealTab={mealTab} />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex flex-col gap-2">
            {leftSeats.map((n) => (
              <SeatBubble key={n} seat={seatMap.get(n)!} onMobileClick={onMobileSeatClick} selectedFood={selectedFood} foodPreferences={foodPreferences} mealTab={mealTab} />
            ))}
          </div>

          <TableCenter tableData={tableData} />

          <div className="flex flex-col gap-2">
            {rightSeats.map((n) => (
              <SeatBubble key={n} seat={seatMap.get(n)!} onMobileClick={onMobileSeatClick} selectedFood={selectedFood} foodPreferences={foodPreferences} mealTab={mealTab} />
            ))}
          </div>
        </div>

        {bottomSeats.length > 0 && (
          <div className="flex justify-center gap-2">
            {bottomSeats.map((n) => (
              <SeatBubble key={n} seat={seatMap.get(n)!} onMobileClick={onMobileSeatClick} selectedFood={selectedFood} foodPreferences={foodPreferences} mealTab={mealTab} />
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
  selectedFood,
  foodPreferences,
  mealTab,
}: {
  tableData: TableViewData;
  onMobileSeatClick: (seat: TableSeatView) => void;
  selectedFood: string | null;
  foodPreferences: StudentFoodPreference[];
  mealTab: 'day' | 'noon' | 'night';
}) {
  const sittingOrder = tableData.seats.map((seat) => seat.seatNumber).join(', ');

  return (
    <Card className="border-border/60 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="pb-2 bg-muted/10 border-b border-border/30 rounded-t-xl">
        <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-lg">
          <span className="font-heading">{tableData.table.table_name || `Table ${tableData.table.table_number}`}</span>
          <span className="text-xs font-normal text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded-md">
            Seats: {sittingOrder}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4">
        {tableData.table.orientation === 'vertical' ? (
          <VerticalTableLayout tableData={tableData} onMobileSeatClick={onMobileSeatClick} selectedFood={selectedFood} foodPreferences={foodPreferences} mealTab={mealTab} />
        ) : (
          <HorizontalTableLayout tableData={tableData} onMobileSeatClick={onMobileSeatClick} selectedFood={selectedFood} foodPreferences={foodPreferences} mealTab={mealTab} />
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
  const [selectedSeat, setSelectedSeat] = useState<SelectedSeatState | null>(null);

  const [tempOverrides, setTempOverrides] = useState<Record<string, TempOverride>>({});
  const [overrideLoaded, setOverrideLoaded] = useState(false);
  const [selectedFood, setSelectedFood] = useState<string | null>(null);
  const [foodItems, setFoodItems] = useState<any[]>([]);
  const [foodPreferences, setFoodPreferences] = useState<StudentFoodPreference[]>([]);

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
        { data: foodItemsData, error: foodItemsError },
        { data: preferencesData, error: prefsError },
        studentsData,
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
        
        supabase.from('food_items').select('*').eq('is_active', true).order('display_order', { ascending: true }),
        supabase.from('student_food_preferences').select('id, student_uid, food_item_id, is_needed'),
        fetchKitchenAttendanceForDate(getIstTodayDateValue()),
      ]);

      if (tablesError) throw tablesError;
      if (assignmentsError) throw assignmentsError;
      if (foodItemsError) throw foodItemsError;
      if (prefsError) throw prefsError;

      setTables((tablesData || []) as KitchenTable[]);
      setAssignments((assignmentsData || []) as KitchenSeatAssignment[]);
      setStudents((studentsData || []) as KitchenStudentLite[]);
      
      setFoodItems(foodItemsData || []);
      setFoodPreferences((preferencesData || []) as StudentFoodPreference[]);

      if (foodItemsData?.length && !selectedFood) {
        setSelectedFood(foodItemsData[0].id);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load dashboard data');
      toast.error('Failed to load chef dashboard', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [selectedFood]);

  const loadTempOverrides = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem(TEMP_OVERRIDE_STORAGE_KEY);
      if (!raw) {
        setTempOverrides({});
        setOverrideLoaded(true);
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, TempOverride>;
      const cleaned = cleanExpiredOverrides(parsed);
      setTempOverrides(cleaned);
      localStorage.setItem(TEMP_OVERRIDE_STORAGE_KEY, JSON.stringify(cleaned));
    } catch {
      setTempOverrides({});
    } finally {
      setOverrideLoaded(true);
    }
  }, []);

  const saveTempOverrides = useCallback((next: Record<string, TempOverride>) => {
    try {
      if (typeof window === 'undefined') return;
      const cleaned = cleanExpiredOverrides(next);
      setTempOverrides(cleaned);
      localStorage.setItem(TEMP_OVERRIDE_STORAGE_KEY, JSON.stringify(cleaned));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const setTemporarySeatStatus = useCallback(
    (studentUid: string, present: boolean) => {
      const key = getOverrideKey(studentUid, mealTab);
      const next = {
        ...tempOverrides,
        [key]: {
          present,
          expiresAt: Date.now() + TEMP_OVERRIDE_DURATION_MS,
        },
      };
      saveTempOverrides(next);
      toast.success(`Temporary ${present ? 'Present' : 'Absent'} override applied.`, { description: `This will last for 2 hours.` });
    },
    [mealTab, tempOverrides, saveTempOverrides]
  );

  useEffect(() => {
    if (authUser?.id) fetchProfile();
  }, [authUser?.id, fetchProfile]);

  useEffect(() => {
    if (profile) fetchDashboardData();
  }, [profile, fetchDashboardData]);

  useEffect(() => {
    loadTempOverrides();
  }, [loadTempOverrides]);

  useEffect(() => {
    const interval = setInterval(() => {
      const cleaned = cleanExpiredOverrides(tempOverrides);
      const currentKeys = Object.keys(tempOverrides);
      const cleanedKeys = Object.keys(cleaned);

      if (currentKeys.length !== cleanedKeys.length) {
        setTempOverrides(cleaned);
        if (typeof window !== 'undefined') {
          localStorage.setItem(TEMP_OVERRIDE_STORAGE_KEY, JSON.stringify(cleaned));
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [tempOverrides]);

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
        
        const effective = getEffectiveSeatPresence(student, mealTab, tempOverrides);

        return {
          seatNumber,
          enabled: seatNumber <= table.active_seat_count,
          student,
          present: effective.present,
          isTemporary: effective.isTemporary,
          temporaryKind: effective.temporaryKind,
        };
      });

      const assignedSeats = seats.filter((s) => s.student);
      const presentSeats = assignedSeats.filter((s) => s.present === true);
      
      const notNeededCount = presentSeats.filter(
        (s) =>
          s.student &&
          !isFoodNeeded(s.student.student_uid, selectedFood, foodPreferences, mealTab)
      ).length;

      const presentCount = presentSeats.length;
      const absentCount = assignedSeats.filter((s) => s.present === false).length;

      const totalNeededPlates = presentCount - notNeededCount;

      return {
        table,
        seats,
        presentCount,
        absentCount,
        totalNeededPlates,
      };
    });
  }, [tables, assignments, studentMap, mealTab, tempOverrides, selectedFood, foodPreferences]);

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

    const presentMembers = uniqueStudents.filter((s) => {
      const present = getEffectiveSeatPresence(s, mealTab, tempOverrides).present === true;
      const needed = isFoodNeeded(s.student_uid, selectedFood, foodPreferences, mealTab);
      return present && needed;
    }).length;

    const absentMembers = uniqueStudents.filter(
      (s) => getEffectiveSeatPresence(s, mealTab, tempOverrides).present === false
    ).length;

    return {
      totalMembers: uniqueStudents.length,
      presentMembers,
      absentMembers,
    };
  }, [assignments, studentMap, mealTab, tempOverrides, selectedFood, foodPreferences]);

  const selectedSeatData = useMemo(() => {
    if (!selectedSeat) return null;
    const table = tableDataList.find((t) => t.table.id === selectedSeat.tableId);
    if (!table) return null;
    return table.seats.find((s) => s.seatNumber === selectedSeat.seatNumber) || null;
  }, [selectedSeat, tableDataList]);

  const selectedSeatOverride = useMemo(() => {
    if (!selectedSeatData?.student) return null;
    const key = getOverrideKey(selectedSeatData.student.student_uid, mealTab);
    return tempOverrides[key] || null;
  }, [selectedSeatData, tempOverrides, mealTab]);

  const mealTitle = mealTab === 'day' ? 'Day' : mealTab === 'noon' ? 'Noon' : 'Night';
  const todayLabel = useMemo(() => formatKitchenDateLabel(getIstTodayDateValue()), []);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20 mb-2">
             Kitchen Overview
          </div>
          <h1 className="text-3xl font-bold font-heading flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-primary" />
            Chef Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Live plate count for {mealTitle} on {todayLabel}.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={fetchDashboardData}
          disabled={loading || profileLoading}
          className="rounded-xl shadow-sm"
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
        <TabsList className="grid w-full grid-cols-3 max-w-md h-auto p-1 rounded-2xl">
          <TabsTrigger value="day" className="py-2.5 rounded-xl">
            <Sun className="mr-2 h-4 w-4" />
            Breakfast
          </TabsTrigger>
          <TabsTrigger value="noon" className="py-2.5 rounded-xl">
            <UtensilsCrossed className="mr-2 h-4 w-4" />
            Lunch
          </TabsTrigger>
          <TabsTrigger value="night" className="py-2.5 rounded-xl">
            <MoonStar className="mr-2 h-4 w-4" />
            Dinner
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mealTab === 'day' && foodItems.length > 0 && (
        <div className="mb-4 animate-in slide-in-from-left-4 duration-300">
          <h3 className="text-sm font-bold font-heading mb-3 text-foreground">Food Selection Filter</h3>
          <div className="flex w-full overflow-x-auto pb-2 gap-2 hide-scrollbar">
            {foodItems.map((food) => (
              <button
                key={food.id}
                onClick={() => setSelectedFood(food.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  selectedFood === food.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-muted/30 text-foreground border-transparent hover:bg-muted/60'
                }`}
              >
                {food.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {profileLoading || loading || !overrideLoaded ? (
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
              description="Will eat this meal"
              icon={<UtensilsCrossed className="h-5 w-5" />}
            />
            <StatCard
              title="Absent Members"
              value={summary.absentMembers}
              description="Will not eat"
              icon={<AlertCircle className="h-5 w-5" />}
            />
          </div>

          {groupedRows.length === 0 ? (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <ChefHat className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-bold text-foreground">No tables found</h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Set up your kitchen tables and seat assignments in the officer settings.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8 mt-8">
              {groupedRows.map((row) => (
                <div key={row.rowNumber} className="space-y-5">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold font-heading text-foreground">Row {row.rowNumber}</h2>
                    <Badge variant="secondary" className="rounded-full px-3">
                      {row.tables.length} Table{row.tables.length > 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    {row.tables.map((tableData) => (
                      <TableCard
                        key={tableData.table.id}
                        tableData={tableData}
                        onMobileSeatClick={(seat) => setSelectedSeat({ tableId: tableData.table.id, seatNumber: seat.seatNumber })}
                        selectedFood={selectedFood}
                        foodPreferences={foodPreferences}
                        mealTab={mealTab}
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
        seatData={selectedSeatData}
        selectedSeatOverride={selectedSeatOverride}
        open={!!selectedSeat}
        onClose={() => setSelectedSeat(null)}
        setTemporarySeatStatus={setTemporarySeatStatus}
      />
    </div>
  );
}