import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { OrderModule } from '../order/order.module.js';
import { PaymentModule } from '../payment/payment.module.js';
import { CheckoutController } from './checkout.controller.js';
import { CheckoutService } from './checkout.service.js';

/** Turns the cart into an order: checks it again, takes the stock, records the payment. */
@Module({
  imports: [PrismaModule, OrderModule, PaymentModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
