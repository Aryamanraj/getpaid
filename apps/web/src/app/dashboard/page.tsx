'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type {
  BootstrapAsset,
  BootstrapChain,
  BootstrapPayload,
  PaymentRequestView,
} from '@recv/shared';
import { api, currentHost, tokenStore } from '@/lib/api';
import { signOut, useMe } from '@/lib/use-auth';
import { shortAddress } from '@/lib/format';
import {
  Button,
  Card,
  CopyButton,
  ErrorText,
  Input,
  Label,
  Mono,
  Muted,
  Page,
  Spinner,
} from '@/components/ui';
import { PENDING_CLAIM_KEY } from '@/components/claim-form';
import { WalletSignIn } from '@/components/wallet-sign-in';

interface PayoutAddressRow {
  payoutAddressId: number;
  namespace: string;
  address: string;
  label?: string;
  isProven: boolean;
}
interface AcceptedRow {
  acceptedAssetId: number;
  assetId: number;
  symbol: string;
  chainId: number;
  chainName: string;
  payoutAddressId: number;
  isActive: boolean;
}
interface Methods {
  payoutAddresses: PayoutAddressRow[];
  acceptedAssets: AcceptedRow[];
}

const NAMESPACE_LABEL: Record<string, string> = {
  eip155: 'Ethereum / Base / Arbitrum / Polygon',
  solana: 'Solana',
  bip122: 'Bitcoin',
  tron: 'Tron',
};

export default function DashboardPage() {
  const router = useRouter();
  const { me, loading, reload, authed } = useMe();
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [methods, setMethods] = useState<Methods | null>(null);
  const [history, setHistory] = useState<PaymentRequestView[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenStore.access) router.replace('/login?next=/dashboard');
  }, [router]);

  // A session that cannot load `me` (refresh failed too) is dead — send the
  // user back to sign-in instead of spinning forever.
  useEffect(() => {
    if (!loading && !me) {
      tokenStore.clear();
      router.replace('/login?next=/dashboard');
    }
  }, [loading, me, router]);

  const loadAll = useCallback(async () => {
    try {
      const [b, m, h] = await Promise.all([
        api<BootstrapPayload>(
          `/config/getBootstrap?host=${encodeURIComponent(currentHost())}`,
        ),
        api<Methods>('/paymentMethod/getAll', { auth: true }),
        api<{ items: PaymentRequestView[] }>(
          '/payment/getMyRequests?limit=50',
          { auth: true },
        ),
      ]);
      setBootstrap(b);
      setMethods(m);
      setHistory(h.items);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (authed) loadAll();
  }, [authed, loadAll]);

  // Finish a claim that started on the landing page before sign-in.
  useEffect(() => {
    if (!me || me.userName) return;
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem(PENDING_CLAIM_KEY);
    } catch {}
    if (!pending) return;
    api('/user/claimUserName', {
      method: 'POST',
      body: { userName: pending },
      auth: true,
    })
      .then(() => {
        try {
          sessionStorage.removeItem(PENDING_CLAIM_KEY);
        } catch {}
        reload();
      })
      .catch((e: Error) => setError(e.message));
  }, [me, reload]);

  if (loading || !me) {
    return (
      <Page wide>
        <Spinner />
      </Page>
    );
  }

  const host = bootstrap?.domain.host ?? currentHost();

  return (
    <Page wide>
      <header className="flex items-start justify-between gap-4">
        <div>
          <Muted>{bootstrap?.domain.brandName ?? host}</Muted>
          <h1 className="text-2xl font-semibold tracking-tight">
            {me.userName ? `${me.userName}.${host}` : 'Your account'}
          </h1>
        </div>
        <Button
          variant="ghost"
          className="min-h-9 px-3 py-1.5 text-sm"
          onClick={() => {
            signOut();
            router.replace('/');
          }}
        >
          Sign out
        </Button>
      </header>

      <ErrorText>{error}</ErrorText>

      {!me.userName ? <ClaimSection host={host} onDone={reload} /> : null}

      {me.userName ? (
        <Card className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Muted>Your link</Muted>
            <Mono className="text-[15px]">
              https://{me.userName}.{host}
            </Mono>
          </div>
          <div className="flex gap-2">
            <CopyButton
              value={`https://${me.userName}.${host}`}
              label="Copy link"
            />
            <Link
              href={`/u/${me.userName}`}
              className="inline-flex min-h-9 items-center rounded-[var(--radius)] border border-[color:var(--color-border)] px-3 text-sm"
            >
              Preview
            </Link>
          </div>
        </Card>
      ) : null}

      <ProfileSection
        me={me}
        onSaved={reload}
        domains={bootstrap ? [bootstrap.domain] : []}
      />

      {bootstrap && methods ? (
        <PayoutSection
          bootstrap={bootstrap}
          methods={methods}
          onChanged={(m) => setMethods(m)}
        />
      ) : null}

      <IdentitiesSection me={me} onLinked={reload} />

      <HistorySection items={history} />
    </Page>
  );
}

