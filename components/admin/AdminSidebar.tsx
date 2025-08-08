'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserData } from '@/hooks/useUserData';
import { GraduationCap, LayoutDashboard, Users, School, UserCheck, Settings, BookUser, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const allNavItems = [
    { href: '/admins/officer/officer-dashboard', label: 'Officer Dashboard', icon: LayoutDashboard, roles: ['officer'] },
    { href: '/admins/classroom/class-dashboard', label: 'Class Dashboard', icon: School, roles: ['class'] },
    { href: '/admins/classleader/class-leader-dashboard', label: 'Leader Dashboard', icon: BookUser, roles: ['class-leader'] },
    { href: '/admins/manage-students', label: 'Manage Students', icon: Users, roles: ['officer', 'class'] },
    { href: '/admins/manage-staff', label: 'Manage Staff', icon: UserCheck, roles: ['officer'] },
    // CORRECTED: The path for settings
    { href: '/admins/settings', label: 'Settings', icon: Settings, roles: ['officer', 'class', 'class-leader'] },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const { role, loading } = useUserData();

    const accessibleNavItems = allNavItems.filter(item => item.roles.includes(role || ''));

    return (
        // REMOVED: `hidden md:flex` classes from here
        <aside className="flex h-full w-full flex-col border-r bg-background">
            <div className="flex h-16 items-center gap-2 border-b px-6">
                <GraduationCap className="h-7 w-7 text-brand-green" />
                <span className="text-lg font-bold font-heading">PMSA Admin</span>
            </div>
            <nav className="flex-1 p-4">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {accessibleNavItems.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-neutral-dark transition-all hover:text-neutral-black hover:bg-neutral-medium/50",
                                        (pathname === item.href || (item.href !== '/admins/officer/officer-dashboard' && pathname.startsWith(item.href))) && "bg-brand-green-light text-brand-green-dark font-semibold"
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </nav>
        </aside>
    );
}