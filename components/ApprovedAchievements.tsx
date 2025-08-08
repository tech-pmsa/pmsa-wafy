'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserData } from '@/hooks/useUserData'
import { Trophy, Calendar, User as UserIcon } from 'lucide-react'

// Shadcn/UI Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// A reusable card for displaying each achievement
function AchievementDisplayCard({ achievement }: { achievement: any }) {
  return (
    <Card className="flex flex-col h-full w-full overflow-hidden text-left shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 rounded-full bg-brand-yellow/20 p-3">
                <Trophy className="h-6 w-6 text-brand-yellow-dark" />
            </div>
            <CardTitle className="text-lg leading-tight">{achievement.title}</CardTitle>
          </div>
      </CardHeader>
      <CardContent className="flex-grow text-sm text-muted-foreground">
        <p className="line-clamp-3">{achievement.description}</p>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 border-t bg-neutral-light/50 p-4 text-xs">
         <div className="flex items-center gap-2 text-muted-foreground">
            <UserIcon className="h-4 w-4" />
            <span className="font-medium text-neutral-black">{achievement.name}</span> ({achievement.cic})
         </div>
         <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
                {new Date(achievement.submitted_at).toLocaleDateString('en-GB', {
                    year: 'numeric', month: 'short', day: 'numeric',
                })}
            </span>
         </div>
      </CardFooter>
    </Card>
  );
}

export default function ApprovedAchievements() {
  const { role, details, loading: userLoading } = useUserData(); // CORRECTED: Using the new hook
  const [achievements, setAchievements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Don't fetch until user data is loaded
    if (userLoading) return;

    const fetchAchievements = async () => {
      setIsLoading(true)
      let query = supabase.from('achievements').select('*').eq('approved', true)

      // CORRECTED: Apply role-based filters using the new hook's data
      if (role === 'student' && details?.cic) {
        query = query.eq('cic', details.cic)
      } else if (role === 'class' && details?.batch) {
        query = query.eq('batch', details.batch)
      }
      // For officer, no filter is applied, so they see all.

      const { data, error } = await query.order('submitted_at', { ascending: false }).limit(10); // Limit to latest 10 for performance

      if (error) {
        console.error("Error fetching achievements:", error)
      } else if (data) {
        setAchievements(data)
      }
      setIsLoading(false)
    }

    fetchAchievements()
  }, [role, details, userLoading]); // CORRECTED: Dependency array

  const title = useMemo(() => {
    if (role === 'student') return 'My Recent Achievements';
    if (role === 'class') return `Recent Achievements from ${details?.batch || 'Your Class'}`;
    return 'Latest College Achievements';
  }, [role, details]);

  if (userLoading || isLoading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>A showcase of recent accomplishments.</CardDescription>
        </CardHeader>
        <CardContent>
            {achievements.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed h-48">
                    <Trophy className="h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium text-muted-foreground">No approved achievements yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {achievements.map((ach) => (
                        <AchievementDisplayCard key={ach.id} achievement={ach} />
                    ))}
                </div>
            )}
        </CardContent>
    </Card>
  )
}