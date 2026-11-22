export interface MailMessage {
  to: string;
  subject: string;
  /** Plain text version, for mail programs that do not show HTML and for the log. */
  text: string;
  html: string;
}

/** How a mail leaves the API: through a mail server, or into the log. */
export interface MailTransport {
  readonly name: 'smtp' | 'log';
  send(message: MailMessage, from: string): Promise<void>;
}

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

export interface MailSettings {
  provider: 'smtp' | 'log' | 'off' | string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  /** The address of the website, which the links in the mails lead to. */
  appUrl: string;
}
