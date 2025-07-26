'use client'

import { useEffect, useRef, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { IoIosLogOut } from 'react-icons/io'

export default function Navbar() {
  const supabase = createClientComponentClient()
  const router = useRouter()

  const [userData, setUserData] = useState<{ name: string; img_url: string } | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const uid = user.id

      let { data, error } = await supabase
        .from('profiles')
        .select('name, img_url')
        .eq('uid', uid)
        .single()

      if (!data && !error) {
        const res = await supabase
          .from('students')
          .select('name, img_url')
          .eq('uid', uid)
          .single()
        data = res.data
      }

      if (data) setUserData(data)
    }

    fetchUserData()
  }, [supabase])

  // Close dropdown on outside click
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

  return (
    <nav className="bg-dark-green text-white pt-3 pb-3 pl-2 pr-2 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <span className="font-bold">PMSA Wafy</span>

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
              <div className="absolute right-0 mt-2 w-32 bg-white text-black rounded-md shadow-lg py-2 z-50">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  <span>Logout</span>
                  <IoIosLogOut size={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
