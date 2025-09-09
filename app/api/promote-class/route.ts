// app/api/promote-class/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase admin client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies });

    // First, check if the user is an authenticated officer
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
        return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    // If authorized, proceed with the promotion logic
    const { from_class_id, to_class_id } = await req.json();

    if (!from_class_id || !to_class_id) {
        return NextResponse.json({ error: 'Missing from_class_id or to_class_id' }, { status: 400 });
    }

    try {
        const { error, count } = await supabaseAdmin
            .from('students')
            .update({ class_id: to_class_id })
            .eq('class_id', from_class_id);

        if (error) {
            throw error;
        }

        return NextResponse.json({ message: `Successfully promoted ${count} students from ${from_class_id} to ${to_class_id}.` });
    } catch (error: any) {
        console.error('Promotion Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to promote class.' }, { status: 500 });
    }
}
