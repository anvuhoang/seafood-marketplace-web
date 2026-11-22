import nodemailer, { type Transporter } from 'nodemailer';
import type { MailMessage, MailSettings, MailTransport } from './mail.types.js';

/**
 * Sends through a mail server. For Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=465, SMTP_USER=the address, and
 * SMTP_PASS=an "app password" (Google account, Security, 2-step verification, App passwords), not the account password.
 */
export class SmtpTransport implements MailTransport {
  readonly name = 'smtp' as const;
  private readonly transporter: Transporter;

  constructor(settings: Pick<MailSettings, 'host' | 'port' | 'secure' | 'user' | 'pass'>) {
    this.transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: settings.user ? { user: settings.user, pass: settings.pass } : undefined,
      // A mail server that does not answer must not hold the worker for minutes.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  async send(message: MailMessage, from: string): Promise<void> {
    await this.transporter.sendMail({ from, to: message.to, subject: message.subject, text: message.text, html: message.html });
  }
}
