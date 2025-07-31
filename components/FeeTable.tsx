'use client'

import { useEffect, useState } from 'react'
import { useUserRoleData } from '@/hooks/useUserRoleData'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type SheetData = Record<
  string,
  {
    headers: string[]
    rows: string[][]
  }
>

export default function FeeTable() {
  const { loading, role, cic, classId, batch } = useUserRoleData()
  const [sheetData, setSheetData] = useState<SheetData>({})
  const [tab, setTab] = useState<string | null>(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!role || loading) return

    const fetchData = async () => {
      try {
        setFetching(true)
        const res = await fetch('/api/fees')
        const data: SheetData = await res.json()
        const cleanedData: SheetData = {}

        for (const sheetName in data) {
          const { headers, rows } = data[sheetName]

          // Skip empty data
          if (!headers.length || !rows.length) continue

          const validRows = rows.filter(row =>
            Array.isArray(row) &&
            typeof row[1] === 'string' &&
            typeof row[2] === 'string' &&
            row[1].trim() &&
            row[2].trim()
          )

          cleanedData[sheetName] = { headers, rows: validRows }
        }

        setSheetData(cleanedData)

        // Default tab based on role
        if (role === 'officer') {
          setTab(Object.keys(cleanedData)[0] || null)
        } else if ((role === 'class' || role === 'student') && batch) {
          const matched = Object.keys(cleanedData).find(
            name => name.toLowerCase().trim() === batch.toLowerCase().trim()
          )
          setTab(matched || null)
        }
      } catch (err) {
        console.error('Error loading fee data:', err)
      } finally {
        setFetching(false)
      }
    }

    fetchData()
  }, [role, loading])

  const sheets = Object.keys(sheetData)

  const getFilteredRows = (rows: string[][]): string[][] => {
    if (role === 'student' && cic) return rows.filter(row => row[1] === cic)
    return rows // officer or class
  }

  const renderSheet = (sheetName: string) => {
    const { headers, rows } = sheetData[sheetName]
    const monthStartIndex = 3 // CIC at index 1, Name at 2, months from index 3

    const monthHeaders = headers.slice(monthStartIndex)
    const filteredRows = getFilteredRows(rows)

    return (
      <TabsContent key={sheetName} value={sheetName}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CIC</TableHead>
                <TableHead>Name</TableHead>
                {monthHeaders.map((month, i) => (
                  <TableHead key={i}>{month}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{row[1]}</TableCell>
                  <TableCell>{row[2]}</TableCell>
                  {monthHeaders.map((_, i) => (
                    <TableCell key={i}>
                      {row[monthStartIndex + i]?.trim() || 'NA'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    )
  }

  if (loading || fetching) return <p className="text-center p-6">Loading...</p>
  if (!role) return <p className="text-center p-6">No role assigned.</p>
  if (!tab && !fetching)
    return (
      <p className="text-center p-6 text-red-500">
        No matching batch sheet found for this user.
      </p>
    )
  if (!['officer', 'class', 'student'].includes(role))
    return <p className="text-center p-6">Unauthorized role.</p>

  return (
    <Tabs value={tab!} onValueChange={setTab}>
      {role === 'officer' && (
        <TabsList className="flex flex-wrap justify-center mb-4">
          {sheets.map(name => (
            <TabsTrigger key={name} value={name}>
              {name}
            </TabsTrigger>
          ))}
        </TabsList>
      )}
      {(role === 'class' || role === 'student') && tab && renderSheet(tab)}
      {role === 'officer' && sheets.map(renderSheet)}
    </Tabs>
  )
}
