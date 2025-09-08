"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link"; // --- NEW: Added Link import ---
// --- EDITED: Added Heart, Library, and Shield icons ---
import { GraduationCap, LogIn, Mail, Lock, Loader2, Heart, Library, Shield } from "lucide-react";

// Using shadcn/ui components for a consistent look and feel
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter, // --- NEW: Added CardFooter import ---
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();
  const currentYear = new Date().getFullYear();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      if (signInError.message.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.");
      } else {
        setError("An unexpected error occurred. Please try again later.");
      }
      setLoading(false);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex w-full max-w-4xl animate-fade-in rounded-2xl shadow-2xl">
        {/* Left Side: Decorative Panel */}
        <div className="hidden md:flex md:w-1/2 relative bg-[url('/imglogin.jpeg')] bg-cover p-8 rounded-l-2xl">
            <div className="relative z-10 flex flex-col justify-between h-full text-white">
                <div>
                    <div className="flex items-center gap-3">
                        <GraduationCap className="h-8 w-8" />
                        <h1 className="text-2xl font-bold font-heading">PMSA Wafy College</h1>
                    </div>
                    <p className="mt-4 text-lg text-primary-foreground/80">
                        Your portal to academic excellence and campus life.
                    </p>
                </div>
                <p className="text-sm text-primary-foreground/70">
                    © 2024 - {currentYear} PMSA Wafy College. All Rights Reserved.
                </p>
            </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-1/2 bg-card rounded-r-2xl rounded-l-2xl md:rounded-l-none">
            <Card className="w-full h-full p-8 border-none shadow-none">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-heading text-neutral-black">Welcome Back!</CardTitle>
                    <CardDescription>
                        Enter your credentials to access your dashboard.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-dark" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@pmsa.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                             <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-dark" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm text-destructive text-center">{error}</p>
                        )}

                        <Button type="submit" disabled={loading} className="w-full bg-brand-yellow text-neutral-black hover:bg-brand-yellow-dark">
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <LogIn className="mr-2 h-4 w-4" />
                            )}
                            {loading ? "Signing In..." : "Sign In"}
                        </Button>
                    </form>
                </CardContent>
                {/* --- NEW: Added CardFooter with links --- */}
                <CardFooter className="flex-col gap-4 pt-6 border-t mt-6">
                    <div className="flex items-center gap-4 text-sm font-medium">
                        <Link href="https://pmsalibrary.vercel.app/" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary">
                            <Library className="h-4 w-4" />
                            PMSA Library
                        </Link>
                        <Link href="https://masapmsa.vercel.app/" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary">
                            <Shield className="h-4 w-4" />
                            MASA Union
                        </Link>
                    </div>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
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
                </CardFooter>
            </Card>
        </div>
    </div>
  );
}
