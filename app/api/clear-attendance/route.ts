import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        // First, verify the user is an authenticated officer before proceeding.
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized: No session found.' }, { status: 401 });
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('uid', session.user.id)
            .single();

        if (profileError || !profile || profile.role !== 'officer') {
            return NextResponse.json({ error: 'Forbidden: User is not an officer.' }, { status: 403 });
        }

        // If the user is a verified officer, proceed with deleting all attendance records.
        // This command deletes every row in the 'attendance' table.
        const { error: deleteError } = await supabase
            .from('attendance')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // A safe way to target all rows

        if (deleteError) {
            // If the delete operation fails, throw an error.
            throw new Error(deleteError.message);
        }

        return NextResponse.json({ message: 'All attendance data has been successfully cleared.' });

    } catch (error: any) {
        console.error('Error clearing attendance data:', error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}