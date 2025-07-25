// components/Footer.tsx
'use client'

export default function Footer() {
  return (
    <footer className="bg-gray-100 text-center py-3 text-sm text-gray-600">
      © {new Date().getFullYear()} College Management System. All rights reserved.
    </footer>
  )
}
