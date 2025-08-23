// app/api/delete-user/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { uid } = await req.json();

  if (!uid) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  // We use the route handler client here which can be elevated to admin privileges
  const supabase = createRouteHandlerClient({ cookies });

  // Elevate to admin client to perform user deletion
  const supabaseAdmin = supabase.auth.admin;

  const { error } = await supabaseAdmin.deleteUser(uid);

  if (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The 'on delete CASCADE' in your database schema should automatically
  // delete the corresponding row from the 'students' table.

  return NextResponse.json({ message: 'User deleted successfully' });
}
