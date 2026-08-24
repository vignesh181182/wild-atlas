import { SignUp } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { AuthGate } from '@/features/auth/AuthGate';

export const metadata: Metadata = {
  title: 'Create an account — Wild Atlas',
};

export default function SignUpPage() {
  return (
    <AuthGate tagline="Make an account and start keeping what you find.">
      <SignUp signInUrl="/sign-in" fallbackRedirectUrl="/" />
    </AuthGate>
  );
}
