export type Semester = 'SEM-1' | 'SEM-2';

export type SemesterDate = {
  value: string; // "yyyy-MM-dd"
  label: string; // "1", "2", ... (day of month)
  monthLabel: string; // "June", "July", ...
};

export type WorkingWeek = {
  key: string;
  monthLabel: string;
  monthKey: string;
  weekNo: number;
  dateFrom: string;
  dateTo: string;
  workingDates: string[];
};

export const SEMESTER_MONTHS = {
  'SEM-1': [
    { label: 'June' },
    { label: 'July' },
    { label: 'August' },
    { label: 'September' },
    { label: 'October' }
  ],
  'SEM-2': [
    { label: 'November' },
    { label: 'December' },
    { label: 'January' },
    { label: 'February' },
    { label: 'March' }
  ]
};

export function getAcademicYearBase(): number {
  const today = new Date();
  const month = today.getMonth(); // 0 = Jan, 5 = June
  if (month < 5) {
    return today.getFullYear() - 1;
  }
  return today.getFullYear();
}

export function toDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function displayDate(value: string): string {
  if (!value) return '';
  const parts = value.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return value;
}

export function getSemesterDates(semester: Semester, academicYear: number): SemesterDate[] {
  const dates: SemesterDate[] = [];
  let start: Date;
  let end: Date;

  if (semester === 'SEM-1') {
    start = new Date(academicYear, 5, 1); // June 1st
    end = new Date(academicYear, 9, 31);   // October 31st
  } else {
    start = new Date(academicYear, 10, 1); // November 1st
    end = new Date(academicYear + 1, 2, 31); // March 31st
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const current = new Date(start);
  while (current <= end) {
    dates.push({
      value: toDateValue(current),
      label: String(current.getDate()),
      monthLabel: monthNames[current.getMonth()],
    });
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export function buildWorkingWeeks(
  semester: Semester,
  excluded: Set<string>,
  academicYear: number
): WorkingWeek[] {
  const weeks: WorkingWeek[] = [];
  let start: Date;
  let end: Date;

  if (semester === 'SEM-1') {
    start = new Date(academicYear, 5, 1); // June 1st
    end = new Date(academicYear, 9, 31);   // October 31st
  } else {
    start = new Date(academicYear, 10, 1); // November 1st
    end = new Date(academicYear + 1, 2, 31); // March 31st
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const current = new Date(start);
  const dayOfWeek = current.getDay();
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  current.setDate(current.getDate() - offset);

  let weekIndex = 1;

  while (current <= end) {
    const monday = new Date(current);
    const sunday = new Date(current);
    sunday.setDate(sunday.getDate() + 6);

    if (sunday < start) {
      current.setDate(current.getDate() + 7);
      continue;
    }

    const dateFrom = toDateValue(monday);
    const dateTo = toDateValue(sunday);

    const workingDates: string[] = [];
    const dateIter = new Date(monday);
    for (let i = 0; i < 7; i++) {
      if (dateIter >= start && dateIter <= end) {
        const dateStr = toDateValue(dateIter);
        // exclude Sundays (0)
        if (dateIter.getDay() !== 0 && !excluded.has(dateStr)) {
          workingDates.push(dateStr);
        }
      }
      dateIter.setDate(dateIter.getDate() + 1);
    }

    const midWeek = new Date(monday);
    midWeek.setDate(midWeek.getDate() + 3); // Thursday
    const monthLabel = monthNames[midWeek.getMonth()];
    const monthKey = `${midWeek.getFullYear()}-${String(midWeek.getMonth() + 1).padStart(2, '0')}`;

    weeks.push({
      key: `WK-${weekIndex}`,
      monthLabel,
      monthKey,
      weekNo: weekIndex,
      dateFrom,
      dateTo,
      workingDates,
    });

    weekIndex++;
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

export function getPortionStatus(actual: number, expected: number): string {
  if (actual === 0) return 'pending';
  if (actual < expected * 0.95) return 'behind';
  if (actual > expected * 1.05) return 'ahead';
  return 'on-track';
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Pending';
    case 'behind': return 'Behind';
    case 'ahead': return 'Ahead';
    case 'on-track': return 'On Track';
    default: return 'Unknown';
  }
}

export function n(value: any): number {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}