function ClaimSection({ host, onDone }: { host: string; onDone: () => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Card className="mt-6">
      <h2 className="font-medium">Claim your username</h2>
      <Muted className="mt-1">
        This becomes your link. It can't be changed later.
      </Muted>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await api('/user/claimUserName', {
              method: 'POST',
              body: { userName: name },
              auth: true,
            });
            onDone();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input
          aria-label="Username"
          placeholder="yourname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoCapitalize="none"
        />
        <Button type="submit" disabled={busy || !name}>
          Claim
        </Button>
      </form>
      <ErrorText>{error}</ErrorText>
      <Muted className="mt-2">
        You'll be {name || 'yourname'}.{host}
      </Muted>
    </Card>
  );
}

function ProfileSection({
  me,
  onSaved,
  domains,
}: {
  me: { displayName?: string; bio?: string; avatarUrl?: string };
  onSaved: () => void;
  domains: BootstrapPayload['domain'][];
}) {
  const [displayName, setDisplayName] = useState(me.displayName ?? '');
  const [bio, setBio] = useState(me.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(me.avatarUrl ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  void domains;

  return (
    <Card className="mt-6">
      <h2 className="font-medium">Profile</h2>
      <form
        className="mt-3 flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          setSaved(false);
          try {
            await api('/user/updateProfile', {
              method: 'PATCH',
              auth: true,
              body: {
                displayName: displayName || undefined,
                bio: bio || undefined,
                avatarUrl: avatarUrl || undefined,
              },
            });
            setSaved(true);
            onSaved();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            maxLength={64}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="bio">Bio</Label>
          <Input
            id="bio"
            maxLength={280}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="What people are paying you for"
          />
        </div>
        <div>
          <Label htmlFor="avatarUrl">Avatar URL (https)</Label>
          <Input
            id="avatarUrl"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
          />
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
          {saved ? <Muted>Saved</Muted> : null}
        </div>
      </form>
    </Card>
  );
}

function PayoutSection({
  bootstrap,
  methods,
  onChanged,
}: {
  bootstrap: BootstrapPayload;
  methods: Methods;
  onChanged: (m: Methods) => void;
}) {
  const [namespace, setNamespace] = useState('eip155');
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chainsFor = (ns: string) =>
    bootstrap.chains.filter((c) => c.namespace === ns);
  const assetsFor = (chain: BootstrapChain) =>
    bootstrap.assets.filter((a) => a.chainId === chain.chainId);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      onChanged(
        await api<Methods>('/paymentMethod/addPayoutAddress', {
          method: 'POST',
          auth: true,
          body: {
            namespace,
            address,
            label: label || undefined,
            assetIds: selected,
          },
        }),
      );
      setAddress('');
      setLabel('');
      setSelected([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(
    asset: BootstrapAsset,
    payoutAddressId: number,
    isActive: boolean,
  ) {
    setError(null);
    try {
      onChanged(
        await api<Methods>('/paymentMethod/setAcceptedAsset', {
          method: 'POST',
          auth: true,
          body: { assetId: asset.assetId, payoutAddressId, isActive },
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(id: number) {
    if (
      !confirm(
        'Remove this address? Assets accepted at it will stop showing on your page.',
      )
    )
      return;
    setError(null);
    try {
      onChanged(
        await api<Methods>(`/paymentMethod/removePayoutAddress/${id}`, {
          method: 'DELETE',
          auth: true,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Card className="mt-6">
      <h2 className="font-medium">Where you get paid</h2>
      <Muted className="mt-1">
        One EVM address works on every EVM chain. Toggle which assets show on
        your page.
      </Muted>

      <ul className="mt-4 flex flex-col gap-4">
        {methods.payoutAddresses.map((pa) => (
          <li
            key={pa.payoutAddressId}
            className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <Muted>
                  {NAMESPACE_LABEL[pa.namespace] ?? pa.namespace}
                  {pa.label ? ` · ${pa.label}` : ''}
                </Muted>
                <Mono className="text-sm">{pa.address}</Mono>
                {pa.isProven ? (
                  <Muted className="mt-1 text-[color:var(--color-success)]">
                    Verified — you signed in with this wallet
                  </Muted>
                ) : (
                  <Muted className="mt-1">
                    Unverified — sign in with this wallet to prove you control
                    it
                  </Muted>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(pa.payoutAddressId)}
                className="text-xs text-[color:var(--color-muted)] underline"
              >
                Remove
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {chainsFor(pa.namespace).map((chain) => (
                <div
                  key={chain.chainId}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span className="w-28 shrink-0 text-sm">{chain.name}</span>
                  {assetsFor(chain).map((asset) => {
                    const row = methods.acceptedAssets.find(
                      (a) => a.assetId === asset.assetId,
                    );
                    const onThis =
                      row?.isActive &&
                      row.payoutAddressId === pa.payoutAddressId;
                    return (
                      <button
                        key={asset.assetId}
                        type="button"
                        aria-pressed={!!onThis}
                        onClick={() =>
                          toggle(asset, pa.payoutAddressId, !onThis)
                        }
                        className={`min-h-9 rounded-full border px-3 text-sm transition-colors duration-200 ${
                          onThis
                            ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]'
                            : 'border-[color:var(--color-border)]'
                        }`}
                      >
                        {asset.symbol}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <form
        className="mt-5 flex flex-col gap-3 border-t border-[color:var(--color-border)] pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <h3 className="text-sm font-medium">Add an address</h3>
        <div>
          <Label htmlFor="ns">Network</Label>
          <select
            id="ns"
            value={namespace}
            onChange={(e) => {
              setNamespace(e.target.value);
              setSelected([]);
            }}
            className="min-h-11 w-full rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3"
          >
            {Object.entries(NAMESPACE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="addr">Address</Label>
          <Input
            id="addr"
            value={address}
            onChange={(e) => setAddress(e.target.value.trim())}
            spellCheck={false}
            autoCapitalize="none"
            className="font-mono text-sm"
            required
          />
        </div>
        <div>
          <Label htmlFor="label">Label (optional)</Label>
          <Input
            id="label"
            maxLength={64}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="main wallet"
          />
        </div>
        <div>
          <Label>Accept at this address</Label>
          <div className="flex flex-col gap-2">
            {chainsFor(namespace).map((chain) => (
              <div
                key={chain.chainId}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="w-28 shrink-0 text-sm">{chain.name}</span>
                {assetsFor(chain).map((asset) => {
                  const on = selected.includes(asset.assetId);
                  return (
                    <button
                      key={asset.assetId}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setSelected((s) =>
                          on
                            ? s.filter((x) => x !== asset.assetId)
                            : [...s, asset.assetId],
                        )
                      }
                      className={`min-h-9 rounded-full border px-3 text-sm transition-colors duration-200 ${
                        on
                          ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]'
                          : 'border-[color:var(--color-border)]'
                      }`}
                    >
                      {asset.symbol}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={busy || !address}>
          {busy ? 'Adding…' : 'Add address'}
        </Button>
      </form>
    </Card>
  );
}

function IdentitiesSection({
  me,
  onLinked,
}: {
  me: {
    identities: Array<{
      provider: string;
      identifier: string;
      isPrimary: boolean;
    }>;
  };
  onLinked: () => void;
}) {
  const [showLink, setShowLink] = useState(false);
  return (
    <Card className="mt-6">
      <h2 className="font-medium">Sign-in methods</h2>
      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {me.identities.map((i) => (
          <li
            key={`${i.provider}:${i.identifier}`}
            className="flex items-center gap-2"
          >
            <span className="w-14 text-[color:var(--color-muted)]">
              {i.provider}
            </span>
            <Mono>
              {i.provider === 'wallet'
                ? shortAddress(i.identifier, 8, 6)
                : i.identifier}
            </Mono>
            {i.isPrimary ? <Muted>primary</Muted> : null}
          </li>
        ))}
      </ul>
      {showLink ? (
        <div className="mt-4">
          <WalletSignIn
            link
            onSuccess={() => {
              setShowLink(false);
              onLinked();
            }}
          />
        </div>
      ) : (
        <Button
          variant="ghost"
          className="mt-4 min-h-9 px-3 py-1.5 text-sm"
          onClick={() => setShowLink(true)}
        >
          Link a wallet
        </Button>
      )}
    </Card>
  );
}

function HistorySection({ items }: { items: PaymentRequestView[] }) {
  return (
    <Card className="mt-6">
      <h2 className="font-medium">Payments</h2>
      {items.length === 0 ? (
        <Muted className="mt-2">Nothing yet. Share your link.</Muted>
      ) : (
        <ul className="mt-3 divide-y divide-[color:var(--color-border)]">
          {items.map((p) => (
            <li
              key={p.publicId}
              className="flex items-center justify-between gap-3 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <div>
                  <span className="font-medium">
                    {p.amountDisplay} {p.asset.symbol}
                  </span>
                  <span className="text-[color:var(--color-muted)]">
                    {' '}
                    on {p.chain.name}
                  </span>
                </div>
                <Muted>
                  {new Date(p.createdAt).toLocaleString()}
                  {p.note ? ` · ${p.note}` : ''}
                </Muted>
              </div>
              <Link
                href={`/r/${p.publicId}`}
                className={`shrink-0 text-xs uppercase tracking-wide ${p.status === 'confirmed' ? 'text-[color:var(--color-success)]' : p.status === 'failed' ? 'text-[color:var(--color-danger)]' : 'text-[color:var(--color-muted)]'}`}
              >
                {p.status}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
