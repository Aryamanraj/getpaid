/**
 * The env file holds only what is needed to reach the database and decrypt
 * everything else. Every other value — RPC URLs, provider keys, JWT secrets,
 * thresholds, feature flags — lives in core.PlatformConfig.
 *
 * See docs/ARCHITECTURE.md §3.
 */
export default () => {
  return {
    NODE_ENV: process.env.NODE_ENV,
    PORT: parseInt(process.env.PORT, 10) || 3001,
    POSTGRES_HOST: process.env.POSTGRES_HOST,
    POSTGRES_PORT: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    POSTGRES_DB: process.env.POSTGRES_DB,
    POSTGRES_SSL: process.env.POSTGRES_SSL,
    AES_ENCRYPTION_KEY: process.env.AES_ENCRYPTION_KEY,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: parseInt(process.env.REDIS_PORT, 10) || 6379,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    ADMIN_API_KEY: process.env.ADMIN_API_KEY,
    IGNORE_MIGRATIONS: process.env.IGNORE_MIGRATIONS,
  };
};
