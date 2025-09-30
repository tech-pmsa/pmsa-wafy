// components/Footer.tsx
'use client'

import Link from 'next/link';
import { Heart, Library, Shield } from 'lucide-react';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t bg-background">
            <div className="container flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
                <p className="text-sm text-muted-foreground">
                    © {currentYear} PMSA Wafy College. All Rights Reserved.
                </p>
                <div className="flex items-center gap-4 text-sm font-medium">
                    <Link href="https://pmsalibrary.vercel.app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary">
                        <Library className="h-4 w-4" /> PMSA Library
                    </Link>
                    <Link href="https://masapmsa.vercel.app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary">
                        <Shield className="h-4 w-4" /> MASA Union
                    </Link>
                </div>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    Made with
                    <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    by
                    <a
                        href="https://devzoranet.vercel.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary transition-colors hover:underline"
                    >
                        Devzora
                    </a>
                </p>
            </div>
        </footer>
    )
}