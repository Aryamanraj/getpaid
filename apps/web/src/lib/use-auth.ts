'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { MeResponse } from '@recv/shared';
import { api, tokenStore } from './api';

function subscribe(cb: () => void) {
  window.addEventListener('recv:auth', cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener('recv:auth', cb);
    window.removeEventListener('storage', cb);
  };
}

export function useIsAuthed(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !!tokenStore.access,
    () => false,
  );
}

export function useMe() {
  const authed = useIsAuthed();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tokenStore.access) {
      setMe(null);
      setLoading(false);
      return;
    }
    // No setLoading(true) here: only the initial load shows the skeleton.
    // A refetch after a save swaps state in place instead of flashing the
    // whole page back to placeholders.
    try {
      setMe(await api<MeResponse>('/user/getMe', { auth: true }));
      setError(null);
    } catch (e) {
      setMe(null);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch whenever the token store changes, not just on mount.
  useEffect(() => {
    reload();
    return subscribe(reload);
  }, [reload]);

  return { me, loading, error, reload, authed };
}

export function signOut() {
  const refresh = tokenStore.refresh;
  tokenStore.clear();
  if (refresh) {
    api('/auth/logout', {
      method: 'POST',
      body: { refreshToken: refresh },
    }).catch(() => undefined);
  }
}
