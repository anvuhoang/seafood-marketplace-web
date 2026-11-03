import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './module/auth/auth.module.js';
import { ProductModule } from './module/product/product.module.js';
import { CartModule } from './module/cart/cart.module.js';
import { CategoryModule } from './module/category/category.module.js';
import { AccountModule } from './module/account/account.module.js';
import { ReviewModule } from './module/review/review.module.js';
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
    CategoryModule,
    AccountModule,
    ReviewModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
