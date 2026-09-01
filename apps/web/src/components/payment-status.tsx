'use client';

import { useEffect, useState } from 'react';
import type { PaymentRequestView } from '@recv/shared';
import { api } from '@/lib/api';
import { Mono, Muted, Spinner } from '@/components/ui';
import { shortAddress } from '@/lib/format';

const FINAL = new Set(['confirmed', 'failed', 'expired']);

/** Polls a request until it reaches a final state. */
export function usePaymentRequest(initial: PaymentRequestView) {
  const [request, setRequest] = useState(initial);

  useEffect(() => {
    setRequest(initial);
  }, [initial]);

  useEffect(() => {
    if (FINAL.has(request.status)) return;
    const t = setInterval(async () => {
      try {
        setRequest(
          await api<PaymentRequestView>(
            `/payment/getRequest/${request.publicId}`,
          ),
        );
      } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [request.publicId, request.status]);

  return [request, setRequest] as const;
}

export function StatusBadge({
  status,
}: {
  status: PaymentRequestView['status'];
}) {
  const live = status === 'pending' || status === 'submitted';
  const tone =
    status === 'confirmed'
      ? 'text-[color:var(--color-success)] border-[color:var(--color-success)] bg-[color:var(--color-success-soft)]'
      : status === 'failed' || status === 'expired'
        ? 'text-[color:var(--color-danger)] border-[color:var(--color-danger)] bg-[color:var(--color-danger-soft)]'
        : 'text-[color:var(--color-muted)] border-[color:var(--color-border)]';
  const label =
    status === 'submitted'
      ? 'Verifying'
      : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${tone}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full bg-current ${live ? 'status-dot-live' : ''}`}
      />
      {label}
    </span>
  );
}

export function TransactionDetails({
  request,
}: {
  request: PaymentRequestView;
}) {
  const tx = request.transaction;
  if (!tx) return null;
  return (
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      <dt className="text-[color:var(--color-muted)]">Transaction</dt>
      <dd>
        <a
          href={tx.explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 transition-colors duration-200 hover:text-[color:var(--color-muted)]"
        >
          <Mono className="tabular">{shortAddress(tx.txHash, 10, 8)}</Mono>
        </a>
      </dd>
      {tx.fromAddress ? (
        <>
          <dt className="text-[color:var(--color-muted)]">From</dt>
          <dd>
            <Mono className="tabular">
              {shortAddress(tx.fromAddress, 8, 6)}
            </Mono>
          </dd>
        </>
      ) : null}
      {tx.status === 'pending' ? (
        <>
          <dt className="text-[color:var(--color-muted)]">Confirmations</dt>
          <dd className="tabular flex items-center gap-2">
            {tx.confirmations} / {tx.requiredConfirmations}
            <Spinner label="" />
          </dd>
        </>
      ) : null}
      {tx.mismatchReason ? (
        <>
          <dt className="text-[color:var(--color-muted)]">Problem</dt>
          <dd className="text-[color:var(--color-danger)]">
            {tx.mismatchReason}
          </dd>
        </>
      ) : null}
      {tx.verifiedAt ? (
        <>
          <dt className="text-[color:var(--color-muted)]">Verified</dt>
          <dd>{new Date(tx.verifiedAt).toLocaleString()}</dd>
        </>
      ) : null}
    </dl>
  );
}

export function StatusHint({ request }: { request: PaymentRequestView }) {
  switch (request.status) {
    case 'pending':
      return (
        <Muted>Waiting for a payment. Send exactly the amount shown.</Muted>
      );
    case 'submitted':
      return (
        <Muted>We're checking the chain. This page updates by itself.</Muted>
      );
    case 'confirmed':
      return (
        <p className="flex items-center gap-2 text-sm font-medium text-[color:var(--color-success)]">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="1.6"
              opacity="0.35"
            />
            <path
              d="M7.5 12.5l3 3 6-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="check-draw"
            />
          </svg>
          Paid and verified on-chain.
        </p>
      );
    case 'failed':
      return (
        <Muted className="text-[color:var(--color-danger)]">
          This payment could not be verified against the request.
        </Muted>
      );
    case 'expired':
      return <Muted>This request expired before a payment was attached.</Muted>;
    default:
      return null;
  }
}
