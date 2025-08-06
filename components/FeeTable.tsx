'use client'

import { useEffect, useState, useMemo } from 'react'
import { useUserRoleData } from '@/hooks/useUserRoleData'
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react' // Added MinusCircle

// Shadcn/UI Components
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

// Recharts for Bar Chart
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// Helper type for sheet data
type SheetData = Record<string, { headers: string[]; rows: string[][] }>

// A component for summary statistic cards
function StatCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

// A new, modern tooltip for the bar chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const totalPaid = payload[0].value;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">Student</span>
            <span className="font-bold">{label}</span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">Total Paid</span>
            <span className="font-bold text-primary">
              {totalPaid.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Helper to show a colored status badge for the accordion trigger
function PaymentStatus({ paid, total }: { paid: number; total: number }) {
  const percentage = total > 0 ? (paid / total) * 100 : 0
  let statusText = 'Pending'
  let bgColor = 'bg-red-100 dark:bg-red-900'
  let textColor = 'text-red-700 dark:text-red-300'

  if (percentage >= 99) {
    statusText = 'Fully Paid'
    bgColor = 'bg-green-100 dark:bg-green-900'
    textColor = 'text-green-700 dark:text-green-300'
  } else if (percentage > 10) {
    statusText = 'Partially Paid'
    bgColor = 'bg-yellow-100 dark:bg-yellow-900'
    textColor = 'text-yellow-700 dark:text-yellow-300'
  }

  return (
    <div className="flex flex-col items-end text-right">
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${bgColor} ${textColor}`}>
        {statusText}
      </span>
      <span className="text-xs text-muted-foreground mt-1">
        {paid} / {total} months
      </span>
    </div>
  )
}

// The Accordion List component with the new logic
function StudentFeeList({ rows, monthHeaders }: { rows: string[][]; monthHeaders: string[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 border rounded-md bg-background">
        <p className="text-muted-foreground">No students found for this search.</p>
      </div>
    )
  }

  return (
    <Accordion type="single" collapsible className="w-full space-y-2">
      {rows.map((row, idx) => {
        const studentCIC = row[1]
        const studentName = row[2]
        const monthStartIndex = 3

        // ======================================================
        // START OF NEW CALCULATION LOGIC
        // ======================================================
        const payments = monthHeaders.map((header, i) => {
          const rawValue = (row[monthStartIndex + i] || '').trim().toLowerCase()
          const amount = parseFloat(rawValue)
          let status: 'paid' | 'unpaid' | 'not_applicable';

          // Apply the new rule for "A"
          if (rawValue === 'a') {
            status = 'not_applicable'
          } else if (!isNaN(amount) && amount > 0) {
            status = 'paid'
          } else {
            status = 'unpaid' // Empty cells are "unpaid"
          }

          return {
            month: header,
            status,
            amount: !isNaN(amount) ? amount : 0,
          }
        })

        // Calculate counts based on the new logic
        const applicablePayments = payments.filter(p => p.status !== 'not_applicable')
        const paidCount = applicablePayments.filter(p => p.status === 'paid').length
        const totalApplicableMonths = applicablePayments.length
        // ======================================================
        // END OF NEW CALCULATION LOGIC
        // ======================================================

        return (
          <AccordionItem key={idx} value={`item-${idx}`} className="border rounded-lg bg-background shadow-sm">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex justify-between items-center w-full gap-4">
                <div className="text-left">
                  <p className="font-semibold text-primary">{studentName}</p>
                  <p className="text-sm text-muted-foreground">CIC: {studentCIC}</p>
                </div>
                {/* This now uses the corrected total months count */}
                <PaymentStatus paid={paidCount} total={totalApplicableMonths} />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-0 pb-4">
              <div className="border-t pt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {payments.map((payment) => (
                  <div key={payment.month} className="flex items-center space-x-2">
                    {/* Render icon based on the new 'status' property */}
                    {payment.status === 'paid' && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />}
                    {payment.status === 'unpaid' && <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />}
                    {payment.status === 'not_applicable' && <MinusCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />}

                    <div>
                      <p className="text-sm font-medium">{payment.month}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.status === 'paid' && `₹${payment.amount.toLocaleString('en-IN')}`}
                        {payment.status === 'unpaid' && 'Not Paid'}
                        {payment.status === 'not_applicable' && 'Not Applicable'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

// The main component for rendering a single sheet's content
function SheetContent({
  sheetName,
  sheetData,
  role,
  cic,
}: {
  sheetName: string
  sheetData: { headers: string[]; rows: string[][] }
  role: string
  cic: string | null
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const { headers, rows } = sheetData

  const filteredRows = useMemo(() => {
    let base = rows
    if (role === 'student' && cic) {
      base = rows.filter(row => row[1] === cic)
    }
    if (!searchTerm.trim()) return base
    const lowercasedFilter = searchTerm.toLowerCase()
    return base.filter(
      row =>
        row[1]?.toLowerCase().includes(lowercasedFilter) ||
        row[2]?.toLowerCase().includes(lowercasedFilter)
    )
  }, [rows, role, cic, searchTerm])

  const summary = useMemo(() => {
    const monthStartIndex = 3
    let totalCollected = 0
    filteredRows.forEach(row => {
      totalCollected += row.slice(monthStartIndex).reduce((sum, cell) => {
        const val = parseFloat(cell || '0')
        return sum + (isNaN(val) ? 0 : val)
      }, 0)
    })
    const totalStudents = filteredRows.length
    const averagePaid = totalStudents > 0 ? totalCollected / totalStudents : 0
    return {
      totalStudents,
      totalCollected: totalCollected.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),
      averagePaid: averagePaid.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),
    }
  }, [filteredRows])

  const chartData = useMemo(() => {
    const monthStartIndex = 3
    return filteredRows.map(row => {
      const totalPaid = row.slice(monthStartIndex).reduce((sum, cell) => {
        const val = parseFloat(cell || '0')
        return sum + (isNaN(val) ? 0 : val)
      }, 0)
      return { name: row[2], 'Total Paid': totalPaid }
    })
  }, [filteredRows])

  const getHeading = () => {
    if (role === 'officer') return `College Fees Details - ${sheetName}`
    if (role === 'class') return 'Class Fees Details'
    if (role === 'student') return 'Your Fees Details'
    return 'Fees Details'
  }

  const monthHeaders = headers.slice(3)

  return (
    <TabsContent key={sheetName} value={sheetName} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{getHeading()}</CardTitle>
          <CardDescription>An overview of the fee payments and outstanding balances.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {role !== 'student' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Total Students" value={summary.totalStudents.toString()} description="Total students in this view." />
                <StatCard title="Total Fees Collected" value={summary.totalCollected} description="Sum of all payments made." />
                <StatCard title="Average Paid Per Student" value={summary.averagePaid} description="The average payment amount." />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Payment Distribution</CardTitle>
                  <CardDescription>Total amount paid by each student. Hover over a bar for details.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[600px] h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                        >
                          {/* ====================================================== */}
                          {/* START OF UPDATED AXIS AND TOOLTIP                      */}
                          {/* ====================================================== */}
                          <XAxis
                            dataKey="name"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            // This is the magic: hide the labels if there are too many bars
                            hide={chartData.length > 6}
                          />
                          <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `₹${value / 1000}k`}
                          />
                          <Tooltip
                            content={<CustomTooltip />} // Use our new custom tooltip
                            cursor={{ fill: 'hsl(var(--muted))' }}
                          />
                          {/* ====================================================== */}
                          {/* END OF UPDATED AXIS AND TOOLTIP                        */}
                          {/* ====================================================== */}
                          <Legend />
                          <Bar dataKey="Total Paid" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="space-y-4">
            {role !== 'student' && (
              <div className="flex justify-center">
                <Input
                  type="text"
                  placeholder="Search by CIC or Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            )}
            <StudentFeeList rows={filteredRows} monthHeaders={monthHeaders} />
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  )
}

// The main page component that fetches data and handles roles
export default function FeeDashboardPage() {
  const { loading, role, cic, batch } = useUserRoleData()
  const [sheetData, setSheetData] = useState<SheetData>({})
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(true)

  useEffect(() => {
    if (!role || loading) return
    const fetchData = async () => {
      try {
        setIsFetching(true)
        const res = await fetch('/api/fees')
        const data: SheetData = await res.json()
        const cleanedData: SheetData = {}
        for (const sheetName in data) {
          const { headers, rows } = data[sheetName]
          if (!headers?.length || !rows?.length) continue
          const validRows = rows.filter(row => Array.isArray(row) && row[1]?.trim() && row[2]?.trim())
          if (validRows.length > 0) {
            cleanedData[sheetName] = { headers, rows: validRows }
          }
        }
        setSheetData(cleanedData)
        const sheetKeys = Object.keys(cleanedData)
        if (role === 'officer') {
          setActiveTab(sheetKeys[0] || null)
        } else if ((role === 'class' || role === 'student') && batch) {
          const matchedTab = sheetKeys.find(name => name.toLowerCase().trim() === batch.toLowerCase().trim())
          setActiveTab(matchedTab || null)
        }
      } catch (err) {
        console.error('Error loading fee data:', err)
      } finally {
        setIsFetching(false)
      }
    }
    fetchData()
  }, [role, loading, batch])

  if (loading || isFetching) {
    return <div className="flex items-center justify-center h-screen"><p>Loading fee details...</p></div>
  }

  if (!role) {
    return <div className="text-center p-6">No user role assigned. Access denied.</div>
  }

  if (!['officer', 'class', 'student'].includes(role)) {
    return <div className="text-center p-6">Your role does not have permission to view this page.</div>
  }

  if (!sheetData || Object.keys(sheetData).length === 0 || !activeTab) {
    return <div className="text-center p-6">No fee data is available for you at the moment.</div>
  }

  const sheetNames = Object.keys(sheetData)

  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-6">
      <Tabs value={activeTab!} onValueChange={setActiveTab} className="w-full">
        {role === 'officer' && (
          <div className="w-full overflow-x-auto pb-1">
            <TabsList className="inline-flex w-max gap-2">
              {sheetNames.map(name => (
                <TabsTrigger key={name} value={name}>
                  {name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        )}
        {activeTab && sheetData[activeTab] && (
           (role === 'class' || role === 'student') ? (
              <SheetContent sheetName={activeTab} sheetData={sheetData[activeTab]} role={role} cic={cic || null} />
            ) : role === 'officer' && sheetNames.map(name => (
              <SheetContent key={name} sheetName={name} sheetData={sheetData[name]} role={role} cic={cic || null} />
            ))
        )}
      </Tabs>
    </div>
  )
}