'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { parse } from 'papaparse'
import { toast } from 'sonner'

// Shadcn/UI & Icon Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from './ui/input'
import { UploadCloud, File, Download, Loader2, CheckCircle2, AlertCircle, ListChecks } from 'lucide-react'

type StudentData = { name: string; cic: string; class_id: string; council: string; batch: string; phone: string; guardian: string; g_phone: string; address: string; sslc: string; plustwo: string; plustwo_streams: string; }
const REQUIRED_COLUMNS: (keyof StudentData)[] = ['name', 'cic', 'class_id', 'council', 'batch', 'phone', 'guardian', 'g_phone', 'address', 'sslc', 'plustwo', 'plustwo_streams'];
type UploadResult = { success: boolean; createdCount: number; failedCount: number; errors: { cic: string; reason: string }[] }

export default function AddBulkStudents() {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<StudentData[]>([])
  const [missingColumns, setMissingColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const fileContent = event.target?.result
        let data: StudentData[] = []
        if (selectedFile.name.endsWith('.xlsx')) {
          const workbook = XLSX.read(fileContent, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          data = XLSX.utils.sheet_to_json<StudentData>(workbook.Sheets[sheetName])
        } else {
          const csvText = new TextDecoder('utf-8').decode(fileContent as ArrayBuffer)
          data = parse<StudentData>(csvText, { header: true, skipEmptyLines: true }).data
        }

        if (data.length > 0) {
          const headers = Object.keys(data[0])
          const missing = REQUIRED_COLUMNS.filter(col => !headers.includes(col))
          setMissingColumns(missing)
          setParsedData(data)
          setStep(2)
        } else {
          toast.error('The selected file is empty or could not be read.')
        }
      } catch (error) {
        toast.error('Failed to parse the file. Please check the format.')
      }
    }
    reader.readAsArrayBuffer(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setUploadResult(null)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/bulk-upload', { method: 'POST', body: formData })
      const result: UploadResult = await res.json()
      setUploadResult(result)
      if (!res.ok) throw new Error(result.errors[0]?.reason || 'An unknown error occurred.')
      toast.success('Bulk upload processed!', { description: `${result.createdCount} students added.` })
    } catch (err: any) {
      toast.error('Upload failed.', { description: err.message })
    } finally {
      setLoading(false)
      setStep(3)
    }
  }

  const reset = () => {
    setStep(1); setFile(null); setParsedData([]); setMissingColumns([]); setUploadResult(null);
  }

  return (
    <Card className="w-full mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><UploadCloud className="h-6 w-6 text-primary" /></div><div><CardTitle>Bulk Add Students</CardTitle><CardDescription>Upload an XLSX or CSV file to add multiple students at once.</CardDescription></div></div>
      </CardHeader>
      <CardContent>
        {step === 1 && (<div className="space-y-4"><a href="/students-template.xlsx" download className="inline-flex items-center text-sm font-medium text-primary hover:underline"><Download className="mr-2 h-4 w-4" /> Download Template (XLSX)</a><div className="flex items-center justify-center w-full"><label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"><div className="flex flex-col items-center justify-center pt-5 pb-6"><UploadCloud className="w-10 h-10 mb-4 text-muted-foreground" /><p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p><p className="text-xs text-muted-foreground">XLSX or CSV file</p></div><Input id="dropzone-file" type="file" className="hidden" accept=".xlsx, .csv" onChange={handleFileChange} /></label></div></div>)}
        {step === 2 && (<div className="space-y-4"><div className="flex items-center gap-2 p-3 rounded-md bg-muted"><File className="h-5 w-5 text-muted-foreground" /><span className="font-medium">{file?.name}</span><span className="text-sm text-muted-foreground">({parsedData.length} records found)</span></div>{missingColumns.length > 0 ? (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Missing Columns!</AlertTitle><AlertDescription>The file is missing required columns: {missingColumns.join(', ')}. Please correct the file and re-upload.</AlertDescription></Alert>) : (<Alert><ListChecks className="h-4 w-4" /><AlertTitle>Preview Data</AlertTitle><AlertDescription>Review the first few rows to ensure data is correct before proceeding.</AlertDescription></Alert>)}<div className="overflow-auto max-h-60 border rounded-md"><Table><TableHeader className="sticky top-0 bg-muted"><TableRow>{REQUIRED_COLUMNS.map(col => <TableHead key={col}>{col}</TableHead>)}</TableRow></TableHeader><TableBody>{parsedData.slice(0, 5).map((row, i) => (<TableRow key={i}>{REQUIRED_COLUMNS.map(col => <TableCell key={col} className="truncate max-w-[100px]">{row[col]}</TableCell>)}</TableRow>))}</TableBody></Table></div></div>)}
        {step === 3 && (<div className="text-center space-y-4 py-8">{loading ? (<><Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" /><h3 className="text-lg font-semibold">Processing File...</h3><p className="text-muted-foreground">Please wait while we create student accounts.</p></>) : uploadResult ? (<><CheckCircle2 className="h-12 w-12 mx-auto text-green-500" /><h3 className="text-lg font-semibold">Upload Complete</h3><div className="text-muted-foreground"><p><span className="font-bold text-primary">{uploadResult.createdCount}</span> students added successfully.</p>{uploadResult.failedCount > 0 && <p><span className="font-bold text-destructive">{uploadResult.failedCount}</span> students failed to be added.</p>}{uploadResult.errors.length > 0 && (<div className="text-left pt-4"><p className="font-semibold">Error Details:</p><ul className="list-disc list-inside text-sm text-destructive">{uploadResult.errors.map(err => <li key={err.cic}>CIC {err.cic}: {err.reason}</li>)}</ul></div>)}</div></>) : (<Alert variant="destructive" className="text-left"><AlertCircle className="h-4 w-4" /><AlertTitle>An Error Occurred</AlertTitle></Alert>)}</div>)}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6">
        <Button variant="ghost" onClick={reset}>{step === 1 ? 'Cancel' : step === 2 ? 'Upload Different File' : 'Upload Another File'}</Button>
        {step === 2 && (<Button onClick={handleUpload} disabled={missingColumns.length > 0 || loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{loading ? 'Processing...' : `Upload and Create ${parsedData.length} Students`}</Button>)}
      </CardFooter>
    </Card>
  )
}