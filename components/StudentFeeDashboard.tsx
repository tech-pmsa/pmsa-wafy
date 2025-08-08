'use client'
import { useEffect, useState, useMemo } from 'react'
import { useUserData } from '@/hooks/useUserData' // CORRECTED: Using the consolidated hook
import { CheckCircle2, XCircle, MinusCircle, Loader2 } from 'lucide-react'

// Shadcn/UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Helper type for sheet data
type SheetData = Record<string, { headers: string[]; rows: string[][] }>

// A new, simplified component to show the student's own fee details.
export default function StudentFeeDashboard() {
  const { loading: userLoading, details } = useUserData(); // CORRECTED: Using the new hook
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const batch = details?.batch; // CORRECTED: Getting batch from details object

    // Don't fetch until we know the user's batch
    if (userLoading || !batch) {
      if (!userLoading) setIsFetching(false); // Stop fetching if user loading is done but no batch
      return;
    }

    const fetchData = async () => {
      try {
        setIsFetching(true);
        setError(null);
        const res = await fetch('/api/fees');
        if (!res.ok) throw new Error('Failed to fetch fee data.');

        const data: SheetData = await res.json();

        // Find the specific sheet that matches the student's batch
        const studentSheetName = Object.keys(data).find(name => name.toLowerCase().trim() === batch.toLowerCase().trim());

        if (studentSheetName) {
           setSheetData({ [studentSheetName]: data[studentSheetName] });
        } else {
           setError("No fee schedule found for your batch.");
        }

      } catch (err: any) {
        console.error('Error loading fee data:', err);
        setError(err.message || "An unknown error occurred.");
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
  }, [userLoading, details]); // CORRECTED: Dependency array now uses details

  // Memoize the processed data for the specific student
  const studentFeeDetails = useMemo(() => {
    const cic = details?.cic; // CORRECTED: Getting cic from details object
    if (!sheetData || !cic) return null;

    const sheetName = Object.keys(sheetData)[0];
    const { headers, rows } = sheetData[sheetName];

    // Find the student's specific row using their CIC
    const studentRow = rows.find(row => row[1] === cic);
    if (!studentRow) return null;

    const monthHeaders = headers.slice(3);
    const monthStartIndex = 3;

    const payments = monthHeaders.map((header, i) => {
      const rawValue = (studentRow[monthStartIndex + i] || '').trim().toLowerCase();
      const amount = parseFloat(rawValue);
      let status: 'paid' | 'unpaid' | 'not_applicable';

      if (rawValue === 'a') {
        status = 'not_applicable';
      } else if (!isNaN(amount) && amount > 0) {
        status = 'paid';
      } else {
        status = 'unpaid';
      }
      return { month: header, status, amount: !isNaN(amount) ? amount : 0 };
    });

    const applicablePayments = payments.filter(p => p.status !== 'not_applicable');
    const paidCount = applicablePayments.filter(p => p.status === 'paid').length;
    const totalApplicableMonths = applicablePayments.length;
    const totalPaidAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    return { payments, paidCount, totalApplicableMonths, totalPaidAmount };
  }, [sheetData, details]); // CORRECTED: Dependency array now uses details

  const renderContent = () => {
    if (userLoading || isFetching) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-dark" />
          <p className="ml-2">Loading your fee details...</p>
        </div>
      );
    }

    if (error) {
       return (
         <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
         </Alert>
       )
    }

    if (!studentFeeDetails) {
      return <p className="text-center text-neutral-dark p-8">Your fee record could not be found.</p>;
    }

    const { payments, paidCount, totalApplicableMonths, totalPaidAmount } = studentFeeDetails;

    return (
      <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
        <AccordionItem value="item-1" className="border-none">
          <AccordionTrigger className="hover:no-underline">
              <div className="flex w-full items-center justify-between rounded-lg bg-neutral-light p-4">
                  <div>
                      <p className="font-semibold text-neutral-black">Monthly Payment Status</p>
                      <p className="text-sm text-neutral-dark">
                          {paidCount} of {totalApplicableMonths} months paid
                      </p>
                  </div>
                   <div className="text-right">
                      <p className="font-semibold text-brand-green">
                          {totalPaidAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                      </p>
                      <p className="text-sm text-neutral-dark">Total Paid</p>
                  </div>
              </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {payments.map((payment) => (
                <div key={payment.month} className="flex items-start space-x-3 rounded-lg bg-neutral-light p-3">
                  {payment.status === 'paid' && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-brand-green" />}
                  {payment.status === 'unpaid' && <XCircle className="h-5 w-5 flex-shrink-0 text-destructive" />}
                  {payment.status === 'not_applicable' && <MinusCircle className="h-5 w-5 flex-shrink-0 text-neutral-dark" />}
                  <div>
                    <p className="text-sm font-semibold text-neutral-black">{payment.month}</p>
                    <p className="text-xs text-neutral-dark">
                      {payment.status === 'paid' && `₹${payment.amount.toLocaleString('en-IN')}`}
                      {payment.status === 'unpaid' && 'Pending'}
                      {payment.status === 'not_applicable' && 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>My Fee Details</CardTitle>
        <CardDescription>A summary of your monthly fee payments.</CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
