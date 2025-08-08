'use client'

export default function Footer() {
  return (
    <footer className="border-t bg-background px-4 py-3 text-center sm:px-6">
      <p className="text-sm text-neutral-dark">
        © {new Date().getFullYear()} PMSA Wafy College. All Rights Reserved.
      </p>
    </footer>
  )
}