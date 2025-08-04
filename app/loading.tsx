// app/loading.tsx
import { GraduationCap } from 'lucide-react'

export default function GlobalLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* Animated Logo */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          {/* Pulsing background rings */}
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50 opacity-75"></span>
          {/* Main Icon Container */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <GraduationCap className="h-8 w-8" />
          </div>
        </div>

        {/* Animated Text */}
        <div className="flex items-center space-x-1">
            <p className="text-lg font-medium text-muted-foreground">Preparing your dashboard</p>
            <span className="animate-pulse delay-0">.</span>
            <span className="animate-pulse delay-150">.</span>
            <span className="animate-pulse delay-300">.</span>
        </div>
      </div>
    </div>
  )
}