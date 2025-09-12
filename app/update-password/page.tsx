'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

// Shadcn/UI & Icon Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
            setSuccess('Your password has been updated successfully! Redirecting to login...');
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
            <Card className="w-full max-w-md animate-fade-in">
                <CardHeader className="text-center">
                    <CardTitle>Create a New Password</CardTitle>
                    <CardDescription>
                        Please enter a new password for your account below.
                    </CardDescription>
                </CardHeader>
                <CardContent>
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
                             <div className="flex items-center gap-3 p-3 rounded-lg text-sm bg-red-100 text-red-800">
                                <AlertCircle size={20} />
                                <span className="font-medium">{error}</span>
                            </div>
                        )}
                        {success && (
                            <div className="flex items-center gap-3 p-3 rounded-lg text-sm bg-green-100 text-green-800">
                                <CheckCircle2 size={20} />
                                <span className="font-medium">{success}</span>
                            </div>
                        )}

                        <Button type="submit" disabled={loading || !!success} className="w-full">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                            {loading ? "Updating..." : "Update Password"}
                        </Button>
                    </form>
                    {success && (
                        <Button variant="outline" asChild className="w-full mt-4">
                            <Link href="/login">Go to Login</Link>
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
