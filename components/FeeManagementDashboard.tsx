'use client'
import { useEffect, useState, useMemo } from 'react'
import { useUserData } from '@/hooks/useUserData'
import { CheckCircle2, XCircle, MinusCircle, Loader2, Search } from 'lucide-react'

// Shadcn/UI Components
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from '@/components/ui/badge'
// Recharts for Bar Chart
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// Helper type for sheet data
type SheetData = Record<string, { headers: string[]; rows: string[][] }>

// A component for summary statistic cards
function StatCard({ title, value, description }: { title: string; value: string; description: string }) {
    return (<Card><CardHeader className="pb-2"><CardDescription>{title}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{description}</p></CardContent></Card>)
}

// A modern tooltip for the bar chart
const CustomTooltip = ({ active, payload, label }: any) => { if (active && payload && payload.length) { const totalPaid = payload[0].value; return (<div className="rounded-lg border bg-background p-2 shadow-sm"><div className="grid grid-cols-2 gap-2"><div className="flex flex-col space-y-1"><span className="text-[0.70rem] uppercase text-muted-foreground">Student</span><span className="font-bold">{label}</span></div><div className="flex flex-col space-y-1"><span className="text-[0.70rem] uppercase text-muted-foreground">Total Paid</span><span className="font-bold text-primary">{totalPaid.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</span></div></div></div>); } return null; };

// A colored status badge for the accordion trigger
function PaymentStatus({ paid, total }: { paid: number; total: number }) {
  if (total === 0) {
    return (
      <div className="flex flex-col items-end text-right">
        <span className={`px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-500`}>
          N/A
        </span>
        <span className="text-xs text-muted-foreground mt-1">
          Not Applicable
        </span>
      </div>
    )
  }
  const percentage = total > 0 ? (paid / total) * 100 : 0
  let statusText = 'Pending'
  let bgColor = 'bg-destructive/10'
  let textColor = 'text-destructive'

  if (percentage >= 99) {
    statusText = 'Fully Paid'
    bgColor = 'bg-brand-green/10'
    textColor = 'text-brand-green'
  } else if (percentage > 10) {
    statusText = 'Partially Paid'
    bgColor = 'bg-brand-yellow/20'
    textColor = 'text-brand-yellow-dark'
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

// The Accordion List component
function StudentFeeList({ rows, monthHeaders }: { rows: string[][]; monthHeaders: string[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 border rounded-md bg-neutral-light">
        <Search className="h-8 w-8 text-neutral-dark mb-2" />
        <p className="text-neutral-dark font-semibold">No Students Found</p>
        <p className="text-muted-foreground text-sm">Your search returned no results.</p>
      </div>
    )
  }

  return (
    <Accordion type="single" collapsible>
      {rows.map((row, idx) => {
        const studentCIC = row[1]
        const studentName = row[2]
        const monthStartIndex = 3

        const payments = monthHeaders.map((header, i) => {
          const rawValue = (row[monthStartIndex + i] || '').trim().toLowerCase()
          const amount = parseFloat(rawValue)
          let status: 'paid' | 'unpaid' | 'not_applicable';

          if (rawValue === 'a') {
            status = 'not_applicable'
          } else if (!isNaN(amount) && amount > 0) {
            status = 'paid'
          } else {
            status = 'unpaid'
          }
          return { month: header, status, amount: !isNaN(amount) ? amount : 0 }
        })

        const applicablePayments = payments.filter(p => p.status !== 'not_applicable')
        const paidCount = applicablePayments.filter(p => p.status === 'paid').length
        const totalApplicableMonths = applicablePayments.length

        return (
          <AccordionItem key={idx} value={`item-${idx}`} className="border rounded-lg bg-background shadow-sm">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex justify-between items-center w-full gap-4">
                <div className="text-left">
                  <p className="font-semibold text-primary">{studentName}</p>
                  <p className="text-sm text-muted-foreground">CIC: {studentCIC}</p>
                </div>
                <PaymentStatus paid={paidCount} total={totalApplicableMonths} />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-0 pb-4">
              <div className="border-t pt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {payments.map((payment) => (
                  <div key={payment.month} className="flex items-center space-x-2">
                    {payment.status === 'paid' && <CheckCircle2 className="h-5 w-5 text-brand-green flex-shrink-0" />}
                    {payment.status === 'unpaid' && <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />}
                    {payment.status === 'not_applicable' && <MinusCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                    <div>
                      <p className="text-sm font-medium">{payment.month}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.status === 'paid' && `₹${payment.amount.toLocaleString('en-IN')}`}
                        {payment.status === 'unpaid' && 'Not Paid'}
                        {payment.status === 'not_applicable' && 'N/A'}
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

// Component for rendering a single sheet's content
function FeeSheetContent({
  sheetData,
}: {
  sheetData: { headers: string[]; rows: string[][] }
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const { headers, rows } = sheetData

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const lowercasedFilter = searchTerm.toLowerCase();
    return rows.filter(
      row =>
        row[1]?.toLowerCase().includes(lowercasedFilter) ||
        row[2]?.toLowerCase().includes(lowercasedFilter)
    );
  }, [rows, searchTerm]);

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
  }, [filteredRows]);

  const chartData = useMemo(() => {
    const monthStartIndex = 3
    return filteredRows.map(row => {
      const totalPaid = row.slice(monthStartIndex).reduce((sum, cell) => {
        const val = parseFloat(cell || '0')
        return sum + (isNaN(val) ? 0 : val)
      }, 0)
      return { name: row[2], 'Total Paid': totalPaid }
    })
  }, [filteredRows]);

  const monthHeaders = headers.slice(3)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Students" value={summary.totalStudents.toString()} description="Total students in this class." />
        <StatCard title="Total Fees Collected" value={summary.totalCollected} description="Sum of all payments made." />
        <StatCard title="Average Paid Per Student" value={summary.averagePaid} description="The average payment amount." />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Payment Distribution</CardTitle>
          <CardDescription>Total amount paid by each student. Hover for details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-hidden">
            <div className="min-w-[600px] h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} hide={chartData.length > 10} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value / 1000}k`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Legend />
                  <Bar dataKey="Total Paid" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by Student Name or CIC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-sm pl-10"
          />
        </div>
        <StudentFeeList rows={filteredRows} monthHeaders={monthHeaders} />
      </div>
    </div>
  )
}

// The main page component that fetches data and handles roles
export default function FeeManagementDashboard() {
  const { loading, role, details } = useUserData()
  const [sheetData, setSheetData] = useState<SheetData | null>(null)
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    const batch = details?.batch;

    const fetchData = async () => {
      try {
        setIsFetching(true);
        setError(null);
        const res = await fetch('/api/fees', {cache: 'no-store'});
        if (!res.ok) throw new Error('Failed to fetch fee data.');

        const data: SheetData = await res.json();

        // Clean data: remove sheets or rows that are invalid
        const cleanedData: SheetData = {};
        for (const sheetName in data) {
          const { headers, rows } = data[sheetName];
          if (!headers?.length || !rows?.length) continue;
          const validRows = rows.filter(row => Array.isArray(row) && row[1]?.trim() && row[2]?.trim());
          if (validRows.length > 0) {
            cleanedData[sheetName] = { headers, rows: validRows };
          }
        }

        if (Object.keys(cleanedData).length === 0) {
          setError("No valid fee data could be loaded.");
          setSheetData(null);
        } else {
          setSheetData(cleanedData);
          const sheetKeys = Object.keys(cleanedData);
          // Set the active tab based on role
          if (role === 'officer') {
            setActiveTab(sheetKeys[0]);
          } else if (role === 'class' && batch) {
            const matchedTab = sheetKeys.find(name => name.toLowerCase().trim() === batch.toLowerCase().trim());
            setActiveTab(matchedTab || null);
            if (!matchedTab) setError("Could not find a fee sheet for your assigned class.");
          }
        }
      } catch (err: any) {
        console.error('Error loading fee data:', err);
        setError(err.message || "An unknown error occurred.");
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
  }, [role, loading, details]);

  if (loading || isFetching) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading Fee Management Dashboard...</p>
      </div>
    );
  }

  if (error) { return (<Alert variant="destructive"><XCircle className="h-4 w-4" /><AlertTitle>Failed to Load Data</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>); }
  if (!sheetData || !activeTab) { return (<Alert><AlertTitle>No Data Available</AlertTitle><AlertDescription>There is no fee data available to view.</AlertDescription></Alert>); }

  const sheetNames = Object.keys(sheetData);

  return (
    <Card>
        <CardHeader>
            <CardTitle>Fee Management</CardTitle>
            <CardDescription>Select a class to view their fee details, payment distribution, and individual records.</CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="w-full overflow-x-auto pb-1">
                    <TabsList className="inline-flex w-max gap-2">
                        {sheetNames.map(name => (<TabsTrigger key={name} value={name}>{name}</TabsTrigger>))}
                    </TabsList>
                </div>
                <TabsContent value={activeTab} className="mt-4">
                    <FeeSheetContent sheetData={sheetData[activeTab]} />
                </TabsContent>
            </Tabs>
        </CardContent>
    </Card>
  )
}
