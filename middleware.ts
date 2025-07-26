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

  // Protect all routes except /auth
  if (!pathname.startsWith('/login') && !session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('uid', session.user.id)
      .single()

    const role = profile?.role

    if (pathname.startsWith('/officer') && role !== 'officer') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
    if (pathname.startsWith('/classroom') && role !== 'class') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
    if (pathname.startsWith('/classleader') && role !== 'class-leader') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
    if (pathname.startsWith('/student') && role !== 'student') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next|favicon.ico|api|profile.png|lock.png|college3d.png|smbg.svg|sm.svg).*)',
  ],
}
