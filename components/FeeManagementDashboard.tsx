// components/FeeManagementDashboard.tsx
'use client'
import { useEffect, useState, useMemo } from 'react'
import { useUserData } from '@/hooks/useUserData'
import { CheckCircle2, XCircle, MinusCircle, Loader2, Search, Inbox } from 'lucide-react'

// Shadcn/UI Components
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from '@/components/ui/badge'

// Recharts for Bar Chart
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// Type Definitions
type SheetData = Record<string, { headers: string[]; rows: string[][] }>

// Reusable Helper Components
function StatCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (<Card><CardHeader className="pb-2"><CardDescription>{title}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{description}</p></CardContent></Card>)
}

const CustomTooltip = ({ active, payload, label }: any) => { if (active && payload && payload.length) { const totalPaid = payload[0].value; return (<div className="rounded-lg border bg-background p-2 shadow-sm"><div className="grid grid-cols-2 gap-2"><div className="flex flex-col space-y-1"><span className="text-[0.70rem] uppercase text-muted-foreground">Student</span><span className="font-bold">{label}</span></div><div className="flex flex-col space-y-1"><span className="text-[0.70rem] uppercase text-muted-foreground">Total Paid</span><span className="font-bold text-primary">{totalPaid.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</span></div></div></div>); } return null; };

function FeeSummaryBadge({ totalPaid }: { totalPaid: number }) {
  const formattedTotal = totalPaid.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0, });
  return (<div className="text-right"><p className="text-xs text-muted-foreground">Total Paid</p><Badge variant="secondary" className="text-base font-semibold">{formattedTotal}</Badge></div>);
}

