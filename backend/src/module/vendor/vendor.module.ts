import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AdministrativeUnitModule } from '../administrative-unit/administrative-unit.module.js';
import { VendorController } from './vendor.controller.js';
import { VendorService } from './vendor.service.js';
import { VendorRegistrationController } from './registration/vendor-registration.controller.js';
import { VendorRegistrationService } from './registration/vendor-registration.service.js';
import { VendorOfferController } from './offers/vendor-offer.controller.js';
import { VendorOfferService } from './offers/vendor-offer.service.js';
import { VendorProductService } from './offers/vendor-product.service.js';
import { VendorOrderController } from './orders/vendor-order.controller.js';
import { VendorOrderService } from './orders/vendor-order.service.js';
import { VendorStatsController } from './stats/vendor-stats.controller.js';
import { VendorStatsService } from './stats/vendor-stats.service.js';
import { OrderModule } from '../order/order.module.js';
import { SmartImportModule } from '../smart-import/smart-import.module.js';
import { SmartImportController } from '../smart-import/smart-import.controller.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CloudinaryModule,
    AdministrativeUnitModule,
    OrderModule,
    SmartImportModule,
  ],
  // Registration and the /vendors/me/... routes are listed first so they are matched before /vendors/:slug/...
  controllers: [
    VendorRegistrationController,
    VendorOfferController,
    VendorOrderController,
    VendorStatsController,
    SmartImportController,
    VendorController,
  ],
  providers: [
    VendorService,
    VendorRegistrationService,
    VendorOfferService,
    VendorProductService,
    VendorOrderService,
    VendorStatsService,
  ],
  exports: [VendorService],
})
export class VendorModule {}
