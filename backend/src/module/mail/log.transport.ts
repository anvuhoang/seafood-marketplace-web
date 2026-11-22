import { Logger } from '@nestjs/common';
import type { MailMessage, MailTransport } from './mail.types.js';

/**
 * Writes the mail in the log instead of sending it, so the links in it (a password reset, an order) can be followed
 * during development without a mail account. It is the default until SMTP_USER is set.
 */
export class LogTransport implements MailTransport {
  readonly name = 'log' as const;
  private readonly logger = new Logger('Mail');

  async send(message: MailMessage, from: string): Promise<void> {
    this.logger.log(`Mail not sent (MAIL_PROVIDER=log)\nFrom: ${from}\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`);
  }
}
