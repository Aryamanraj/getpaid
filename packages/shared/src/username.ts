export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export const RESERVED_SUBDOMAINS = [
  'api',
  'app',
  'admin',
  'www',
  'docs',
  'mail',
  'cdn',
  'status',
  'assets',
  'static',
  'blog',
  'help',
  'support',
];

export function normaliseUserName(input: string): string {
  return (input ?? '').trim().toLowerCase();
}

export interface UserNameCheckOptions {
  minLength?: number;
  maxLength?: number;
}

/**
 * Shape-only validation. Reservation and uniqueness are decided by the API —
 * this exists so the claim input can give instant feedback without a round
 * trip, using the same rules both sides.
 */
export function checkUserNameShape(
  input: string,
  options: UserNameCheckOptions = {},
): { valid: boolean; reason?: string } {
  const { minLength = 3, maxLength = 30 } = options;
  const name = normaliseUserName(input);

  if (name.length < minLength)
    return { valid: false, reason: `Must be at least ${minLength} characters` };
  if (name.length > maxLength)
    return { valid: false, reason: `Must be at most ${maxLength} characters` };
  if (name.includes('--'))
    return { valid: false, reason: 'No consecutive hyphens' };
  if (!USERNAME_PATTERN.test(name))
    return {
      valid: false,
      reason: 'Only letters, numbers and hyphens; must start and end with one',
    };

  return { valid: true };
}
