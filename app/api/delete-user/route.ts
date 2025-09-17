import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// --- EDITED: Initialize the true Supabase admin client ---
// This client uses your secret service_role key and has full administrative privileges.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    // This client is used to check the session of the user MAKING the request.
    const supabase = createRouteHandlerClient({ cookies });

    try {
        // --- NEW: Security check to ensure the CALLER is an officer ---
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('uid', session.user.id)
            .single();

        if (profile?.role !== 'officer') {
            return NextResponse.json({ error: 'Forbidden: You do not have permission to delete users.' }, { status: 403 });
        }
        // --- End of Security Check ---

        const { uid } = await req.json();
        if (!uid) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // --- EDITED: Use the true admin client to perform the deletion ---
        const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);

        if (error) {
            console.error('Error deleting user:', error);
            // The error message from Supabase will now be more specific.
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // The 'ON DELETE CASCADE' rule in your database will now automatically
        // delete the corresponding row from the 'students' table.

        return NextResponse.json({ message: 'User deleted successfully' });

    } catch (error: any) {
        return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
    }
}
