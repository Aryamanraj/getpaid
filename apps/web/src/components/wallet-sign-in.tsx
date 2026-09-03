'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import type { AuthTokens, WalletChallenge } from '@recv/shared';
import { api, currentHost } from '@/lib/api';
import { Button, ErrorText, Muted } from '@/components/ui';
import { shortAddress } from '@/lib/format';

interface LoginResult {
  tokens: AuthTokens;
  userName?: string;
}

/**
 * Sign-in with an EVM or Solana wallet: fetch a challenge, sign it, exchange
 * the signature. With `link` the call carries the bearer token and attaches
 * the wallet to the current account instead.
 */
export function WalletSignIn({
  onSuccess,
  link = false,
}: {
  onSuccess: (result: LoginResult) => void;
  link?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const evm = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const solana = useWallet();

  // One button per detected wallet: with several Wallet Standard wallets
  // installed (MetaMask registers a Solana facade too), auto-picking the
  // first regularly grabs the wrong one.
  const installedSolana = solana.wallets.filter(
    (w) => w.readyState === 'Installed',
  );

  async function evmSignIn() {
    setError(null);
    setBusy('evm');
    try {
      let address = evm.address;
      if (!address) {
        const connector = connectors[0];
        if (!connector) throw new Error('No browser wallet found');
        const result = (await connect({ connector })) as unknown as {
          accounts?: readonly string[];
        };
        address = (result?.accounts?.[0] ?? evm.address) as `0x${string}`;
      }
      if (!address) throw new Error('Wallet did not return an address');

      const challenge = await api<WalletChallenge>('/auth/getNonce', {
        method: 'POST',
        body: { address, namespace: 'eip155', host: currentHost() },
      });
      const signature = await signMessageAsync({
        account: address as `0x${string}`,
        message: challenge.message,
      });
      const result = await api<LoginResult>('/auth/walletLogin', {
        method: 'POST',
        auth: link,
        body: {
          address,
          namespace: 'eip155',
          message: challenge.message,
          signature,
          host: currentHost(),
        },
      });
      onSuccess(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function solanaSignIn(w: (typeof solana.wallets)[number]) {
    setError(null);
    setBusy(w.adapter.name);
    try {
      // Sign with the adapter we just connected — the `solana` context is a
      // render-time snapshot and lags a first-time connect.
      const adapter = w.adapter;
      if (!adapter.connected || !adapter.publicKey) {
        solana.select(adapter.name);
        await adapter.connect();
      }
      const pubkey = adapter.publicKey;
      if (!pubkey) throw new Error(`${adapter.name} did not return an address`);
      if (
        !('signMessage' in adapter) ||
        typeof (adapter as { signMessage?: unknown }).signMessage !== 'function'
      )
        throw new Error(
          `${adapter.name} cannot sign messages — try another wallet`,
        );
      const address = pubkey.toBase58();

      const challenge = await api<WalletChallenge>('/auth/getNonce', {
        method: 'POST',
        body: { address, namespace: 'solana', host: currentHost() },
      });
      const sig = await (
        adapter as unknown as {
          signMessage: (m: Uint8Array) => Promise<Uint8Array>;
        }
      ).signMessage(new TextEncoder().encode(challenge.message));

      const result = await api<LoginResult>('/auth/walletLogin', {
        method: 'POST',
        auth: link,
        body: {
          address,
          namespace: 'solana',
          message: challenge.message,
          signature: bs58.encode(sig),
          host: currentHost(),
        },
      });
      onSuccess(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="ghost"
        onClick={evmSignIn}
        disabled={busy !== null}
      >
        {busy === 'evm'
          ? 'Check your wallet…'
          : evm.address
            ? `Sign in as ${shortAddress(evm.address)}`
            : 'Ethereum wallet'}
      </Button>
      {installedSolana.length === 0 ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            setError(
              'No Solana wallet found — install Phantom or Solflare, or use email.',
            )
          }
          disabled={busy !== null}
        >
          Solana wallet
        </Button>
      ) : (
        installedSolana.map((w) => (
          <Button
            key={w.adapter.name}
            type="button"
            variant="ghost"
            onClick={() => solanaSignIn(w)}
            disabled={busy !== null}
          >
            {/* biome-ignore lint/performance/noImgElement: wallet-supplied data URI */}
            <img
              src={w.adapter.icon}
              alt=""
              width={16}
              height={16}
              className="rounded"
            />
            {busy === w.adapter.name
              ? 'Check your wallet…'
              : w.adapter.connected && w.adapter.publicKey
                ? `Sign in as ${shortAddress(w.adapter.publicKey.toBase58())}`
                : w.adapter.name}
            <span className="text-xs text-[color:var(--color-muted)]">
              · Solana
            </span>
          </Button>
        ))
      )}
      {evm.address ? (
        <button
          type="button"
          onClick={() => disconnect()}
          className="self-start text-xs text-[color:var(--color-muted)] underline"
        >
          Disconnect Ethereum wallet
        </button>
      ) : null}
      <ErrorText>{error}</ErrorText>
      <Muted>You sign a message, not a transaction. It costs nothing.</Muted>
    </div>
  );
}
