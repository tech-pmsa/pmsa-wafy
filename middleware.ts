import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = req.nextUrl.pathname

  // Protect all routes except login
  if (!pathname.startsWith('/login') && !session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (session) {
    const uid = session.user.id
    let role: string | null = null

    // First, check profiles table (admins)
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('uid', uid)
      .single()

    if (adminProfile) {
      role = adminProfile.role
    } else {
      // If not found in profiles, check students table
      const { data: studentProfile } = await supabase
        .from('students')
        .select('role')
        .eq('uid', uid)
        .single()

      if (studentProfile) {
        role = studentProfile.role
      }
    }

    if (!role) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    // Route-specific access control
    if (pathname.startsWith('/admins/officer') && role !== 'officer') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
    if (pathname.startsWith('/admins/classroom') && role !== 'class') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
    if (pathname.startsWith('/admins/classleader') && role !== 'class-leader') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
    if (pathname.startsWith('/students') && role !== 'student') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next|api|.*\\..*).*)',
  ],
}