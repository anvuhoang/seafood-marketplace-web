import { Module } from '@nestjs/common';
import { AdministrativeUnitController } from './administrative-unit.controller.js';
import { AdministrativeUnitService } from './administrative-unit.service.js';

@Module({
  controllers: [AdministrativeUnitController],
  providers: [AdministrativeUnitService],
  exports: [AdministrativeUnitService],
})
export class AdministrativeUnitModule {}
