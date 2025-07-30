import { google } from 'googleapis'
import { NextResponse } from 'next/server'

const SHEET_ID = process.env.SHEET_FEES_ID!
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL!
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n')

// Cache in-memory (for dev/demo only, not production-safe)
let cachedData: Record<string, { headers: string[]; rows: any[] }> | null = null
let lastFetchTime = 0
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

export async function GET() {
  const now = Date.now()

  // Return cached data if fresh
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return NextResponse.json(cachedData)
  }

  try {
    // Authenticate with Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    // Fetch spreadsheet metadata
    const metadata = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
    const sheetNames = metadata.data.sheets
      ?.map(sheet => sheet.properties?.title)
      .filter(Boolean) as string[]

    const data: Record<string, { headers: string[]; rows: any[] }> = {}

    for (const sheetName of sheetNames) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A1:CE60`,
      })

      const values = response.data.values || []
      if (values.length === 0) continue

      // Locate the header row (e.g., contains "CIC")
      const headerIndex = values.findIndex(row =>
        row.some(cell => cell?.toLowerCase?.().includes('cic'))
      )
      if (headerIndex === -1) continue

      const headers = values[headerIndex]
      const studentRows = values.slice(headerIndex + 1)

      data[sheetName] = {
        headers,
        rows: studentRows,
      }
    }

    // Cache and return
    cachedData = data
    lastFetchTime = now

    return NextResponse.json(data)
  } catch (error) {
    console.error('[FEES_FETCH_ERROR]', error)
    return NextResponse.json({ error: 'Failed to fetch fees' }, { status: 500 })
  }
}
