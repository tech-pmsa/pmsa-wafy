'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'

interface UserData {
  loading: boolean;
  user: User | null;
  role: string | null;
  details: { [key: string]: any } | null;
}

export function useUserData(): UserData {
  const [data, setData] = useState<UserData>({
    loading: true,
    user: null,
    role: null,
    details: null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchUserDetails = async (user: User | null) => {
      if (!user) {
        if (isMounted) setData({ loading: false, user: null, role: null, details: null });
        return;
      }

      try {
        // Try profiles table first
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('uid', user.id)
          .single();

        if (profile && !profileError) {
          if (isMounted) {
            setData({
              loading: false,
              user,
              role: profile.role,
              details: profile,
            });
          }
          return;
        }

        // Then try students table
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('uid', user.id)
          .single();

        if (student && !studentError) {
          if (isMounted) {
            setData({
              loading: false,
              user,
              role: student.role,
              details: student,
            });
          }
          return;
        }

        // If no role found in any table
        if (isMounted) setData({ loading: false, user, role: null, details: null });
      } catch (err) {
        console.error('Error fetching user details:', err);
        if (isMounted) setData({ loading: false, user: null, role: null, details: null });
      }
    };

    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        fetchUserDetails(session?.user || null);
      } catch (err) {
        console.error('Error getting initial session:', err);
        if (isMounted) setData({ loading: false, user: null, role: null, details: null });
      }
    };

    getInitialSession();

    // Subscribe to auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        // We set loading back to true here only if user changes completely, 
        // but for smooth experience, we can just fetch the details and let it update when ready.
        fetchUserDetails(session?.user || null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return data;
}