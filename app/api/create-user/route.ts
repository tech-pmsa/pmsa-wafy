import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  const body = await req.json()
  const {
    name,
    email,
    password,
    cic,
    class_id,
    council,
    batch,
    phone,
    guardian,
    g_phone,
    address,
    sslc,
    plustwo,
    plustwo_streams
  } = body

  // Step 1: Create Auth user
  const { data: user, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !user?.user) {
    return NextResponse.json({ error: authError?.message || 'User creation failed' }, { status: 400 })
  }

  const uid = user.user.id

  // Step 2: Insert student record
  const { error: dbError } = await supabaseAdmin.from('students').insert({
    uid,
    name,
    cic,
    class_id,
    council,
    batch,
    phone,
    guardian,
    g_phone,
    address,
    sslc,
    plustwo,
    plustwo_streams,
    role: 'student',
  })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, uid })
}
