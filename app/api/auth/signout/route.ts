import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Sign out error:', err);
  }

  const response = NextResponse.json({ success: true });

  // Manually clear any lingering supabase auth cookies
  const allCookies = cookieStore.getAll();
  allCookies.forEach((cookie) => {
    if (cookie.name.includes('supabase') || cookie.name.includes('sb-') || cookie.name.includes('auth-token')) {
      response.cookies.set(cookie.name, '', {
        path: '/',
        expires: new Date(0),
      });
    }
  });

  return response;
}
