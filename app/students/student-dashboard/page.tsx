'use client'

import React from 'react';
import StudentAttendanceCard from '@/components/StudentAttendanceCard';
import FeeTable from '@/components/StudentFeeDashboard';
import AchievementsForm from '@/components/AchievementsForm';
import ApprovedAchievements from '@/components/ApprovedAchievements';

const StudentDashboardPage = () => {
  return (
    // Using a responsive grid layout for a modern dashboard feel.
    // The grid will stack on small screens and expand on larger screens.
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">

      {/* Welcome Header */}
      <div className="lg:col-span-3">
        <h1 className="text-3xl font-bold font-heading text-neutral-black">My Dashboard</h1>
        <p className="text-neutral-dark">Here's an overview of your academic progress.</p>
      </div>

      {/* Main Content Area - takes up 2/3 of the width on large screens */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <StudentAttendanceCard />
        <FeeTable />
      </div>

      {/* Sidebar Content Area - takes up 1/3 of the width on large screens */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <AchievementsForm />
        <ApprovedAchievements />
      </div>
    </div>
  );
};

export default StudentDashboardPage;