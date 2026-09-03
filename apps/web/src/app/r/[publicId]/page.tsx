import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { PaymentRequestView } from '@recv/shared';
import { getBootstrap, getHost } from '@/lib/bootstrap';
import { Receipt } from '@/components/receipt';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

// Receipts are shareable but private-by-obscurity — never indexed.
export const metadata = { robots: { index: false, follow: false } };

async function getRequest(
  publicId: string,
): Promise<PaymentRequestView | null> {
  try {
    const res = await fetch(
      `${API_URL}/payment/getRequest/${encodeURIComponent(publicId)}`,
      {
        cache: 'no-store',
      },
    );
    const body = (await res.json()) as {
      success: boolean;
      data: PaymentRequestView;
    };
    return body.success ? body.data : null;
  } catch {
    return null;
  }
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const host = await getHost();
  const [bootstrap, request] = await Promise.all([
    getBootstrap(host),
    getRequest(publicId),
  ]);
  if (!bootstrap || !request) notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-12 sm:px-6 sm:py-16">
      <Link
        href={`/u/${request.payee.userName}`}
        className="text-sm text-[color:var(--color-muted)]"
      >
        ← {request.payee.displayName || request.payee.userName}
      </Link>
      <Receipt initial={request} brandName={bootstrap.domain.brandName} />
    </main>
  );
}
