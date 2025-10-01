// app/admins/layout.tsx
import React from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-muted/40">

      {/* Sidebar: Visible on desktop, hidden on mobile */}
      <div className="hidden md:block">
        <AdminSidebar />
      </div>
      {/* Main Content Area with overflow fixes */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}