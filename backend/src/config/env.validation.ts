/**
 * Secret that used to be hard-coded as a fallback. It is public in the git
 * history, so tokens signed with it can be forged by anyone.
 */
const LEAKED_JWT_SECRET = 'haisan-express-jwt-secret-key-2026';

const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Validate environment variables at startup (ConfigModule `validate` hook).
 * Fails fast instead of silently signing tokens with a weak or known secret.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const jwtSecret = config.JWT_SECRET;

  if (typeof jwtSecret !== 'string' || jwtSecret.trim() === '') {
    throw new Error(
      'JWT_SECRET is not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    );
  }

  if (jwtSecret === LEAKED_JWT_SECRET) {
    throw new Error(
      'JWT_SECRET uses the old default value that is public in the repository. Replace it with a newly generated secret.',
    );
  }

  if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long.`,
    );
  }

  return config;
}
