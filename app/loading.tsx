// app/loading.tsx (Enhanced)

import { GraduationCap } from 'lucide-react'

export default function GlobalLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-neutral-light/50">
      <div className="absolute inset-0 z-0 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div className="relative flex flex-col items-center gap-6 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green text-white shadow-lg">
          <GraduationCap className="h-8 w-8" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold font-heading text-neutral-black">
            PMSA Wafy College
          </h1>
          <p className="text-base text-muted-foreground">
            Preparing your dashboard, please wait a moment...
          </p>
        </div>
        <div className="w-48 h-2 bg-neutral-medium rounded-full overflow-hidden">
          <div className="h-full bg-brand-green animate-progress rounded-full"></div>
        </div>
      </div>
    </div>
  )
}
