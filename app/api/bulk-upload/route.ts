import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'
import { parse } from 'papaparse'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⛔ only backend
)

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const zipFile = formData.get('zip') as File
    if (!zipFile) throw new Error('ZIP file missing.')

    const zip = await JSZip.loadAsync(await zipFile.arrayBuffer())

    // 1. Find the CSV file
    const csvEntry = Object.values(zip.files).find(file => file.name.endsWith('.csv'))
    if (!csvEntry) throw new Error('CSV file not found in ZIP.')

    const csvText = await csvEntry.async('text')
    const { data: students }: { data: any[] } = parse(csvText, {
      header: true,
      skipEmptyLines: true,
    })

    for (const student of students) {
      const cic = student.cic.trim().toLowerCase()
      const email = `${cic}@pmsa.com`
      const password = `${cic}@11`

      // 2. Create Auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (authError || !authUser?.user) continue // Skip this record

      const uid = authUser.user.id

      // 3. Upload image
      const imageName = student.image_name
      const imageFile = zip.files[imageName]
      let img_url = ''

      if (imageFile) {
        const imageBuffer = await imageFile.async('uint8array')
        const { error: uploadError } = await supabaseAdmin.storage
          .from('student-photos')
          .upload(`${uid}.${imageName.split('.').pop()}`, imageBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          })

        if (!uploadError) {
          const { data: publicUrlData } = supabaseAdmin.storage
            .from('student-photos')
            .getPublicUrl(`${uid}.${imageName.split('.').pop()}`)
          img_url = publicUrlData.publicUrl || '/profile.png'
        }
      }

      // 4. Insert into `students` table
      await supabaseAdmin.from('students').insert({
        uid,
        name: student.name,
        cic,
        class_id: student.class_id,
        council: student.council,
        batch: student.batch,
        phone: student.phone,
        guardian: student.guardian,
        g_phone: student.g_phone,
        address: student.address,
        img_url,
        role: 'student',
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
