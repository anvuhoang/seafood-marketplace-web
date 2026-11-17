import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { VendorController } from './vendor.controller.js';
import { VendorService } from './vendor.service.js';

@Module({
  imports: [PrismaModule, AuthModule, CloudinaryModule],
  controllers: [VendorController],
  providers: [VendorService],
  exports: [VendorService],
})
export class VendorModule {}
