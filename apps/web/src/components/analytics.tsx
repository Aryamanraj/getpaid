'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initAnalytics, trackPageview } from '@/lib/analytics';

/** Mounts once in the root layout; renders nothing. */
export function Analytics({
  posthogKey,
  posthogHost,
}: {
  posthogKey: string;
  posthogHost: string;
}) {
  useEffect(() => {
    initAnalytics(posthogKey, posthogHost);
  }, [posthogKey, posthogHost]);

  const pathname = usePathname();
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger — a pageview per route change
  useEffect(() => {
    trackPageview();
  }, [pathname]);

  return null;
}
