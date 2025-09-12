import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase admin client using your service role key
// This is required to bypass email confirmation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        // 1. Get the current user's session from the browser cookies
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized: No session found.' }, { status: 401 });
        }

        const { new_email, password } = await req.json();
        if (!new_email || !password) {
            return NextResponse.json({ error: 'New email and current password are required.' }, { status: 400 });
        }

        // 2. Verify the user's identity by re-authenticating with their current password.
        // This is a crucial security step before making a privileged change.
        const { error: reauthError } = await supabase.auth.signInWithPassword({
            email: session.user.email!,
            password: password,
        });

        if (reauthError) {
            return NextResponse.json({ error: 'Invalid password. Please try again.' }, { status: 403 });
        }

        // 3. If the password is correct, use the Supabase Admin Client to update the user's email.
        // --- THIS IS THE KEY CHANGE ---
        // Setting `email_confirm: true` marks the new email as verified immediately.
        const { error: adminUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
            session.user.id,
            {
                email: new_email,
                email_confirm: true // This bypasses the confirmation email
            }
        );

        if (adminUpdateError) {
            throw new Error(adminUpdateError.message);
        }

        // 4. Also update the email in the public profile table to keep data consistent.
        const table = session.user.user_metadata?.role === 'student' ? 'students' : 'profiles';
        await supabaseAdmin.from(table).update({ email: new_email }).eq('uid', session.user.id);

        return NextResponse.json({ message: "Your email has been updated successfully." });

    } catch (error: any) {
        console.error('Error updating email:', error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
