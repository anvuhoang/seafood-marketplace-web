import type { BrowserContext } from "@playwright/test";
import { BASE_URL } from "./env";
import type { Session } from "./api";

/**
 * Starts a browser context already signed in, the way the site itself stores a session: the token and user in
 * localStorage (read by the app) and two cookies (read by the Next.js proxy that guards the pages). It skips the
 * sign-in form, which is tested on its own, and the sign-in rate limit.
 */
export async function signInAs(context: BrowserContext, session: Session): Promise<void> {
  const { hostname } = new URL(BASE_URL);
  const user = { ...session.user, name: session.user.fullName, emailOrPhone: session.user.phone || session.user.email };
  await context.addCookies([
    { name: "haisan_token", value: encodeURIComponent(session.accessToken), domain: hostname, path: "/" },
    { name: "haisan_role", value: session.user.role, domain: hostname, path: "/" },
  ]);
  await context.addInitScript(
    ([token, json]) => {
      localStorage.setItem("haisan_express_token", token);
      localStorage.setItem("haisan_express_user", json);
    },
    [session.accessToken, JSON.stringify(user)] as const,
  );
}
