import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Roles } from './roles.decorator.js';

/**
* Shorthand decorator: requires login + ADMIN role. 
*
* @example
* @Admin()
* @Delete(':id')
* deleteUser(@Param('id') id: string) { ... }
*/
export const Admin = () =>
  applyDecorators(
    Roles('ADMIN'),
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiBearerAuth(),
  );
