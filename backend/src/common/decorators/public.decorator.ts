import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
* Marks an endpoint as public, meaning it does not require a JWT token. 
* Used in conjunction with the globally registered JwtAuthGuard. 
*
* @example
* @Public()
* @Get('health')
* getHealth() { return { status: 'ok' }; }
*/
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
