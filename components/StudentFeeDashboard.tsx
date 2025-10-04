// components/StudentFeeDashboard.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useUserData } from '@/hooks/useUserData'
import { CheckCircle2, XCircle, MinusCircle, Loader2, Inbox } from 'lucide-react'

// Shadcn/UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

// Type Definitions
type SheetData = Record<string, { headers: string[]; rows: string[][] }>;

// Redesigned, theme-aware status badge
function PaymentStatusBadge({ paid, total }: { paid: number; total: number }) {
  if (total === 0) {
    return <Badge variant="secondary">Not Applicable</Badge>
  }
  const percentage = total > 0 ? (paid / total) * 100 : 0;

  let statusText = 'Pending';
  let variant: "default" | "destructive" | "outline" | "secondary" = "destructive";

  if (percentage >= 99) {
    statusText = 'Fully Paid';
    variant = 'default'; // Uses primary color
  } else if (percentage > 10) {
    statusText = 'Partially Paid';
    variant = 'secondary';
  }

  return (
    <Badge variant={variant} className={variant === 'default' ? 'bg-green-600/80' : ''}>
      {statusText}
    </Badge>
  )
}

// Main Component
export default function StudentFeeDashboard() {
  const { loading: userLoading, details } = useUserData();
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Your data fetching logic is preserved.
  useEffect(() => {
    const batch = details?.batch;
    if (userLoading || !batch) {
      if (!userLoading) setIsFetching(false);
      return;
    }
    const fetchData = async () => {
      try {
        setIsFetching(true);
        setError(null);
        const res = await fetch('/api/fees');
        if (!res.ok) throw new Error('Failed to fetch fee data.');
        const data: SheetData = await res.json();
        const studentSheetName = Object.keys(data).find(name => name.toLowerCase().trim() === batch.toLowerCase().trim());
        if (studentSheetName) {
          setSheetData({ [studentSheetName]: data[studentSheetName] });
        } else {
          setError("No fee schedule found for your batch.");
        }
      } catch (err: any) {
        setError(err.message || "An unknown error occurred.");
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
  }, [userLoading, details]);

  // Your data processing logic is preserved.
  const studentFeeDetails = useMemo(() => {
    const cic = details?.cic;
    if (!sheetData || !cic) return null;
    const sheetName = Object.keys(sheetData)[0];
    const { headers, rows } = sheetData[sheetName];
    const studentRow = rows.find(row => row[1] === cic);
    if (!studentRow) return null;

    const monthHeaders = headers.slice(3);
    const payments = monthHeaders.map((header, i) => {
      const rawValue = (studentRow[3 + i] || '').trim().toLowerCase();
      const amount = parseFloat(rawValue);
      let status: 'paid' | 'unpaid' | 'not_applicable';
      if (rawValue === 'a' || rawValue === 'yk') { status = 'not_applicable'; }
      else if (!isNaN(amount) && amount > 0) { status = 'paid'; }
      else { status = 'unpaid'; }
      return { month: header, status, amount: status === 'paid' ? amount : 0 };
    });

    const applicablePayments = payments.filter(p => p.status !== 'not_applicable');
    const paidCount = applicablePayments.filter(p => p.status === 'paid').length;
    const totalApplicableMonths = applicablePayments.length;
    const totalPaidAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    return { payments, paidCount, totalApplicableMonths, totalPaidAmount };
  }, [sheetData, details]);

  if (userLoading || isFetching) {
    return (
        <Card>
            <CardHeader><Skeleton className="h-6 w-3/5" /><Skeleton className="h-4 w-4/5 mt-2" /></CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-24 w-full" />
            </CardContent>
        </Card>
    );
  }

  if (error) {
    return (
        <Card><CardHeader><CardTitle>My Fee Details</CardTitle></CardHeader>
        <CardContent><Alert variant="destructive"><XCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></CardContent></Card>
    )
  }

  if (!studentFeeDetails) {
    return (
        <Card><CardHeader><CardTitle>My Fee Details</CardTitle></CardHeader>
        <CardContent><Alert><Inbox className="h-4 w-4" /><AlertTitle>No Data Found</AlertTitle><AlertDescription>Your fee record could not be found.</AlertDescription></Alert></CardContent></Card>
    );
  }

  const { payments, paidCount, totalApplicableMonths, totalPaidAmount } = studentFeeDetails;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>My Fee Details</CardTitle>
        <CardDescription>A summary of your monthly fee payments.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
            {/* Main Summary Section */}
            <div className="flex w-full items-center justify-between rounded-lg bg-muted/50 p-4 border">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                    <div className="flex items-center gap-2">
                        <PaymentStatusBadge paid={paidCount} total={totalApplicableMonths} />
                        <span className="font-semibold">{paidCount} of {totalApplicableMonths} months paid</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                    <p className="text-2xl font-bold text-primary">
                        {totalPaidAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}
                    </p>
                </div>
            </div>

            {/* Accordion for Detailed Breakdown */}
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-none">
                    <AccordionTrigger className="hover:no-underline rounded-lg bg-muted/50 px-4 py-3 font-semibold">
                        View Monthly Breakdown
                    </AccordionTrigger>
                    <AccordionContent className="pt-6">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {payments.map((payment) => (
                                <div key={payment.month} className="flex items-start space-x-3 rounded-lg bg-muted/50 p-3 border">
                                    {payment.status === 'paid' && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />}
                                    {payment.status === 'unpaid' && <XCircle className="h-5 w-5 flex-shrink-0 text-destructive" />}
                                    {payment.status === 'not_applicable' && <MinusCircle className="h-5 w-5 flex-shrink-0 text-muted-foreground" />}
                                    <div>
                                        <p className="text-sm font-semibold">{payment.month}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {payment.status === 'paid' && `₹${payment.amount.toLocaleString('en-IN')}`}
                                            {payment.status === 'unpaid' && 'Pending'}
                                            {payment.status === 'not_applicable' && 'Not Applicable'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}