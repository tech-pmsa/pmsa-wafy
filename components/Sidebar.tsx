// components/Sidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserData } from '@/hooks/useUserData';
import { cn } from '@/lib/utils';

// UI Components
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GraduationCap, LayoutDashboard, Settings, Loader2 } from 'lucide-react';

const navItems = [
    { href: '/students/student-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admins/admin-settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
    onLinkClick?: () => void;
}

export default function Sidebar({ onLinkClick }: SidebarProps) {
    const pathname = usePathname();
    const { details, loading } = useUserData();

    return (
        <aside className="flex h-full w-64 flex-col border-r bg-background">
            <div className="flex h-16 items-center gap-3 border-b px-6">
                <GraduationCap className="h-8 w-8 bg-primary-gradient text-white rounded-lg p-1.5" />
                <span className="text-xl font-bold font-heading">PMSA Wafy</span>
            </div>

            <div className="flex-1 overflow-y-auto">
                <nav className="p-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-full pt-20">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <ul className="space-y-1">
                            {navItems.map((item) => (
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
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </nav>
            </div>

            <div className="mt-auto p-4 border-t">
                {loading || !details ? (
                    <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground animate-pulse">
                        <div className="h-10 w-10 rounded-full bg-muted"></div>
                        <div className="flex flex-col gap-2">
                           <div className="h-4 w-24 bg-muted rounded"></div>
                           <div className="h-3 w-16 bg-muted rounded"></div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground">
                        <Avatar className="h-10 w-10 border">
                            <AvatarImage src={details.img_url} alt={details.name} />
                            <AvatarFallback>{details.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground truncate">{details.name}</span>
                            <span className="text-xs capitalize">{details.role}</span>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}