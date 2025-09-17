import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// --- NEW: Initialize the true Supabase admin client ---
// This client has the necessary permissions to delete users.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    // This client is for checking the session of the person making the request.
    const supabase = createRouteHandlerClient({ cookies });

    try {
        // --- NEW: Security check to ensure the caller is an officer ---
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
            return NextResponse.json({ error: 'Forbidden: You do not have permission to perform this action.' }, { status: 403 });
        }
        // --- End of Security Check ---

        const { class_id } = await req.json();
        if (!class_id) {
            return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
        }

        // 1. Find all students in the specified class using the standard client.
        const { data: students, error: studentsError } = await supabase
            .from('students')
            .select('uid')
            .eq('class_id', class_id);

        if (studentsError) {
            throw studentsError;
        }

        if (!students || students.length === 0) {
            return NextResponse.json({ message: 'No students found in this class to delete.' });
        }

        // 2. Extract the user IDs to be deleted.
        const userIds = students.map(student => student.uid);

        // 3. Loop through and delete each user using the powerful admin client.
        for (const userId of userIds) {
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (deleteError) {
                // Log the error but continue trying to delete other users in the class.
                console.error(`Failed to delete user ${userId}:`, deleteError.message);
            }
        }

        return NextResponse.json({ message: `Successfully processed deletion for ${userIds.length} students from class ${class_id}.` });

    } catch (error: any) {
        console.error('Error deleting class:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
