'use client';

import type { PaymentRequestView } from '@recv/shared';
import { Card, CopyButton, Mono, Muted } from '@/components/ui';
import {
  StatusBadge,
  StatusHint,
  TransactionDetails,
  usePaymentRequest,
} from '@/components/payment-status';

export function Receipt({
  initial,
  brandName,
}: {
  initial: PaymentRequestView;
  brandName: string;
}) {
  const [request] = usePaymentRequest(initial);
  const url = typeof window === 'undefined' ? '' : window.location.href;

  return (
    <>
      <div className="mt-6 flex items-start justify-between gap-3">
        <div>
          <Muted>Receipt · {brandName}</Muted>
          <h1 className="text-2xl font-semibold tracking-tight">
            {request.amountDisplay} {request.asset.symbol}
          </h1>
          <Muted>
            on {request.chain.name} to{' '}
            {request.payee.displayName || request.payee.userName}
          </Muted>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <Card className="mt-6">
        <StatusHint request={request} />
        <TransactionDetails request={request} />
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-[color:var(--color-border)] pt-3 text-sm">
          <dt className="text-[color:var(--color-muted)]">To</dt>
          <dd>
            <Mono>{request.toAddress}</Mono>
          </dd>
          {request.note ? (
            <>
              <dt className="text-[color:var(--color-muted)]">Note</dt>
              <dd>{request.note}</dd>
            </>
          ) : null}
          <dt className="text-[color:var(--color-muted)]">Created</dt>
          <dd>{new Date(request.createdAt).toLocaleString()}</dd>
          <dt className="text-[color:var(--color-muted)]">Reference</dt>
          <dd>
            <Mono>{request.publicId}</Mono>
          </dd>
        </dl>
      </Card>

      <div className="mt-4 flex gap-2">
        {url ? <CopyButton value={url} label="Copy receipt link" /> : null}
      </div>
    </>
  );
}
