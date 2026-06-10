// components/Sidebar.tsx
'use client';

import React, { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Lucide Icon Components
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  School,
  UserCheck,
  Settings,
  BookUser,
  Bell,
  Book,
  CookingPot,
  LogOut,
  ClipboardList,
  NotebookPen,
  BarChart3,
  FileCheck2,
} from 'lucide-react';

const allNavItems = [
  {
    href: '/admins/officer/officer-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['officer'],
  },
  {
    href: '/admins/classroom/class-dashboard',
    label: 'Dashboard',
    icon: School,
    roles: ['class'],
  },
  {
    href: '/admins/classleader/class-leader-dashboard',
    label: 'Dashboard',
    icon: BookUser,
    roles: ['class-leader'],
  },
  {
    href: '/admins/classleader/portions',
    label: 'Portions',
    icon: BarChart3,
    roles: ['class-leader'],
  },
  {
    href: '/admins/classleader/ce-work',
    label: 'CE Work',
    icon: FileCheck2,
    roles: ['class-leader'],
  },
  {
    href: '/admins/staff/staff-dashboard',
    label: 'Dashboard',
    icon: BookUser,
    roles: ['staff'],
  },
  {
    href: '/admins/students-detail',
    label: 'Students',
    icon: Users,
    roles: ['staff'],
  },
  {
    href: '/students/student-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['student'],
  },
  {
    href: '/admins/manage-students',
    label: 'Students',
    icon: Users,
    roles: ['officer', 'class'],
  },
  {
    href: '/admins/officer/manage-staff',
    label: 'Staff',
    icon: UserCheck,
    roles: ['officer'],
  },
  {
    href: '/admins/officer/staffregister',
    label: 'Staff Register',
    icon: Book,
    roles: ['officer'],
  },
  {
    href: '/admins/classroom/notifications',
    label: 'Notifications',
    icon: Bell,
    roles: ['class'],
    notification: 'achievements',
  },
  {
    href: '/admins/classroom/internal-marks',
    label: 'Internal Marks',
    icon: ClipboardList,
    roles: ['class'],
    minBatch: 17,
  },
  {
    href: '/admins/classroom/homework',
    label: 'Homework',
    icon: NotebookPen,
    roles: ['class'],
    minBatch: 17,
  },
  {
    href: '/admins/classroom/portions-statistics',
    label: 'Portions',
    icon: BarChart3,
    roles: ['class'],
  },
  {
    href: '/admins/classroom/ce-work-statistics',
    label: 'CE Work Statistics',
    icon: FileCheck2,
    roles: ['class'],
  },
  {
    href: '/admins/chef/chef-dashboard',
    label: 'Dashboard',
    icon: CookingPot,
    roles: ['chef'],
  },
  {
    href: '/admins/mainoffice/main-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['main'],
  },
  {
    href: '/admins/chef/chef-settings',
    label: 'Kitchen Settings',
    icon: Settings,
    roles: ['chef'],
  },
  {
    href: '/admins/kitchen',
    label: 'Kitchen Attendance',
    icon: CookingPot,
    roles: ['officer', 'class'],
  },
];

function getBatchNumber(batch?: string | null) {
  const match = batch?.match(/Batch\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

interface SidebarProps {
  onLinkClick?: () => void;
}

export default function Sidebar({ onLinkClick }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { role, details, loading } = useUserData();
  const [notificationCount, setNotificationCount] = useState(0);

  // Notification fetching logic for class teachers
  useEffect(() => {
    if (role === 'class' && details?.batch) {
      const fetchCount = async () => {
        const { count } = await supabase
          .from('achievements')
          .select('*', { count: 'exact', head: true })
          .eq('batch', details.batch)
          .eq('approved', false);
        setNotificationCount(count || 0);
      };
      fetchCount();

      const channel = supabase
        .channel('achievement-notifications')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'achievements' },
          fetchCount
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [role, details]);

  const accessibleNavItems = useMemo(() => {
    if (!role) return [];
    return allNavItems.filter((item) => {
      if (!item.roles.includes(role)) return false;
      const minBatch = 'minBatch' in item ? item.minBatch : undefined;
      if (!minBatch) return true;

      const batchNumber = getBatchNumber(details?.batch);
      return !!batchNumber && batchNumber >= minBatch;
    });
  }, [role, details?.batch]);

  const settingsRoute = '/admins/admin-settings';
  const isSettingsActive = pathname === settingsRoute || pathname.startsWith(settingsRoute + '/');
  const userInitial = details?.name?.charAt(0)?.toUpperCase() || 'U';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Premium Skeleton Loading Screen
  if (loading) {
    return (
      <aside className="flex h-full w-64 flex-col border-r border-border bg-background select-none">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b px-6">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary animate-pulse">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="h-5 bg-muted animate-pulse rounded-md w-2/3"></div>
        </div>
        <div className="flex-grow p-4 space-y-4">
          <div className="h-3.5 bg-muted animate-pulse rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-9 bg-muted animate-pulse rounded-lg w-full"></div>
            <div className="h-9 bg-muted animate-pulse rounded-lg w-full"></div>
            <div className="h-9 bg-muted animate-pulse rounded-lg w-full"></div>
          </div>
        </div>
        <div className="mt-auto p-4 border-t">
          <div className="flex items-center gap-3 animate-pulse">
            <div className="h-10 w-10 rounded-full bg-muted"></div>
            <div className="flex-grow space-y-2">
              <div className="h-3.5 bg-muted rounded w-2/3"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-background select-none">
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b px-6">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground shadow-sm">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <h2 className="text-base font-bold font-heading text-foreground tracking-tight leading-none">PMSA Wafy</h2>
          <span className="text-[10px] font-semibold text-muted-foreground/80 mt-1">Academic Portal</span>
        </div>
      </div>

      {/* Main Navigation Section */}
      <div className="flex-grow overflow-y-auto p-4">
        <nav className="space-y-1">
          {accessibleNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onLinkClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all hover:bg-accent hover:text-accent-foreground text-muted-foreground",
                  isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.notification === 'achievements' && notificationCount > 0 && (
                  <Badge className="h-5 min-w-[20px] px-1 flex items-center justify-center text-[10px] font-extrabold bg-destructive text-destructive-foreground hover:bg-destructive">
                    {notificationCount}
                  </Badge>
                )}
              </Link>
            );
          })}

          <div className="h-px my-4 bg-border" />

          {/* Settings Link */}
          <Link
            href={settingsRoute}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all hover:bg-accent hover:text-accent-foreground text-muted-foreground",
              isSettingsActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span className="flex-grow">Settings</span>
          </Link>
        </nav>
      </div>

      {/* Footer Profile Section & Log Out */}
      <div className="mt-auto p-4 border-t bg-background">
        {/* Profile Info */}
        <div className="flex items-center gap-3 px-2 py-1.5 text-muted-foreground">
          <div className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted items-center justify-center shadow-inner">
            {details?.img_url ? (
              <img src={details.img_url} alt={details.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-muted-foreground text-sm font-extrabold font-heading">{userInitial}</span>
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-grow">
            <span className="text-sm font-semibold text-foreground truncate leading-snug">{details?.name || 'Loading...'}</span>
            <span className="text-[10px] capitalize text-muted-foreground/80 truncate leading-none mt-0.5">{details?.role || role || 'User'}</span>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full mt-3 py-2 px-4 rounded-lg border border-destructive/10 bg-destructive/5 hover:bg-destructive/10 text-destructive text-xs font-semibold transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}