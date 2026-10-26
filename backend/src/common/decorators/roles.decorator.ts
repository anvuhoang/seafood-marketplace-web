import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
* Restricts an endpoint to specific roles. 
* Used in conjunction with RolesGuard. 
*
* @example
* @Roles('ADMIN', 'VENDOR')
* @Get('dashboard')
* getDashboard() { ... }
*/
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
