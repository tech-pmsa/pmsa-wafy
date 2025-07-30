'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

type SheetData = Record<
  string,
  {
    headers: string[]
    rows: string[][]
  }
>

interface FeeTableProps {
  role: string
  cic?: string
  classId?: string
}

export default function FeeTable({ role, cic, classId }: FeeTableProps) {
  const [sheetData, setSheetData] = useState<SheetData>({})
  const [tab, setTab] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/fees')
      .then((res) => res.json())
      .then((data: SheetData) => {
        console.log('[RAW DATA]', data)
        const cleanedData: SheetData = {}

        for (const sheetName in data) {
          const { headers, rows } = data[sheetName]

          const monthStartIndex = headers.findIndex((h) => {
            const str = String(h).toUpperCase().trim()
            return (
              /^[A-Z]{3}-\d{2}$/.test(str) ||               // e.g., Sep-24
              /^[A-Z][a-z]+[- ]\d{2,4}$/.test(str) ||       // e.g., September 24, September-2024
              /^[A-Z]+$/.test(str)                          // e.g., JUNE
            )
          })

          if (monthStartIndex === -1 || !rows.length) {
            console.warn(`⛔ Skipping ${sheetName} — no month headers or rows`)
            continue
          }

          const validRows = rows.filter(row =>
            Array.isArray(row) &&
            typeof row[1] === 'string' &&
            typeof row[2] === 'string' &&
            row[1].trim() &&
            row[2].trim()
          )

          cleanedData[sheetName] = {
            headers,
            rows: validRows,
          }
        }

        console.log('[CLEANED DATA]', cleanedData)
        setSheetData(cleanedData)
        const firstTab = Object.keys(cleanedData)[0]
        setTab(firstTab || null)
      })
  }, [])

  const sheets = Object.keys(sheetData)

  const getRelevantRows = (rows: string[][]): string[][] => {
    if (role === 'student') return rows.filter(row => row[1] === cic)
    if (role === 'class-leader') return rows.filter(row =>
      row[2]?.toLowerCase().includes(classId?.toLowerCase() || '')
    )
    return rows
  }

  const renderSheet = (name: string) => {
    const { headers, rows } = sheetData[name]
    const monthStartIndex = headers.findIndex((h) => {
      const str = String(h).toUpperCase().trim()
      return (
        /^[A-Z]{3}-\d{2}$/.test(str) ||               // e.g., Sep-24
        /^[A-Z][a-z]+[- ]\d{2,4}$/.test(str) ||       // e.g., September 24, September-2024
        /^[A-Z]+$/.test(str)                          // e.g., JUNE
      )
    })

    const monthHeaders = headers.slice(monthStartIndex)
    const filteredRows = getRelevantRows(rows)

    return (
      <TabsContent key={name} value={name}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CIC</TableHead>
                <TableHead>Name</TableHead>
                {monthHeaders.map((h, i) => (
                  <TableHead key={i} className="text-nowrap">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{row[1]}</TableCell>
                  <TableCell>{row[2]}</TableCell>
                  {monthHeaders.map((_, i) => {
                    const value = row[monthStartIndex + i]?.trim()
                    return (
                      <TableCell key={i} className="text-center whitespace-nowrap">
                        {value || 'NA'}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    )
  }

  if (!tab) return <p className="text-center p-6">Loading...</p>

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="flex flex-wrap justify-center mb-4">
        {sheets.map((name: string) => (
          <TabsTrigger key={name} value={name}>
            {name}
          </TabsTrigger>
        ))}
      </TabsList>
      {sheets.map(renderSheet)}
    </Tabs>
  )
}
