import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto.js';
import { RegisterVendorDto, VendorRegistrationStatusDto } from './dto/vendor-registration.dto.js';
import { VendorRegistrationService } from './vendor-registration.service.js';

@ApiTags('Vendor registration')
@ApiBearerAuth()
@Controller('vendors/registration')
export class VendorRegistrationController {
  constructor(private readonly registration: VendorRegistrationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Apply to open a store, or resubmit a rejected application',
    description:
      'Creates a PENDING store owned by the signed-in account. One store per account. ' +
      'If the previous application was REJECTED, the same record is updated with the new details and set back to PENDING (slug kept). ' +
      'The account role is not changed; it becomes VENDOR when an admin approves the store. ' +
      'Province, district and ward are GSO codes from /administrative-units and must belong to each other.',
  })
  @ApiResponse({ status: 201, description: 'Application submitted; returns the new registration state', type: VendorRegistrationStatusDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid fields, unknown fields (status, ownerId, ...) or an address whose district/ward does not belong to the chosen province/district',
    type: ErrorResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Admin account, or the account is not ACTIVE', type: ErrorResponseDto })
  @ApiResponse({
    status: 409,
    description: 'The account already has a store that is PENDING, ACTIVE or SUSPENDED, or the application changed concurrently',
    type: ErrorResponseDto,
  })
  register(@CurrentUser('sub') userId: string, @Body() dto: RegisterVendorDto): Promise<VendorRegistrationStatusDto> {
    return this.registration.register(userId, dto);
  }

  @Get('me')
  @ApiOperation({
    summary: "The signed-in account's store application",
    description: 'Status is NONE when nothing was submitted. rejectionReason is only set while the status is REJECTED.',
  })
  @ApiResponse({ status: 200, description: 'Registration state retrieved', type: VendorRegistrationStatusDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token', type: ErrorResponseDto })
  getMine(@CurrentUser('sub') userId: string): Promise<VendorRegistrationStatusDto> {
    return this.registration.getMyRegistration(userId);
  }
}
