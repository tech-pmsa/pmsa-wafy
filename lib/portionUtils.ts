import { supabase } from '@/lib/supabaseClient';

export type Semester = 'SEM-1' | 'SEM-2';

export const SEMESTER_LABELS: Record<Semester, string> = {
  'SEM-1': 'SEM 1 (Nov)',
  'SEM-2': 'SEM 2 (May)',
};

export type WeekBlock = {
  key: string;
  monthKey: string;
  monthLabel: string;
  weekNo: number;
  dateFrom: string;
  dateTo: string;
  workingDates: string[];
};

export const SEMESTER_MONTHS: Record<
  Semester,
  { month: number; label: string; half?: 'first' | 'second' }[]
> = {
  'SEM-1': [
    { month: 5, label: 'Jun', half: 'second' },
    { month: 6, label: 'Jul' },
    { month: 7, label: 'Aug' },
    { month: 8, label: 'Sep' },
    { month: 9, label: 'Oct' },
    { month: 10, label: 'Nov', half: 'first' },
  ],
  'SEM-2': [
    { month: 10, label: 'Nov', half: 'second' },
    { month: 11, label: 'Dec' },
    { month: 0, label: 'Jan' },
    { month: 1, label: 'Feb' },
    { month: 2, label: 'Mar' },
    { month: 3, label: 'Apr' },
    { month: 4, label: 'May' },
  ],
};

