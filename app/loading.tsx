// app/loading.tsx
import { GraduationCap } from 'lucide-react'

export default function GlobalLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center animate-in fade-in duration-700">

        {/* Animated Logo */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          {/* The pulsing outer ring, using the theme's primary color */}
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50 opacity-75"></span>

          {/* The static inner circle with the icon */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <GraduationCap className="h-8 w-8" />
          </div>
        </div>

        {/* Animated Text */}
        <div className="flex items-center space-x-1 font-medium text-muted-foreground">
            <p>Loading</p>
            <span className="animate-pulse" style={{ animationDelay: '0s' }}>.</span>
            <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
            <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
        </div>
      </div>
    </div>
  )
}