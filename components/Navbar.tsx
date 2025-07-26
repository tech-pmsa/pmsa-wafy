'use client'

import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function Navbar() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-blue-600 text-white p-4 shadow-md">
      <div className="flex justify-end container mx-auto">
        <h1>Pmsa Wafy College</h1>
        <button
          onClick={handleLogout}
          className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-gray-100 transition"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}
