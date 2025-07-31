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
import { Input } from '@/components/ui/input'

type SheetData = Record<
  string,
  {
    headers: string[]
    rows: string[][]
  }
>

export default function FeeTable() {
  const { loading, role, cic, batch } = useUserRoleData()
  const [sheetData, setSheetData] = useState<SheetData>({})
  const [tab, setTab] = useState<string | null>(null)
  const [fetching, setFetching] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

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

        // Default tab
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

  useEffect(() => {
    setSearchTerm('') // Reset search when switching tabs
  }, [tab])

  const sheets = Object.keys(sheetData)

  const getFilteredRows = (rows: string[][]): string[][] => {
    let base = rows
    if (role === 'student' && cic) {
      base = rows.filter(row => row[1] === cic)
    }

    if (!searchTerm.trim()) return base

    return base.filter(row =>
      row[1].toLowerCase().includes(searchTerm.toLowerCase()) ||
      row[2].toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const renderSheet = (sheetName: string) => {
    const { headers, rows } = sheetData[sheetName]
    const monthStartIndex = 3
    const monthHeaders = headers.slice(monthStartIndex)
    const filteredRows = getFilteredRows(rows)

    return (
      <TabsContent key={sheetName} value={sheetName}>
        <div className="mb-4 flex justify-center">
          <Input
            type="text"
            placeholder="Search by CIC or Name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-3 py-2 text-sm"
          />
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[80vh] w-full sm:rounded-lg border shadow-inner">
          <div className='min-w-[600px]'>
            <Table className="relative text-sm sm:text-base">
              <TableHeader>
                <TableRow className="hover:bg-gray-50 active:bg-gray-100">
                  <TableHead className="w-[80px] sticky left-0 z-40 bg-white border-r py-2 text-xs sm:text-sm">CIC</TableHead>
                  <TableHead className="w-[160px] sticky left-[80px] z-40 bg-white border-r py-2 text-xs sm:text-sm">Name</TableHead>
                  {monthHeaders.map((month, i) => (
                    <TableHead key={i} className="min-w-[120px] whitespace-nowrap">
                      {month}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="w-[80px] sticky left-0 z-40 bg-white border-r px-2 py-2 text-xs sm:text-sm">{row[1]}</TableCell>
                    <TableCell className="w-[160px] sticky left-[80px] z-40 bg-white border-r px-2 py-2 text-xs sm:text-sm">{row[2]}</TableCell>
                    {monthHeaders.map((_, i) => (
                      <TableCell key={i} className="min-w-[120px] whitespace-nowrap">
                        {row[monthStartIndex + i]?.trim() || 'NA'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </TabsContent>
    )
  }

  if (loading || fetching) return <p className="text-center p-6">Loading...</p>
  if (!role) return <p className="text-center p-6">No role assigned.</p>
  if (!tab) return null
  if (!['officer', 'class', 'student'].includes(role)) return <p className="text-center p-6">Unauthorized role.</p>

  return (
    <Tabs value={tab!} onValueChange={setTab}>
      {role === 'officer' && (
        <TabsList className="flex flex-wrap justify-center gap-2 mb-20 px-2">
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
