import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CustomerOrderController } from './customer-order.controller.js';
import { CustomerOrderService } from './customer-order.service.js';
import { OrderLifecycleService } from './order-lifecycle.service.js';

/** Customer order routes, and the status lifecycle shared with the vendor module. */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CustomerOrderController],
  providers: [CustomerOrderService, OrderLifecycleService],
  exports: [OrderLifecycleService, CustomerOrderService],
})
export class OrderModule {}
