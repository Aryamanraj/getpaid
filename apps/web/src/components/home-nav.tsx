'use client';

import Link from 'next/link';
import { useIsAuthed } from '@/lib/use-auth';

export function HomeNav() {
  const authed = useIsAuthed();
  return (
    <nav className="flex justify-end text-sm">
      <Link href={authed ? '/dashboard' : '/login'} className="underline">
        {authed ? 'Dashboard' : 'Sign in'}
      </Link>
    </nav>
  );
}
