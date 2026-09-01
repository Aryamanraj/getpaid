'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { AuthTokens } from '@recv/shared';
import { api, currentHost, tokenStore } from '@/lib/api';
import { Button, ErrorText, Input, Label, Muted, Page } from '@/components/ui';
import { WalletSignIn } from '@/components/wallet-sign-in';

interface LoginResult {
  tokens: AuthTokens;
  userName?: string;
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function finish(result: LoginResult) {
    tokenStore.set(result.tokens.accessToken, result.tokens.refreshToken);
    router.replace(next);
  }

  async function requestCode() {
    setBusy(true);
    setError(null);
    try {
      await api('/auth/requestOtp', {
        method: 'POST',
        body: { email, host: currentHost() },
      });
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      finish(
        await api<LoginResult>('/auth/verifyOtp', {
          method: 'POST',
          body: { email, code },
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <Link href="/" className="text-sm text-[color:var(--color-muted)]">
        ← Back
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Sign in</h1>
      <Muted className="mt-1">
        No password. A code by email, or a wallet signature.
      </Muted>

      <form
        className="mt-8 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          sent ? verify() : requestCode();
        }}
      >
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            disabled={sent}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {sent ? (
          <div>
            <Label htmlFor="code">Code from your inbox</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="font-mono tracking-[0.3em]"
            />
          </div>
        ) : null}
        <ErrorText>{error}</ErrorText>
        <Button
          type="submit"
          disabled={busy || !email || (sent && code.length < 4)}
        >
          {busy ? 'Working…' : sent ? 'Sign in' : 'Email me a code'}
        </Button>
        {sent ? (
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setCode('');
            }}
            className="self-start text-xs text-[color:var(--color-muted)] underline"
          >
            Use a different email
          </button>
        ) : null}
      </form>

      <div className="my-8 flex items-center gap-3 text-xs text-[color:var(--color-muted)]">
        <span className="h-px flex-1 bg-[color:var(--color-border)]" />
        or
        <span className="h-px flex-1 bg-[color:var(--color-border)]" />
      </div>

      <WalletSignIn onSuccess={finish} />
    </Page>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
