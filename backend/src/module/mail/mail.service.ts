import { Inject, Injectable, Logger, OnApplicationShutdown, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { maskPii } from '../chat/guardrails.js';
import { MAIL_TRANSPORT, type MailMessage, type MailSettings, type MailTransport } from './mail.types.js';

/** Tries again after these pauses when the mail server does not take a mail (the first try is at once). */
export const RETRY_DELAYS_MS = [0, 2_000, 10_000];
const EMAIL_PATTERN = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

export interface MailStats {
  provider: string;
  sent: number;
  failed: number;
}

/**
 * Sends mail without ever holding up or breaking what the customer is doing. `send` returns at once with a promise
 * that never rejects: it says whether the mail was handed over. Delivery happens in the background, with a few
 * retries, and a failure is only logged (with the address masked). Mail is a notification, not the thing itself:
 * an order stands even if its confirmation mail does not go out.
 *
 * Queued mails live in this process, so a crash loses the ones not sent yet. That is fine for notifications; a
 * system that must never lose a mail would keep them in the database.
 */
@Injectable()
export class MailService implements OnApplicationShutdown {
  private readonly logger = new Logger(MailService.name);
  private readonly pending = new Set<Promise<boolean>>();
  private sent = 0;
  private failed = 0;

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport | null,
    private readonly config: ConfigService,
    /** Pauses between tries; the tests pass zeros. Nest has nothing to inject here, so it stays the default. */
    @Optional() private readonly retryDelaysMs: number[] = RETRY_DELAYS_MS,
  ) {}

  private get settings(): MailSettings {
    return {
      provider: 'log',
      host: '',
      port: 465,
      secure: true,
      user: '',
      pass: '',
      from: '"HaiSan Express" <no-reply@haisanexpress.local>',
      appUrl: 'http://localhost:3000',
      ...this.config.get<Partial<MailSettings>>('mail'),
    };
  }

  /** The address of the website, for the links in the mails. */
  get appUrl(): string {
    return this.settings.appUrl;
  }

  get enabled(): boolean {
    return this.transport !== null;
  }

  stats(): MailStats {
    return { provider: this.transport?.name ?? 'off', sent: this.sent, failed: this.failed };
  }

  /** Queues a mail. Resolves true once it is handed over, false if it was skipped or given up; never rejects. */
  send(message: MailMessage): Promise<boolean> {
    const delivery = this.deliver(message);
    this.pending.add(delivery);
    void delivery.finally(() => this.pending.delete(delivery));
    return delivery;
  }

  private async deliver(raw: MailMessage): Promise<boolean> {
    if (!this.transport) return false;
    // A line break in these would let a value that came from a customer add headers to the mail.
    const message = { ...raw, to: raw.to.replace(/[\r\n]+/g, ' ').trim(), subject: raw.subject.replace(/[\r\n]+/g, ' ').trim() };
    if (!EMAIL_PATTERN.test(message.to)) {
      this.logger.warn(`Mail skipped, the address is not valid: ${maskPii(message.to)}`);
      return false;
    }

    let lastError: unknown;
    for (const delay of this.retryDelaysMs) {
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay).unref());
      try {
        await this.transport.send(message, this.settings.from);
        this.sent++;
        return true;
      } catch (error) {
        lastError = error;
      }
    }
    this.failed++;
    this.logger.warn(`Mail "${message.subject}" to ${maskPii(message.to)} could not be sent after ${this.retryDelaysMs.length} tries: ${maskPii(String(lastError))}`);
    return false;
  }

  /** On shutdown the mails still being sent get a few seconds to finish. */
  async onApplicationShutdown(): Promise<void> {
    if (this.pending.size === 0) return;
    await Promise.race([Promise.allSettled(this.pending), new Promise((resolve) => setTimeout(resolve, 5_000).unref())]);
  }
}
