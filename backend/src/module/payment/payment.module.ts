import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';
import { PayosWebhookController } from './payos-webhook.controller.js';
import { PayosService } from './payos.service.js';

/** Paying an order with a PayOS QR: the customer's payment screen API and the PayOS webhook. */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PaymentController, PayosWebhookController],
  providers: [PaymentService, PayosService],
  exports: [PayosService],
})
export class PaymentModule {}
