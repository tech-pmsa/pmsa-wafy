"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { GraduationCap, LogIn, Mail, Lock, Loader2, Heart, Library, Shield } from "lucide-react";
import { toast } from "sonner";

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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
    DialogFooter,
} from "@/components/ui/dialog";

// A dedicated modal for the password reset flow
function ForgotPasswordModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const supabase = createClientComponentClient();

    const handlePasswordReset = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      // This MUST match the URL you configured in your Supabase Dashboard
      const redirectTo = `${window.location.origin}/update-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      setLoading(false);
      if (error) {
        toast.error("Error", { description: "Failed to send reset link. Please check the email address and try again." });
      } else {
        toast.success("Check your email", {
          description: "If an account exists for that email, a password reset link has been sent.",
          duration: 8000,
        });
        setIsOpen(false); // Close the modal on success
      }
    };

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="link" className="px-0 text-sm font-medium text-primary hover:underline">
            Forgot Password?
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={handlePasswordReset}>
            <DialogHeader>
              <DialogTitle>Reset Your Password</DialogTitle>
              <DialogDescription>
                Enter your email address below. If an account is associated with it, we'll send you a link to reset your password.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="reset-email">Email Address</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@pmsa.com"
              />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

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

        // As requested, refresh the page to let middleware handle redirection.
        router.refresh();
    };

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
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <ForgotPasswordModal />
                                </div>
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
