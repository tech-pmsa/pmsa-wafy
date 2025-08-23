// app/api/delete-class/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { class_id } = await req.json();

  if (!class_id) {
    return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const supabaseAdmin = supabase.auth.admin;

  try {
    // 1. Find all students in the specified class
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

    // 2. Extract the user IDs
    const userIds = students.map(student => student.uid);

    // 3. Loop through and delete each user
    // Note: For very large classes, this could be slow. A database function would be faster.
    for (const userId of userIds) {
      const { error: deleteError } = await supabaseAdmin.deleteUser(userId);
      if (deleteError) {
        // Log the error but continue trying to delete others
        console.error(`Failed to delete user ${userId}:`, deleteError.message);
      }
    }

    return NextResponse.json({ message: `Successfully deleted ${userIds.length} students from class ${class_id}.` });

  } catch (error: any) {
    console.error('Error deleting class:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
