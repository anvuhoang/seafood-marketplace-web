import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { VendorController } from './vendor.controller.js';
import { VendorService } from './vendor.service.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [VendorController],
  providers: [VendorService],
  exports: [VendorService],
})
export class VendorModule {}
