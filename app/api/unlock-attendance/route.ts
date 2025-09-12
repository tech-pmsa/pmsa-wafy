import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { format } from 'date-fns';

export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        // First, verify the user is an authenticated officer.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized: No session found.' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('uid', session.user.id)
            .single();

        if (profile?.role !== 'officer') {
            return NextResponse.json({ error: 'Forbidden: Only officers can perform this action.' }, { status: 403 });
        }

        const { class_id, date, reason } = await req.json();

        if (!class_id || !date || !reason) {
            return NextResponse.json({ error: 'Missing required fields: class_id, date, and reason are required.' }, { status: 400 });
        }

        const formattedDate = format(new Date(date), 'yyyy-MM-dd');

        // Step 1: Update the status_locked field to false for all students in the class on that date.
        const { error: updateError } = await supabase
            .from('attendance')
            .update({ status_locked: false })
            .eq('class_id', class_id)
            .eq('date', formattedDate);

        if (updateError) {
            throw new Error(`Failed to unlock attendance: ${updateError.message}`);
        }

        // Step 2: Log this action in the audit table for accountability.
        const { error: logError } = await supabase
            .from('unlocked_attendance_days')
            .insert({
                officer_uid: session.user.id,
                class_id: class_id,
                unlocked_date: formattedDate,
                reason: reason,
            });

        if (logError) {
            // While not ideal, we don't roll back the unlock. We just log that the audit entry failed.
            console.error('CRITICAL: Failed to log attendance unlock action:', logError.message);
        }

        return NextResponse.json({ message: `Successfully unlocked attendance for ${class_id} on ${formattedDate}.` });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}