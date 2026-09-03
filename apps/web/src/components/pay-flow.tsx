'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  PaymentRequestView,
  ProfileAcceptedAsset,
  PublicProfile,
} from '@recv/shared';
import { api, currentHost } from '@/lib/api';
import { track } from '@/lib/analytics';
import { Button, ErrorText, Input, Label, Muted } from '@/components/ui';
import { Qr } from '@/components/qr';
import {
  StatusBadge,
  StatusHint,
  TransactionDetails,
  usePaymentRequest,
} from '@/components/payment-status';
import { WalletPayButton } from '@/components/wallet-pay';
import { MicroLabel, MiniCopy, Row } from '@/components/ledger';
import { shortAddress } from '@/lib/format';

/**
 * The pay page. The amount is the hero: a borderless numeral, one selector,
 * one button. Everything else is disclosed on demand, and every state of the
 * flow lives here so the payer never navigates away until they have a
 * receipt. Ledger skin — mono micro-labels, dotted leaders, a slip.
 */
export function PayFlow({
  profile,
  brandName,
}: {
  profile: PublicProfile;
  brandName: string;
}) {
  const [request, setRequest] = useState<PaymentRequestView | null>(null);
  return request ? (
    <PayPanel request={request} onReset={() => setRequest(null)} />
  ) : (
    <RequestForm
      profile={profile}
      brandName={brandName}
      onCreated={setRequest}
    />
  );
}

