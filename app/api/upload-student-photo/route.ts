import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  const fileName = req.nextUrl.searchParams.get('file')
  if (!fileName) return NextResponse.json({ error: 'No filename' }, { status: 400 })

  const body = await req.arrayBuffer()
  const buffer = new Uint8Array(body)

  const { error } = await supabaseAdmin.storage
    .from('student-photos')
    .upload(fileName, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabaseAdmin.storage.from('student-photos').getPublicUrl(fileName)

  return NextResponse.json({ url: data.publicUrl })
}
