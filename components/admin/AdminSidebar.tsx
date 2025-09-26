'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserData } from '@/hooks/useUserData';
import { GraduationCap, LayoutDashboard, Users, School, UserCheck, Settings, BookUser, Loader2, Bell, Book } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';

const allNavItems = [
    { href: '/admins/officer/officer-dashboard', label: 'Officer Dashboard', icon: LayoutDashboard, roles: ['officer'] },
    { href: '/admins/classroom/class-dashboard', label: 'Class Dashboard', icon: School, roles: ['class'] },
    { href: '/admins/classleader/class-leader-dashboard', label: 'Leader Dashboard', icon: BookUser, roles: ['class-leader'] },
    { href: '/admins/classroom/notifications', label: 'Notifications', icon: Bell, roles: ['class'], notification: 'achievements' },
    { href: '/admins/manage-students', label: 'Manage Students', icon: Users, roles: ['officer', 'class'] },
    { href: '/admins/officer/manage-staff', label: 'Manage Staff', icon: UserCheck, roles: ['officer'] },
    { href: '/admins/admin-settings', label: 'Settings', icon: Settings, roles: ['officer', 'class', 'class-leader'] },
    { href: '/admins/officer/staffregister', label: 'Staff Register', icon: Book, roles: ['officer'] },
];

interface AdminSidebarProps {
    onLinkClick?: () => void;
}

export default function AdminSidebar({ onLinkClick }: AdminSidebarProps) {
    const pathname = usePathname();
    const { role, details, loading } = useUserData();
    const [notificationCount, setNotificationCount] = useState(0);

    // Fetch notification count for pending achievements
    useEffect(() => {
        if (role === 'class' && details?.batch) {
            const fetchCount = async () => {
                const { count, error } = await supabase
                    .from('achievements')
                    .select('*', { count: 'exact', head: true })
                    .eq('batch', details.batch)
                    .eq('approved', false);

                if (!error) {
                    setNotificationCount(count || 0);
                }
            };
            fetchCount();

            const channel = supabase.channel('achievement-notifications')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'achievements' }, fetchCount)
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [role, details]);

    const accessibleNavItems = allNavItems.filter(item => item.roles.includes(role || ''));

    return (
        <aside className="flex h-full w-full flex-col border-r bg-background">
            <div className="flex h-16 items-center gap-2 border-b px-6">
                <GraduationCap className="h-7 w-7 text-primary" />
                <span className="text-lg font-bold">PMSA Wafy</span>
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
                                    onClick={onLinkClick}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10",
                                        (pathname === item.href || pathname.startsWith(`${item.href}/`)) && "bg-primary/10 text-primary font-semibold"
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    <span className="flex-1">{item.label}</span>
                                    {item.notification === 'achievements' && notificationCount > 0 && (
                                        <Badge className="h-6 w-6 flex items-center justify-center p-0 bg-primary text-primary-foreground">{notificationCount}</Badge>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </nav>
        </aside>
    );
}
