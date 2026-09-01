'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkUserNameShape, normaliseUserName } from '@recv/shared';
import { api } from '@/lib/api';
import { useIsAuthed } from '@/lib/use-auth';
import { Button, ErrorText } from '@/components/ui';

export const PENDING_CLAIM_KEY = 'recv.pendingClaim';

function AvailabilityIcon({
  state,
}: {
  state: 'checking' | 'free' | 'taken' | null;
}) {
  if (state === 'checking') {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="animate-spin text-[color:var(--color-muted)]"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.25"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (state === 'free') {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="text-[color:var(--color-success)]"
      >
        <path
          d="M5 13l4 4L19 7"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="check-draw"
        />
      </svg>
    );
  }
  if (state === 'taken') {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="text-[color:var(--color-danger)]"
      >
        <path
          d="M6 6l12 12M18 6L6 18"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return null;
}

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

  const iconState = !name
    ? null
    : checking
      ? 'checking'
      : shape.valid && availability
        ? availability.available
          ? 'free'
          : 'taken'
        : null;

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

      <div className="flex min-h-14 items-center rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] transition-[border-color,box-shadow] duration-200 hover:border-[color:var(--color-border-strong)] focus-within:border-[color:var(--color-accent)] focus-within:[box-shadow:0_0_0_3px_var(--color-accent-ring)]">
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
          className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-lg outline-none"
        />
        <span className="flex shrink-0 items-center gap-2.5 pr-4">
          <span className="text-[color:var(--color-muted)]">.{host}</span>
          <AvailabilityIcon state={iconState} />
        </span>
      </div>

      <p
        className={`min-h-5 text-sm transition-colors duration-200 ${
          iconState === 'free'
            ? 'text-[color:var(--color-success)]'
            : iconState === 'taken'
              ? 'text-[color:var(--color-danger)]'
              : 'text-[color:var(--color-muted)]'
        }`}
      >
        <span id="username-hint">{hint}</span>
      </p>
      <ErrorText>{error}</ErrorText>

      <Button
        type="submit"
        disabled={!canClaim || submitting}
        className="lift min-h-12 text-base"
      >
        {submitting
          ? 'Claiming…'
          : authed
            ? 'Claim'
            : 'Claim — sign in to continue'}
      </Button>
    </form>
  );
}
