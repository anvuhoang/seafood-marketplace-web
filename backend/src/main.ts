import { hostname } from 'node:os';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { PrismaExceptionFilter } from './common/filters/index.js';
import { setupApiDocs } from './swagger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const port = config.get<number>('port', 3000);
  const frontendUrl = config.get<string>(
    'frontendUrl',
    'http://localhost:5173',
  );

  app.setGlobalPrefix('api');

  // Behind nginx or another load balancer, request.ip must be the visitor (the rate limits count per IP).
  const trustProxy = config.get<string>('trustProxy', '');
  if (trustProxy) {
    const hops = Number(trustProxy);
    const value = trustProxy === 'true' ? true : Number.isInteger(hops) ? hops : trustProxy;
    app.getHttpAdapter().getInstance().set('trust proxy', value);
  }

  // Says which API process answered; with several behind a load balancer it shows the balancing at work.
  app.use((_request: unknown, response: { setHeader(name: string, value: string): void }, next: () => void) => {
    response.setHeader('X-Served-By', hostname());
    next();
  });

  // Lets the process finish its requests and close connections (database, Redis) on SIGTERM from Docker.
  app.enableShutdownHooks();

  app.enableCors({
    // FRONTEND_URL may list several origins separated by commas, e.g. the
    // customer site and the admin subdomain.
    origin: frontendUrl
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new PrismaExceptionFilter(app.get(HttpAdapterHost).httpAdapter));

  if (config.get<boolean>('apiDocsEnabled')) {
    setupApiDocs(app);
  }

  await app.listen(port);
}

bootstrap();
