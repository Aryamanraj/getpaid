export const BucketSizes = {
  ONE_SECOND: 1_000,
  ONE_MINUTE: 60_000,
  FIVE_MINUTES: 300_000,
  TEN_MINUTES: 600_000,
  ONE_HOUR: 3_600_000,
  ONE_DAY: 86_400_000,
} as const;

export const QueueNames = {
  VerificationQueue: 'verification-queue',
  NotificationQueue: 'notification-queue',
} as const;

export const CacheKeys = {
  platformConfig: (key: string) => `pc:${key}`,
  bootstrap: (host: string) => `bootstrap:${host}`,
} as const;

export const DEFAULT_CONFIG_CACHE_TTL_SECONDS = 300;

export const SCHEMA = {
  CORE: 'core',
  OPS: 'ops',
} as const;
