'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import UserProfileNav from '@/components/UserProfileNav';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Sidebar from './Sidebar';
import { Button } from './ui/button';

// A simple function to generate a readable title from the URL path
const generateTitle = (path: string) => {
    const lastSegment = path.split('/').pop() || 'dashboard';
    return lastSegment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize each word
};

export default function Header() {
    const pathname = usePathname();
    const title = generateTitle(pathname);

    return (
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
            <div className="flex items-center gap-4">
                 {/* Mobile Menu using a Sheet for the Sidebar */}
                 <div className="md:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle navigation menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0">
                           <Sidebar />
                        </SheetContent>
                    </Sheet>
                </div>
                <h1 className="text-xl font-semibold font-heading hidden md:block">{title}</h1>
            </div>

            <div className="ml-auto">
                <UserProfileNav />
            </div>
        </header>
    );
}