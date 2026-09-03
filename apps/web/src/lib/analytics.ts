'use client';

import posthog from 'posthog-js';

let ready = false;

/** No-op unless a key is configured — analytics is off by default. */
export function initAnalytics(key: string, host: string) {
  if (ready || !key || typeof window === 'undefined') return;
  posthog.init(key, {
    api_host: host || 'https://us.i.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
  });
  ready = true;
}

export function trackPageview() {
  if (ready) posthog.capture('$pageview');
}

export function track(event: string, props?: Record<string, unknown>) {
  if (ready) posthog.capture(event, props);
}
