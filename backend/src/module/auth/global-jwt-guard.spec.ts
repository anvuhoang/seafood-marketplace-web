import { describe, it, beforeAll, afterAll } from 'vitest';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from './auth.module.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('probe')
class ProbeController {
  @Get('private')
  privateRoute() {
    return { ok: true };
  }

  @Public()
  @Get('public')
  publicRoute() {
    return { ok: true };
  }
}

describe('Global JwtAuthGuard', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ jwtSecret: 'x'.repeat(64), jwtExpiresIn: '1h' })],
        }),
        AuthModule,
      ],
      controllers: [ProbeController],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    jwtService = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows @Public() routes without a token', async () => {
    await request(app.getHttpServer()).get('/probe/public').expect(200);
  });

  it('rejects routes without @Public() when no token is sent', async () => {
    await request(app.getHttpServer()).get('/probe/private').expect(401);
  });

  it('rejects an invalid token', async () => {
    await request(app.getHttpServer())
      .get('/probe/private')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('allows a valid token', async () => {
    const token = await jwtService.signAsync({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'CUSTOMER',
    });

    await request(app.getHttpServer())
      .get('/probe/private')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
