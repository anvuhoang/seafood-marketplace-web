import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Webhook } from '@payos/node';
import { Public } from '../../common/decorators/public.decorator.js';
import { PaymentService } from './payment.service.js';

/**
 * Called by PayOS, not by a signed-in user, so it has no JWT. The signature in the body is what
 * proves the call is from PayOS; a request that fails it is refused with 400.
 */
@ApiExcludeController()
@Public()
@Controller('payments/payos')
export class PayosWebhookController {
  constructor(private readonly payments: PaymentService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async receive(@Body() body: Webhook): Promise<{ success: boolean }> {
    await this.payments.handlePayosWebhook(body);
    return { success: true };
  }
}
