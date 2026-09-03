'use client';

import { useState } from 'react';

/** Uppercase mono micro-label — the ledger's column headings. */
export function MicroLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] font-medium tracking-[0.12em] text-[color:var(--color-muted)] uppercase">
      {children}
    </span>
  );
}

/** LABEL ····· value — one line of the ledger. */
export function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-end text-sm">
      <MicroLabel>{label}</MicroLabel>
      <span className="leader" aria-hidden="true" />
      <span className="flex min-w-0 items-center gap-1.5 font-mono">
        {children}
      </span>
    </div>
  );
}

/** Icon-only copy affordance sized for a ledger row. */
export function MiniCopy({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-md transition-colors duration-200 hover:bg-[color:var(--color-background)] ${
        done
          ? 'text-[color:var(--color-success)]'
          : 'text-[color:var(--color-muted)]'
      }`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
    >
      {done ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="9"
            y="9"
            width="11"
            height="11"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      )}
    </button>
  );
}
