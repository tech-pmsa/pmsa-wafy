'use client'

import { useEffect, useRef, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { IoIosLogOut } from 'react-icons/io'
import { CiSettings } from 'react-icons/ci'
import { MdOutlineDashboard } from 'react-icons/md'
import Link from 'next/link'
import { FaBell } from 'react-icons/fa'

type Role = 'officer' | 'class' | 'class-leader' | 'student'

export default function Navbar() {
  const supabase = createClientComponentClient()
  const router = useRouter()

  const [userData, setUserData] = useState<{
    name: string
    img_url: string
    role: Role
    batch: string
  } | null>(null)
  const [uid, setUid] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const uid = user.id
      setUid(uid)

      let { data: profileData } = await supabase
        .from('profiles')
        .select('name, img_url, batch, role',)
        .eq('uid', uid)
        .single()

      // If not found in profiles, try students
      if (!profileData) {
        const { data: studentData } = await supabase
          .from('students')
          .select('name, img_url, batch, role')
          .eq('uid', uid)
          .single()

        profileData = studentData
      }

      if (profileData) setUserData(profileData as any)
    }

    fetchUserData()
  }, [supabase])

  useEffect(() => {
    const fetchNotifications = async (batch: string) => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('batch', batch)
        .eq('approved', false)
        .order('submitted_at', { ascending: false })

      if (!error) setNotifications(data || [])
    }

    const subscribeToRealtime = (batch: string) => {
      const channel = supabase
        .channel('realtime-achievements')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'achievements',
            filter: `batch=eq.${batch}`
          },
          (payload) => {
            fetchNotifications(batch)
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    const getBatchAndSubscribe = async () => {
      if (!uid) return

      const { data: studentData } = await supabase
        .from('students')
        .select('batch')
        .eq('uid', uid)
        .single()

      if (userData?.batch) {
        fetchNotifications(userData.batch)
        return subscribeToRealtime(userData.batch)
      }
    }

    let cleanup: any
    if (userData?.role === 'class' && userData.batch) {
      getBatchAndSubscribe().then((cb) => {
        cleanup = cb
      })
    }

    return () => {
      if (cleanup) cleanup()
    }
  }, [userData?.role, userData?.batch])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogout = async () => {
    setDropdownOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getDashboardLink = (role: Role) => {
    switch (role) {
      case 'officer':
        return '/admins/officer/officer-dashboard'
      case 'class':
        return '/admins/classroom/class-dashboard'
      case 'class-leader':
        return '/admins/classleader/class-leader-dashboard'
      case 'student':
        return '/students/student-dashboard'
      default:
        return '/'
    }
  }

  return (
    <nav className="bg-dark-green text-white pt-3 pb-3 px-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          {/* <Image
            src="/college3d.png"
            alt="College Logo"
            width={36}
            height={36}
            className="rounded-full object-cover"
          /> */}
          <span className="font-bold text-lg">PMSA Wafy</span>
        </div>
        {userData && (
          <div className="flex items-center gap-4 relative" ref={dropdownRef}>
            {userData?.role === 'class' && (
              <div className='relative'>
                <button
                  className="relative"
                  onClick={() => {
                    setShowDropdown((prev) => !prev)
                    setDropdownOpen(false)
                  }}
                >
                  <FaBell className="text-white text-xl" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-semibold rounded-full px-1.5">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-72 bg-white text-black rounded-md shadow-lg py-2 z-50">
                    <h4 className="text-center font-semibold mb-2">New Achievements</h4>

                    {notifications.length === 0 ? (
                      <p className="text-center text-sm text-gray-500 py-2">
                        No new notifications
                      </p>
                    ) : (
                      notifications.slice(0, 3).map((ach) => (
                        <div key={ach.id} className="px-4 py-2 border-b">
                          <p className="text-sm font-medium">{ach.title}</p>
                          <p className="text-xs text-gray-600">
                            Submitted by {ach.name} ({ach.cic})
                          </p>
                        </div>
                      ))
                    )}
                    <div className="text-center mt-2">
                      <Link
                        href="/admins/classroom/notifications"
                        className="text-blue-600 text-sm hover:underline"
                        onClick={() => setShowDropdown(false)}
                      >
                        Show All
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              className="flex items-center gap-2 focus:outline-none"
              onClick={() => {
                setDropdownOpen((prev) => !prev)
                setShowDropdown(false)
              }}
            >
              <div className="w-[45px] h-[45px] rounded-full overflow-hidden">
                <Image
                  src={userData.img_url || '/profile.png'}
                  alt="Profile"
                  width={45}
                  height={45}
                  className="object-cover object-center"
                />
              </div>
              <span className="text-white font-medium font-heading uppercase">{userData.name}</span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white text-black rounded-md shadow-lg py-2 z-50">
                <Link
                  href={getDashboardLink(userData.role)}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition-colors duration-150"
                  onClick={() => setDropdownOpen(false)}
                >
                  <MdOutlineDashboard size={20} className="text-gray-600" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/admins/admin-settings"
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition-colors duration-150"
                  onClick={() => setDropdownOpen(false)}
                >
                  <CiSettings size={20} className="text-gray-600" />
                  <span>Settings</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors duration-150"
                >
                  <IoIosLogOut size={20} className="text-gray-600" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
