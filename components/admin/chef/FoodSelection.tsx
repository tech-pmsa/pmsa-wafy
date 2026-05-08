import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Plus,
  Save,
  Trash2,
  Edit3,
  Check,
  X,
  Search,
  Sparkles,
  Soup,
  ClipboardList,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FoodSelectionPdfExport } from '@/components/admin/chef/FoodSelectionPdfExport';

export interface FoodItem {
  id: string;
  name: string;
  is_active: boolean;
  display_order: number;
}

export interface KitchenStudent {
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

export interface StudentFoodPreference {
  id: string;
  student_uid: string;
  food_item_id: string;
  is_needed: boolean;
}

interface Props {
  foods: FoodItem[];
  students: KitchenStudent[];
  preferences: StudentFoodPreference[];
  onRefresh: () => Promise<void>;
}

function MiniInfoCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<any>;
}) {
  return (
    <Card className="border-border/60 shadow-sm flex-1">
      <CardContent className="p-4 sm:p-5 flex items-center gap-4">
        <div className="rounded-2xl bg-primary/10 p-3 text-primary shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xl font-bold font-heading leading-tight">{value}</h3>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const FoodChip = memo(function FoodChip({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <button
      onClick={onPress}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
        checked
          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
          : 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
      }`}
    >
      {checked ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
});

const StudentFoodCard = memo(function StudentFoodCard({
  student,
  foods,
  drafts,
  onToggle,
}: {
  student: KitchenStudent;
  foods: FoodItem[];
  drafts: Record<string, boolean>;
  onToggle: (studentUid: string, foodId: string) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border rounded-xl shadow-sm gap-4 hover:shadow-md transition-shadow">
      <div>
        <h4 className="font-semibold text-foreground">{student.name}</h4>
        <p className="text-xs text-muted-foreground font-mono">CIC: {student.cic || '—'}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {foods.map((food) => {
          const key = `${student.student_uid}-${food.id}`;
          const checked = drafts[key] ?? true;
          return (
            <FoodChip
              key={food.id}
              label={food.name}
              checked={checked}
              onPress={() => onToggle(student.student_uid, food.id)}
            />
          );
        })}
      </div>
    </div>
  );
});

const ClassSection = memo(function ClassSection({
  classId,
  students,
  foods,
  drafts,
  onToggle,
}: {
  classId: string;
  students: KitchenStudent[];
  foods: FoodItem[];
  drafts: Record<string, boolean>;
  onToggle: (studentUid: string, foodId: string) => void;
}) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 pb-2 border-b">
        <h3 className="text-xl font-bold font-heading">{classId}</h3>
        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
          {students.length} students
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {students.map((student) => (
          <StudentFoodCard
            key={student.student_uid}
            student={student}
            foods={foods}
            drafts={drafts}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
});

export default function FoodSelection({ foods, students, preferences, onRefresh }: Props) {
  const [newFoodName, setNewFoodName] = useState('');
  const [editingFoodId, setEditingFoodId] = useState('');
  const [editingFoodName, setEditingFoodName] = useState('');
  const [selectedDeleteFoodId, setSelectedDeleteFoodId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportFoodId, setSelectedReportFoodId] = useState('');
  const [savingAll, setSavingAll] = useState(false);
  const [workingAction, setWorkingAction] = useState<'add' | 'edit' | 'delete' | null>(null);

  const foodsSorted = useMemo(
    () => [...foods].filter((f) => f.is_active).sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)),
    [foods]
  );

  useEffect(() => {
    if (!selectedReportFoodId && foodsSorted.length > 0) {
      setSelectedReportFoodId(foodsSorted[0].id);
    }
  }, [foodsSorted, selectedReportFoodId]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return students;

    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.cic?.toLowerCase().includes(query) ||
        student.class_id.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  const groupedStudents = useMemo(() => {
    const grouped: Record<string, KitchenStudent[]> = {};

    [...filteredStudents]
      .sort((a, b) => {
        const classCmp = a.class_id.localeCompare(b.class_id, undefined, { numeric: true, sensitivity: 'base' });
        if (classCmp !== 0) return classCmp;

        return (a.cic || '').localeCompare(b.cic || '', undefined, { numeric: true, sensitivity: 'base' });
      })
      .forEach((student) => {
        if (!grouped[student.class_id]) grouped[student.class_id] = [];
        grouped[student.class_id].push(student);
      });

    return grouped;
  }, [filteredStudents]);

  const prefMap = useMemo(() => {
    const map = new Map<string, StudentFoodPreference>();
    preferences.forEach((pref) => {
      map.set(`${pref.student_uid}-${pref.food_item_id}`, pref);
    });
    return map;
  }, [preferences]);

  const baseDrafts = useMemo(() => {
    const initial: Record<string, boolean> = {};
    preferences.forEach((pref) => {
      initial[`${pref.student_uid}-${pref.food_item_id}`] = pref.is_needed;
    });
    return initial;
  }, [preferences]);

  const [drafts, setDrafts] = useState<Record<string, boolean>>({});
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    setDrafts(baseDrafts);
    setChangedKeys(new Set());
    initializedRef.current = true;
  }, [baseDrafts]);

  const toggleDraft = useCallback(
    (studentUid: string, foodId: string) => {
      const key = `${studentUid}-${foodId}`;
      const baseValue = baseDrafts[key] ?? true;

      setDrafts((prev) => {
        const current = prev[key] ?? true;
        const nextValue = !current;
        return { ...prev, [key]: nextValue };
      });

      setChangedKeys((prev) => {
        const next = new Set(prev);
        const currentValue = drafts[key] ?? true;
        const nextValue = !currentValue;

        if (nextValue === baseValue) next.delete(key);
        else next.add(key);

        return next;
      });
    },
    [baseDrafts, drafts]
  );

  const handleAddFood = async () => {
    const name = newFoodName.trim();
    if (!name) return toast.error('Enter food name');

    try {
      setWorkingAction('add');
      const maxOrder = foods.length ? Math.max(...foods.map((f) => f.display_order)) : 0;
      const { error } = await supabase.from('food_items').insert({ name, is_active: true, display_order: maxOrder + 1 });
      if (error) throw error;
      setNewFoodName('');
      await onRefresh();
      toast.success('Food added successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setWorkingAction(null);
    }
  };

  const handleEditFood = async () => {
    const name = editingFoodName.trim();
    if (!editingFoodId || !name) return toast.error('Select a food and enter a new name');

    try {
      setWorkingAction('edit');
      const { error } = await supabase.from('food_items').update({ name }).eq('id', editingFoodId);
      if (error) throw error;
      setEditingFoodId('');
      setEditingFoodName('');
      await onRefresh();
      toast.success('Food renamed successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setWorkingAction(null);
    }
  };

  const handleDeleteFood = async () => {
    if (!selectedDeleteFoodId) return toast.error('Select food to delete');

    if (!window.confirm('Are you sure you want to delete this food item?')) return;

    try {
      setWorkingAction('delete');
      const { error } = await supabase.from('food_items').delete().eq('id', selectedDeleteFoodId);
      if (error) throw error;
      setSelectedDeleteFoodId('');
      await onRefresh();
      toast.success('Food deleted successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setWorkingAction(null);
    }
  };

  const handleSaveAll = async () => {
    if (changedKeys.size === 0) return toast.info('No food changes to save');
    setSavingAll(true);

    try {
      for (const key of changedKeys) {
        const pref = prefMap.get(key);
        const food = foodsSorted.find((item) => key.endsWith(`-${item.id}`));
        const studentUid = food ? key.slice(0, -(food.id.length + 1)) : '';
        const nextValue = drafts[key] ?? true;

        if (!food || !studentUid) continue;

        const { error } = pref
          ? await supabase.from('student_food_preferences').update({ is_needed: nextValue }).eq('id', pref.id)
          : await supabase.from('student_food_preferences').insert({ student_uid: studentUid, food_item_id: food.id, is_needed: nextValue });

        if (error) throw error;
      }
      toast.success('All food selections saved');
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingAll(false);
    }
  };

  const selectedReportFood = useMemo(() => foodsSorted.find((food) => food.id === selectedReportFoodId) || null, [foodsSorted, selectedReportFoodId]);

  const notNeededStudentsByClass = useMemo(() => {
    if (!selectedReportFoodId) return {};

    const grouped: Record<string, KitchenStudent[]> = {};

    [...filteredStudents]
      .filter((student) => {
        const key = `${student.student_uid}-${selectedReportFoodId}`;
        return (drafts[key] ?? true) === false;
      })
      .sort((a, b) => {
        const classCmp = a.class_id.localeCompare(b.class_id, undefined, { numeric: true, sensitivity: 'base' });
        if (classCmp !== 0) return classCmp;

        const cicCmp = (a.cic || '').localeCompare(b.cic || '', undefined, { numeric: true, sensitivity: 'base' });
        if (cicCmp !== 0) return cicCmp;

        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      })
      .forEach((student) => {
        const classKey = student.class_id || 'Unassigned';
        if (!grouped[classKey]) grouped[classKey] = [];
        grouped[classKey].push(student);
      });

    return grouped;
  }, [filteredStudents, selectedReportFoodId, drafts]);

  const notNeededClassEntries = useMemo(() => Object.entries(notNeededStudentsByClass), [notNeededStudentsByClass]);
  const notNeededCount = useMemo(() => notNeededClassEntries.reduce((total, [, classStudents]) => total + classStudents.length, 0), [notNeededClassEntries]);

  const summary = useMemo(() => ({
    totalFoods: foodsSorted.length,
    totalStudents: students.length,
    totalClasses: Object.keys(groupedStudents).length,
    changed: changedKeys.size,
  }), [foodsSorted.length, students.length, groupedStudents, changedKeys]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20 mb-2">
            <Sparkles className="w-3 h-3 mr-1" />
            Food Selection
          </div>
          <h2 className="text-3xl font-bold font-heading flex items-center gap-2">
            Manage Food Preferences
          </h2>
          <p className="text-muted-foreground">Add food items, edit names, delete unused items, and manage student-wise food needs.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniInfoCard label="Foods" value={`${summary.totalFoods}`} icon={Soup} />
        <MiniInfoCard label="Students" value={`${summary.totalStudents}`} icon={Users} />
        <MiniInfoCard label="Classes" value={`${summary.totalClasses}`} icon={ClipboardList} />
        <MiniInfoCard label="Changed" value={`${summary.changed}`} icon={Save} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 sm:p-5 space-y-6">
              <div>
                <h3 className="font-semibold text-lg">Food Management</h3>
                <p className="text-sm text-muted-foreground mb-4">Add, rename, delete, and export data.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Add Food</label>
                  <div className="flex gap-2">
                    <Input placeholder="New food name" value={newFoodName} onChange={(e) => setNewFoodName(e.target.value)} />
                    <Button onClick={handleAddFood} disabled={workingAction === 'add'}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Edit Food</label>
                  <Select value={editingFoodId} onValueChange={(v) => { setEditingFoodId(v); setEditingFoodName(foodsSorted.find(f => f.id === v)?.name || ''); }}>
                    <SelectTrigger><SelectValue placeholder="Select food" /></SelectTrigger>
                    <SelectContent>{foodsSorted.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input placeholder="New name" value={editingFoodName} onChange={(e) => setEditingFoodName(e.target.value)} disabled={!editingFoodId} />
                    <Button onClick={handleEditFood} disabled={!editingFoodId || workingAction === 'edit'}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Delete Food</label>
                  <div className="flex gap-2">
                    <Select value={selectedDeleteFoodId} onValueChange={setSelectedDeleteFoodId}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select food" /></SelectTrigger>
                      <SelectContent>{foodsSorted.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="destructive" onClick={handleDeleteFood} disabled={!selectedDeleteFoodId || workingAction === 'delete'}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-lg">{changedKeys.size}</p>
                    <p className="text-xs text-muted-foreground">Pending changes</p>
                  </div>
                  <Button onClick={handleSaveAll} disabled={savingAll || changedKeys.size === 0}>
                    {savingAll ? 'Saving...' : 'Save All Changes'}
                  </Button>
                </div>
                
                <FoodSelectionPdfExport foods={foodsSorted} students={students} preferences={preferences} drafts={drafts} selectedFoodId={selectedReportFoodId} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 sm:p-5 space-y-6">
              <div>
                <h3 className="font-semibold text-lg">Food Preference Filter</h3>
                <p className="text-sm text-muted-foreground mb-4">Review who does not need the selected food.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Search Student</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search name, CIC, class..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Food Filter</label>
                  <Select value={selectedReportFoodId} onValueChange={setSelectedReportFoodId}>
                    <SelectTrigger><SelectValue placeholder="Select food" /></SelectTrigger>
                    <SelectContent>{foodsSorted.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl text-center">
                <p className="text-2xl font-bold text-destructive">{notNeededCount}</p>
                <p className="text-sm text-destructive/80 font-medium mt-1">students do not need {selectedReportFood?.name || 'selected food'}</p>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-3">
                {notNeededClassEntries.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-4">No matching students are marked as not needing this food.</p>
                ) : (
                  notNeededClassEntries.map(([classId, classStudents]) => (
                    <div key={classId} className="space-y-2">
                      <div className="flex justify-between items-center bg-muted/40 px-3 py-1.5 rounded-lg border">
                        <span className="font-semibold text-sm">{classId}</span>
                        <Badge variant="secondary" className="text-xs">{classStudents.length}</Badge>
                      </div>
                      <div className="space-y-1 px-1">
                        {classStudents.map((s, i) => (
                          <div key={s.student_uid} className="flex gap-2 text-sm text-muted-foreground">
                            <span className="font-mono w-4 text-right">{i + 1}.</span>
                            <span className="text-foreground">{s.name} <span className="text-xs opacity-60 ml-1">({s.cic || '-'})</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {Object.keys(groupedStudents).map((classId) => (
            <ClassSection
              key={classId}
              classId={classId}
              students={groupedStudents[classId]}
              foods={foodsSorted}
              drafts={drafts}
              onToggle={toggleDraft}
            />
          ))}
        </div>
      </div>
    </div>
  );
}