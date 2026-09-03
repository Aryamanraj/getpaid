import type { BootstrapPayload } from '@recv/shared';

export function supportHandle(
  bootstrap: BootstrapPayload | null,
): string | null {
  const handle = bootstrap?.publicConfig?.['support.handle'];
  return typeof handle === 'string' && handle.length > 0 ? handle : null;
}

/** Quiet donation card under blog articles — links the operator's pay page. */
export function SupportCard({
  handle,
  host,
  brandName,
}: {
  handle: string;
  host: string;
  brandName: string;
}) {
  return (
    <a
      href={`https://${handle}.${host}`}
      className="mt-10 flex items-center justify-between gap-4 rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 transition-[border-color,box-shadow] duration-200 hover:border-[color:var(--color-border-strong)] hover:[box-shadow:var(--shadow-md)]"
    >
      <span>
        <span className="block text-sm font-semibold">
          Enjoying {brandName}?
        </span>
        <span className="mt-0.5 block text-sm text-[color:var(--color-muted)]">
          Support the project — send anything to{' '}
          <span className="font-mono">
            {handle}.{host}
          </span>
        </span>
      </span>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0 text-[color:var(--color-muted)]"
      >
        <path
          d="M4 12h15m-6-7l7 7-7 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
