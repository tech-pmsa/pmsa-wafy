'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserRoleData } from '@/hooks/useUserRoleData'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Autoplay } from 'swiper/modules'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ApprovedAchievements() {
  const { role, cic, batch } = useUserRoleData()
  const [achievements, setAchievements] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [batches, setBatches] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')

  useEffect(() => {
    const fetchAchievements = async () => {
      let query = supabase.from('achievements').select('*').eq('approved', true)

      if (role === 'student' && cic) {
        query = query.eq('cic', cic)
      } else if (role === 'class' && batch) {
        query = query.eq('batch', batch)
      }

      const { data, error } = await query
      if (!error) {
        const sorted = data.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
        setAchievements(sorted)

        if (role === 'officer') {
          const uniqueBatches = [...new Set(sorted.map((a) => a.batch))].filter(Boolean)
          setBatches(uniqueBatches)
          setSelectedBatch(uniqueBatches[0] || '')
        }
      }
    }

    fetchAchievements()
  }, [role, cic, batch])

  useEffect(() => {
    if (role === 'officer') {
      const filteredByBatch = achievements.filter((a) => a.batch === selectedBatch)
      const searchFiltered = filteredByBatch.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase()) || a.cic?.toLowerCase().includes(search.toLowerCase())
      )
      setFiltered(searchFiltered)
    } else if (role === 'class') {
      const searchFiltered = achievements.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase()) || a.cic?.toLowerCase().includes(search.toLowerCase())
      )
      setFiltered(searchFiltered)
    } else {
      setFiltered(achievements)
    }
  }, [search, selectedBatch, achievements])

  if (!role) return null

  return (
    <div className="space-y-6 p-6">
      <h1 className='text-2xl font-bold mb-4'>Approved Achievements</h1>
      {(role === 'officer' || role === 'class') && (
        <div className="space-y-2">
          {role === 'officer' && (
            <Tabs defaultValue={selectedBatch} onValueChange={setSelectedBatch}>
              <TabsList>
                {batches.map((b) => (
                  <TabsTrigger key={b} value={b}>
                    {b}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          <Input
            placeholder="Search by name or CIC"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p>No approved achievements found.</p>
      ) : (
        <>
          {/* Mobile Swiper */}
          <div className="block md:hidden">
            <Swiper
              modules={[Pagination, Autoplay]}
              spaceBetween={20}
              slidesPerView={1}
              loop={true}
              autoplay={{ delay: 2500, disableOnInteraction: false }}
              pagination={{ clickable: true }}
            >
              {filtered.map((ach) => (
                <SwiperSlide key={ach.id} className="flex justify-center">
                  <div className="p-4 w-full max-w-sm border rounded-xl shadow-md bg-white space-y-2 text-center">
                    <h3 className="text-lg font-semibold">{ach.title}</h3>
                    <p className="text-sm text-gray-600">{ach.description}</p>
                    <p className="text-xs text-gray-500">
                      {ach.name} ({ach.cic}) — {new Date(ach.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          {/* Desktop static layout */}
          <div className="hidden md:flex flex-wrap gap-4 justify-center">
            {filtered.map((ach) => (
              <div
                key={ach.id}
                className="p-4 w-full max-w-sm border rounded-xl shadow-md bg-white space-y-2 text-center"
              >
                <h3 className="text-lg font-semibold">{ach.title}</h3>
                <p className="text-sm text-gray-600">{ach.description}</p>
                <p className="text-xs text-gray-500">
                  {ach.name} ({ach.cic}) — {new Date(ach.submitted_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
