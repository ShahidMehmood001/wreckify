import './instrument';
import 'reflect-metadata';

// Bootstrap proxy BEFORE NestJS loads — passport-oauth2 uses raw https.request
// which ignores system proxy, so we patch globalAgent here.
// HTTPS_PROXY / NO_PROXY are loaded from .env by dotenv before ConfigModule runs.
import * as dotenv from 'dotenv';
dotenv.config();
if (process.env.GLOBAL_AGENT_HTTPS_PROXY) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { bootstrap } = require('global-agent');
  bootstrap();
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  app.use(cookieParser());

  const rawOrigin = config.get<string>('corsOrigin') || 'http://localhost:3000';
  const corsOrigin = rawOrigin.includes(',')
    ? rawOrigin.split(',').map((o) => o.trim())
    : rawOrigin;

  app.enableCors({ origin: corsOrigin, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Wreckify API')
    .setDescription('Vehicle damage detection and repair cost estimation API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('PORT') || 3001;
  await app.listen(port);
  console.log(`Wreckify API running on http://localhost:${port}/api`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
