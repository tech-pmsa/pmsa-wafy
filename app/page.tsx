'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserData } from '@/hooks/useUserData'
const SplashScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-light">
    <div className="animate-spin-and-fade">
      <svg className="w-24 h-24 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v11.494m-9-5.747h18" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 18a6 6 0 100-12 6 6 0 000 12z" />
      </svg>
    </div>
    <p className="mt-4 text-lg font-heading text-neutral-dark animate-fade-in [animation-delay:0.2s]">
      Loading your dashboard...
    </p>
  </div>
);

export default function Home() {
  const router = useRouter();
  const { loading, role } = useUserData();

  useEffect(() => {
    if (!loading) {
      if (!role) {
        router.replace('/login');
        return;
      }

      // Role-based redirection logic
      switch (role) {
        case 'officer':
          router.replace('/admins/officer/officer-dashboard');
          break;
        case 'class':
          router.replace('/admins/classroom/class-dashboard');
          break;
        case 'class-leader':
          router.replace('/admins/classleader/class-leader-dashboard');
          break;
        case 'student':
          router.replace('/students/student-dashboard');
          break;
        default:
          router.replace('/unauthorized');
          break;
      }
    }
  }, [loading, role, router]);

  // Show a splash screen while we determine the user's role and destination
  if (loading) {
    return <SplashScreen />;
  }

  // Return null because the redirect will happen in the useEffect
  return null;
}