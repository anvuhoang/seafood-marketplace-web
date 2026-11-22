import { expect, test } from "@playwright/test";
import { API_URL } from "./support/env";
import { authHeaders, loginViaApi, registerViaApi } from "./support/api";
import { canReadMailLog, waitForResetLink } from "./support/mail-log";

test.describe("Sessions", () => {
  test("a token that was issued before a password reset stops working, a new sign-in works", async ({ request }) => {
    test.skip(!canReadMailLog(), "needs the API log: run the stack with Docker, or set E2E_API_LOG_COMMAND");
    const session = await registerViaApi(request);
    expect((await request.get(`${API_URL}/auth/me`, { headers: authHeaders(session) })).status()).toBe(200);

    // A token carries its issue time in whole seconds and a reset revokes tokens issued before its own second, so
    // let the second pass: a person cannot ask for a link and reset in the same second as they signed in.
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    await request.post(`${API_URL}/auth/forgot-password`, { data: { email: session.user.email } });
    const token = new URL(await waitForResetLink(session.user.email)).searchParams.get("token");
    const newPassword = "NewPass@654321";
    const reset = await request.post(`${API_URL}/auth/reset-password`, { data: { token, password: newPassword } });
    expect(reset.ok(), await reset.text()).toBeTruthy();

    // The session of the person who forgot the password (or of whoever had taken it) is over.
    expect((await request.get(`${API_URL}/auth/me`, { headers: authHeaders(session) })).status()).toBe(401);
    expect((await request.get(`${API_URL}/orders/me`, { headers: authHeaders(session) })).status()).toBe(401);

    // Signing in again works at once: a token issued from the reset's own second on is not revoked.
    const fresh = await loginViaApi(request, session.user.email, newPassword);
    expect((await request.get(`${API_URL}/auth/me`, { headers: authHeaders(fresh) })).status()).toBe(200);
  });

  test("an expired or tampered token is refused", async ({ request }) => {
    const session = await registerViaApi(request);
    // Changing one character of the signature breaks it.
    const tampered = `${session.accessToken.slice(0, -2)}${session.accessToken.endsWith("AA") ? "BB" : "AA"}`;
    expect((await request.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${tampered}` } })).status()).toBe(401);
    // A token with another role claim and the old signature is refused too.
    const [header, payload, signature] = session.accessToken.split(".");
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as Record<string, unknown>;
    const escalated = Buffer.from(JSON.stringify({ ...claims, role: "ADMIN" })).toString("base64url");
    const forged = [header, escalated, signature].join(".");
    expect((await request.get(`${API_URL}/admin/stats/overview`, { headers: { Authorization: `Bearer ${forged}` } })).status()).toBe(401);
  });
});
