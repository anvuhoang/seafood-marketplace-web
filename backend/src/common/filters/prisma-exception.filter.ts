import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

/**
 * HTTP error for a Prisma error the client can act on, or null when it is a
 * server problem. Messages stay generic so table and column names never leak.
 */
export function toHttpException(error: Prisma.PrismaClientKnownRequestError): HttpException | null {
  switch (error.code) {
    case 'P2002': // unique constraint
      return new ConflictException('Dữ liệu này đã tồn tại.');
    case 'P2025': // record to update or delete not found
      return new NotFoundException('Không tìm thấy dữ liệu yêu cầu.');
    case 'P2003': // foreign key constraint
      return new BadRequestException('Dữ liệu liên kết không hợp lệ.');
    default:
      return null;
  }
}

/**
 * Turns Prisma errors that escape a service into proper HTTP responses
 * instead of a bare 500. Services that need a more specific message should
 * still catch the error themselves. Anything unmapped falls through to Nest's
 * default handling, which logs it and returns 500.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    super.catch(toHttpException(exception) ?? exception, host);
  }
}
