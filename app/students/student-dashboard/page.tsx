// app/students/student-dashboard/page.tsx
'use client'

import React from 'react';
import { useUserData } from '@/hooks/useUserData';
import { Skeleton } from '@/components/ui/skeleton';

// Import the redesigned dashboard components
import StudentAttendanceCard from '@/components/StudentAttendanceCard';
import StudentFeeDashboard from '@/components/StudentFeeDashboard';
import AchievementsForm from '@/components/AchievementsForm';
import ApprovedAchievements from '@/components/ApprovedAchievements';

export default function StudentDashboardPage() {
  const { details, loading } = useUserData();

  // A modern skeleton loader that mimics the final layout
  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="lg:col-span-1 space-y-8">
            <Skeleton className="h-52 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold font-heading">
          My Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {details?.name}. Here's an overview of your progress.
        </p>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* Primary Column (Attendance & Fees) */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <StudentAttendanceCard />
          <StudentFeeDashboard />
        </div>

        {/* Secondary Column (Achievements) */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          <AchievementsForm />
          <ApprovedAchievements />
        </div>

      </div>
    </div>
  );
};