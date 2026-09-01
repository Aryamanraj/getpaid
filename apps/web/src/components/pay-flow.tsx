'use client';

import { useMemo, useState } from 'react';
import type {
  PaymentRequestView,
  ProfileAcceptedAsset,
  PublicProfile,
} from '@recv/shared';
import { api, currentHost } from '@/lib/api';
import {
  Button,
  Card,
  CopyButton,
  ErrorText,
  Input,
  Label,
  Mono,
  Muted,
} from '@/components/ui';
import { Qr } from '@/components/qr';
import {
  StatusBadge,
  StatusHint,
  TransactionDetails,
  usePaymentRequest,
} from '@/components/payment-status';
import { WalletPayButton } from '@/components/wallet-pay';

/**
 * The pay page. One column: who you're paying, what they accept, an amount,
 * one primary button. Every state of the flow lives here so the payer never
 * navigates away until they have a receipt.
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
  const grouped = useMemo(() => {
    const byChain = new Map<
      number,
      { name: string; items: ProfileAcceptedAsset[] }
    >();
    for (const a of profile.acceptedAssets) {
      const g = byChain.get(a.chain.chainId) ?? {
        name: a.chain.name,
        items: [],
      };
      g.items.push(a);
      byChain.set(a.chain.chainId, g);
    }
    return [...byChain.values()];
  }, [profile.acceptedAssets]);

  const [selected, setSelected] = useState<ProfileAcceptedAsset | null>(
    profile.acceptedAssets[0] ?? null,
  );
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [payerName, setPayerName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountOk = /^\d+(\.\d+)?$/.test(amount) && Number(amount) > 0;

  async function create() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
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
      <Card className="mt-8">
        <Muted>
          {profile.displayName || profile.userName} hasn't added a way to get
          paid yet.
        </Muted>
      </Card>
    );
  }

  return (
    <form
      className="mt-8 flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (amountOk && selected) create();
      }}
    >
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Pay with</legend>
        <div className="flex flex-col gap-2">
          {grouped.map((g) => (
            <div key={g.name} className="flex flex-wrap items-center gap-2">
              <span className="w-24 shrink-0 text-sm text-[color:var(--color-muted)]">
                {g.name}
              </span>
              {g.items.map((a) => {
                const on = selected?.acceptedAssetId === a.acceptedAssetId;
                return (
                  <button
                    key={a.acceptedAssetId}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSelected(a)}
                    className={`min-h-10 rounded-full border px-3.5 text-sm transition-colors duration-200 ${
                      on
                        ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]'
                        : 'border-[color:var(--color-border)] hover:bg-[color:var(--color-surface)]'
                    }`}
                  >
                    {a.asset.symbol}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </fieldset>

      <div>
        <Label htmlFor="amount">
          Amount{selected ? ` in ${selected.asset.symbol}` : ''}
        </Label>
        <Input
          id="amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
          className="text-2xl font-medium"
          aria-describedby="amount-hint"
        />
        <Muted className="mt-1.5">
          <span id="amount-hint">
            {selected
              ? `Sent as ${selected.asset.symbol} on ${selected.chain.name}. No conversion.`
              : ''}
          </span>
        </Muted>
      </div>

      <div>
        <Label htmlFor="note">Note (optional)</Label>
        <Input
          id="note"
          maxLength={140}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What this is for"
        />
      </div>

      <div>
        <Label htmlFor="payerName">Your name (optional)</Label>
        <Input
          id="payerName"
          maxLength={128}
          value={payerName}
          onChange={(e) => setPayerName(e.target.value)}
        />
      </div>

      <ErrorText>{error}</ErrorText>
      <Button type="submit" disabled={!amountOk || !selected || busy}>
        {busy ? 'One moment…' : 'Continue'}
      </Button>
      <Muted className="text-center">
        Funds go straight to {profile.displayName || profile.userName}.{' '}
        {brandName} never holds them.
      </Muted>
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

  async function submit(txHash: string, submittedVia: 'wallet' | 'manual') {
    setBusy(true);
    setError(null);
    try {
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
    <div className="mt-8 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Muted>Send exactly</Muted>
          <p className="text-3xl font-semibold tracking-tight">
            {request.amountDisplay}{' '}
            <span className="text-xl font-medium">{request.asset.symbol}</span>
          </p>
          <Muted>on {request.chain.name}</Muted>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {awaiting ? (
        <>
          <WalletPayButton
            request={request}
            onSent={(h) => submit(h, 'wallet')}
          />

          <Card className="flex flex-col items-center gap-3">
            {/* Tron wallets handle URIs inconsistently; the address alone is safer. */}
            <Qr
              value={isTron ? request.toAddress : request.paymentUri}
              label={`QR code to pay ${request.amountDisplay} ${request.asset.symbol}`}
            />
            <div className="w-full">
              <Muted className="mb-1">
                To this address on {request.chain.name}
              </Muted>
              <div className="flex items-start justify-between gap-2">
                <Mono className="text-sm">{request.toAddress}</Mono>
                <CopyButton value={request.toAddress} />
              </div>
            </div>
            <div className="flex w-full items-center justify-between">
              <Muted>Amount</Muted>
              <div className="flex items-center gap-2">
                <Mono className="text-sm">{request.amountDisplay}</Mono>
                <CopyButton value={request.amountDisplay} />
              </div>
            </div>
          </Card>

          <Card>
            {showManual ? (
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (hash) submit(hash, 'manual');
                }}
              >
                <Label htmlFor="hash">Paste the transaction hash</Label>
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
                className="w-full text-left text-sm"
              >
                <span className="font-medium">
                  Already sent from another wallet?
                </span>
                <Muted>Paste the transaction hash and we'll verify it.</Muted>
              </button>
            )}
          </Card>
        </>
      ) : (
        <Card>
          <StatusHint request={request} />
          <TransactionDetails request={request} />
          {request.status === 'confirmed' ? (
            <div className="mt-4 flex gap-2">
              <a
                href={`/r/${request.publicId}`}
                className="inline-flex min-h-10 items-center rounded-[var(--radius)] bg-[color:var(--color-accent)] px-4 text-sm font-medium text-[color:var(--color-accent-foreground)]"
              >
                View receipt
              </a>
            </div>
          ) : null}
        </Card>
      )}

      {awaiting ? (
        <button
          type="button"
          onClick={onReset}
          className="self-start text-sm text-[color:var(--color-muted)] underline"
        >
          Change amount or asset
        </button>
      ) : null}
      <ErrorText>{!showManual ? error : null}</ErrorText>
    </div>
  );
}
