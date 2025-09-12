"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { GraduationCap, LogIn, Mail, Lock, Loader2, Heart, Library, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import clsx from 'classnames';

// Shadcn/UI & Icon Components
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const currentYear = new Date().getFullYear();

    // --- State for Login ---
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // --- State for Password Reset ---
    const [view, setView] = useState<'login' | 'reset'>('login');
    const [resetEmail, setResetEmail] = useState('');
    const [resetMsg, setResetMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [resetLoading, setResetLoading] = useState(false);

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

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetLoading(true);
        setResetMsg(null);
        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
          redirectTo: `${location.origin}/update-password`,
        });
        if (error) {
          setResetMsg({ type: 'error', text: "Failed to send reset link. Please check the email address." });
        } else {
          setResetMsg({ type: 'success', text: 'Password reset email sent. Check your inbox.' });
        }
        setResetLoading(false);
      }

    return (
        <div className="flex w-full max-w-4xl animate-fade-in rounded-2xl shadow-2xl">
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

            <div className="w-full md:w-1/2 bg-card rounded-r-2xl rounded-l-2xl md:rounded-l-none">
                <Card className="w-full h-full p-8 border-none shadow-none">
                    {view === 'login' ? (
                        <>
                        <CardHeader className="text-center">
                            <CardTitle className="text-3xl font-heading text-neutral-black">Welcome Back!</CardTitle>
                            <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleLogin} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-dark" /><Input id="email" type="email" placeholder="you@pmsa.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10" /></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><Button variant="link" onClick={() => setView('reset')} className="px-0 h-auto text-sm font-medium text-primary hover:underline">Forgot Password?</Button></div>
                                    <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-dark" /><Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10" /></div>
                                </div>
                                {error && (<p className="text-sm text-destructive text-center">{error}</p>)}
                                <Button type="submit" disabled={loading} className="w-full bg-brand-yellow text-neutral-black hover:bg-brand-yellow-dark">{loading ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<LogIn className="mr-2 h-4 w-4" />)}{loading ? "Signing In..." : "Sign In"}</Button>
                            </form>
                        </CardContent>
                        </>
                    ) : (
                        <>
                        <CardHeader className="text-center">
                            <CardTitle className="text-3xl font-heading text-neutral-black">Reset Password</CardTitle>
                            <CardDescription>Enter your email to receive a reset link.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {resetMsg && (<div className={clsx("flex items-center gap-3 p-3 rounded-lg text-sm mb-4", resetMsg.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800')}>{resetMsg.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}<span className="font-medium">{resetMsg.text}</span></div>)}
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div><Label htmlFor="reset-email">Email Address</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-dark" /><Input id="reset-email" type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="you@pmsa.com" className="pl-10"/></div></div>
                                <Button type="submit" disabled={resetLoading} className="w-full bg-brand-yellow text-neutral-black hover:bg-brand-yellow-dark">{resetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{resetLoading ? 'Sending...' : 'Send Reset Link'}</Button>
                            </form>
                            <Button variant="link" onClick={() => setView('login')} className="w-full mt-4">Back to Login</Button>
                        </CardContent>
                        </>
                    )}
                    <CardFooter className="flex-col gap-4 pt-6 border-t mt-6">
                        <div className="flex items-center gap-4 text-sm font-medium">
                            <Link href="https://pmsalibrary.vercel.app/" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"><Library className="h-4 w-4" />PMSA Library</Link>
                            <Link href="https://masapmsa.vercel.app/" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"><Shield className="h-4 w-4" />MASA Union</Link>
                        </div>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">Made with<Heart className="h-4 w-4 fill-red-500 text-red-500 mx-1" />by<a href="https://devzoranet.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary transition-colors hover:underline ml-1">Devzora</a></p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
