import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // Use a modern gradient background that incorporates the brand colors
    <main className="flex min-h-screen w-full items-center justify-center bg-neutral-light p-4">
       {/* The children, in this case the login page, will be rendered here */}
      {children}
    </main>
  );
}