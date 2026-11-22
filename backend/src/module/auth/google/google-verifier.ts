import { Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleProfile {
  /** The permanent id of the Google account ("sub"). It never changes, unlike the email address. */
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
}

/** Checks a Google ID token. A seam, so the sign-in logic can be tested without Google. */
export interface GoogleVerifier {
  verify(credential: string, clientId: string): Promise<GoogleProfile>;
}

export const GOOGLE_VERIFIER = Symbol('GOOGLE_VERIFIER');

/**
 * The real check: the token is signed by Google (its public keys are fetched and cached), was made for this
 * site's client ID (`audience`), is not expired, and was issued by accounts.google.com. Anything else throws.
 */
@Injectable()
export class GoogleIdTokenVerifier implements GoogleVerifier {
  private readonly client = new OAuth2Client();

  async verify(credential: string, clientId: string): Promise<GoogleProfile> {
    const ticket = await this.client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) throw new Error('The Google token has no account or email.');
    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: payload.name ?? '',
      picture: payload.picture ?? null,
    };
  }
}
