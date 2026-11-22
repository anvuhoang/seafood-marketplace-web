import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './module/auth/auth.module.js';
import { ProductModule } from './module/product/product.module.js';
import { CartModule } from './module/cart/cart.module.js';
import { CheckoutModule } from './module/checkout/checkout.module.js';
import { CategoryModule } from './module/category/category.module.js';
import { AccountModule } from './module/account/account.module.js';
import { ReviewModule } from './module/review/review.module.js';
import { VendorModule } from './module/vendor/vendor.module.js';
import { AdminModule } from './module/admin/admin.module.js';
import { OrderModule } from './module/order/order.module.js';
import { PaymentModule } from './module/payment/payment.module.js';
import { ChatModule } from './module/chat/chat.module.js';
import { VisualSearchModule } from './module/visual-search/visual-search.module.js';
import configuration from './config/configuration.js';
import { validateEnv } from './config/env.validation.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    ProductModule,
    CartModule,
    CheckoutModule,
    CategoryModule,
    AccountModule,
    ReviewModule,
    VendorModule,
    AdminModule,
    OrderModule,
    PaymentModule,
    ChatModule,
    VisualSearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
