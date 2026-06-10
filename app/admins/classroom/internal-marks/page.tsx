// app/admins/classroom/internal-marks/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { utils, writeFile } from 'xlsx';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// Icons
import {
  ClipboardList,
  BookOpen,
  PenLine,
  Newspaper,
  Mic2,
  FileText,
  User,
  Calendar,
  Save,
  FileSpreadsheet,
  Plus,
  Trash2,
  Search,
  Sparkles,
  Check,
  ChevronDown,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

type TabKey = 'reading' | 'writing' | 'newspaper' | 'general' | 'morning' | 'fTalk';
type Tone = 'positive' | 'negative';

interface StudentOption {
  uid: string;
  name: string;
  cic: string | null;
  class_id: string;
  batch: string | null;
}

const LANGUAGE_OPTIONS = ['MAL', 'ENG', 'ARB', 'URD'];
const BOOK_TYPE_OPTIONS = ['Novel', 'Story', 'Short Story', 'Poem', 'Article', 'Blog', 'Magazine'];
const PUBLISHED_OPTIONS = [
  'Not Published',
  'Sargambaram',
  'Book',
  'Magazine',
  'Newspaper',
  'Journal',
  'Research',
  'Blog',
  'Website',
];

const NEWSPAPERS: Record<string, string[]> = {
  MAL: ['Malayala Manorama', 'Suprabhatam', 'Chandrika', 'Madhyamam'],
  ENG: ['The Hindu'],
  ARB: ['A Arabic Newspaper'],
  URD: ['A Urdu Newspaper'],
};

const NEWSPAPER_SECTIONS = [
  'Front Page',
  'Politics',
  'International',
  'Sports',
  'Editorial',
  'Religion',
  'Education',
  'Lifestyle',
  'Business',
];

const GENERAL_FIELDS: { key: 'law_practice' | 'cleaness' | 'spirituality'; label: string }[] = [
  { key: 'law_practice', label: 'Law Practice' },
  { key: 'cleaness', label: 'Cleanliness' },
  { key: 'spirituality', label: 'Spirituality' },
];

const MARK_OPTIONS = Array.from({ length: 11 }, (_, i) => i);

function getBatchNumber(batch?: string | null) {
  const match = batch?.match(/Batch\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function isEligibleBatch(batch?: string | null) {
  const num = getBatchNumber(batch);
  return !!num && num >= 17;
}

function todayDateValue() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateStr: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

function sortByCic(a: StudentOption, b: StudentOption) {
  return (a.cic || '').localeCompare(b.cic || '', undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export default function InternalMarksPage() {
  const { role, details, loading: userLoading } = useUserData();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('reading');
  const [selectedStudentUid, setSelectedStudentUid] = useState('');
  
  // Date values in 'YYYY-MM-DD'
  const [selectedDate, setSelectedDate] = useState(todayDateValue());
  const [morningDate, setMorningDate] = useState(todayDateValue());
  const [fTalkDate, setFTalkDate] = useState(todayDateValue());
  
  // Search queries for bulk lists
  const [morningSearch, setMorningSearch] = useState('');
  const [fTalkSearch, setFTalkSearch] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);

  // Bulk marks structures
  const [morningMap, setMorningMap] = useState<Record<string, { present: boolean; mark: number }>>({});
  const [fTalkMap, setFTalkMap] = useState<Record<string, { talked: boolean; mark: number }>>({});
  
  // Skills variables
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<{ id: string; skill_name: string }[]>([]);

  // Individual entry structures
  const [reading, setReading] = useState({
    book_name: '',
    author_name: '',
    pages_read: '',
    language: 'MAL',
    book_type: 'Novel',
  });
  const [writing, setWriting] = useState({
    language: 'MAL',
    writing_type: 'Article',
    pages_written: '',
    published_in: 'Not Published',
  });
  const [newspaper, setNewspaper] = useState({
    language: 'MAL',
    newspaper_names: [] as string[],
    sections_read: [] as string[],
  });
  const [general, setGeneral] = useState({
    law_practice_status: 'positive' as Tone,
    law_practice_note: '',
    cleaness_status: 'positive' as Tone,
    cleaness_note: '',
    spirituality_status: 'positive' as Tone,
    spirituality_note: '',
  });

  const eligible = role === 'class' && isEligibleBatch(details?.batch);

  const fetchStudents = useCallback(async () => {
    if (!details?.batch || !eligible) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('uid, name, cic, class_id, batch')
        .eq('batch', details.batch)
        .order('cic', { ascending: true });

      if (error) throw error;
      const rows = ((data || []) as StudentOption[]).sort(sortByCic);
      setStudents(rows);
      if (rows[0]) {
        setSelectedStudentUid(rows[0].uid);
      }
    } catch (err: any) {
      toast.error('Failed to load class students', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [details?.batch, eligible]);

  useEffect(() => {
    if (!userLoading) fetchStudents();
  }, [userLoading, fetchStudents]);

  const selectedStudent = useMemo(
    () => students.find((student) => student.uid === selectedStudentUid) || null,
    [students, selectedStudentUid]
  );

  // Searchable student selection list
  const filteredStudentDropdown = useMemo(() => {
    const q = studentSearchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.cic?.toLowerCase().includes(q) ||
        s.class_id.toLowerCase().includes(q)
    );
  }, [students, studentSearchQuery]);

  // Load single student records based on selection and date
  const loadSingleRecord = useCallback(async () => {
    if (!selectedStudentUid || !selectedDate) return;

    try {
      if (activeTab === 'reading') {
        const { data } = await supabase
          .from('internal_reading_marks')
          .select('*')
          .eq('student_uid', selectedStudentUid)
          .eq('entry_date', selectedDate)
          .maybeSingle();

        setReading({
          book_name: data?.book_name || '',
          author_name: data?.author_name || '',
          pages_read: data?.pages_read ? String(data.pages_read) : '',
          language: data?.language || 'MAL',
          book_type: data?.book_type || 'Novel',
        });
      }

      if (activeTab === 'writing') {
        const { data } = await supabase
          .from('internal_writing_marks')
          .select('*')
          .eq('student_uid', selectedStudentUid)
          .eq('entry_date', selectedDate)
          .maybeSingle();

        setWriting({
          language: data?.language || 'MAL',
          writing_type: data?.writing_type || 'Article',
          pages_written: data?.pages_written ? String(data.pages_written) : '',
          published_in: data?.published_in || 'Not Published',
        });
      }

      if (activeTab === 'newspaper') {
        const { data } = await supabase
          .from('internal_newspaper_marks')
          .select('*')
          .eq('student_uid', selectedStudentUid)
          .eq('entry_date', selectedDate)
          .maybeSingle();

        setNewspaper({
          language: data?.language || 'MAL',
          newspaper_names: data?.newspaper_names || [],
          sections_read: data?.sections_read || [],
        });
      }

      if (activeTab === 'general') {
        const { data } = await supabase
          .from('internal_general_marks')
          .select('*')
          .eq('student_uid', selectedStudentUid)
          .eq('entry_date', selectedDate)
          .maybeSingle();

        setGeneral({
          law_practice_status: data?.law_practice_status || 'positive',
          law_practice_note: data?.law_practice_note || '',
          cleaness_status: data?.cleaness_status || 'positive',
          cleaness_note: data?.cleaness_note || '',
          spirituality_status: data?.spirituality_status || 'positive',
          spirituality_note: data?.spirituality_note || '',
        });
      }
    } catch (err: any) {
      toast.error('Failed to load record details', { description: err.message });
    }
  }, [activeTab, selectedStudentUid, selectedDate]);

  useEffect(() => {
    loadSingleRecord();
  }, [loadSingleRecord]);

  // Load general skills list
  const loadSkills = useCallback(async () => {
    if (!selectedStudentUid) {
      setSkills([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('internal_student_skills')
        .select('id, skill_name')
        .eq('student_uid', selectedStudentUid)
        .order('skill_name', { ascending: true });

      if (error) throw error;
      setSkills((data || []) as { id: string; skill_name: string }[]);
    } catch (err: any) {
      toast.error('Error loading skills list', { description: err.message });
    }
  }, [selectedStudentUid]);

  useEffect(() => {
    if (activeTab === 'general') {
      loadSkills();
    }
  }, [activeTab, loadSkills]);

  // Load Morning Talk status
  const loadMorningTalk = useCallback(async () => {
    if (students.length === 0) return;
    try {
      const { data, error } = await supabase
        .from('internal_morning_talk_attendance')
        .select('student_uid, present, mark')
        .eq('entry_date', morningDate);

      if (error) throw error;

      const nextMap: Record<string, { present: boolean; mark: number }> = {};
      students.forEach((s) => {
        nextMap[s.uid] = { present: false, mark: 0 };
      });
      (data || []).forEach((row: any) => {
        nextMap[row.student_uid] = {
          present: row.present,
          mark: row.mark ?? 0,
        };
      });
      setMorningMap(nextMap);
    } catch (err: any) {
      toast.error('Error loading Morning Talk records', { description: err.message });
    }
  }, [students, morningDate]);

  useEffect(() => {
    if (activeTab === 'morning') loadMorningTalk();
  }, [activeTab, loadMorningTalk]);

  // Load F-Talk status
  const loadFTalk = useCallback(async () => {
    if (students.length === 0) return;
    try {
      const { data, error } = await supabase
        .from('internal_f_talk_marks')
        .select('student_uid, talked, mark')
        .eq('entry_date', fTalkDate);

      if (error) throw error;

      const nextMap: Record<string, { talked: boolean; mark: number }> = {};
      students.forEach((s) => {
        nextMap[s.uid] = { talked: false, mark: 0 };
      });
      (data || []).forEach((row: any) => {
        nextMap[row.student_uid] = {
          talked: row.talked || false,
          mark: row.mark ?? 0,
        };
      });
      setFTalkMap(nextMap);
    } catch (err: any) {
      toast.error('Error loading F-Talk records', { description: err.message });
    }
  }, [students, fTalkDate]);

  useEffect(() => {
    if (activeTab === 'fTalk') loadFTalk();
  }, [activeTab, loadFTalk]);

  // Save current individual marks entry
  const saveCurrent = async () => {
    if (!selectedStudentUid) {
      toast.warning('Select Student', { description: 'Please select a student first.' });
      return;
    }
    setSaving(true);
    try {
      if (activeTab === 'reading') {
        const { error } = await supabase.from('internal_reading_marks').upsert(
          {
            student_uid: selectedStudentUid,
            entry_date: selectedDate,
            book_name: reading.book_name.trim(),
            author_name: reading.author_name.trim(),
            pages_read: Number(reading.pages_read) || 0,
            language: reading.language,
            book_type: reading.book_type,
            created_by: details?.uid,
          },
          { onConflict: 'student_uid,entry_date' }
        );
        if (error) throw error;
      }

      if (activeTab === 'writing') {
        const { error } = await supabase.from('internal_writing_marks').upsert(
          {
            student_uid: selectedStudentUid,
            entry_date: selectedDate,
            language: writing.language,
            writing_type: writing.writing_type,
            pages_written: Number(writing.pages_written) || 0,
            published_in: writing.published_in,
            created_by: details?.uid,
          },
          { onConflict: 'student_uid,entry_date' }
        );
        if (error) throw error;
      }

      if (activeTab === 'newspaper') {
        const { error } = await supabase.from('internal_newspaper_marks').upsert(
          {
            student_uid: selectedStudentUid,
            entry_date: selectedDate,
            language: newspaper.language,
            newspaper_names: newspaper.newspaper_names,
            sections_read: newspaper.sections_read,
            created_by: details?.uid,
          },
          { onConflict: 'student_uid,entry_date' }
        );
        if (error) throw error;
      }

      if (activeTab === 'general') {
        const { error } = await supabase.from('internal_general_marks').upsert(
          {
            student_uid: selectedStudentUid,
            entry_date: selectedDate,
            ...general,
            created_by: details?.uid,
          },
          { onConflict: 'student_uid,entry_date' }
        );
        if (error) throw error;
      }

      toast.success('Internal mark saved successfully');
    } catch (err: any) {
      toast.error('Save failed', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Save Morning Talk bulk records
  const saveMorningTalk = async () => {
    setSaving(true);
    try {
      const payload = students.map((s) => ({
        student_uid: s.uid,
        entry_date: morningDate,
        present: morningMap[s.uid]?.present ?? false,
        mark: morningMap[s.uid]?.mark ?? 0,
        created_by: details?.uid,
      }));

      const { error } = await supabase
        .from('internal_morning_talk_attendance')
        .upsert(payload, { onConflict: 'student_uid,entry_date' });

      if (error) throw error;
      toast.success('Morning Talk records saved successfully');
    } catch (err: any) {
      toast.error('Morning Talk save failed', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Save F-Talk bulk records
  const saveFTalk = async () => {
    setSaving(true);
    try {
      const payload = students.map((s) => ({
        student_uid: s.uid,
        entry_date: fTalkDate,
        talked: fTalkMap[s.uid]?.talked ?? false,
        mark: fTalkMap[s.uid]?.mark ?? 0,
        created_by: details?.uid,
      }));

      const { error } = await supabase
        .from('internal_f_talk_marks')
        .upsert(payload, { onConflict: 'student_uid,entry_date' });

      if (error) throw error;
      toast.success('F-Talk records saved successfully');
    } catch (err: any) {
      toast.error('F-Talk save failed', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Skill manipulations
  const addSkill = async () => {
    if (!selectedStudentUid) return;
    const skillName = skillInput.trim();
    if (!skillName) return;

    try {
      const { error } = await supabase.from('internal_student_skills').insert({
        student_uid: selectedStudentUid,
        skill_name: skillName,
        created_by: details?.uid,
      });
      if (error) throw error;
      setSkillInput('');
      loadSkills();
      toast.success('Skill added');
    } catch (err: any) {
      toast.error('Failed to add skill', { description: err.message });
    }
  };

  const removeSkill = async (id: string) => {
    try {
      const { error } = await supabase.from('internal_student_skills').delete().eq('id', id);
      if (error) throw error;
      loadSkills();
      toast.success('Skill removed');
    } catch (err: any) {
      toast.error('Failed to remove skill', { description: err.message });
    }
  };

  // Multi-choice newspaper selectors
  const toggleNewspaper = (name: string) => {
    const list = newspaper.newspaper_names;
    const nextList = list.includes(name) ? list.filter((n) => n !== name) : [...list, name];
    setNewspaper((prev) => ({ ...prev, newspaper_names: nextList }));
  };

  const toggleNewspaperSection = (section: string) => {
    const list = newspaper.sections_read;
    const nextList = list.includes(section) ? list.filter((s) => s !== section) : [...list, section];
    setNewspaper((prev) => ({ ...prev, sections_read: nextList }));
  };

  // Excel reporting
  const exportExcelReport = async () => {
    if (students.length === 0 || exporting) return;
    setExporting(true);
    try {
      const studentIds = students.map((s) => s.uid);
      const [
        { data: readingRows, error: readingError },
        { data: writingRows, error: writingError },
        { data: newspaperRows, error: newspaperError },
        { data: generalRows, error: generalError },
        { data: skillRows, error: skillError },
        { data: morningRows, error: morningError },
        { data: fTalkRows, error: fTalkError },
      ] = await Promise.all([
        supabase.from('internal_reading_marks').select('*').in('student_uid', studentIds),
        supabase.from('internal_writing_marks').select('*').in('student_uid', studentIds),
        supabase.from('internal_newspaper_marks').select('*').in('student_uid', studentIds),
        supabase.from('internal_general_marks').select('*').in('student_uid', studentIds),
        supabase.from('internal_student_skills').select('*').in('student_uid', studentIds),
        supabase.from('internal_morning_talk_attendance').select('*').in('student_uid', studentIds),
        supabase.from('internal_f_talk_marks').select('*').in('student_uid', studentIds),
      ]);

      const firstError =
        readingError ||
        writingError ||
        newspaperError ||
        generalError ||
        skillError ||
        morningError ||
        fTalkError;
      if (firstError) throw firstError;

      const groupByStudent = <T extends { student_uid: string }>(rows: T[] = []) => {
        const grouped: Record<string, T[]> = {};
        rows.forEach((row) => {
          if (!grouped[row.student_uid]) grouped[row.student_uid] = [];
          grouped[row.student_uid].push(row);
        });
        return grouped;
      };

      const readingByStudent = groupByStudent(readingRows || []);
      const writingByStudent = groupByStudent(writingRows || []);
      const newspaperByStudent = groupByStudent(newspaperRows || []);
      const generalByStudent = groupByStudent(generalRows || []);
      const skillsByStudent = groupByStudent(skillRows || []);
      const morningByStudent = groupByStudent(morningRows || []);
      const fTalkByStudent = groupByStudent(fTalkRows || []);

      const workbook = utils.book_new();

      // Overall Tab
      const overallRows: any[][] = [
        ['Internal Marks Overall Report'],
        ['Batch', details?.batch || ''],
        ['Generated', formatDateDisplay(todayDateValue())],
        [],
      ];

      const addTopSection = (title: string, items: { student: StudentOption; value: number }[], valueLabel: string) => {
        overallRows.push([title]);
        overallRows.push(['Rank', 'Name', 'CIC', 'Class', valueLabel]);
        if (items.length === 0) {
          overallRows.push(['No data']);
        } else {
          items.forEach((item, index) => {
            overallRows.push([
              index + 1,
              item.student.name,
              item.student.cic || '',
              item.student.class_id,
              item.value,
            ]);
          });
        }
        overallRows.push([]);
      };

      const topFiveItems = (getValue: (student: StudentOption) => number) => {
        return [...students]
          .map((s) => ({ student: s, value: getValue(s) }))
          .filter((item) => item.value > 0)
          .sort((a, b) => b.value - a.value || sortByCic(a.student, b.student))
          .slice(0, 5);
      };

      addTopSection('Top 5 Reading', topFiveItems((s) => readingByStudent[s.uid]?.length || 0), 'Entries');
      addTopSection('Top 5 Writing', topFiveItems((s) => writingByStudent[s.uid]?.length || 0), 'Entries');
      addTopSection('Top 5 Newspaper', topFiveItems((s) => newspaperByStudent[s.uid]?.length || 0), 'Entries');
      addTopSection(
        'Top 5 General',
        topFiveItems((s) => {
          const rows = generalByStudent[s.uid] || [];
          return rows.reduce((total: number, row: any) => {
            return (
              total +
              ['law_practice', 'cleaness', 'spirituality'].filter((k) => row[`${k}_status`] === 'positive').length
            );
          }, 0);
        }),
        'Positive Count'
      );
      addTopSection('Top 5 Morning Talk', topFiveItems((s) => (morningByStudent[s.uid] || []).filter((r: any) => r.present).length), 'Present Count');
      addTopSection('Top 5 F-Talk', topFiveItems((s) => (fTalkByStudent[s.uid] || []).filter((r: any) => r.talked).length), 'Talked Count');

      utils.book_append_sheet(workbook, utils.aoa_to_sheet(overallRows), 'Overall');

      // Student Tabs
      const safeSheetNames = new Set(['Overall']);
      students.forEach((student) => {
        const rows: any[][] = [
          ['Name', student.name],
          ['CIC', student.cic || ''],
          ['Class', student.class_id],
          ['Batch', student.batch || ''],
        ];

        // Reading summary
        rows.push([], ['Reading Log']);
        rows.push(['Date', 'Book Name', 'Author', 'Pages', 'Language', 'Book Type']);
        const readLogs = (readingByStudent[student.uid] || []).sort((a: any, b: any) => a.entry_date.localeCompare(b.entry_date));
        if (readLogs.length === 0) rows.push(['No data']);
        else {
          readLogs.forEach((r: any) => {
            rows.push([formatDateDisplay(r.entry_date), r.book_name, r.author_name, r.pages_read, r.language, r.book_type]);
          });
        }

        // Writing summary
        rows.push([], ['Writing Log']);
        rows.push(['Date', 'Language', 'Type', 'Pages', 'Published In']);
        const writeLogs = (writingByStudent[student.uid] || []).sort((a: any, b: any) => a.entry_date.localeCompare(b.entry_date));
        if (writeLogs.length === 0) rows.push(['No data']);
        else {
          writeLogs.forEach((w: any) => {
            rows.push([formatDateDisplay(w.entry_date), w.language, w.writing_type, w.pages_written, w.published_in]);
          });
        }

        // Newspaper summary
        rows.push([], ['Newspaper Log']);
        rows.push(['Date', 'Language', 'Newspapers', 'Sections Read']);
        const newsLogs = (newspaperByStudent[student.uid] || []).sort((a: any, b: any) => a.entry_date.localeCompare(b.entry_date));
        if (newsLogs.length === 0) rows.push(['No data']);
        else {
          newsLogs.forEach((n: any) => {
            rows.push([formatDateDisplay(n.entry_date), n.language, (n.newspaper_names || []).join(', '), (n.sections_read || []).join(', ')]);
          });
        }

        // General summary
        rows.push([], ['General behavior Summary']);
        rows.push(['Metric', 'Total Positive', 'Total Negative', 'Positive Comments', 'Negative Comments']);
        const genLogs = generalByStudent[student.uid] || [];
        GENERAL_FIELDS.forEach((f) => {
          const positiveRows = genLogs.filter((r: any) => r[`${f.key}_status`] === 'positive');
          const negativeRows = genLogs.filter((r: any) => r[`${f.key}_status`] === 'negative');
          rows.push([
            f.label,
            positiveRows.length,
            negativeRows.length,
            positiveRows.map((r: any) => r[`${f.key}_note`]).filter(Boolean).join(' | '),
            negativeRows.map((r: any) => r[`${f.key}_note`]).filter(Boolean).join(' | '),
          ]);
        });

        // Skills
        rows.push([], ['Skills']);
        rows.push(['Skill Name']);
        const sks = skillsByStudent[student.uid] || [];
        if (sks.length === 0) rows.push(['No skills recorded']);
        else {
          sks.forEach((s: any) => {
            rows.push([s.skill_name]);
          });
        }

        // Morning Talk
        rows.push([], ['Morning Talk']);
        rows.push(['Date', 'Present', 'Mark']);
        const mt = (morningByStudent[student.uid] || []).sort((a: any, b: any) => a.entry_date.localeCompare(b.entry_date));
        if (mt.length === 0) rows.push(['No data']);
        else {
          mt.forEach((r: any) => {
            rows.push([formatDateDisplay(r.entry_date), r.present ? 'Yes' : 'No', r.mark]);
          });
        }

        // F-Talk
        rows.push([], ['F-Talk']);
        rows.push(['Date', 'Talked', 'Mark']);
        const ft = (fTalkByStudent[student.uid] || []).sort((a: any, b: any) => a.entry_date.localeCompare(b.entry_date));
        if (ft.length === 0) rows.push(['No data']);
        else {
          ft.forEach((r: any) => {
            rows.push([formatDateDisplay(r.entry_date), r.talked ? 'Yes' : 'No', r.mark]);
          });
        }

        // Safe sheet naming
        const baseName = (student.name || 'Student').replace(/[\[\]\*\/\\\?:]/g, '').slice(0, 25);
        let sheetName = baseName;
        let counter = 1;
        while (safeSheetNames.has(sheetName)) {
          sheetName = `${baseName.slice(0, 20)} ${counter}`;
          counter++;
        }
        safeSheetNames.add(sheetName);

        utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), sheetName);
      });

      writeFile(workbook, `Internal_Marks_${details?.batch || 'Report'}.xlsx`);
      toast.success('Excel spreadsheet downloaded successfully');
    } catch (err: any) {
      toast.error('Excel export failed', { description: err.message });
    } finally {
      setExporting(false);
    }
  };

  // Bulk lists queries filter
  const filteredMorningList = useMemo(() => {
    const q = morningSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.cic?.toLowerCase().includes(q) ||
        s.class_id.toLowerCase().includes(q)
    );
  }, [students, morningSearch]);

  const filteredFTalkList = useMemo(() => {
    const q = fTalkSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.cic?.toLowerCase().includes(q) ||
        s.class_id.toLowerCase().includes(q)
    );
  }, [students, fTalkSearch]);

  const tabs = [
    { key: 'reading', label: 'Reading', icon: BookOpen },
    { key: 'writing', label: 'Writing', icon: PenLine },
    { key: 'newspaper', label: 'Newspaper', icon: Newspaper },
    { key: 'general', label: 'General Behavior', icon: ClipboardList },
    { key: 'morning', label: 'Morning Talk', icon: Mic2 },
    { key: 'fTalk', label: 'F-Talk', icon: FileText },
  ] as const;

  if (userLoading || loading) {
    return (
      <div className="flex h-[75vh] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!eligible) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4 animate-in fade-in duration-300">
        <Card className="max-w-md w-full border border-destructive/20 bg-destructive/5 text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive shadow-inner">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold font-heading text-destructive">Internal Marks Denied</CardTitle>
            <CardDescription className="text-destructive-foreground/75 mt-1">
              Internal behavioral and literature evaluations are active only for class teachers supervising Batch 17 and higher.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Header and Exporter Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-bold w-fit shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Classroom Teacher Portal ({details?.batch})</span>
          </div>
          <h1 className="text-3xl font-extrabold font-heading tracking-tight flex items-center gap-2.5">
            <ClipboardList className="h-8 w-8 text-primary" />
            Internal Marks Entry
          </h1>
          <p className="text-sm text-muted-foreground font-semibold">
            Track reading logs, writing pages, behavioral tones, Morning Talk progress, and F-Talk marks.
          </p>
        </div>

        <Button
          onClick={exportExcelReport}
          disabled={exporting}
          variant="outline"
          className="gap-2 font-bold shadow-sm rounded-xl shrink-0 h-11 border-primary/20 hover:bg-primary/5 hover:text-primary"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 text-primary" />
          )}
          <span>{exporting ? 'Preparing Sheets...' : 'Download Full Excel Report'}</span>
        </Button>
      </div>

      {/* Tabs Panel */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-muted rounded-2xl w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <Button
              key={tab.key}
              variant={active ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setActiveTab(tab.key);
                setIsStudentDropdownOpen(false);
              }}
              className="rounded-xl font-bold text-xs gap-1.5 h-10 px-4"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form / Bulk lists */}
        <div className="lg:col-span-8 space-y-6">

          {/* Form wrapper for Single student entries (reading, writing, newspaper, general) */}
          {!['morning', 'fTalk'].includes(activeTab) && (
            <Card className="border border-border/50 bg-card/40 backdrop-blur-sm shadow-md rounded-2xl">
              <CardHeader className="border-b pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold font-heading">
                      {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Entry Form
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {selectedStudent?.name || 'Loading student'} • Date: {formatDateDisplay(selectedDate)}
                    </CardDescription>
                  </div>

                  {/* Save Trigger */}
                  <Button
                    onClick={saveCurrent}
                    disabled={saving}
                    className="gap-2 font-bold shadow-md rounded-xl h-10 px-5 sm:self-center"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>{saving ? 'Saving...' : 'Save Record'}</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">

                {/* Tab: Reading fields */}
                {activeTab === 'reading' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="book-name" className="text-xs font-bold text-muted-foreground">Book Title</Label>
                      <Input
                        id="book-name"
                        placeholder="e.g. Al-Chemist"
                        value={reading.book_name}
                        onChange={(e) => setReading((p) => ({ ...p, book_name: e.target.value }))}
                        className="rounded-xl font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="book-author" className="text-xs font-bold text-muted-foreground">Author</Label>
                      <Input
                        id="book-author"
                        placeholder="e.g. Paulo Coelho"
                        value={reading.author_name}
                        onChange={(e) => setReading((p) => ({ ...p, author_name: e.target.value }))}
                        className="rounded-xl font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="book-pages" className="text-xs font-bold text-muted-foreground">Pages Read</Label>
                      <Input
                        id="book-pages"
                        type="number"
                        placeholder="0"
                        value={reading.pages_read}
                        onChange={(e) => setReading((p) => ({ ...p, pages_read: e.target.value }))}
                        className="rounded-xl font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="book-lang" className="text-xs font-bold text-muted-foreground">Language</Label>
                      <select
                        id="book-lang"
                        value={reading.language}
                        onChange={(e) => setReading((p) => ({ ...p, language: e.target.value }))}
                        className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {LANGUAGE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="book-type" className="text-xs font-bold text-muted-foreground">Book Category</Label>
                      <select
                        id="book-type"
                        value={reading.book_type}
                        onChange={(e) => setReading((p) => ({ ...p, book_type: e.target.value }))}
                        className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {BOOK_TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Tab: Writing fields */}
                {activeTab === 'writing' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label htmlFor="write-lang" className="text-xs font-bold text-muted-foreground">Language</Label>
                      <select
                        id="write-lang"
                        value={writing.language}
                        onChange={(e) => setWriting((p) => ({ ...p, language: e.target.value }))}
                        className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm font-semibold"
                      >
                        {LANGUAGE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="write-type" className="text-xs font-bold text-muted-foreground">Type</Label>
                      <select
                        id="write-type"
                        value={writing.writing_type}
                        onChange={(e) => setWriting((p) => ({ ...p, writing_type: e.target.value }))}
                        className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm font-semibold"
                      >
                        {BOOK_TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="write-pages" className="text-xs font-bold text-muted-foreground">Pages Written</Label>
                      <Input
                        id="write-pages"
                        type="number"
                        placeholder="0"
                        value={writing.pages_written}
                        onChange={(e) => setWriting((p) => ({ ...p, pages_written: e.target.value }))}
                        className="rounded-xl font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="write-published" className="text-xs font-bold text-muted-foreground">Published In</Label>
                      <select
                        id="write-published"
                        value={writing.published_in}
                        onChange={(e) => setWriting((p) => ({ ...p, published_in: e.target.value }))}
                        className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm font-semibold"
                      >
                        {PUBLISHED_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Tab: Newspaper fields */}
                {activeTab === 'newspaper' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <Label htmlFor="news-lang" className="text-xs font-bold text-muted-foreground">Newspaper Language</Label>
                        <select
                          id="news-lang"
                          value={newspaper.language}
                          onChange={(e) => setNewspaper({ language: e.target.value, newspaper_names: [], sections_read: [] })}
                          className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm font-semibold"
                        >
                          {LANGUAGE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Newspapers checkbox grid */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground">Newspapers Read</Label>
                      <div className="flex flex-wrap gap-2.5">
                        {(NEWSPAPERS[newspaper.language] || []).map((name) => {
                          const active = newspaper.newspaper_names.includes(name);
                          return (
                            <button
                              key={name}
                              onClick={() => toggleNewspaper(name)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all duration-200 ${
                                active
                                  ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20'
                                  : 'bg-background border-border text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                              <span>{name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sections checkbox grid */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground">Sections Covered</Label>
                      <div className="flex flex-wrap gap-2.5">
                        {NEWSPAPER_SECTIONS.map((sec) => {
                          const active = newspaper.sections_read.includes(sec);
                          return (
                            <button
                              key={sec}
                              onClick={() => toggleNewspaperSection(sec)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all duration-200 ${
                                active
                                  ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20'
                                  : 'bg-background border-border text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                              <span>{sec}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: General behavior fields */}
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    {GENERAL_FIELDS.map((f) => {
                      const status = general[`${f.key}_status` as keyof typeof general] as Tone;
                      const note = general[`${f.key}_note` as keyof typeof general] as string;
                      return (
                        <div key={f.key} className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <Label className="text-sm font-extrabold text-foreground">{f.label}</Label>
                            <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
                              {(['positive', 'negative'] as Tone[]).map((t) => (
                                <button
                                  key={t}
                                  onClick={() => setGeneral((p) => ({ ...p, [`${f.key}_status`]: t }))}
                                  className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                                    status === t
                                      ? t === 'positive'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-rose-600 text-white shadow-sm'
                                      : 'text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>
                          <Input
                            placeholder={`Write comments on ${f.label.toLowerCase()}...`}
                            value={note}
                            onChange={(e) => setGeneral((p) => ({ ...p, [`${f.key}_note`]: e.target.value }))}
                            className="rounded-xl font-semibold bg-background"
                          />
                        </div>
                      );
                    })}

                    {/* Behavior Skills Segment */}
                    <div className="border-t pt-6 space-y-4">
                      <div>
                        <Label className="text-sm font-extrabold text-foreground">Talent & Skill Directory</Label>
                        <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                          Skills are saved directly to the student profile and persist across dates.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter a talent or skill name (e.g. Calligraphy, Public Speaking)"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          className="rounded-xl font-semibold bg-background"
                        />
                        <Button onClick={addSkill} className="rounded-xl font-bold gap-1 px-4">
                          <Plus className="h-4 w-4" /> Add
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        {skills.length > 0 ? (
                          skills.map((s) => (
                            <Badge
                              key={s.id}
                              variant="secondary"
                              className="px-3.5 py-1.5 rounded-full text-xs font-bold gap-1 bg-primary/10 text-primary border border-primary/15"
                            >
                              <span>{s.skill_name}</span>
                              <button
                                onClick={() => removeSkill(s.id)}
                                className="h-4 w-4 rounded-full flex items-center justify-center text-primary hover:bg-destructive hover:text-white transition-colors text-[9px] font-black"
                              >
                                &times;
                              </button>
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground/85 font-semibold italic">No custom talents added yet.</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          )}

          {/* Tab: Morning Talk List */}
          {activeTab === 'morning' && (
            <Card className="border border-border/50 bg-card/45 backdrop-blur-sm shadow-md rounded-2xl">
              <CardHeader className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-bold font-heading">Morning Talk Attendance & Score</CardTitle>
                  <CardDescription className="text-xs">
                    Mark participation state and rate oral presentation marks (0-10) for this date.
                  </CardDescription>
                </div>
                <Button
                  onClick={saveMorningTalk}
                  disabled={saving}
                  className="gap-2 font-bold shadow-md rounded-xl h-10 px-5 shrink-0"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{saving ? 'Saving...' : 'Save Bulk Records'}</span>
                </Button>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Search in Morning list */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter list by name or register..."
                    value={morningSearch}
                    onChange={(e) => setMorningSearch(e.target.value)}
                    className="pl-10 h-10 rounded-xl bg-background/50 text-xs font-semibold"
                  />
                </div>

                <div className="rounded-xl border overflow-x-auto bg-background/40">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-[10px] font-bold uppercase">No</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase">Student Name</TableHead>
                        <TableHead className="w-28 text-[10px] font-bold uppercase text-center">Participation</TableHead>
                        <TableHead className="w-40 text-[10px] font-bold uppercase text-right">Presentation Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMorningList.map((s, index) => {
                        const mState = morningMap[s.uid] || { present: false, mark: 0 };
                        return (
                          <TableRow key={s.uid} className="hover:bg-muted/10">
                            <TableCell className="text-xs font-semibold text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="text-xs font-bold uppercase">
                              <div>{s.name}</div>
                              <div className="text-[9.5px] text-muted-foreground font-semibold">CIC: {s.cic || '-'} • {s.class_id}</div>
                            </TableCell>
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                checked={mState.present}
                                onChange={(e) => {
                                  setMorningMap((prev) => ({
                                    ...prev,
                                    [s.uid]: { ...mState, present: e.target.checked },
                                  }));
                                }}
                                className="mx-auto h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <select
                                value={mState.mark}
                                onChange={(e) => {
                                  setMorningMap((prev) => ({
                                    ...prev,
                                    [s.uid]: { ...mState, mark: Number(e.target.value) },
                                  }));
                                }}
                                className="ml-auto flex h-8 w-24 rounded-lg border border-input bg-card px-2.5 text-xs font-bold"
                              >
                                {MARK_OPTIONS.map((val) => (
                                  <option key={val} value={val}>{val}/10</option>
                                ))}
                              </select>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab: F-Talk List */}
          {activeTab === 'fTalk' && (
            <Card className="border border-border/50 bg-card/45 backdrop-blur-sm shadow-md rounded-2xl">
              <CardHeader className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-bold font-heading">F-Talk Presentation Mark List</CardTitle>
                  <CardDescription className="text-xs">
                    Mark talk presentation state and allocate score (0-10) for this date.
                  </CardDescription>
                </div>
                <Button
                  onClick={saveFTalk}
                  disabled={saving}
                  className="gap-2 font-bold shadow-md rounded-xl h-10 px-5 shrink-0"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{saving ? 'Saving...' : 'Save Bulk Records'}</span>
                </Button>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Search in F-Talk list */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter list by name or register..."
                    value={fTalkSearch}
                    onChange={(e) => setFTalkSearch(e.target.value)}
                    className="pl-10 h-10 rounded-xl bg-background/50 text-xs font-semibold"
                  />
                </div>

                <div className="rounded-xl border overflow-x-auto bg-background/40">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-[10px] font-bold uppercase">No</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase">Student Name</TableHead>
                        <TableHead className="w-28 text-[10px] font-bold uppercase text-center">Presented</TableHead>
                        <TableHead className="w-40 text-[10px] font-bold uppercase text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFTalkList.map((s, index) => {
                        const fState = fTalkMap[s.uid] || { talked: false, mark: 0 };
                        return (
                          <TableRow key={s.uid} className="hover:bg-muted/10">
                            <TableCell className="text-xs font-semibold text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="text-xs font-bold uppercase">
                              <div>{s.name}</div>
                              <div className="text-[9.5px] text-muted-foreground font-semibold">CIC: {s.cic || '-'} • {s.class_id}</div>
                            </TableCell>
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                checked={fState.talked}
                                onChange={(e) => {
                                  setFTalkMap((prev) => ({
                                    ...prev,
                                    [s.uid]: { ...fState, talked: e.target.checked },
                                  }));
                                }}
                                className="mx-auto h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <select
                                value={fState.mark}
                                onChange={(e) => {
                                  setFTalkMap((prev) => ({
                                    ...prev,
                                    [s.uid]: { ...fState, mark: Number(e.target.value) },
                                  }));
                                }}
                                className="ml-auto flex h-8 w-24 rounded-lg border border-input bg-card px-2.5 text-xs font-bold"
                              >
                                {MARK_OPTIONS.map((val) => (
                                  <option key={val} value={val}>{val}/10</option>
                                ))}
                              </select>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Right Column: Parameters (Selected Student & Date details) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Date Picker Configurations Card */}
          <Card className="border border-border/50 bg-card/45 backdrop-blur-sm shadow-sm rounded-2xl">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold font-heading">Calendar Date Config</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              
              {/* If bulk tabs, date maps to their specific dates */}
              {activeTab === 'morning' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="m-date" className="text-xs font-bold text-muted-foreground">Morning Talk Date</Label>
                  <Input
                    id="m-date"
                    type="date"
                    value={morningDate}
                    onChange={(e) => setMorningDate(e.target.value)}
                    className="rounded-xl font-semibold bg-background"
                  />
                </div>
              ) : activeTab === 'fTalk' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="f-date" className="text-xs font-bold text-muted-foreground">F-Talk Date</Label>
                  <Input
                    id="f-date"
                    type="date"
                    value={fTalkDate}
                    onChange={(e) => setFTalkDate(e.target.value)}
                    className="rounded-xl font-semibold bg-background"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="entry-date" className="text-xs font-bold text-muted-foreground">Entry Evaluation Date</Label>
                  <Input
                    id="entry-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-xl font-semibold bg-background"
                  />
                </div>
              )}

            </CardContent>
          </Card>

          {/* Searchable Student Picker (Only for individual entry tabs) */}
          {!['morning', 'fTalk'].includes(activeTab) && (
            <Card className="border border-border/50 bg-card/45 backdrop-blur-sm shadow-sm rounded-2xl relative">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-bold font-heading">Selected Student</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Search Dropdown Selector */}
                <div className="relative">
                  <button
                    onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-4 py-2 text-sm font-bold text-left transition-all hover:bg-muted/30"
                  >
                    <span className="truncate">
                      {selectedStudent ? `${selectedStudent.name} (${selectedStudent.cic || 'No CIC'})` : 'Select student'}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>

                  {isStudentDropdownOpen && (
                    <div className="absolute right-0 left-0 z-30 mt-2 rounded-xl border border-border bg-card shadow-xl max-h-60 overflow-y-auto p-2 space-y-2 animate-in slide-in-from-top-2 duration-150">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search student..."
                          value={studentSearchQuery}
                          onChange={(e) => setStudentSearchQuery(e.target.value)}
                          className="pl-8 h-8 rounded-lg text-xs font-semibold bg-background"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      <div className="space-y-0.5">
                        {filteredStudentDropdown.map((s) => (
                          <button
                            key={s.uid}
                            onClick={() => {
                              setSelectedStudentUid(s.uid);
                              setIsStudentDropdownOpen(false);
                              setStudentSearchQuery('');
                            }}
                            className={`w-full text-left px-3 py-2 text-xs font-bold uppercase rounded-lg hover:bg-primary/10 hover:text-primary transition-all flex justify-between items-center ${
                              selectedStudentUid === s.uid ? 'bg-primary/10 text-primary' : 'text-foreground/80'
                            }`}
                          >
                            <span className="truncate">{s.name}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0 font-medium">{s.cic || s.class_id}</span>
                          </button>
                        ))}
                        {filteredStudentDropdown.length === 0 && (
                          <p className="text-center text-xs text-muted-foreground py-4 italic">No students match search</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {selectedStudent && (
                  <div className="p-3 bg-muted/40 rounded-xl border border-border/40 space-y-2 text-xs font-semibold text-foreground/85">
                    <p><span className="text-muted-foreground">Classroom:</span> {selectedStudent.class_id}</p>
                    <p><span className="text-muted-foreground">CIC Reg:</span> {selectedStudent.cic || 'N/A'}</p>
                    <p><span className="text-muted-foreground">Batch:</span> {selectedStudent.batch || 'N/A'}</p>
                  </div>
                )}

              </CardContent>
            </Card>
          )}

        </div>
      </div>

    </div>
  );
}
