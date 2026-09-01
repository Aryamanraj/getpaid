'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkUserNameShape, normaliseUserName } from '@recv/shared';
import { api } from '@/lib/api';
import { useIsAuthed } from '@/lib/use-auth';
import { Button, ErrorText, Muted } from '@/components/ui';

export const PENDING_CLAIM_KEY = 'recv.pendingClaim';

/**
 * Shape validation runs from @recv/shared so instant feedback here and the
 * server's answer cannot disagree. Availability is still the API's call.
 */
export function ClaimForm({ host }: { host: string }) {
  const router = useRouter();
  const authed = useIsAuthed();
  const [value, setValue] = useState('');
  const [availability, setAvailability] = useState<{
    available: boolean;
    reason?: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = normaliseUserName(value);
  const shape = useMemo(
    () => (name ? checkUserNameShape(name) : { valid: false }),
    [name],
  );

  useEffect(() => {
    if (!shape.valid) {
      setAvailability(null);
      return;
    }
    const t = setTimeout(async () => {
      setChecking(true);
      try {
        setAvailability(
          await api<{ available: boolean; reason?: string }>(
            `/user/checkUserName?userName=${encodeURIComponent(name)}`,
          ),
        );
      } catch {
        setAvailability(null);
      } finally {
        setChecking(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [name, shape.valid]);

  const canClaim = shape.valid && availability?.available && !checking;

  async function claim() {
    setError(null);
    if (!authed) {
      try {
        sessionStorage.setItem(PENDING_CLAIM_KEY, name);
      } catch {}
      router.push('/login?next=/dashboard');
      return;
    }
    setSubmitting(true);
    try {
      await api('/user/claimUserName', {
        method: 'POST',
        body: { userName: name },
        auth: true,
      });
      router.push('/dashboard');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const hint = !name
    ? null
    : !shape.valid
      ? shape.reason
      : checking
        ? 'Checking…'
        : availability
          ? availability.available
            ? `${name}.${host} is available`
            : availability.reason
          : null;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (canClaim) claim();
      }}
    >
      <label htmlFor="username" className="text-sm font-medium">
        Claim your link
      </label>

      <div className="flex min-h-12 items-center rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] transition-colors duration-200 focus-within:border-[color:var(--color-accent)]">
        <input
          id="username"
          name="username"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="yourname"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-describedby="username-hint"
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[16px] outline-none"
        />
        <span className="shrink-0 px-4 text-sm text-[color:var(--color-muted)]">
          .{host}
        </span>
      </div>

      <Muted className="min-h-5">
        <span id="username-hint">{hint}</span>
      </Muted>
      <ErrorText>{error}</ErrorText>

      <Button type="submit" disabled={!canClaim || submitting}>
        {submitting
          ? 'Claiming…'
          : authed
            ? 'Claim'
            : 'Claim — sign in to continue'}
      </Button>
    </form>
  );
}
