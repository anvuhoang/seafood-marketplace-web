import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../infra/rate-limit.guard.js';
import { PASSWORD_RESET_DONE, PasswordResetService, RESET_REQUESTED } from './password-reset.service.js';
import { ForgotPasswordDto, MessageDto, ResetPasswordDto, ResetTokenDto, TokenCheckDto } from './dto/recovery.dto.js';

/** "I forgot my password": ask for a link by email, check the link, choose a new password. */
@ApiTags('Auth')
@Public()
@Controller('auth')
export class AuthRecoveryController {
  constructor(private readonly passwordReset: PasswordResetService) {}

  @RateLimit(5, 60)
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Ask for a password reset link by email',
    description: 'Always answers the same, whether or not the address has an account. One address gets at most 3 mails an hour.',
  })
  @ApiResponse({ status: 200, type: MessageDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageDto> {
    await this.passwordReset.requestReset(dto.email);
    return { message: RESET_REQUESTED };
  }

  @RateLimit(20, 60)
  @Post('reset-password/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Is the link in the mail still good?' })
  @ApiResponse({ status: 200, type: TokenCheckDto })
  async verify(@Body() dto: ResetTokenDto): Promise<TokenCheckDto> {
    return { valid: await this.passwordReset.isValid(dto.token) };
  }

  @RateLimit(10, 60)
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Choose a new password with the link from the mail', description: 'The link works once. All earlier sign-ins are ended.' })
  @ApiResponse({ status: 200, type: MessageDto })
  @ApiResponse({ status: 400, description: 'The link is not valid or has expired' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageDto> {
    await this.passwordReset.resetPassword(dto.token, dto.password);
    return { message: PASSWORD_RESET_DONE };
  }
}
