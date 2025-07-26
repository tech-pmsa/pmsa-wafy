import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  const body = await req.json()

  // Add to Supabase Auth
  const { data: user, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  // Save to `students` table
  const { error: dbError } = await supabaseAdmin
    .from('students')
    .insert({
      uid: user.user.id,
      name: body.name,
      class: body.class,
      // Add any other fields
    })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
