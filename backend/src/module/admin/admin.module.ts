import { Module } from '@nestjs/common';
import { AdminVendorController } from './admin-vendor.controller.js';
import { AdminVendorService } from './admin-vendor.service.js';

@Module({
  controllers: [AdminVendorController],
  providers: [AdminVendorService],
})
export class AdminModule {}
