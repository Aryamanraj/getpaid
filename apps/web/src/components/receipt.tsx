'use client';

import type { PaymentRequestView } from '@recv/shared';
import { CopyButton, Muted } from '@/components/ui';
import { MiniCopy, Row } from '@/components/ledger';
import {
  StatusBadge,
  StatusHint,
  usePaymentRequest,
} from '@/components/payment-status';
import { shortAddress } from '@/lib/format';

/** The receipt, styled as one — a slip with a tear line and a stamp. */
export function Receipt({
  initial,
  brandName,
}: {
  initial: PaymentRequestView;
  brandName: string;
}) {
  const [request] = usePaymentRequest(initial);
  const url = typeof window === 'undefined' ? '' : window.location.href;
  const tx = request.transaction;

  return (
    <>
      <div className="mt-6 flex items-center justify-between">
        <p className="font-mono text-[11px] font-medium tracking-[0.12em] text-[color:var(--color-muted)] uppercase">
          Receipt · {brandName}
        </p>
        <StatusBadge status={request.status} />
      </div>

      <div className="slip relative mt-4 p-5">
        {request.status === 'confirmed' ? (
          <span className="stamp absolute -top-3 right-4 bg-[color:var(--color-surface)] text-[color:var(--color-success)]">
            Verified on-chain
          </span>
        ) : null}

        <p className="tabular text-center text-[clamp(2.5rem,12vw,3.5rem)] leading-none font-semibold tracking-tight">
          {request.amountDisplay}
        </p>
        <p className="mt-2 text-center font-mono text-sm text-[color:var(--color-muted)]">
          {request.asset.symbol} · {request.chain.name}
        </p>

        <div className="tear mt-5 flex flex-col gap-2.5 pt-5">
          <Row label="To">
            {request.payee.displayName || request.payee.userName}
          </Row>
          <Row label="Address">
            <span className="truncate" title={request.toAddress}>
              {shortAddress(request.toAddress, 10, 8)}
            </span>
            <MiniCopy value={request.toAddress} label="address" />
          </Row>
          {tx ? (
            <Row label="Tx">
              <a
                href={tx.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate underline underline-offset-2"
                title={tx.txHash}
              >
                {shortAddress(tx.txHash, 10, 8)}
              </a>
            </Row>
          ) : null}
          {tx?.fromAddress ? (
            <Row label="From">{shortAddress(tx.fromAddress, 8, 6)}</Row>
          ) : null}
          {request.note ? <Row label="Note">{request.note}</Row> : null}
          <Row label="Created">
            {new Date(request.createdAt).toLocaleString()}
          </Row>
          {tx?.verifiedAt ? (
            <Row label="Verified">
              {new Date(tx.verifiedAt).toLocaleString()}
            </Row>
          ) : null}
          <Row label="Ref">{request.publicId}</Row>
        </div>

        {tx?.status === 'pending' ? (
          <Muted className="mt-4 font-mono text-xs">
            {tx.confirmations} / {tx.requiredConfirmations} confirmations —
            this page updates by itself.
          </Muted>
        ) : null}
        {tx?.mismatchReason ? (
          <p className="mt-4 text-sm text-[color:var(--color-danger)]">
            {tx.mismatchReason}
          </p>
        ) : null}
        {request.status !== 'confirmed' ? (
          <div className="mt-4">
            <StatusHint request={request} />
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex gap-2">
        {url ? <CopyButton value={url} label="Copy receipt link" /> : null}
      </div>
    </>
  );
}
