import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AccountService } from './account.service.js';
import {
  ChangePasswordDto,
  CreateAddressDto,
  UpdateAddressDto,
  UpdateProfileDto,
} from './dto/account.dto.js';
import type { AddressDto, DeletedAddressDto, PasswordChangedDto, ProfileDto } from './dto/account.dto.js';

/** The signed-in user's own profile, password and address book. */
@ApiTags('Account')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Missing or invalid token' })
@UseGuards(JwtAuthGuard)
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get my profile' })
  getProfile(@CurrentUser('sub') userId: string): Promise<ProfileDto> {
    return this.accountService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update my profile' })
  @ApiResponse({ status: 409, description: 'Phone number already used' })
  updateProfile(@CurrentUser('sub') userId: string, @Body() dto: UpdateProfileDto): Promise<ProfileDto> {
    return this.accountService.updateProfile(userId, dto);
  }

  @Post('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change my password' })
  @ApiResponse({ status: 400, description: 'Current password is wrong or the new one is invalid' })
  changePassword(@CurrentUser('sub') userId: string, @Body() dto: ChangePasswordDto): Promise<PasswordChangedDto> {
    return this.accountService.changePassword(userId, dto);
  }

  @Get('addresses')
  @ApiOperation({ summary: 'List my delivery addresses, default first' })
  listAddresses(@CurrentUser('sub') userId: string): Promise<AddressDto[]> {
    return this.accountService.listAddresses(userId);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Add a delivery address' })
  createAddress(@CurrentUser('sub') userId: string, @Body() dto: CreateAddressDto): Promise<AddressDto> {
    return this.accountService.createAddress(userId, dto);
  }

  @Put('addresses/:id')
  @ApiOperation({ summary: 'Update one of my addresses' })
  @ApiResponse({ status: 404, description: 'Address not found or not mine' })
  updateAddress(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<AddressDto> {
    return this.accountService.updateAddress(userId, id, dto);
  }

  @Post('addresses/:id/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Make one of my addresses the default' })
  setDefaultAddress(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AddressDto> {
    return this.accountService.setDefaultAddress(userId, id);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Delete one of my addresses' })
  deleteAddress(@CurrentUser('sub') userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<DeletedAddressDto> {
    return this.accountService.deleteAddress(userId, id);
  }
}
