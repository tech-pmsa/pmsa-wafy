// app/api/students/bulk-create/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parse } from 'papaparse'
import * as XLSX from 'xlsx'

// IMPORTANT: Use the SERVICE_ROLE_KEY for admin actions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const REQUIRED_COLUMNS = [
  'name', 'cic', 'class_id', 'council', 'batch', 'phone',
  'guardian', 'g_phone', 'address', 'sslc', 'plustwo', 'plustwo_streams'
];

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) throw new Error('File is missing.')

    const buffer = await file.arrayBuffer()
    let students: any[] = []

    // Parse file based on type
    if (file.name.endsWith('.xlsx')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      students = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
    } else if (file.name.endsWith('.csv')) {
      const csvText = new TextDecoder('utf-8').decode(buffer)
      students = parse(csvText, { header: true, skipEmptyLines: true }).data
    } else {
      throw new Error('Unsupported file type. Please upload XLSX or CSV.')
    }

    if (students.length === 0) {
      throw new Error('No student data found in the file.')
    }

    // Validate headers
    const headers = Object.keys(students[0]);
    const missingHeaders = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    let createdCount = 0
    let failedCount = 0
    const errors: { cic: string; reason: string }[] = []

    for (const student of students) {
      const cic = String(student.cic || '').trim().toLowerCase()
      if (!cic || !student.name) {
        failedCount++
        errors.push({ cic: student.cic || 'N/A', reason: 'Missing required CIC or Name.' })
        continue
      }

      const email = `${cic}@pmsa.com`
      const password = `${cic}@11`

      // 1. Create Auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (authError || !authUser?.user) {
        failedCount++
        errors.push({ cic, reason: authError?.message || 'Failed to create auth user.' })
        continue
      }

      // 2. Insert into `students` table
      const { error: insertError } = await supabaseAdmin.from('students').insert({
        uid: authUser.user.id,
        name: student.name,
        cic,
        class_id: student.class_id,
        council: student.council,
        batch: String(student.batch || ''),
        phone: String(student.phone || ''),
        guardian: student.guardian,
        g_phone: String(student.g_phone || ''),
        address: student.address,
        sslc: String(student.sslc || ''),
        plustwo: String(student.plustwo || ''),
        plustwo_streams: student.plustwo_streams,
        role: 'student',
      })

      if (insertError) {
        // If DB insert fails, it's good practice to delete the created auth user
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        failedCount++;
        errors.push({ cic, reason: insertError.message });
        continue;
      }

      createdCount++
    }

    return NextResponse.json({
      success: true,
      createdCount,
      failedCount,
      errors,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, createdCount: 0, failedCount: 0, errors: [{ cic: 'N/A', reason: err.message }] },
      { status: 500 }
    )
  }
}