// app/login/layout.tsx
import React from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // Use the theme's background color for a consistent look.
    <main className="relative flex min-h-screen w-full items-center justify-center bg-background p-4">
      {/* Position the theme toggle outside and on top of the main card */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      {children}
    </main>
  );
}