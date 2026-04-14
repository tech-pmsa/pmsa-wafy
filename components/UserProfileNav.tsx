// components/UserProfileNav.tsx
'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

// Shadcn/UI & Icon Components
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, Settings, LogOut, User, ChevronDown } from 'lucide-react';

export default function UserProfileNav() {
  const router = useRouter();
  const { user, role, details, loading } = useUserData();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getDashboardLink = () => {
    if (!role) return '/';
    switch (role) {
      case 'officer': return '/admins/officer/officer-dashboard';
      case 'class': return '/admins/classroom/class-dashboard';
      case 'class-leader': return '/admins/classleader/class-leader-dashboard';
      case 'student': return '/students/student-dashboard';
      case 'staff': return '/admins/staff/staff-dashboard';
      case 'chef': return '/admins/chef/chef-dashboard';
      case 'main': return '/admins/mainoffice/main-dashboard';
      default: return '/';
    }
  };

  const settingsLink = '/admins/admin-settings';

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-24 rounded-md hidden sm:block" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    );
  }

  if (!user || !details) {
    return <Button onClick={() => router.push('/login')}>Sign In</Button>
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 h-auto p-1.5 rounded-full">
          <span className="font-medium text-sm hidden sm:inline-block">{details.name}</span>
          <Avatar className="h-9 w-9 border">
            <AvatarImage src={details.img_url} alt={details.name} className='object-cover' />
            <AvatarFallback>{details.name?.charAt(0) || <User className="h-5 w-5" />}</AvatarFallback>
          </Avatar>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href={getDashboardLink()}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href={settingsLink}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}