function StudentFeeList({ rows, monthHeaders }: { rows: string[][]; monthHeaders: string[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-md bg-muted/50">
        <Search className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-foreground font-semibold">No Students Found</p>
        <p className="text-muted-foreground text-sm">Your search returned no results.</p>
      </div>
    )
  }
  return (
    <Accordion type="single" collapsible className="w-full space-y-2">
      {rows.map((row, idx) => {
        const studentCIC = row[1];
        const studentName = row[2];
        const monthStartIndex = 3;

        const payments = monthHeaders.map((header, i) => {
          const rawValue = (row[monthStartIndex + i] || '').trim().toLowerCase();
          const amount = parseFloat(rawValue);
          let status: 'paid' | 'unpaid' | 'not_applicable';
          if (rawValue === 'a' || rawValue === 'yk') { status = 'not_applicable'; }
          else if (!isNaN(amount) && amount > 0) { status = 'paid'; }
          else { status = 'unpaid'; }
          return { month: header, status, amount: status === 'paid' ? amount : 0, };
        });
        const totalAmountPaid = payments.reduce((sum, p) => sum + p.amount, 0);

        return (
          <AccordionItem key={idx} value={`item-${idx}`} className="border rounded-lg bg-background shadow-sm">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex justify-between items-center w-full gap-4">
                <div className="text-left"><p className="font-semibold text-primary">{studentName}</p><p className="text-sm text-muted-foreground">CIC: {studentCIC}</p></div>
                <FeeSummaryBadge totalPaid={totalAmountPaid} />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-0 pb-4">
              <div className="border-t pt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {payments.map((payment) => (
                  <div key={payment.month} className="flex items-center space-x-2">
                    {payment.status === 'paid' && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />}
                    {payment.status === 'unpaid' && <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />}
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

function FeeSheetContent({
  sheetName,
  sheetData,
  role,
  cic, // <-- Accept role and cic as props
}: {
  sheetName: string;
  sheetData: { headers: string[]; rows: string[][] };
  role: string | null;
  cic: string | null | undefined;
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const { headers, rows } = sheetData;
    // const { cic } = useUserData(); // <-- REMOVED this incorrect, redundant hook call

    const filteredRows = useMemo(() => {
        let baseRows = rows;
        // This logic now uses the 'cic' passed in via props
        if (role === 'student' && cic) {
            baseRows = rows.filter(row => row[1] === cic);
        }
        if (!searchTerm.trim()) return baseRows;
        const lowercasedFilter = searchTerm.toLowerCase();
        return baseRows.filter(row => row[1]?.toLowerCase().includes(lowercasedFilter) || row[2]?.toLowerCase().includes(lowercasedFilter));
    }, [rows, searchTerm, role, cic]);

const summary = useMemo(() => {
  const monthStartIndex = 3;
  let totalCollected = 0;
  rows.forEach(row => { totalCollected += row.slice(monthStartIndex).reduce((sum, cell) => { const val = parseFloat(cell || '0'); return sum + (isNaN(val) ? 0 : val); }, 0); });
  const totalStudents = rows.length;
  const averagePaid = totalStudents > 0 ? totalCollected / totalStudents : 0;
  return { totalStudents: totalStudents.toString(), totalCollected: totalCollected.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }), averagePaid: averagePaid.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) };
}, [rows]);

const chartData = useMemo(() => {
  const monthStartIndex = 3;
  return rows.map(row => {
    const totalPaid = row.slice(monthStartIndex).reduce((sum, cell) => { const val = parseFloat(cell || '0'); return sum + (isNaN(val) ? 0 : val); }, 0);
    return { name: row[2], 'Total Paid': totalPaid };
  });
}, [rows]);

return (
  <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Total Students" value={summary.totalStudents} description={`In ${sheetName}`} />
                <StatCard title="Total Fees Collected" value={summary.totalCollected} description="Sum of all payments made." />
                <StatCard title="Average Paid Per Student" value={summary.averagePaid} description="The average payment amount." />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Payment Distribution</CardTitle>
                    <CardDescription>Total amount paid by each student in {sheetName}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="w-full overflow-x-auto"><div className="min-w-[600px] h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} hide={chartData.length > 10} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value / 1000}k`} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                <Bar dataKey="Total Paid" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div></div>
                </CardContent>
            </Card>
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input type="text" placeholder="Search by Student Name or CIC..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full max-w-sm pl-10" />
                </div>
                <StudentFeeList rows={filteredRows} monthHeaders={headers.slice(3)} />
            </div>
        </div>
)
}

// Main Component
export default function FeeManagementDashboard() {
  const { loading: userLoading, role, details } = useUserData();
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userLoading) return;
    const fetchData = async () => {
      try {
        setIsFetching(true);
        setError(null);
        const res = await fetch('/api/fees', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch fee data from the server.');
        const data: SheetData = await res.json();
        const cleanedData: SheetData = {};
        for (const sheetName in data) {
          const { headers, rows } = data[sheetName];
          if (!headers?.length || !rows?.length) continue;
          const validRows = rows.filter(row => Array.isArray(row) && row[1]?.trim() && row[2]?.trim());
          if (validRows.length > 0) { cleanedData[sheetName] = { headers, rows: validRows }; }
        }

        if (Object.keys(cleanedData).length === 0) {
          setError("No valid fee data could be loaded.");
          setSheetData(null);
        } else {
          setSheetData(cleanedData);
          const sheetKeys = Object.keys(cleanedData);
          if (role === 'officer') {
            setActiveTab(sheetKeys[0]);
          } else if (role === 'class' || role === 'student') {
            const batch = details?.batch;
            const matchedTab = batch ? sheetKeys.find(name => name.toLowerCase().trim() === batch.toLowerCase().trim()) : null;
            setActiveTab(matchedTab || null);
            if (!matchedTab) setError("Could not find a fee sheet for your assigned class.");
          }
        }
      } catch (err: any) {
        setError(err.message || "An unknown error occurred while fetching data.");
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
  }, [role, userLoading, details]);

  if (userLoading || isFetching) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading Fee Dashboard...</p>
      </div>
    );
  }

  if (error) { return (<Alert variant="destructive"><XCircle className="h-4 w-4" /><AlertTitle>Failed to Load Data</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>); }
  if (!sheetData) { return (<Alert><Inbox className="h-4 w-4" /><AlertTitle>No Data Available</AlertTitle><AlertDescription>There is no fee data available to view at this time.</AlertDescription></Alert>); }

  const sheetNames = Object.keys(sheetData);

  return (
    <Card>
        <CardHeader>
            <CardTitle>Fee Management</CardTitle>
            <CardDescription>
                {role === 'officer' ? "Select a class to view fee details." : "An overview of fee payments for your class or yourself."}
            </CardDescription>
        </CardHeader>
        <CardContent>
            {role === 'officer' ? (
                <Tabs value={activeTab || ''} onValueChange={setActiveTab} className="w-full">
                    <div className="w-full overflow-x-auto pb-2">
                        <TabsList className="inline-flex w-max gap-2">
                            {sheetNames.map(name => (<TabsTrigger key={name} value={name}>{name}</TabsTrigger>))}
                        </TabsList>
                    </div>
                    {sheetNames.map(name => (
                        <TabsContent key={name} value={name} className="mt-6">
                           {/* Pass props down to the child component */}
                           <FeeSheetContent sheetName={name} sheetData={sheetData[name]} role={role} cic={details?.cic} />
                        </TabsContent>
                    ))}
                </Tabs>
            ) : activeTab ? (
                // Pass props down to the child component
                <FeeSheetContent sheetName={activeTab} sheetData={sheetData[activeTab]} role={role} cic={details?.cic} />
            ) : (
                <Alert><Inbox className="h-4 w-4" /><AlertTitle>No Fee Sheet Found</AlertTitle><AlertDescription>A fee sheet corresponding to your record could not be found.</AlertDescription></Alert>
            )}
        </CardContent>
    </Card>
  )
}