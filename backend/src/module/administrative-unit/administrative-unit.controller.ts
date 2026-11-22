import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { AdministrativeUnitService } from './administrative-unit.service.js';
import { AdministrativeUnitDto } from './dto/administrative-unit.dto.js';

@ApiTags('Administrative units')
@Controller('administrative-units')
export class AdministrativeUnitController {
  constructor(private readonly administrativeUnits: AdministrativeUnitService) {}

  @Public()
  @Get('provinces')
  @ApiOperation({
    summary: 'List provinces and centrally-run cities',
    description: 'GSO catalogue, three-level system in force before 07/2025.',
  })
  @ApiResponse({ status: 200, description: 'Provinces retrieved', type: [AdministrativeUnitDto] })
  listProvinces(): AdministrativeUnitDto[] {
    return this.administrativeUnits.listProvinces();
  }

  @Public()
  @Get('provinces/:code/districts')
  @ApiOperation({ summary: 'List the districts of one province' })
  @ApiParam({ name: 'code', description: 'Province code', example: '91' })
  @ApiResponse({ status: 200, description: 'Districts retrieved', type: [AdministrativeUnitDto] })
  @ApiResponse({ status: 404, description: 'Unknown province code', type: ErrorResponseDto })
  listDistricts(@Param('code') code: string): AdministrativeUnitDto[] {
    return this.administrativeUnits.listDistricts(code);
  }

  @Public()
  @Get('districts/:code/wards')
  @ApiOperation({ summary: 'List the wards of one district' })
  @ApiParam({ name: 'code', description: 'District code', example: '911' })
  @ApiResponse({ status: 200, description: 'Wards retrieved', type: [AdministrativeUnitDto] })
  @ApiResponse({ status: 404, description: 'Unknown district code', type: ErrorResponseDto })
  listWards(@Param('code') code: string): AdministrativeUnitDto[] {
    return this.administrativeUnits.listWards(code);
  }
}
