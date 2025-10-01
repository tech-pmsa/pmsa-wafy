// components/admin/AdminSidebar.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';

// UI Components
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GraduationCap, LayoutDashboard, Users, School, UserCheck, Settings, BookUser, Loader2, Bell, Book } from 'lucide-react';

// Centralized navigation configuration
const allNavItems = [
    { href: '/admins/officer/officer-dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['officer'] },
    { href: '/admins/classroom/class-dashboard', label: 'Dashboard', icon: School, roles: ['class'] },
    { href: '/admins/classleader/class-leader-dashboard', label: 'Dashboard', icon: BookUser, roles: ['class-leader'] },
    { href: '/admins/manage-students', label: 'Students', icon: Users, roles: ['officer', 'class'] },
    { href: '/admins/officer/manage-staff', label: 'Staff', icon: UserCheck, roles: ['officer'] },
    { href: '/admins/officer/staffregister', label: 'Staff Register', icon: Book, roles: ['officer'] },
    { href: '/admins/classroom/notifications', label: 'Notifications', icon: Bell, roles: ['class'], notification: 'achievements' },
];

const settingsNavItem = { href: '/admins/admin-settings', label: 'Settings', icon: Settings, roles: ['officer', 'class', 'class-leader', 'staff'] };

interface AdminSidebarProps {
    onLinkClick?: () => void;
}

export default function AdminSidebar({ onLinkClick }: AdminSidebarProps) {
    const pathname = usePathname();
    const { role, details, loading } = useUserData();
    const [notificationCount, setNotificationCount] = useState(0);

    // Notification fetching logic is preserved
    useEffect(() => {
        if (role === 'class' && details?.batch) {
            const fetchCount = async () => {
                const { count } = await supabase.from('achievements').select('*', { count: 'exact', head: true }).eq('batch', details.batch).eq('approved', false);
                setNotificationCount(count || 0);
            };
            fetchCount();
            const channel = supabase.channel('achievement-notifications').on('postgres_changes', { event: '*', schema: 'public', table: 'achievements' }, fetchCount).subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [role, details]);

    const accessibleNavItems = allNavItems.filter(item => item.roles.includes(role || ''));
    const canAccessSettings = settingsNavItem.roles.includes(role || '');

    return (
        <aside className="flex h-full w-64 flex-col border-r bg-background">
            <div className="flex h-16 items-center gap-3 border-b px-6">
                <GraduationCap className="h-8 w-8 bg-primary-gradient text-white rounded-lg p-1.5" />
                <span className="text-xl font-bold font-heading">PMSA Wafy</span>
            </div>

            <div className="flex-1 overflow-y-auto">
                <nav className="p-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-full pt-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <ul className="space-y-1">
                            {accessibleNavItems.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={onLinkClick}
                                        className={cn(
                                            "flex items-center gap-3 rounded-md px-3 py-2.5 text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground",
                                            (pathname === item.href) && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground font-semibold"
                                        )}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        <span className="flex-1 font-semibold">{item.label}</span>
                                        {item.notification === 'achievements' && notificationCount > 0 && (
                                            <Badge className="h-6 w-6 flex items-center justify-center p-0 bg-destructive text-destructive-foreground">{notificationCount}</Badge>
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </nav>
            </div>

            <div className="mt-auto p-4 border-t">
                <nav>
                    <ul className="space-y-1">
                        {canAccessSettings && (
                             <li>
                                <Link href={settingsNavItem.href} onClick={onLinkClick}
                                    className={cn(
                                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground",
                                        pathname === settingsNavItem.href && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground font-semibold"
                                    )}
                                >
                                    <Settings className="h-5 w-5" />
                                    <span className="font-semibold">Settings</span>
                                </Link>
                            </li>
                        )}
                         <li className="pt-2">
                            <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground">
                                <Avatar className="h-10 w-10 border">
                                    <AvatarImage src={details?.img_url} alt={details?.name} />
                                    <AvatarFallback>{details?.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-foreground truncate">{details?.name}</span>
                                    <span className="text-xs capitalize">{details?.role}</span>
                                </div>
                            </div>
                         </li>
                    </ul>
                </nav>
            </div>
        </aside>
    );
}