function RequestForm({
  profile,
  brandName,
  onCreated,
}: {
  profile: PublicProfile;
  brandName: string;
  onCreated: (r: PaymentRequestView) => void;
}) {
  const [selected, setSelected] = useState<ProfileAcceptedAsset | null>(
    profile.acceptedAssets[0] ?? null,
  );
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [payerName, setPayerName] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = useMemo(
    () =>
      (profile.presetAmounts ?? [])
        .map((p) => ({
          ...p,
          accepted: profile.acceptedAssets.find(
            (a) => a.asset.assetId === p.assetId,
          ),
        }))
        .filter((p) => p.accepted),
    [profile.presetAmounts, profile.acceptedAssets],
  );

  const amountOk = /^\d+(\.\d+)?$/.test(amount) && Number(amount) > 0;
  const payeeName = profile.displayName || profile.userName;

  async function create() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      track('payment request created', {
        asset: selected.asset.symbol,
        chain: selected.chain.name,
        host: currentHost(),
      });
      onCreated(
        await api<PaymentRequestView>('/payment/createRequest', {
          method: 'POST',
          body: {
            userName: profile.userName,
            assetId: selected.asset.assetId,
            amount,
            note: note || undefined,
            payerName: payerName || undefined,
            host: currentHost(),
          },
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (profile.acceptedAssets.length === 0) {
    return (
      <div className="slip mt-10 p-5 text-center">
        <Muted>{payeeName} hasn't added a way to get paid yet.</Muted>
      </div>
    );
  }

  return (
    <form
      className="mt-10 flex flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (amountOk && selected) create();
      }}
    >
      <label htmlFor="amount" className="sr-only">
        Amount in {selected?.asset.symbol}
      </label>
      <input
        id="amount"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
        className="tabular w-full [caret-color:var(--color-accent)] border-0 bg-transparent text-center text-[clamp(3.5rem,18vw,5rem)] leading-none font-semibold tracking-tight outline-none placeholder:text-[color:var(--color-border-strong)]"
      />

      {presets.length > 0 ? (
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {presets.map((p) => (
            <button
              key={`${p.assetId}:${p.amount}`}
              type="button"
              onClick={() => {
                setAmount(p.amount);
                if (p.accepted) setSelected(p.accepted);
              }}
              className="rounded-full border border-[color:var(--color-border)] px-3 py-1 font-mono text-sm transition-[border-color,background-color] duration-200 hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-surface)] active:scale-95"
            >
              {p.amount} {p.accepted?.asset.symbol}
            </button>
          ))}
        </div>
      ) : null}

      {/* One selector: a styled pill with an invisible native <select> on
          top, so mobile gets the OS picker and a11y comes for free. */}
      <div className="relative mx-auto mt-5">
        <div className="pointer-events-none flex items-center gap-2 rounded-full border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] px-4 py-2 font-mono text-sm">
          <span className="font-semibold">{selected?.asset.symbol}</span>
          <span className="text-[color:var(--color-muted)]">
            on {selected?.chain.name}
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="text-[color:var(--color-muted)]"
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <select
          aria-label="Asset and network"
          value={selected?.acceptedAssetId ?? ''}
          onChange={(e) => {
            const next = profile.acceptedAssets.find(
              (a) => a.acceptedAssetId === Number(e.target.value),
            );
            if (next) setSelected(next);
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          {profile.acceptedAssets.map((a) => (
            <option key={a.acceptedAssetId} value={a.acceptedAssetId}>
              {a.asset.symbol} on {a.chain.name}
            </option>
          ))}
        </select>
      </div>

      {showDetails ? (
        <div className="mt-8 flex flex-col gap-4">
          <div>
            <Label htmlFor="note">Note</Label>
            <Input
              id="note"
              maxLength={140}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What this is for"
            />
          </div>
          <div>
            <Label htmlFor="payerName">Your name</Label>
            <Input
              id="payerName"
              maxLength={128}
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className="mx-auto mt-6 text-sm text-[color:var(--color-muted)] transition-colors duration-200 hover:text-[color:var(--color-foreground)]"
        >
          + Add a note
        </button>
      )}

      <ErrorText>{error}</ErrorText>
      <Button
        type="submit"
        disabled={!amountOk || !selected || busy}
        className="mt-8 min-h-13 text-base"
      >
        {busy ? 'One moment…' : `Pay ${payeeName}`}
      </Button>
      <p className="mt-3 text-center text-xs text-[color:var(--color-muted)]">
        Straight to {payeeName}'s wallet — {brandName} never holds funds.
      </p>
    </form>
  );
}

function PayPanel({
  request: initial,
  onReset,
}: {
  request: PaymentRequestView;
  onReset: () => void;
}) {
  const [request, setRequest] = usePaymentRequest(initial);
  const [hash, setHash] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const isTron = request.chain.namespace === 'tron';
  const awaiting = request.status === 'pending';

  const confirmedTracked = useRef(false);
  useEffect(() => {
    if (request.status === 'confirmed' && !confirmedTracked.current) {
      confirmedTracked.current = true;
      track('payment confirmed', {
        chain: request.chain.name,
        asset: request.asset.symbol,
      });
    }
  }, [request.status, request.chain.name, request.asset.symbol]);

  async function submit(txHash: string, submittedVia: 'wallet' | 'manual') {
    setBusy(true);
    setError(null);
    try {
      track('transaction submitted', {
        via: submittedVia,
        chain: request.chain.name,
        asset: request.asset.symbol,
      });
      setRequest(
        await api<PaymentRequestView>('/payment/submitTransaction', {
          method: 'POST',
          body: { publicId: request.publicId, txHash, submittedVia },
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 flex flex-col">
      <div className="flex items-center justify-between">
        <MicroLabel>Send exactly</MicroLabel>
        <StatusBadge status={request.status} />
      </div>
      <p className="tabular mt-1 text-center text-[clamp(2.75rem,14vw,4rem)] leading-none font-semibold tracking-tight">
        {request.amountDisplay}
      </p>
      <p className="mt-2 text-center font-mono text-sm text-[color:var(--color-muted)]">
        {request.asset.symbol} · {request.chain.name}
      </p>

      {awaiting ? (
        <>
          <div className="mt-6">
            <WalletPayButton
              request={request}
              onSent={(h) => submit(h, 'wallet')}
            />
          </div>

          <div className="slip mt-5 p-5">
            {/* Tron wallets handle URIs inconsistently; the address alone is safer. */}
            <Qr
              value={isTron ? request.toAddress : request.paymentUri}
              label={`QR code to pay ${request.amountDisplay} ${request.asset.symbol}`}
            />
            <p className="mt-3 text-center font-mono text-xs text-[color:var(--color-muted)]">
              scan with any wallet
            </p>

            <div className="tear mt-4 flex flex-col gap-2.5 pt-4">
              <Row label="To">
                <span className="truncate" title={request.toAddress}>
                  {shortAddress(request.toAddress, 10, 8)}
                </span>
                <MiniCopy value={request.toAddress} label="address" />
              </Row>
              <Row label="Amount">
                <span className="tabular">{request.amountDisplay}</span>
                <MiniCopy value={request.amountDisplay} label="amount" />
              </Row>
              <Row label="Network">{request.chain.name}</Row>
            </div>
          </div>

          {showManual ? (
            <form
              className="mt-5 flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (hash) submit(hash, 'manual');
              }}
            >
              <Label htmlFor="hash">Transaction hash</Label>
              <Input
                id="hash"
                value={hash}
                onChange={(e) => setHash(e.target.value.trim())}
                spellCheck={false}
                autoCapitalize="none"
                className="font-mono text-sm"
              />
              <ErrorText>{error}</ErrorText>
              <Button type="submit" disabled={busy || !hash}>
                {busy ? 'Checking…' : 'Verify payment'}
              </Button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowManual(true)}
              className="mx-auto mt-5 text-sm text-[color:var(--color-muted)] transition-colors duration-200 hover:text-[color:var(--color-foreground)]"
            >
              Already sent? Paste the transaction hash
            </button>
          )}

          <button
            type="button"
            onClick={onReset}
            className="mx-auto mt-3 text-xs text-[color:var(--color-muted)] underline underline-offset-2"
          >
            Change amount or asset
          </button>
        </>
      ) : (
        <div className="slip relative mt-6 p-5">
          {request.status === 'confirmed' ? (
            <span className="stamp absolute -top-3 right-4 bg-[color:var(--color-surface)] text-[color:var(--color-success)]">
              Verified on-chain
            </span>
          ) : null}
          <StatusHint request={request} />
          <TransactionDetails request={request} />
          {request.status === 'confirmed' ? (
            <div className="mt-4">
              <a
                href={`/r/${request.publicId}`}
                className="inline-flex min-h-10 items-center rounded-[var(--radius)] bg-[color:var(--color-accent)] px-4 text-sm font-medium text-[color:var(--color-accent-foreground)]"
              >
                View receipt
              </a>
            </div>
          ) : null}
        </div>
      )}
      <ErrorText>{!showManual ? error : null}</ErrorText>
    </div>
  );
}
