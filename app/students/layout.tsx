// app/students/layout.tsx
import React from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      {/* Sidebar is hidden on mobile, visible on desktop */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}