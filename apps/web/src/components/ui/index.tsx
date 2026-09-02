'use client';

import {
  forwardRef,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ');

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }
>(function Button({ className, variant = 'primary', ...props }, ref) {
  return (
    <button
      ref={ref}
      {...props}
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius)] px-4 py-2.5 text-[15px] font-medium transition-[background-color,border-color,box-shadow,transform,opacity] duration-200 [transition-timing-function:var(--ease-out-soft)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
        variant === 'primary' &&
          'bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)] [box-shadow:var(--shadow-sm)] hover:[box-shadow:var(--shadow-md)] hover:opacity-90',
        variant === 'ghost' &&
          'border border-[color:var(--color-border)] bg-transparent hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface)]',
        className,
      )}
    />
  );
});

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      {...props}
      className={cx(
        'min-h-11 w-full rounded-[var(--radius)] border border-[color:var(--color-border)] bg-transparent px-4 py-2.5 text-[16px] outline-none transition-[border-color,box-shadow] duration-200 hover:border-[color:var(--color-border-strong)] focus:border-[color:var(--color-accent)] focus:[box-shadow:0_0_0_3px_var(--color-accent-ring)]',
        className,
      )}
    />
  );
});

export function Label({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
      {children}
    </label>
  );
}

export function Card({
  children,
  className,
  elevated,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}) {
  return (
    <div
      className={cx(
        'rounded-[var(--radius)] border bg-[color:var(--color-surface)] p-5',
        elevated
          ? 'border-[color:var(--color-border-strong)] [box-shadow:var(--shadow-md)]'
          : 'border-[color:var(--color-border)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Muted({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cx('text-sm text-[color:var(--color-muted)]', className)}>
      {children}
    </p>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-sm text-[color:var(--color-danger)]">
      {children}
    </p>
  );
}

export function Mono({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cx('font-mono break-all', className)}>{children}</span>
  );
}

function CopyIcon({ done }: { done: boolean }) {
  return done ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="check-draw"
      />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="9"
        y="9"
        width="11"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function CopyButton({
  value,
  label = 'Copy',
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={`${label} to clipboard`}
      className={cx(
        'min-h-9 px-3 py-1.5 text-sm',
        copied && 'text-[color:var(--color-success)]',
      )}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {}
      }}
    >
      <CopyIcon done={copied} />
      {copied ? 'Copied' : label}
    </Button>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-flex items-center gap-2 text-sm text-[color:var(--color-muted)]"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="animate-spin"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.25"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {label}
    </span>
  );
}

export function Page({
  children,
  wide,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main
      className={cx(
        'mx-auto flex min-h-dvh w-full flex-col px-5 py-12 sm:px-6 sm:py-16',
        wide ? 'max-w-2xl' : 'max-w-md',
      )}
    >
      {children}
    </main>
  );
}
