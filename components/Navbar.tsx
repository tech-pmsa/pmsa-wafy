// components/Navbar.tsx
'use client'

import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between">
        <span className="font-bold text-lg">College Portal</span>
        <div className="space-x-4">
          <Link href="/">Home</Link>
          <Link href="/(officer)/dashboard">Dashboard</Link>
          <Link href="/logout">Logout</Link>
        </div>
      </div>
    </nav>
  )
}
