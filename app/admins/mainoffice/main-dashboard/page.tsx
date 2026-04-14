'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

import {
  AlertCircle,
  Building2,
  RefreshCcw,
  Users,
  Sun,
  UtensilsCrossed,
  MoonStar,
} from 'lucide-react';

interface Profile {
  uid: string;
  role: string;
  name: string | null;
}

interface StudentRow {
  uid: string;
}

interface KitchenStudent {
  student_uid: string;
  name: string;
  class_id: string;
  day_present: boolean;
  noon_present: boolean;
  night_present: boolean;
}

interface FoodItem {
  id: string;
  name: string;
  is_active: boolean;
  display_order: number;
}

interface StudentFoodPreference {
  id: string;
  student_uid: string;
  food_item_id: string;
  is_needed: boolean;
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <h3 className="text-3xl font-bold font-heading">{value}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MainOfficePage() {
  const { user: authUser } = useUserData();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [kitchenStudents, setKitchenStudents] = useState<KitchenStudent[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [foodPreferences, setFoodPreferences] = useState<StudentFoodPreference[]>([]);
  const [selectedFoodId, setSelectedFoodId] = useState('default');

  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      if (!data || data.role !== 'main') {
        throw new Error('You are not allowed to access Main Office dashboard.');
      }

      setProfile(data as Profile);
    } catch (err: any) {
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
        { data: studentsData, error: studentsError },
        { data: kitchenData, error: kitchenError },
        { data: foodsData, error: foodsError },
        { data: prefsData, error: prefsError },
      ] = await Promise.all([
        supabase.from('students').select('uid'),
        supabase.from('kitchen_students').select('student_uid, name, class_id, day_present, noon_present, night_present'),
        supabase.from('food_items').select('id, name, is_active, display_order').eq('is_active', true).order('display_order', { ascending: true }),
        supabase.from('student_food_preferences').select('id, student_uid, food_item_id, is_needed'),
      ]);

      if (studentsError) throw studentsError;
      if (kitchenError) throw kitchenError;
      if (foodsError) throw foodsError;
      if (prefsError) throw prefsError;

      setStudents((studentsData || []) as StudentRow[]);
      setKitchenStudents((kitchenData || []) as KitchenStudent[]);
      setFoods((foodsData || []) as FoodItem[]);
      setFoodPreferences((prefsData || []) as StudentFoodPreference[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load main office data');
      toast.error('Failed to load main office data', { description: err.message });
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

  const summary = useMemo(() => {
    const totalStudents = students.length;

    const totalPresent = kitchenStudents.filter(
      (s) => s.day_present || s.noon_present || s.night_present
    ).length;

    const totalAbsent = kitchenStudents.filter(
      (s) => !s.day_present && !s.noon_present && !s.night_present
    ).length;

    const dayPresent = kitchenStudents.filter((s) => s.day_present).length;
    const noonPresent = kitchenStudents.filter((s) => s.noon_present).length;
    const nightPresent = kitchenStudents.filter((s) => s.night_present).length;

    let finalFoodPresent = 0;

    if (selectedFoodId !== 'default') {
      const presentDayStudentIds = new Set(
        kitchenStudents.filter((s) => s.day_present).map((s) => s.student_uid)
      );

      const neededStudentIds = new Set(
        foodPreferences
          .filter((p) => p.food_item_id === selectedFoodId && p.is_needed === true)
          .map((p) => p.student_uid)
      );

      finalFoodPresent = Array.from(presentDayStudentIds).filter((id) => neededStudentIds.has(id)).length;
    }

    return {
      totalStudents,
      totalPresent,
      totalAbsent,
      dayPresent,
      noonPresent,
      nightPresent,
      finalFoodPresent,
    };
  }, [students, kitchenStudents, foodPreferences, selectedFoodId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold font-heading">
            <Building2 className="h-8 w-8 text-primary" />
            Main Office Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Current college presence report and final food-needed present count.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="min-w-[220px]">
            <Select value={selectedFoodId} onValueChange={setSelectedFoodId}>
              <SelectTrigger>
                <SelectValue placeholder="Select food" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                {foods.map((food) => (
                  <SelectItem key={food.id} value={food.id}>
                    {food.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={fetchData} disabled={loading || profileLoading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Students"
            value={summary.totalStudents}
            description="Total students in college"
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="Total Present"
            value={summary.totalPresent}
            description="Present in any of day, noon, or night"
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="Total Absent"
            value={summary.totalAbsent}
            description="Absent in day, noon, and night"
            icon={<AlertCircle className="h-5 w-5" />}
          />
          <StatCard
            title="Day Present"
            value={summary.dayPresent}
            description="Present in day"
            icon={<Sun className="h-5 w-5" />}
          />
          <StatCard
            title="Noon Present"
            value={summary.noonPresent}
            description="Present in noon"
            icon={<UtensilsCrossed className="h-5 w-5" />}
          />
          <StatCard
            title="Night Present"
            value={summary.nightPresent}
            description="Present in night"
            icon={<MoonStar className="h-5 w-5" />}
          />
          <StatCard
            title="Final Food Present"
            value={summary.finalFoodPresent}
            description={
              selectedFoodId === 'default'
                ? 'Select a food to calculate'
                : 'Day present students who need selected food'
            }
            icon={<UtensilsCrossed className="h-5 w-5" />}
          />
        </div>
      )}
    </div>
  );
}