import { describe, it, expect } from 'vitest';
import { validateEnv } from './env.validation.js';

const STRONG_SECRET = 'a'.repeat(64);

describe('validateEnv', () => {
  it('accepts a strong JWT_SECRET', () => {
    const config = { JWT_SECRET: STRONG_SECRET, PORT: '5000' };

    expect(validateEnv(config)).toBe(config);
  });

  it.each([undefined, '', '   '])('rejects a missing JWT_SECRET (%j)', (secret) => {
    expect(() => validateEnv({ JWT_SECRET: secret })).toThrow(/JWT_SECRET is not set/);
  });

  it('rejects the old default secret that is public in the repository', () => {
    expect(() =>
      validateEnv({ JWT_SECRET: 'haisan-express-jwt-secret-key-2026' }),
    ).toThrow(/old default value/);
  });

  it('rejects a short JWT_SECRET', () => {
    expect(() => validateEnv({ JWT_SECRET: 'short-secret' })).toThrow(
      /at least 32 characters/,
    );
  });
});
