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
  const [busy, setBusy] = useState<'evm' | 'solana' | null>(null);

  const evm = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const solana = useWallet();

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
        },
      });
      onSuccess(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function solanaSignIn() {
    setError(null);
    setBusy('solana');
    try {
      if (!solana.connected) {
        const w =
          solana.wallets.find((x) => x.readyState === 'Installed') ??
          solana.wallets[0];
        if (!w) throw new Error('No Solana wallet found');
        solana.select(w.adapter.name);
        await w.adapter.connect();
      }
      const pubkey = solana.publicKey ?? solana.wallet?.adapter.publicKey;
      if (!pubkey || !solana.signMessage)
        throw new Error('Wallet cannot sign messages');
      const address = pubkey.toBase58();

      const challenge = await api<WalletChallenge>('/auth/getNonce', {
        method: 'POST',
        body: { address, namespace: 'solana', host: currentHost() },
      });
      const sig = await solana.signMessage(
        new TextEncoder().encode(challenge.message),
      );
      const result = await api<LoginResult>('/auth/walletLogin', {
        method: 'POST',
        auth: link,
        body: {
          address,
          namespace: 'solana',
          message: challenge.message,
          signature: bs58.encode(sig),
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
      <Button
        type="button"
        variant="ghost"
        onClick={solanaSignIn}
        disabled={busy !== null}
      >
        {busy === 'solana'
          ? 'Check your wallet…'
          : solana.publicKey
            ? `Sign in as ${shortAddress(solana.publicKey.toBase58())}`
            : 'Solana wallet'}
      </Button>
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
