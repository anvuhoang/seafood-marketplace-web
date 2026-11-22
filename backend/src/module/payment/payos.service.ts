import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import type {
  CreatePaymentLinkRequest,
  CreatePaymentLinkResponse,
  PaymentLink,
  Webhook,
  WebhookData,
} from '@payos/node';

export const PAYOS_NOT_CONFIGURED =
  'Thanh toán QR hiện chưa được bật. Vui lòng chọn thanh toán khi nhận hàng (COD).';

interface PayosConfig {
  clientId?: string;
  apiKey?: string;
  checksumKey?: string;
  linkTtlMinutes?: number;
}

/** The only place that talks to PayOS. The keys come from the environment and never leave the server. */
@Injectable()
export class PayosService {
  private readonly logger = new Logger(PayosService.name);
  private client: PayOS | null = null;

  constructor(private readonly config: ConfigService) {}

  private settings(): PayosConfig {
    return this.config.get<PayosConfig>('payos') ?? {};
  }

  isConfigured(): boolean {
    const { clientId, apiKey, checksumKey } = this.settings();
    return Boolean(clientId && apiKey && checksumKey);
  }

  /** How long a new QR stays valid, in minutes (at least 1). */
  linkTtlMinutes(): number {
    const minutes = this.settings().linkTtlMinutes;
    return Number.isFinite(minutes) && minutes! >= 1 ? minutes! : 15;
  }

  private payos(): PayOS {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(PAYOS_NOT_CONFIGURED);
    }
    if (!this.client) {
      const { clientId, apiKey, checksumKey } = this.settings();
      this.client = new PayOS({ clientId, apiKey, checksumKey });
    }
    return this.client;
  }

  async createLink(
    request: CreatePaymentLinkRequest,
  ): Promise<CreatePaymentLinkResponse> {
    return this.payos().paymentRequests.create(request);
  }

  async getLink(orderCode: number): Promise<PaymentLink> {
    return this.payos().paymentRequests.get(orderCode);
  }

  /** Closes the payment link, so nobody can pay it any more. */
  async cancelLink(orderCode: number, reason: string): Promise<void> {
    await this.payos().paymentRequests.cancel(orderCode, reason);
  }

  /** Checks the signature. Throws when the body was not signed by PayOS with our checksum key. */
  async verifyWebhook(body: Webhook): Promise<WebhookData> {
    return this.payos().webhooks.verify(body);
  }

  warn(message: string): void {
    this.logger.warn(message);
  }
}
