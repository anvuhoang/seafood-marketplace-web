import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminStatsController } from './admin-stats.controller.js';
import { AdminStatsService } from './admin-stats.service.js';
import { AdminVendorController } from './admin-vendor.controller.js';
import { AdminVendorService } from './admin-vendor.service.js';

@Module({
  // AuthModule provides JwtService, which the @Admin() guards need.
  imports: [AuthModule],
  controllers: [AdminVendorController, AdminStatsController],
  providers: [AdminVendorService, AdminStatsService],
})
export class AdminModule {}
