'use client'

import { useEffect, useRef, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { IoIosLogOut } from 'react-icons/io'
import { CiSettings } from 'react-icons/ci'
import { MdOutlineDashboard } from 'react-icons/md'
import Link from 'next/link'

type Role = 'officer' | 'class' | 'class-leader'

export default function Navbar() {
  const supabase = createClientComponentClient()
  const router = useRouter()

  const [userData, setUserData] = useState<{
    name: string
    img_url: string
    role: Role
  } | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const uid = user.id

      let { data, error } = await supabase
        .from('profiles')
        .select('name, img_url, role')
        .eq('uid', uid)
        .single()

      if (!data && !error) {
        const res = await supabase
          .from('students')
          .select('name, img_url, role')
          .eq('uid', uid)
          .single()
        data = res.data
      }

      if (data) setUserData(data as any)
    }

    fetchUserData()
  }, [supabase])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
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
      default:
        return '/'
    }
  }

  return (
    <nav className="bg-dark-green text-white pt-3 pb-3 px-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Image
            src="/college3d.png"
            alt="College Logo"
            width={36}
            height={36}
            className="rounded-full object-cover"
          />
          <span className="font-bold text-lg">PMSA Wafy</span>
        </div>

        {userData && (
          <div className="relative" ref={dropdownRef}>
            <button
              className="flex items-center gap-2 focus:outline-none"
              onClick={() => setDropdownOpen((prev) => !prev)}
            >
              <Image
                src={userData.img_url}
                alt="Profile"
                width={36}
                height={36}
                className="rounded-full object-cover"
              />
              <span className="text-white font-medium">{userData.name}</span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white text-black rounded-md shadow-lg py-2 z-50">
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
