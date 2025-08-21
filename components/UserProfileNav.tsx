// components/UserProfileNav.tsx (Corrected)

'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';

// Shadcn/UI & Icon Components
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
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
    if (!role) return '/login';
    // Simplified dashboard link logic
    return role === 'student'
      ? '/students/student-dashboard'
      : `/admins/${role}/${role}-dashboard`;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    );
  }

  if (!user || !details) {
    return (
      <Button onClick={() => router.push('/login')}>
        Sign In
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-auto p-1.5 flex items-center gap-2">
            <span className="font-medium text-sm hidden sm:inline-block">{details.name}</span>
            <Avatar className="h-9 w-9">
                <AvatarImage src={details.img_url} alt={details.name} className='object-cover' />
                <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
            </Avatar>
            <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:inline-block"/>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* ====================================================== */}
        {/* START OF FIX                                         */}
        {/* ====================================================== */}
        <DropdownMenuItem onClick={() => router.push(getDashboardLink())} className="cursor-pointer">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/admins/admin-settings')} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
        </DropdownMenuItem>
        {/* ====================================================== */}
        {/* END OF FIX                                           */}
        {/* ====================================================== */}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
