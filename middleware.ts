// middleware.ts (Corrected)

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

// Helper function to fetch user role from multiple tables
async function getUserRole(supabase: any, uid: string): Promise<string | null> {
  // Check profiles table first
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('uid', uid)
    .single();

  if (profile?.role) {
    return profile.role;
  }

  // If not in profiles, check students table
  const { data: student } = await supabase
    .from('students')
    .select('role')
    .eq('uid', uid)
    .single();

  if (student?.role) {
    return student.role;
  }

  return null;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // If user is not logged in and not on the login page, redirect to login
  if (!session && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If user is logged in, perform role-based redirects
  if (session) {
    const role = await getUserRole(supabase, session.user.id);

    // If no role is found, redirect to an unauthorized page
    if (!role) {
      if (pathname !== '/unauthorized') {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
      return res;
    }

    // Define role-to-path mappings for cleaner logic
    const roleRedirects: { [key: string]: string } = {
      officer: '/admins/officer',
      class: '/admins/classroom',
      'class-leader': '/admins/classleader',
      student: '/students',
      staff: '/admins/staff',
    };

    const requiredPath = roleRedirects[role];

    // Allow access to the shared settings page for all authenticated users
    if (pathname.startsWith('/admins/admin-settings')) {
      return res; // Continue without redirecting
    }
    if (pathname.startsWith('/admins/manage-students')) {
      return res; // Continue without redirecting
    }

    // If user is on a path they are not authorized for, redirect them
    if (requiredPath && !pathname.startsWith(requiredPath)) {
      // Redirect to the correct dashboard for their role
      const dashboardPath = `${requiredPath}/${role}-dashboard`;
      return NextResponse.redirect(new URL(dashboardPath, req.url));
    }

    // If a logged-in user tries to access the login page, redirect them to their dashboard
    if (pathname === '/login') {
      const dashboardPath = `${roleRedirects[role]}/${role}-dashboard`;
      return NextResponse.redirect(new URL(dashboardPath, req.url));
    }
  }

  return res;
}

// The matcher configuration remains the same
export const config = {
  matcher: [
    '/((?!_next|api|.*\\..*).*)',
  ],
};
