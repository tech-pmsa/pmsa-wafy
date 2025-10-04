// app/update-password/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

// Shadcn/UI & Icon Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export default function UpdatePasswordPage() {
    const router = useRouter();
    const supabase = createClientComponentClient();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError("Passwords do not match. Please try again.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        setLoading(true);
        const { error: updateError } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (updateError) {
            setError(updateError.message);
        } else {
            setSuccess('Your password has been updated successfully!');
        }
    };

    // Redirect user after a successful password update
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => {
                router.push('/login');
            }, 2500); // Wait 2.5 seconds before redirecting
            return () => clearTimeout(timer); // Cleanup the timer
        }
    }, [success, router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md animate-in fade-in-50 duration-500 shadow-lg">
                <CardHeader className="text-center p-8">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                        <KeyRound className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-heading">Create a New Password</CardTitle>
                    <CardDescription>
                        Please enter and confirm a new, secure password for your account.
                    </CardDescription>
                </CardHeader>

                <CardContent className="px-8 pb-8">
                    {success ? (
                        <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
                            <CheckCircle2 className="h-16 w-16 text-green-500" />
                            <h3 className="text-xl font-semibold">Password Updated!</h3>
                            <p className="text-muted-foreground">You will be redirected to the login page shortly.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm New Password</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                />
                            </div>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <Button type="submit" disabled={loading} className="w-full text-base py-6">
                                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <KeyRound className="mr-2 h-5 w-5" />}
                                {loading ? "Updating..." : "Update Password"}
                            </Button>
                        </form>
                    )}
                </CardContent>

                {!success && (
                    <CardFooter>
                        <Button variant="link" asChild className="w-full">
                            <Link href="/login">Back to Login</Link>
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}