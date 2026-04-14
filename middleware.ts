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

    // --- EDITED: Define public paths that do not require authentication ---
    const publicPaths = ['/login', '/update-password'];

    // If user is not logged in and is trying to access a non-public page, redirect to login.
    if (!session && !publicPaths.includes(pathname)) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    // If user is logged in, perform role-based redirects
    if (session) {
        const role = await getUserRole(supabase, session.user.id);

        // If no role is found, they can't access dashboards.
        // Allow them to access settings to complete their profile.
        if (!role) {
            if (pathname.startsWith('/admins/admin-settings') || pathname === '/unauthorized' || pathname.startsWith('/admins/kitchen') || pathname.startsWith('/admins/manage-students')) {
                return res;
            }
            return NextResponse.redirect(new URL('/unauthorized', req.url));
        }

        const roleRedirects: { [key: string]: string } = {
            officer: '/admins/officer',
            class: '/admins/classroom',
            'class-leader': '/admins/classleader',
            student: '/students',
            staff: '/admins/staff',
            chef: '/admins/chef',
            main: '/admins/mainoffice'
        };

        const requiredPath = roleRedirects[role];

        // --- EDITED: Simplified logic for shared pages ---
        const sharedAdminPaths = ['/admins/admin-settings', '/admins/manage-students', '/admins/kitchen'];
        if (sharedAdminPaths.some(p => pathname.startsWith(p))) {
            return res; // Allow access without redirecting
        }

        // If a logged-in user tries to access a public page (like login), redirect them to their dashboard
        if (publicPaths.includes(pathname)) {
            const dashboardPath = `${requiredPath}/${role}-dashboard`;
            return NextResponse.redirect(new URL(dashboardPath, req.url));
        }

        // If user is on a path they are not authorized for, redirect them
        if (requiredPath && !pathname.startsWith(requiredPath)) {
            const dashboardPath = `${requiredPath}/${role}-dashboard`;
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
