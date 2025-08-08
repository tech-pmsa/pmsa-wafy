import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Must be stored securely
)

export async function POST(req: Request) {
  const body = await req.json()
  const { name, email, designation, batch, role, password } = body

  try {
    // 1. Create Auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData?.user) {
      return NextResponse.json({ error: authError?.message || 'Auth creation failed' }, { status: 400 })
    }

    const uid = authData.user.id

    // 2. Insert into `profiles` table
    const { error: dbError } = await supabaseAdmin.from('profiles').insert({
      uid,
      name,
      role,
      designation,
      batch,
      email
    })

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
