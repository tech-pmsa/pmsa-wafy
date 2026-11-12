import { supabase } from '@/lib/supabaseClient';

export async function clearAllClientAuth() {
  try {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    await supabase.auth.signOut().catch(() => {});
  } catch (e) {
    console.error('Client signout error:', e);
  }

  // Clear local storage items related to Supabase
  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-') || key.includes('auth'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      // Clear session storage
      sessionStorage.clear();

      // Clear all document cookies accessible by JS
      document.cookie.split(';').forEach((c) => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });
    } catch (e) {
      console.error('Storage clear error:', e);
    }
  }

  // Clear server cookies
  try {
    await fetch('/api/auth/signout', { method: 'POST' });
  } catch (e) {
    console.error('Server signout fetch error:', e);
  }
}
