import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Admin } from '../../common/decorators/admin.decorator.js';
import { AdminUserService } from './admin-user.service.js';
import { AdminUserListDto, AdminUserListQueryDto } from './dto/admin-user.dto.js';

@ApiTags('Admin - Users')
@Admin()
@ApiResponse({ status: 401, description: 'Missing or invalid token' })
@ApiResponse({ status: 403, description: 'The account is not an ADMIN' })
@Controller('admin/users')
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  @ApiOperation({
    summary: 'List user accounts',
    description: 'Paginated and read-only. `counts` covers every account regardless of the filters.',
  })
  @ApiResponse({ status: 200, description: 'Accounts retrieved', type: AdminUserListDto })
  list(@Query() query: AdminUserListQueryDto): Promise<AdminUserListDto> {
    return this.adminUserService.list(query);
  }
}
