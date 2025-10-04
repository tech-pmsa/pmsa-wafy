// components/Header.tsx
'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useUserData } from '@/hooks/useUserData';

// UI Components
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from './ui/button';
import { Menu, Loader2 } from 'lucide-react';
import UserProfileNav from '@/components/UserProfileNav';
import AdminSidebar from './admin/AdminSidebar';
import Sidebar from './Sidebar'; // This is the student sidebar
import { ThemeToggle } from './theme-toggle';

// Generates a clean title from the URL's last segment.
const generateTitle = (path: string) => {
    const lastSegment = path.split('/').pop() || 'dashboard';
    return lastSegment.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

export default function Header() {
    const pathname = usePathname();
    const { role, loading } = useUserData();
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const isAdmin = role === 'officer' || role === 'class' || role === 'class-leader' || role === 'staff';
    const handleLinkClick = () => setIsSheetOpen(false);

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
            {/* Mobile Menu (Sheet) */}
            <div className="md:hidden">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle navigation menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-64">
                        {loading ? (
                            <div className="flex h-full w-full items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : isAdmin ? (
                            <AdminSidebar onLinkClick={handleLinkClick} />
                        ) : (
                            <Sidebar onLinkClick={handleLinkClick} />
                        )}
                    </SheetContent>
                </Sheet>
            </div>

            {/* Dynamic Page Title for Desktop */}
            <div className="hidden md:block">
                <h1 className="text-xl font-semibold font-heading">{generateTitle(pathname)}</h1>
            </div>

            <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
                <UserProfileNav />
            </div>
        </header>
    );
}