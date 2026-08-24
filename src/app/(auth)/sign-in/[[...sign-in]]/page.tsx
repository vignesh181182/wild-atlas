import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { AuthGate } from '@/features/auth/AuthGate';

export const metadata: Metadata = {
  title: 'Sign in — Wild Atlas',
};

export default function SignInPage() {
  return (
    <AuthGate tagline="Sign in to open your groups and the creatures kept in them.">
      <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/" />
    </AuthGate>
  );
}
