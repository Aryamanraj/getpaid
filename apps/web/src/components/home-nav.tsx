'use client';

import Link from 'next/link';
import { useIsAuthed } from '@/lib/use-auth';

export function HomeNav() {
  const authed = useIsAuthed();
  return (
    <Link
      href={authed ? '/dashboard' : '/login'}
      className="inline-flex min-h-9 items-center rounded-full border border-[color:var(--color-border)] px-3.5 text-sm font-medium transition-[background-color,border-color] duration-200 hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface)]"
    >
      {authed ? 'Dashboard' : 'Sign in'}
    </Link>
  );
}
