'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Trophy, Calendar, User as UserIcon, Search, Inbox } from 'lucide-react'

// Shadcn/UI Components
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// A reusable card for displaying each achievement
function AchievementDisplayCard({ achievement }: { achievement: any }) {
  return (
    <Card className="flex flex-col h-full overflow-hidden text-left shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 rounded-lg bg-primary/10 p-3">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base leading-tight">{achievement.title}</CardTitle>
            <CardDescription className="text-xs pt-1">
                {new Date(achievement.submitted_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow text-sm text-muted-foreground">
        <p className="line-clamp-3">{achievement.description}</p>
      </CardContent>
      <CardFooter className="flex items-center gap-2 border-t bg-muted/50 p-3 text-xs">
        <UserIcon className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-foreground">{achievement.name}</span>
        <span className="text-muted-foreground">({achievement.cic})</span>
      </CardFooter>
    </Card>
  );
}

export default function AchievementViewer() {
  const [allAchievements, setAllAchievements] = useState<any[]>([])
  const [batches, setBatches] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('All')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true)
      const { data, error } = await supabase.from('achievements').select('*').eq('approved', true)

      if (error) {
        console.error("Error fetching achievements:", error)
      } else if (data) {
        setAllAchievements(data)
        const uniqueBatches = ['All', ...[...new Set(data.map((a) => a.batch))].filter(Boolean).sort()]
        setBatches(uniqueBatches)
      }
      setIsLoading(false)
    }
    fetchInitialData()
  }, [])

  const filteredAchievements = useMemo(() => {
    let filtered = allAchievements

    if (selectedBatch && selectedBatch !== 'All') {
      filtered = filtered.filter((a) => a.batch === selectedBatch)
    }

    if (search) {
      const lowercasedSearch = search.toLowerCase()
      return filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(lowercasedSearch) ||
          a.cic?.toLowerCase().includes(lowercasedSearch) ||
          a.title.toLowerCase().includes(lowercasedSearch)
      )
    }

    return filtered
  }, [search, selectedBatch, allAchievements])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approved Achievements</CardTitle>
        <CardDescription>Browse and search all approved student achievements across the college.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search by student, CIC, or title..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10" />
          </div>
          {batches.length > 1 && (
            <div className="w-full md:w-auto overflow-x-auto pb-1">
              <Tabs value={selectedBatch} onValueChange={setSelectedBatch} className="w-max">
                <TabsList>
                  {batches.map((b) => (<TabsTrigger key={b} value={b}>{b}</TabsTrigger>))}
                </TabsList>
              </Tabs>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-56 w-full" /><Skeleton className="h-56 w-full" /><Skeleton className="h-56 w-full" />
          </div>
        ) : filteredAchievements.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed h-48">
            <Inbox className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">No achievements match your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map((ach) => (<AchievementDisplayCard key={ach.id} achievement={ach} />))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}