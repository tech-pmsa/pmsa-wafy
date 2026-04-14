'use client';

import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Save, Trash2, Edit3, Check, X } from 'lucide-react';
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

function sortByCic(a: KitchenStudent, b: KitchenStudent) {
  return (a.cic || '').localeCompare(b.cic || '', undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export default function FoodSelection({
  foods,
  students,
  preferences,
  onRefresh,
}: Props) {
  const [newFoodName, setNewFoodName] = useState('');
  const [editingFoodId, setEditingFoodId] = useState<string>('');
  const [editingFoodName, setEditingFoodName] = useState('');
  const [selectedDeleteFoodId, setSelectedDeleteFoodId] = useState('');
  const [savingAll, setSavingAll] = useState(false);
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({});
  const [localChanges, setLocalChanges] = useState<Record<string, boolean>>({});

  const groupedStudents = useMemo(() => {
    const grouped: Record<string, KitchenStudent[]> = {};
    [...students]
      .sort((a, b) => {
        const classCmp = a.class_id.localeCompare(b.class_id, undefined, { numeric: true, sensitivity: 'base' });
        if (classCmp !== 0) return classCmp;
        return sortByCic(a, b);
      })
      .forEach((student) => {
        if (!grouped[student.class_id]) grouped[student.class_id] = [];
        grouped[student.class_id].push(student);
      });
    return grouped;
  }, [students]);

  const foodsSorted = useMemo(
    () => [...foods].filter((f) => f.is_active).sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)),
    [foods]
  );

  const prefMap = useMemo(() => {
    const map = new Map<string, StudentFoodPreference>();
    preferences.forEach((pref) => {
      map.set(`${pref.student_uid}-${pref.food_item_id}`, pref);
    });
    return map;
  }, [preferences]);

  const [drafts, setDrafts] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    preferences.forEach((pref) => {
      initial[`${pref.student_uid}-${pref.food_item_id}`] = pref.is_needed;
    });
    return initial;
  });

  const changedKeys = useMemo(() => {
    return Object.keys(drafts).filter((key) => {
      const pref = preferences.find((p) => `${p.student_uid}-${p.food_item_id}` === key);
      return pref && pref.is_needed !== drafts[key];
    });
  }, [drafts, preferences]);

  const toggleDraft = (studentUid: string, foodId: string) => {
    const key = `${studentUid}-${foodId}`;
    setDrafts((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setLocalChanges((prev) => ({ ...prev, [studentUid]: true }));
  };

  const handleAddFood = async () => {
    const name = newFoodName.trim();
    if (!name) return toast.error('Enter food name');

    try {
      const maxOrder = foods.length ? Math.max(...foods.map((f) => f.display_order)) : 0;
      const { error } = await supabase.from('food_items').insert({
        name,
        is_active: true,
        display_order: maxOrder + 1,
      });
      if (error) throw error;

      toast.success('Food added');
      setNewFoodName('');
      await onRefresh();
    } catch (err: any) {
      toast.error('Failed to add food', { description: err.message });
    }
  };

  const handleStartEdit = (food: FoodItem) => {
    setEditingFoodId(food.id);
    setEditingFoodName(food.name);
  };

  const handleEditFood = async () => {
    const name = editingFoodName.trim();
    if (!editingFoodId || !name) return toast.error('Enter food name');

    try {
      const { error } = await supabase
        .from('food_items')
        .update({ name })
        .eq('id', editingFoodId);

      if (error) throw error;

      toast.success('Food updated');
      setEditingFoodId('');
      setEditingFoodName('');
      await onRefresh();
    } catch (err: any) {
      toast.error('Failed to update food', { description: err.message });
    }
  };

  const handleDeleteFood = async () => {
    if (!selectedDeleteFoodId) return toast.error('Select food to delete');

    try {
      const { error } = await supabase.from('food_items').delete().eq('id', selectedDeleteFoodId);
      if (error) throw error;

      toast.success('Food deleted');
      setSelectedDeleteFoodId('');
      await onRefresh();
    } catch (err: any) {
      toast.error('Failed to delete food', { description: err.message });
    }
  };

  const handleSaveStudent = async (studentUid: string) => {
    setRowLoading((prev) => ({ ...prev, [studentUid]: true }));
    try {
      const updates = foodsSorted.map((food) => {
        const key = `${studentUid}-${food.id}`;
        const pref = prefMap.get(key);
        return supabase
          .from('student_food_preferences')
          .update({ is_needed: drafts[key] })
          .eq('id', pref?.id || '');
      });

      for (const op of updates) {
        const { error } = await op;
        if (error) throw error;
      }

      toast.success('Student food saved');
      setLocalChanges((prev) => ({ ...prev, [studentUid]: false }));
      await onRefresh();
    } catch (err: any) {
      toast.error('Failed to save student food', { description: err.message });
    } finally {
      setRowLoading((prev) => ({ ...prev, [studentUid]: false }));
    }
  };

  const handleSaveAll = async () => {
    if (changedKeys.length === 0) return toast.error('No food changes to save');

    setSavingAll(true);
    try {
      for (const key of changedKeys) {
        const pref = prefMap.get(key);
        if (!pref) continue;
        const { error } = await supabase
          .from('student_food_preferences')
          .update({ is_needed: drafts[key] })
          .eq('id', pref.id);

        if (error) throw error;
      }

      toast.success('All food selections saved');
      setLocalChanges({});
      await onRefresh();
    } catch (err: any) {
      toast.error('Failed to save all food selections', { description: err.message });
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Food Management</CardTitle>
          <CardDescription>Add, edit, or delete food items for students.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Add Food</label>
              <div className="flex gap-2">
                <Input
                  value={newFoodName}
                  onChange={(e) => setNewFoodName(e.target.value)}
                  placeholder="Enter food name"
                />
                <Button onClick={handleAddFood}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Edit Food</label>
              <div className="flex gap-2">
                <Select value={editingFoodId} onValueChange={(value) => {
                  const food = foodsSorted.find((f) => f.id === value);
                  if (food) handleStartEdit(food);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select food" />
                  </SelectTrigger>
                  <SelectContent>
                    {foodsSorted.map((food) => (
                      <SelectItem key={food.id} value={food.id}>
                        {food.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={editingFoodName}
                  onChange={(e) => setEditingFoodName(e.target.value)}
                  placeholder="Edit name"
                />
                <Button onClick={handleEditFood}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Delete Food</label>
              <div className="flex gap-2">
                <Select value={selectedDeleteFoodId} onValueChange={setSelectedDeleteFoodId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select food" />
                  </SelectTrigger>
                  <SelectContent>
                    {foodsSorted.map((food) => (
                      <SelectItem key={food.id} value={food.id}>
                        {food.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="destructive" onClick={handleDeleteFood}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Badge variant="outline">Changed: {changedKeys.length}</Badge>
            <Button onClick={handleSaveAll} disabled={savingAll || changedKeys.length === 0}>
              <Save className="mr-2 h-4 w-4" />
              Save All Foods
            </Button>

            <FoodSelectionPdfExport
              foods={foodsSorted}
              students={students.map((s) => ({
                student_uid: s.student_uid,
                name: s.name,
                cic: s.cic,
                class_id: s.class_id,
              }))}
              preferences={preferences}
            />
          </div>
        </CardContent>
      </Card>

      {Object.keys(groupedStudents).map((classId) => (
        <Card key={classId} className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>{classId}</CardTitle>
            <CardDescription>
              {groupedStudents[classId].length} students • ordered by CIC ascending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-2xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60">
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">CIC</th>
                    {foodsSorted.map((food) => (
                      <th key={food.id} className="px-4 py-3 text-center font-semibold whitespace-nowrap">
                        {food.name}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedStudents[classId].map((student) => (
                    <tr key={student.student_uid} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-medium">{student.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{student.cic || '—'}</td>

                      {foodsSorted.map((food) => {
                        const key = `${student.student_uid}-${food.id}`;
                        const checked = drafts[key] ?? true;

                        return (
                          <td key={food.id} className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleDraft(student.student_uid, food.id)}
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                                checked
                                  ? 'bg-green-600 text-white border-green-700'
                                  : 'bg-red-600 text-white border-red-700'
                              }`}
                              title={checked ? 'Needed' : 'Not needed'}
                            >
                              {checked ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                            </button>
                          </td>
                        );
                      })}

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {localChanges[student.student_uid] && <Badge variant="outline">Changed</Badge>}
                          <Button
                            size="sm"
                            onClick={() => handleSaveStudent(student.student_uid)}
                            disabled={rowLoading[student.student_uid]}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}