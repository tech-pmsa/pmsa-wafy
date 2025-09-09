import React from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Toaster } from '@/components/ui/sonner';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-neutral-light">
      <div className="hidden md:block w-64 border-r bg-background">
        <AdminSidebar />
      </div>

      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <Footer />
        <Toaster richColors position="top-right" />
      </div>
    </div>
  );
}