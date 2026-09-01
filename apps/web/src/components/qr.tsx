'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function Qr({ value, label }: { value: string; label: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, {
      margin: 1,
      width: 240,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [value]);

  return (
    <div
      className="mx-auto aspect-square w-[240px] max-w-full rounded-[var(--radius)] bg-white p-2"
      aria-busy={!src}
    >
      {src ? (
        // biome-ignore lint/performance/noImgElement: data URI, no optimisation possible
        <img
          src={src}
          alt={label}
          width={240}
          height={240}
          className="block h-full w-full"
        />
      ) : null}
    </div>
  );
}
