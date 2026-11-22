import { execFileSync } from "node:child_process";

/**
 * Until an SMTP server is set, the API writes each mail into its log instead of sending it. The tests read the
 * password reset link from there, so they need no mailbox. Set E2E_COMPOSE_PROJECT if the stack has another name,
 * or E2E_API_LOG_COMMAND (a command that prints the API log) when the API does not run in Docker.
 */
function apiLog(): string {
  const custom = process.env.E2E_API_LOG_COMMAND;
  if (custom) return execFileSync(custom, { shell: true, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const project = process.env.E2E_COMPOSE_PROJECT ?? "haisan";
  return execFileSync("docker", ["compose", "-p", project, "logs", "api", "--no-color", "--since", "10m"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

export function canReadMailLog(): boolean {
  try {
    apiLog();
    return true;
  } catch {
    return false;
  }
}

/** The newest reset link that was mailed to this address, or null when none is in the log yet. */
export function findResetLink(email: string): string | null {
  const log = apiLog();
  // A mail starts at its "To:" line and holds one link; take the last mail for this address.
  const parts = log.split(/To: /).slice(1).filter((part) => part.startsWith(email));
  for (const part of parts.reverse()) {
    const match = /(https?:\/\/[^\s"<]+\/customer\/reset-password\?token=[\w-]+)/.exec(part);
    if (match) return match[1];
  }
  return null;
}

/** Waits for the mail to reach the log (it is written a moment after the request) and returns its link. */
export async function waitForResetLink(email: string, timeoutMs = 30_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const link = findResetLink(email);
    if (link) return link;
    if (Date.now() > deadline) throw new Error(`No reset link for ${email} reached the API log within ${timeoutMs} ms`);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
}
