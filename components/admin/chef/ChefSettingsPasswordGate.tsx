'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LockKeyhole, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  children: React.ReactNode;
}

export default function ChefSettingsPasswordGate({ children }: Props) {
  const [verified, setVerified] = useState(false);
  const [checkingStored, setCheckingStored] = useState(true);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('chef-settings-access');
    if (stored === 'granted') {
      setVerified(true);
    }
    setCheckingStored(false);
  }, []);

  const handleVerify = async () => {
    if (!password.trim()) {
      toast.error('Enter password');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('page_access_passwords')
        .select('password_text')
        .eq('page_key', 'chef-settings')
        .eq('is_active', true)
        .single();

      if (error) throw error;

      if (!data || data.password_text !== password.trim()) {
        toast.error('Wrong password');
        return;
      }

      sessionStorage.setItem('chef-settings-access', 'granted');
      setVerified(true);
      toast.success('Access granted');
    } catch (err: any) {
      toast.error('Password verification failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (checkingStored) {
    return null;
  }

  if (verified) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/60 shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <CardTitle>Protected Settings</CardTitle>
          <CardDescription>
            Enter the password to open chef settings.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerify();
              }}
            />
          </div>

          <Button className="w-full" onClick={handleVerify} disabled={loading}>
            <AlertCircle className="mr-2 h-4 w-4" />
            Verify Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}