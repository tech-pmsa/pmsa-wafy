// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";

// Shadcn/UI & Icon Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GraduationCap, LogIn, Loader2, Heart, Library, Shield, AlertCircle, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const currentYear = new Date().getFullYear();

    // State for Login & Password Reset
    const [view, setView] = useState<'login' | 'reset'>('login');
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetMsg, setResetMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [resetLoading, setResetLoading] = useState(false);

    // Your backend logic remains unchanged
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
        <div className="w-full max-w-4xl lg:grid lg:grid-cols-2 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-500">
            {/* Left Panel: Branding Image */}
            <div className="hidden lg:flex relative bg-[url('/imglogin.jpeg')] bg-cover p-8">
                {/* Dark overlay for text readability */}
                <div className="absolute inset-0 bg-zinc-900/60" />
                <div className="relative z-10 flex flex-col justify-between h-full text-white">
                    <div>
                        <div className="flex items-center gap-3">
                            <GraduationCap className="h-8 w-8" />
                            <h1 className="text-2xl font-bold font-heading">PMSA Wafy College</h1>
                        </div>
                        <p className="mt-4 text-lg">
                            Your portal to academic excellence and campus life.
                        </p>
                    </div>
                    <p className="text-sm">
                        © {currentYear} PMSA Wafy College. All Rights Reserved.
                    </p>
                </div>
            </div>

            {/* Right Panel: Form */}
            <div className="w-full bg-card">
                <Card className="w-full h-full p-6 sm:p-8 border-none shadow-none rounded-none">
                    {/* View for Login Form */}
                    {view === 'login' ? (
                        <>
                            <CardHeader className="text-center">
                                {/* Responsive Logo for mobile */}
                                <div className="flex md:hidden items-center justify-center gap-2 mb-4">
                                    <GraduationCap className="h-7 w-7 text-primary" />
                                    <h1 className="text-xl font-bold font-heading">PMSA Wafy College</h1>
                                </div>
                                <CardTitle className="text-3xl font-heading">Welcome Back!</CardTitle>
                                <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" placeholder="you@pmsa.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="password">Password</Label>
                                            {/* CRITICAL FIX: type="button" prevents this from submitting the form */}
                                            <Button type="button" variant="link" onClick={() => setView('reset')} className="px-0 h-auto text-sm font-medium">Forgot Password?</Button>
                                        </div>
                                        <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
                                    </div>
                                    {error && (
                                        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Login Failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
                                    )}
                                    <Button type="submit" disabled={loading} className="w-full text-base py-6">
                                        {loading ? (<Loader2 className="mr-2 h-5 w-5 animate-spin" />) : (<LogIn className="mr-2 h-5 w-5" />)}
                                        {loading ? "Signing In..." : "Sign In"}
                                    </Button>
                                </form>
                            </CardContent>
                        </>
                    ) : (
                        // View for Password Reset Form
                        <>
                            <CardHeader className="text-center">
                                <CardTitle className="text-3xl font-heading">Reset Password</CardTitle>
                                <CardDescription>Enter your email to receive a password reset link.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {resetMsg && (
                                    <Alert variant={resetMsg.type === 'error' ? 'destructive' : 'default'} className={resetMsg.type === 'success' ? 'border-green-500' : ''}>
                                        {resetMsg.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-green-600"/>}
                                        <AlertTitle>{resetMsg.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
                                        <AlertDescription>{resetMsg.text}</AlertDescription>
                                    </Alert>
                                )}
                                <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="reset-email">Email Address</Label>
                                        <Input id="reset-email" type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="you@pmsa.com" disabled={resetLoading} />
                                    </div>
                                    <Button type="submit" disabled={resetLoading} className="w-full text-base py-6">
                                        {resetLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                        {resetLoading ? 'Sending...' : 'Send Reset Link'}
                                    </Button>
                                </form>
                                <Button variant="link" onClick={() => setView('login')} className="w-full mt-2">Back to Login</Button>
                            </CardContent>
                        </>
                    )}
                    <CardFooter className="flex-col gap-4 pt-6 border-t mt-6">
                        <div className="flex items-center gap-4 text-sm font-medium">
                            <Link href="https://pmsalibrary.vercel.app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"><Library className="h-4 w-4" />PMSA Library</Link>
                            <Link href="https://masapmsa.vercel.app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"><Shield className="h-4 w-4" />MASA Union</Link>
                        </div>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">Made with<Heart className="h-4 w-4 fill-red-500 text-red-500 mx-1" />by<a href="https://devzoranet.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary transition-colors hover:underline ml-1">Devzora</a></p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}