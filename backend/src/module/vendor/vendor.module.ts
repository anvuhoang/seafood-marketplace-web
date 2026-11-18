import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AdministrativeUnitModule } from '../administrative-unit/administrative-unit.module.js';
import { VendorController } from './vendor.controller.js';
import { VendorService } from './vendor.service.js';
import { VendorRegistrationController } from './vendor-registration.controller.js';
import { VendorRegistrationService } from './vendor-registration.service.js';
import { VendorOfferController } from './vendor-offer.controller.js';
import { VendorOfferService } from './vendor-offer.service.js';
import { VendorProductService } from './vendor-product.service.js';
import { VendorOrderController } from './vendor-order.controller.js';
import { VendorOrderService } from './vendor-order.service.js';
import { OrderModule } from '../order/order.module.js';

@Module({
  imports: [PrismaModule, AuthModule, CloudinaryModule, AdministrativeUnitModule, OrderModule],
  // Registration and the /vendors/me/... routes are listed first so they are matched before /vendors/:slug/...
  controllers: [VendorRegistrationController, VendorOfferController, VendorOrderController, VendorController],
  providers: [VendorService, VendorRegistrationService, VendorOfferService, VendorProductService, VendorOrderService],
  exports: [VendorService],
})
export class VendorModule {}
