'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log the error to an error reporting service in a real app
    console.error('Global Error Boundary Caught:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex items-center justify-center min-h-screen bg-neutral-light">
            <Card className="w-full max-w-md text-center animate-fade-in shadow-lg">
                <CardHeader>
                    <div className="mx-auto bg-red-100 text-red-600 p-3 rounded-full w-fit">
                        <AlertTriangle className="h-12 w-12" />
                    </div>
                    <CardTitle className="text-2xl font-heading mt-4">Something Went Wrong</CardTitle>
                    <CardDescription>
                        An unexpected error occurred. We've been notified and are looking into it.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => reset()}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        </div>
      </body>
    </html>
  )
}