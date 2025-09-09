'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import UserProfileNav from '@/components/UserProfileNav';
import { Menu, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from './ui/button';

import Sidebar from './Sidebar';
import AdminSidebar from './admin/AdminSidebar';
import { useUserData } from '@/hooks/useUserData';

// A simple function to generate a readable title from the URL path
const generateTitle = (path: string) => {
    const lastSegment = path.split('/').pop() || 'dashboard';
    return lastSegment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
};

export default function Header() {
    const pathname = usePathname();
    const { role, loading } = useUserData();
    const title = generateTitle(pathname);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Determine if the user has an administrative role
    const isAdmin = role === 'officer' || role === 'class' || role === 'class-leader';

    const handleLinkClick = () => {
        setIsSheetOpen(false);
    };

    return (
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
            <div className="flex items-center gap-4">
                {/* Mobile Menu using a Sheet for the Sidebar */}
                <div className="md:hidden">
                    {/* Control the Sheet's state */}
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle navigation menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0">
                            {/* Conditionally render the correct sidebar and pass the closing function */}
                            {loading ? (
                                <div className="flex h-full w-full items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : isAdmin ? (
                                <AdminSidebar onLinkClick={handleLinkClick} />
                            ) : (
                                <Sidebar />
                            )}
                        </SheetContent>
                    </Sheet>
                </div>
                <h1 className="text-xl font-semibold hidden md:block">{title}</h1>
            </div>

            <div className="ml-auto">
                <UserProfileNav />
            </div>
        </header>
    );
}
