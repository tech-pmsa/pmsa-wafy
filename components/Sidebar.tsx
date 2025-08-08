// components/Sidebar.tsx (Corrected & Simplified)

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, LayoutDashboard, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

// Simplified navigation for a better student experience
const navItems = [
    { href: '/students/student-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    // Corrected the path to the unified settings page
    { href: '/admins/admin-settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="flex h-full w-full flex-col border-r bg-background">
            <div className="flex h-16 items-center gap-2 border-b px-6">
                <GraduationCap className="h-7 w-7 text-brand-green" />
                <span className="text-lg font-bold font-heading">PMSA Wafy</span>
            </div>
            <nav className="flex-1 p-4">
                <ul className="space-y-2">
                    {navItems.map((item) => (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-neutral-dark transition-all hover:text-neutral-black hover:bg-neutral-medium/50",
                                    // Updated logic to correctly highlight the active page
                                    pathname === item.href && "bg-brand-green-light text-brand-green-dark font-semibold"
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
}
