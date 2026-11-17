import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AdministrativeUnitModule } from '../administrative-unit/administrative-unit.module.js';
import { VendorController } from './vendor.controller.js';
import { VendorService } from './vendor.service.js';
import { VendorRegistrationController } from './vendor-registration.controller.js';
import { VendorRegistrationService } from './vendor-registration.service.js';

@Module({
  imports: [PrismaModule, AuthModule, CloudinaryModule, AdministrativeUnitModule],
  // Registration is listed first so /vendors/registration/... is matched before /vendors/:slug/...
  controllers: [VendorRegistrationController, VendorController],
  providers: [VendorService, VendorRegistrationService],
  exports: [VendorService],
})
export class VendorModule {}
