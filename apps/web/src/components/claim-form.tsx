'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkUserNameShape, normaliseUserName } from '@recv/shared';
import { api, currentHost } from '@/lib/api';
import { useIsAuthed } from '@/lib/use-auth';
import { ErrorText } from '@/components/ui';

export const PENDING_CLAIM_KEY = 'recv.pendingClaim';

function AvailabilityIcon({
  state,
}: {
  state: 'checking' | 'free' | 'taken' | null;
}) {
  if (state === 'checking') {
    return (
      <svg
        width="18"
        height="18"
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
        width="18"
        height="18"
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
        width="18"
        height="18"
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
            `/user/checkUserName?userName=${encodeURIComponent(name)}&host=${encodeURIComponent(currentHost())}`,
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

  // The line under the field is the live link preview; it turns into the
  // reason when the name is malformed or taken.
  const preview = !name ? (
    <>Type a name — your link appears here.</>
  ) : !shape.valid ? (
    shape.reason
  ) : availability && !availability.available && !checking ? (
    availability.reason
  ) : (
    <span className="font-mono">
      https://{name}.{host}
    </span>
  );

  return (
    <form
      className="mx-auto w-full max-w-xl"
      onSubmit={(event) => {
        event.preventDefault();
        if (canClaim) claim();
      }}
    >
      <label htmlFor="username" className="sr-only">
        Claim your link
      </label>

      <div className="flex h-14 items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-background)] pr-1.5 pl-5 [box-shadow:var(--shadow-md)] transition-[border-color,box-shadow] duration-200 focus-within:border-[color:var(--color-accent)] focus-within:[box-shadow:var(--shadow-md),0_0_0_3px_var(--color-accent-ring)] hover:border-[color:var(--color-border-strong)] sm:h-16 sm:pl-6">
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
          className="min-w-0 flex-1 bg-transparent text-lg outline-none sm:text-xl"
        />
        <span className="hidden shrink-0 text-lg text-[color:var(--color-muted)] sm:block sm:text-xl">
          .{host}
        </span>
        <span className="grid w-6 shrink-0 place-items-center">
          <AvailabilityIcon state={iconState} />
        </span>
        <button
          type="submit"
          disabled={!canClaim || submitting}
          aria-label={
            authed ? 'Claim your link' : 'Claim your link — sign in to continue'
          }
          className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)] transition-[opacity,transform,box-shadow] duration-200 [transition-timing-function:var(--ease-out-soft)] hover:[box-shadow:var(--shadow-md)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-25 disabled:active:scale-100 sm:h-13 sm:w-13"
        >
          {submitting ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="animate-spin"
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
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 12h15m-6-7l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>

      <p
        id="username-hint"
        className={`mt-3 min-h-5 text-sm transition-colors duration-200 ${
          iconState === 'free'
            ? 'text-[color:var(--color-success)]'
            : iconState === 'taken'
              ? 'text-[color:var(--color-danger)]'
              : 'text-[color:var(--color-muted)]'
        }`}
      >
        {preview}
      </p>
      <ErrorText>{error}</ErrorText>
    </form>
  );
}
