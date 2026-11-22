import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { LogTransport } from './log.transport.js';
import { MailService } from './mail.service.js';
import { MAIL_TRANSPORT, type MailSettings, type MailTransport } from './mail.types.js';
import { OrderMailer } from './order-mailer.js';
import { SmtpTransport } from './smtp.transport.js';

/** One setting (MAIL_PROVIDER) decides how mail leaves: through SMTP, into the log, or nowhere. */
function createTransport(config: ConfigService): MailTransport | null {
  const settings = config.get<MailSettings>('mail');
  if (settings?.provider === 'smtp') return new SmtpTransport(settings);
  if (settings?.provider === 'off') return null;
  return new LogTransport();
}

/** Mail for the whole API: password resets, order and payment notices. Other modules only ask for MailService. */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [{ provide: MAIL_TRANSPORT, inject: [ConfigService], useFactory: createTransport }, MailService, OrderMailer],
  exports: [MailService, OrderMailer],
})
export class MailModule {}
