/**
 * Resolve a post-authentication redirect to a same-origin path.
 *
 * A prefix check alone is not enough: browsers treat "/\evil.com" like
 * "//evil.com", so the value is resolved with URL and its origin compared.
 *
 * @returns The path (with search and hash) to navigate to, or null when the
 * redirect is missing or would leave the current origin.
 */
export function getSafeRedirectPath(
  redirect: string | null | undefined,
  origin: string,
): string | null {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return null;
  }

  try {
    const target = new URL(redirect, origin);

    // Only allow redirects to the same origin.
    if (target.origin !== origin) return null;

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}
