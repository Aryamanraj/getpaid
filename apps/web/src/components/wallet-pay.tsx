'use client';

import { useState } from 'react';
import {
  useAccount,
  useConnect,
  useSendTransaction,
  useSwitchChain,
  useWriteContract,
} from 'wagmi';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import type { PaymentRequestView } from '@recv/shared';
import { ERC20_ABI, wagmiConfig } from '@/lib/wallets';

type SupportedChainId = (typeof wagmiConfig)['chains'][number]['id'];

function asSupportedChainId(ref: string): SupportedChainId {
  const id = Number(ref);
  if (!wagmiConfig.chains.some((c) => c.id === id))
    throw new Error(
      `Chain ${ref} is not supported for wallet payments — use the QR code`,
    );
  return id as SupportedChainId;
}
import { Button, ErrorText, Muted } from '@/components/ui';

/**
 * "Connect and pay" for the two namespaces with a usable browser-wallet
 * standard. Bitcoin and Tron fall back to QR + manual hash.
 *
 * The wallet returns the hash the moment the transaction is broadcast; the
 * API verifies it independently, so a lying client gains nothing.
 */
export function WalletPayButton({
  request,
  onSent,
}: {
  request: PaymentRequestView;
  onSent: (txHash: string) => void;
}) {
  const ns = request.chain.namespace;
  if (ns === 'eip155') return <EvmPay request={request} onSent={onSent} />;
  if (ns === 'solana') return <SolanaPay request={request} onSent={onSent} />;
  return null;
}

function EvmPay({
  request,
  onSent,
}: {
  request: PaymentRequestView;
  onSent: (h: string) => void;
}) {
  const { address, chainId: current } = useAccount();
  const { connect, connectors } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      if (!address) {
        const connector = connectors[0];
        if (!connector)
          throw new Error('No browser wallet found — use the QR code instead');
        await connect({ connector });
        setBusy(false);
        return; // wagmi updates `address`; the user taps again with it connected
      }
      const chainId = asSupportedChainId(request.chain.chainRef);
      if (current !== chainId) await switchChainAsync({ chainId });

      const to = request.toAddress as `0x${string}`;
      const amount = BigInt(request.amountRaw);

      const chain = wagmiConfig.chains.find((c) => c.id === chainId);
      const hash = request.asset.contractAddress
        ? await writeContractAsync({
            chainId,
            chain,
            account: address,
            address: request.asset.contractAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [to, amount],
          })
        : await sendTransactionAsync({ chainId, to, value: amount });

      onSent(hash);
    } catch (e) {
      setError(friendly((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={pay} disabled={busy}>
        {busy
          ? 'Check your wallet…'
          : address
            ? `Pay ${request.amountDisplay} ${request.asset.symbol}`
            : 'Connect wallet to pay'}
      </Button>
      <ErrorText>{error}</ErrorText>
      {!address ? (
        <Muted className="text-center">
          MetaMask, Rabby, Coinbase Wallet, or any browser wallet.
        </Muted>
      ) : null}
    </div>
  );
}

function SolanaPay({
  request,
  onSent,
}: {
  request: PaymentRequestView;
  onSent: (h: string) => void;
}) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      if (!wallet.connected) {
        const w =
          wallet.wallets.find((x) => x.readyState === 'Installed') ??
          wallet.wallets[0];
        if (!w)
          throw new Error('No Solana wallet found — use the QR code instead');
        wallet.select(w.adapter.name);
        await w.adapter.connect();
        setBusy(false);
        return;
      }
      const from = wallet.publicKey;
      if (!from) throw new Error('Wallet has no public key');

      const to = new PublicKey(request.toAddress);
      const amount = BigInt(request.amountRaw);
      const tx = new Transaction();

      if (request.asset.contractAddress) {
        const mint = new PublicKey(request.asset.contractAddress);
        const fromAta = getAssociatedTokenAddressSync(mint, from);
        const toAta = getAssociatedTokenAddressSync(mint, to);
        tx.add(
          // No-op if the recipient already has a token account.
          createAssociatedTokenAccountIdempotentInstruction(
            from,
            toAta,
            to,
            mint,
          ),
          createTransferInstruction(fromAta, toAta, from, amount),
        );
      } else {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: from,
            toPubkey: to,
            lamports: amount,
          }),
        );
      }

      const signature = await wallet.sendTransaction(tx, connection);
      onSent(signature);
    } catch (e) {
      setError(friendly((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={pay} disabled={busy}>
        {busy
          ? 'Check your wallet…'
          : wallet.connected
            ? `Pay ${request.amountDisplay} ${request.asset.symbol}`
            : 'Connect wallet to pay'}
      </Button>
      <ErrorText>{error}</ErrorText>
      {!wallet.connected ? (
        <Muted className="text-center">
          Phantom, Solflare, Backpack, or any Solana wallet.
        </Muted>
      ) : null}
    </div>
  );
}

function friendly(message: string): string {
  if (/rejected|denied|cancel/i.test(message))
    return 'You cancelled in the wallet.';
  if (/insufficient/i.test(message))
    return 'Not enough balance to cover the amount and fees.';
  return message.split('\n')[0].slice(0, 200);
}
