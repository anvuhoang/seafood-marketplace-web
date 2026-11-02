import { describe, it, expect, vi } from 'vitest';
import { ArgumentsHost, ConflictException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter, toHttpException } from './prisma-exception.filter.js';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('failed', {
    code,
    clientVersion: 'test',
    meta: { target: ['users_phone_key'] },
  });

describe('toHttpException', () => {
  it.each([
    ['P2002', 409],
    ['P2025', 404],
    ['P2003', 400],
  ])('maps %s to %i', (code, status) => {
    expect(toHttpException(prismaError(code))?.getStatus()).toBe(status);
  });

  it('does not leak constraint names', () => {
    expect(JSON.stringify(toHttpException(prismaError('P2002'))?.getResponse())).not.toContain('users_phone_key');
  });

  it('leaves other errors to the default 500 handling', () => {
    expect(toHttpException(prismaError('P1001'))).toBeNull();
  });
});

describe('PrismaExceptionFilter', () => {
  const host = {} as ArgumentsHost;

  it('passes the mapped HTTP error on', () => {
    const parent = vi.spyOn(BaseExceptionFilter.prototype, 'catch').mockImplementation(() => undefined);
    new PrismaExceptionFilter().catch(prismaError('P2002'), host);
    expect(parent.mock.calls[0]![0]).toBeInstanceOf(ConflictException);
    parent.mockRestore();
  });

  it('passes unmapped errors on unchanged', () => {
    const parent = vi.spyOn(BaseExceptionFilter.prototype, 'catch').mockImplementation(() => undefined);
    const error = prismaError('P1001');
    new PrismaExceptionFilter().catch(error, host);
    expect(parent.mock.calls[0]![0]).toBe(error);
    parent.mockRestore();
  });
});
