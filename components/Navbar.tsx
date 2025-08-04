'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

// Shadcn/UI & Icon Components
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LayoutDashboard, Settings, LogOut, Bell, User, ChevronDown } from 'lucide-react'

type Role = 'officer' | 'class' | 'class-leader' | 'student'

interface UserProfile {
  name: string
  img_url: string
  role: Role
  batch: string
}

// Helper function to format time
const formatTimeAgo = (date: string) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export default function Navbar() {
  const supabase = createClientComponentClient()
  const router = useRouter()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [uid, setUid] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 1. ADDED STATE: State to control the notification popover
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Fetch user data and set up subscriptions
  useEffect(() => {
    const fetchAndSubscribe = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        router.push('/login')
        return
      }
      setUid(user.id)

      // Try fetching from 'profiles' then 'students'
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, img_url, batch, role')
        .eq('uid', user.id)
        .single()

      const userProfile = profileData || (await supabase.from('students').select('name, img_url, batch, role').eq('uid', user.id).single()).data

      if (userProfile) {
        setProfile(userProfile as UserProfile)

        // If user is a class teacher, fetch notifications and subscribe
        if (userProfile.role === 'class' && userProfile.batch) {
          fetchNotifications(userProfile.batch)

          const channel = supabase
            .channel(`realtime-achievements-${userProfile.batch}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'achievements', filter: `batch=eq.${userProfile.batch}` },
              () => fetchNotifications(userProfile.batch)
            )
            .subscribe()

          setLoading(false)
          return () => {
            supabase.removeChannel(channel)
          }
        }
      }
      setLoading(false)
    }

    const cleanup = fetchAndSubscribe()

    return () => {
        cleanup.then(cb => cb && cb())
    }
  }, [supabase, router])

  const fetchNotifications = async (batch: string) => {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('batch', batch)
      .eq('approved', false)
      .order('submitted_at', { ascending: false })

    if (!error) setNotifications(data || [])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getDashboardLink = (role?: Role) => {
    switch (role) {
      case 'officer': return '/admins/officer/officer-dashboard'
      case 'class': return '/admins/classroom/class-dashboard'
      case 'class-leader': return '/admins/classleader/class-leader-dashboard'
      case 'student': return '/students/student-dashboard'
      default: return '/'
    }
  }

  if (loading || !profile) {
    return (
        <nav className="border-b bg-background">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Skeleton className="h-6 w-24" />
                <div className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
            </div>
        </nav>
    )
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
           <Image
             src="/logo.png" // Your college logo
             alt="College Logo"
             width={32}
             height={32}
             className="rounded-full object-cover"
           />
          <span className="font-bold text-lg hidden sm:inline-block">PMSA Wafy</span>
        </Link>

        <div className="flex items-center gap-4">
          {profile.role === 'class' && (
            // 2. CONTROLLED POPOVER: Linking the popover to our state
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-0 -right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {notifications.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="p-4">
                  <h4 className="font-semibold">Pending Achievements</h4>
                  <p className="text-xs text-muted-foreground">New submissions from your class.</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">No new notifications</p>
                    ) : (
                        notifications.map((ach) => (
                        <div key={ach.id} className="border-t p-4 hover:bg-muted/50">
                            <p className="text-sm font-semibold">{ach.title}</p>
                            <p className="text-xs text-muted-foreground">by {ach.name} • {formatTimeAgo(ach.submitted_at)}</p>
                        </div>
                        ))
                    )}
                </div>
                <div className="border-t p-2 text-center">
                    {/* 3. ONCLICK HANDLER: Added onClick to close the popover */}
                    <Link
                        href="/admins/classroom/notifications"
                        className="text-sm font-medium text-primary hover:underline"
                        onClick={() => setNotificationsOpen(false)}
                    >
                        View All
                    </Link>
                </div>
              </PopoverContent>
            </Popover>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-auto p-1 rounded-full">
                 <span className="font-medium text-sm hidden md:inline-block">{profile.name}</span>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile.img_url} alt={profile.name} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href={getDashboardLink(profile.role)}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admins/admin-settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}