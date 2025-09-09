'use client'

import React from 'react';
import StudentAttendanceCard from '@/components/StudentAttendanceCard';
import FeeTable from '@/components/StudentFeeDashboard';
import AchievementsForm from '@/components/AchievementsForm';
import ApprovedAchievements from '@/components/ApprovedAchievements';

const StudentDashboardPage = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      <div className="lg:col-span-3">
        <h1 className="text-3xl font-bold font-heading text-neutral-black">My Dashboard</h1>
        <p className="text-neutral-dark">Here's an overview of your academic progress.</p>
      </div>

      <div className="lg:col-span-2 flex flex-col gap-6">
        <StudentAttendanceCard />
        <FeeTable />
      </div>

      <div className="lg:col-span-1 flex flex-col gap-6">
        <AchievementsForm />
        <ApprovedAchievements />
      </div>
    </div>
  );
};

export default StudentDashboardPage;