export function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function displayDate(value?: string | null) {
  if (!value) return '-';
  const [year, month, day] = value.split('T')[0].split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function getAcademicYearBase(today = new Date()) {
  const year = today.getFullYear();
  return today.getMonth() >= 5 ? year : year - 1;
}

export function getSemesterDates(semester: Semester, academicYear = getAcademicYearBase()) {
  const months = SEMESTER_MONTHS[semester];
  const dates: { value: string; label: string; monthKey: string; monthLabel: string }[] = [];

  for (const item of months) {
    const year = item.month >= 5 ? academicYear : academicYear + 1;
    const lastDay = new Date(year, item.month + 1, 0).getDate();
    const startDay = 1;
    const endDay = lastDay;
    const monthKey = `${year}-${String(item.month + 1).padStart(2, '0')}`;

    for (let day = startDay; day <= endDay; day += 1) {
      const date = new Date(year, item.month, day);
      const value = toDateValue(date);
      dates.push({
        value,
        label: String(day),
        monthKey,
        monthLabel: item.label,
      });
    }
  }

  return dates;
}

export function buildWorkingWeeks(
  semester: Semester,
  excludedDates: Set<string>,
  academicYear = getAcademicYearBase()
): WeekBlock[] {
  const allDates = getSemesterDates(semester, academicYear);
  const weeks: WeekBlock[] = [];

  for (const monthConfig of SEMESTER_MONTHS[semester]) {
    const monthDates = allDates.filter(
      (d) => d.monthLabel === monthConfig.label
    );
    if (!monthDates.length) continue;

    const monthKey = monthDates[0].monthKey;
    const monthLabel = monthConfig.label;

    const workingMonthDates = monthDates.filter(
      (d) => !excludedDates.has(d.value)
    );

    if (workingMonthDates.length > 0) {
      let weekNo = 1;
      for (let i = 0; i < workingMonthDates.length; i += 6) {
        const slice = workingMonthDates.slice(i, i + 6);
        if (!slice.length) continue;

        weeks.push({
          key: `${monthKey}-W${weekNo}`,
          monthKey,
          monthLabel,
          weekNo,
          dateFrom: slice[0].value,
          dateTo: slice[slice.length - 1].value,
          workingDates: slice.map((d) => d.value),
        });
        weekNo += 1;
      }
    }
  }

  return weeks;
}

export function getPortionStatus(actual: number, expected: number) {
  if (expected <= 0) return 'same';
  const diff = actual - expected;
  if (diff < -0.01) return 'back';
  if (diff > 0.01) return 'ahead';
  return 'same';
}

export function statusLabel(status: string, diffOrActual?: number, expected?: number): string {
  let diff: number | undefined;
  if (expected !== undefined && diffOrActual !== undefined) {
    diff = diffOrActual - expected;
  } else if (diffOrActual !== undefined) {
    diff = diffOrActual;
  }

  if (diff !== undefined && diff !== null) {
    const absDiff = Math.abs(diff);
    const formatted = Number(absDiff.toFixed(1)).toString();
    const unit = formatted === '1' ? 'page' : 'pages';
    if (status === 'back') return `Behind by ${formatted} ${unit}`;
    if (status === 'ahead') return `Ahead by ${formatted} ${unit}`;
    return 'On Track';
  }
  if (status === 'back') return 'Behind';
  if (status === 'ahead') return 'Ahead';
  return 'On Track';
}

export type SubjectProgressStatus = {
  status: 'back' | 'ahead' | 'same';
  diff: number;
  actual: number;
  expected: number;
  latestWeekNo: number;
  hasUpdates: boolean;
};

export function computeSubjectProgressStatus(
  weeks: WeekBlock[],
  weekAllocations: Record<string, { expectedPeriod?: number; expP?: number; expectedPages?: number; expPg?: number }>,
  progressMap: Record<string, { period_taken?: any; pages_taken?: any } | undefined>
): SubjectProgressStatus {
  if (!weeks.length) {
    return { status: 'same', diff: 0, actual: 0, expected: 0, latestWeekNo: 0, hasUpdates: false };
  }

  // Find all week indices that have been updated
  const updatedIndices: number[] = [];
  weeks.forEach((w, idx) => {
    const rec = progressMap[w.key];
    const hasPages = rec?.pages_taken !== '' && rec?.pages_taken !== null && rec?.pages_taken !== undefined && n(rec?.pages_taken) > 0;
    const hasPeriod = rec?.period_taken !== '' && rec?.period_taken !== null && rec?.period_taken !== undefined && n(rec?.period_taken) > 0;
    if (hasPages || hasPeriod) {
      updatedIndices.push(idx);
    }
  });

  const hasUpdates = updatedIndices.length > 0;
  // If no updates yet: default to first week (index 0) so default shows behind by week 1's quota
  const lastIndex = hasUpdates ? updatedIndices[updatedIndices.length - 1] : 0;
  const targetWeeks = weeks.slice(0, lastIndex + 1);

  let totalActual = 0;
  let totalExpected = 0;

  targetWeeks.forEach((w) => {
    const rec = progressMap[w.key];
    const alloc = weekAllocations[w.key];
    const expPages = alloc ? (alloc.expectedPages ?? alloc.expPg ?? 0) : 0;
    const actPages = n(rec?.pages_taken);

    totalActual += actPages;
    totalExpected += expPages;
  });

  const diff = totalActual - totalExpected;
  const status = getPortionStatus(totalActual, totalExpected);

  return {
    status,
    diff,
    actual: totalActual,
    expected: totalExpected,
    latestWeekNo: targetWeeks[targetWeeks.length - 1].weekNo,
    hasUpdates,
  };
}

export function getDefaultSemester(date = new Date()): Semester {
  const month = date.getMonth(); // 0 = Jan, 5 = June, 10 = Nov, 11 = Dec
  if (month === 10) {
    return date.getDate() > 15 ? 'SEM-2' : 'SEM-1';
  }
  if (month >= 5 && month < 10) {
    return 'SEM-1';
  }
  return 'SEM-2';
}

export function getSemesterDisplayName(semester: Semester): string {
  return SEMESTER_LABELS[semester] || (semester === 'SEM-1' ? 'SEM 1 (Nov)' : 'SEM 2 (May)');
}

export type SemesterDaysLeftInfo = {
  workingDaysLeft: number;
  calendarDaysLeft: number;
  totalWorkingDays: number;
  totalDates: number;
  isPast: boolean;
  isFuture: boolean;
  startDate: string;
  endDate: string;
};

export function getSemesterDaysLeft(
  semester: Semester,
  excludedDates: Set<string>,
  academicYear = getAcademicYearBase(),
  today = new Date()
): SemesterDaysLeftInfo {
  const allDates = getSemesterDates(semester, academicYear);
  if (!allDates.length) {
    return {
      workingDaysLeft: 0,
      calendarDaysLeft: 0,
      totalWorkingDays: 0,
      totalDates: 0,
      isPast: false,
      isFuture: false,
      startDate: '',
      endDate: '',
    };
  }

  const todayStr = toDateValue(today);
  const startDate = allDates[0].value;
  const endDate = allDates[allDates.length - 1].value;
  const totalWorkingDays = allDates.filter((d) => !excludedDates.has(d.value)).length;

  if (todayStr > endDate) {
    return {
      workingDaysLeft: 0,
      calendarDaysLeft: 0,
      totalWorkingDays,
      totalDates: allDates.length,
      isPast: true,
      isFuture: false,
      startDate,
      endDate,
    };
  }

  if (todayStr < startDate) {
    return {
      workingDaysLeft: totalWorkingDays,
      calendarDaysLeft: allDates.length,
      totalWorkingDays,
      totalDates: allDates.length,
      isPast: false,
      isFuture: true,
      startDate,
      endDate,
    };
  }

  const remainingDates = allDates.filter((d) => d.value >= todayStr);
  const remainingWorkingDates = remainingDates.filter((d) => !excludedDates.has(d.value));

  return {
    workingDaysLeft: remainingWorkingDates.length,
    calendarDaysLeft: remainingDates.length,
    totalWorkingDays,
    totalDates: allDates.length,
    isPast: false,
    isFuture: false,
    startDate,
    endDate,
  };
}

export function getRemainingWorkingDays(
  semesterDates: { value: string }[],
  excludedDates: Set<string>,
  referenceDate = new Date()
): number {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');
  const refStr = `${year}-${month}-${day}`;
  return semesterDates.filter((d) => d.value >= refStr && !excludedDates.has(d.value)).length;
}

export function n(value: any): number {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Distributes an integer total (e.g. total_period) across items proportionally to their weights
 * (e.g. working days) using the largest remainder (Hamilton) method.
 * Guarantees every item gets an integer and the sum is exactly equal to total.
 */
export function allocateIntegerTotal(total: number, weights: number[]): number[] {
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  if (sumWeights <= 0 || total <= 0) {
    return weights.map(() => 0);
  }

  const exactQuotas = weights.map((w) => (total * w) / sumWeights);
  const floors = exactQuotas.map((q) => Math.floor(q));
  const allocated = floors.reduce((a, b) => a + b, 0);
  const remainderCount = Math.round(total - allocated);

  const remainders = exactQuotas.map((q, idx) => ({
    idx,
    rem: q - floors[idx],
  }));

  remainders.sort((a, b) => b.rem - a.rem);

  for (let i = 0; i < remainderCount && i < remainders.length; i++) {
    floors[remainders[i].idx] += 1;
  }

  return floors;
}

export type WeeklyProgressLike = {
  week_key: string;
  pages_taken?: number | string | null;
  period_taken?: number | string | null;
};

export type SubjectWeeklyStatus = {
  status: 'back' | 'ahead' | 'same';
  diff: number;
  actualPages: number;
  expectedPages: number;
  evaluatedWeeksCount: number;
  isDefault: boolean;
};

export function computeWeekAllocations(
  semester: Semester,
  weeks: WeekBlock[],
  totalPages: number | string,
  totalPeriod: number | string
): Record<string, { expectedPeriod: number; expectedPages: number }> {
  const totPages = n(totalPages);
  const totPeriod = n(totalPeriod);
  const pagesPerPeriod = totPeriod > 0 ? totPages / totPeriod : 0;

  const rawMonths = SEMESTER_MONTHS[semester]
    .map((month) => {
      const monthWeeks = weeks.filter((week) => week.monthLabel === month.label);
      const monthWorkingDays = monthWeeks.reduce((sum, w) => sum + w.workingDates.length, 0);
      return {
        label: month.label,
        monthWeeks,
        workingDays: monthWorkingDays,
      };
    })
    .filter((m) => m.workingDays > 0 || m.monthWeeks.length > 0);

  const monthWorkingDaysList = rawMonths.map((m) => m.workingDays);
  const allocatedMonthPeriods = allocateIntegerTotal(totPeriod, monthWorkingDaysList);

  const weekAllocMap: Record<string, { expectedPeriod: number; expectedPages: number }> = {};

  rawMonths.forEach((month, idx) => {
    const expectedMonthPeriod = allocatedMonthPeriods[idx] || 0;
    const weekDays = month.monthWeeks.map((w) => w.workingDates.length);
    const allocatedWeekPeriods = allocateIntegerTotal(expectedMonthPeriod, weekDays);

    month.monthWeeks.forEach((w, wIdx) => {
      const wExpPeriod = allocatedWeekPeriods[wIdx] || 0;
      const wExpPages = wExpPeriod * pagesPerPeriod;
      weekAllocMap[w.key] = {
        expectedPeriod: wExpPeriod,
        expectedPages: wExpPages,
      };
    });
  });

  return weekAllocMap;
}

export function calculateSubjectWeeklyStatus(
  subject: { total_pages: number | string; total_period: number | string },
  weeks: WeekBlock[],
  weekAllocations: Record<string, { expectedPeriod: number; expectedPages: number }>,
  progressList: WeeklyProgressLike[]
): SubjectWeeklyStatus {
  const totalPages = n(subject.total_pages);

  if (totalPages <= 0 || !weeks.length) {
    return {
      status: 'same',
      diff: 0,
      actualPages: 0,
      expectedPages: 0,
      evaluatedWeeksCount: 0,
      isDefault: true,
    };
  }

  const pMap: Record<string, WeeklyProgressLike> = {};
  (progressList || []).forEach((p) => {
    if (p && p.week_key) pMap[p.week_key] = p;
  });

  // Find the highest week index that has been updated
  // A week is updated if pages_taken > 0 or period_taken > 0
  let lastUpdatedIdx = -1;
  weeks.forEach((w, idx) => {
    const rec = pMap[w.key];
    const pages = n(rec?.pages_taken);
    const period = n(rec?.period_taken);
    if (pages > 0 || period > 0) {
      lastUpdatedIdx = idx;
    }
  });

  // If no week has been updated yet, default state:
  // "in default it will be behind when they update the first week data then check how much should they take in that week and consider behind and ahead"
  if (lastUpdatedIdx === -1) {
    let firstExp = 0;
    for (const w of weeks) {
      const exp = weekAllocations[w.key]?.expectedPages || 0;
      if (exp > 0) {
        firstExp = exp;
        break;
      }
    }
    if (firstExp === 0 && totalPages > 0) {
      firstExp = totalPages / weeks.length;
    }

    return {
      status: 'back',
      diff: -firstExp,
      actualPages: 0,
      expectedPages: firstExp,
      evaluatedWeeksCount: 1,
      isDefault: true,
    };
  }

  // Evaluate from week 0 up to lastUpdatedIdx
  const evaluatedWeeks = weeks.slice(0, lastUpdatedIdx + 1);
  let totalExpPages = 0;
  let totalActPages = 0;

  evaluatedWeeks.forEach((w) => {
    const alloc = weekAllocations[w.key];
    totalExpPages += alloc ? alloc.expectedPages : 0;
    const rec = pMap[w.key];
    totalActPages += n(rec?.pages_taken);
  });

  const diff = totalActPages - totalExpPages;
  const status = getPortionStatus(totalActPages, totalExpPages);

  return {
    status,
    diff,
    actualPages: totalActPages,
    expectedPages: totalExpPages,
    evaluatedWeeksCount: evaluatedWeeks.length,
    isDefault: false,
  };
}

export type ClassOption = {
  id: string;
  label: string;
  queryKeys: string[];
};

export async function fetchClassOptions(
  sourceTable?: 'portion_subjects' | 'ce_work_items' | 'cbcss_records'
): Promise<ClassOption[]> {
  try {
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('class_id, batch');

    if (studentsError) throw studentsError;

    const classMap: Record<string, Set<string>> = {};

    (students || []).forEach((s: any) => {
      const classId = s.class_id?.trim();
      const batch = s.batch?.trim();
      if (!classId && !batch) return;

      const primaryKey = classId || batch;
      if (!classMap[primaryKey]) {
        classMap[primaryKey] = new Set<string>();
      }
      if (classId) {
        classMap[primaryKey].add(classId);
        classMap[primaryKey].add(`${classId} Class`);
      }
      if (batch) {
        classMap[primaryKey].add(batch);
        classMap[primaryKey].add(`${batch} Class`);
      }
    });

    if (sourceTable) {
      const { data: sourceRows } = await supabase
        .from(sourceTable)
        .select('batch');

      (sourceRows || []).forEach((row: any) => {
        const batch = row.batch?.trim();
        if (!batch) return;

        const alreadyCovered = Object.values(classMap).some((keys) =>
          keys.has(batch)
        );
        if (!alreadyCovered) {
          if (!classMap[batch]) {
            classMap[batch] = new Set<string>();
          }
          classMap[batch].add(batch);
        }
      });
    }

    const options: ClassOption[] = Object.keys(classMap)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map((key) => ({
        id: key,
        label: key,
        queryKeys: Array.from(classMap[key]),
      }));

    return options;
  } catch (err) {
    console.error('Failed to fetch class options:', err);
    return [];
  }
}

export function findMatchingClass(
  classes: ClassOption[],
  userBatch?: string | null,
  userDesignation?: string | null
): string {
  if (!classes.length) return '';
  const b = userBatch?.trim() || '';
  const d = userDesignation?.trim() || '';
  const cleanD = d.replace(/\s+Class$/i, '').trim();

  const match = classes.find(
    (c) =>
      c.id === b ||
      c.id === d ||
      c.id === cleanD ||
      c.label === b ||
      c.label === d ||
      c.label === cleanD ||
      c.queryKeys.includes(b) ||
      c.queryKeys.includes(d) ||
      c.queryKeys.includes(cleanD)
  );

  return match ? match.id : classes[0].id;
}
