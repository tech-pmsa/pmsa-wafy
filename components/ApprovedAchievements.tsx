'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserRoleData } from '@/hooks/useUserRoleData'
import { Trophy } from 'lucide-react'

// Swiper for the carousel
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Autoplay } from 'swiper/modules'

// Shadcn/UI Components
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

// A new, reusable, and modern card for displaying each achievement
function AchievementCard({ achievement }: { achievement: any }) {
  return (
    <Card className="flex flex-col h-full w-full overflow-hidden text-left shadow-lg transition-transform duration-300 hover:scale-105">
      <CardHeader className="flex-row items-start gap-4 space-y-0">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
          <Trophy className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-lg leading-tight">{achievement.title}</CardTitle>
          <CardDescription className="mt-1 text-xs">
            {new Date(achievement.submitted_at).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow text-sm text-muted-foreground">
        <p>{achievement.description}</p>
      </CardContent>
      <CardFooter>
        <p className="text-xs font-medium">
          {achievement.name} <span className="text-muted-foreground">({achievement.cic})</span>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function ApprovedAchievements() {
  const { role, cic, batch } = useUserRoleData()
  const [achievements, setAchievements] = useState<any[]>([])
  const [batches, setBatches] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAchievements = async () => {
      setIsLoading(true)
      let query = supabase.from('achievements').select('*').eq('approved', true)

      // Apply role-based filters to the query
      if (role === 'student' && cic) {
        query = query.eq('cic', cic)
      } else if (role === 'class' && batch) {
        query = query.eq('batch', batch)
      }

      const { data, error } = await query.order('submitted_at', { ascending: false })

      if (error) {
        console.error("Error fetching achievements:", error)
      } else if (data) {
        setAchievements(data)
        // If officer, populate batch tabs
        if (role === 'officer') {
          const uniqueBatches = [...new Set(data.map((a) => a.batch))].filter(Boolean)
          setBatches(uniqueBatches)
          if (uniqueBatches.length > 0 && !selectedBatch) {
            setSelectedBatch(uniqueBatches[0])
          }
        }
      }
      setIsLoading(false)
    }

    if (role) {
        fetchAchievements()
    }
  }, [role, cic, batch])

  // Use useMemo for efficient, derived filtering
  const filteredAchievements = useMemo(() => {
    let filtered = achievements

    // Filter by batch for officer
    if (role === 'officer' && selectedBatch) {
      filtered = filtered.filter((a) => a.batch === selectedBatch)
    }

    // Filter by search term for officer/class
    if ((role === 'officer' || role === 'class') && search) {
      const lowercasedSearch = search.toLowerCase()
      return filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(lowercasedSearch) ||
          a.cic?.toLowerCase().includes(lowercasedSearch)
      )
    }

    return filtered
  }, [search, selectedBatch, achievements, role])

  // Determine if carousel features should be active
  const enableCarouselFeatures = filteredAchievements.length > 3;

  if (!role) return null

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* 1. Role-based Heading */}
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {role === 'student' ? 'Your Achievements' : 'Student Achievements'}
        </h1>

        {/* Filter controls for officer and class roles */}
        {(role === 'officer' || role === 'class') && (
          <div className="flex flex-grow items-center gap-4 md:flex-grow-0">
            <Input
              placeholder="Search by name or CIC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64"
            />
          </div>
        )}
      </div>

      {role === 'officer' && batches.length > 0 && (
          <div className="w-full overflow-x-auto pb-1">
             <Tabs value={selectedBatch} onValueChange={setSelectedBatch} className="w-max">
                <TabsList>
                    {batches.map((b) => (
                    <TabsTrigger key={b} value={b}>
                        {b}
                    </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
          </div>
      )}

      {isLoading ? (
        <p className="text-center text-muted-foreground">Loading achievements...</p>
      ) : filteredAchievements.length === 0 ? (
        <p className="text-center text-muted-foreground pt-8">No approved achievements found.</p>
      ) : (
        // 2. Smart, Responsive Swiper Carousel
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={30}
          slidesPerView={1}
          navigation={enableCarouselFeatures} // Show nav buttons only when needed
          pagination={{ clickable: true, dynamicBullets: true }}
          loop={enableCarouselFeatures} // Loop only when there are enough items
          autoplay={enableCarouselFeatures ? { delay: 2500, disableOnInteraction: false } : false}
          breakpoints={{
            // Show 2 cards on screens > 768px
            768: {
              slidesPerView: 2,
            },
            // Show 3 cards on screens > 1024px
            1024: {
              slidesPerView: 3,
            },
          }}
          className="w-full pb-12" // Add padding-bottom for pagination
        >
          {filteredAchievements.map((ach) => (
            <SwiperSlide key={ach.id} className="h-auto pb-2">
              {/* 3. Modern Achievement Card */}
              <AchievementCard achievement={ach} />
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </div>
  )
}