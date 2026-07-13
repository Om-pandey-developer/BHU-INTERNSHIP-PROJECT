import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';

/**
 * Bootstrap the BHU Email Portal NestJS application.
 *
 * Security layers applied at startup:
 * 1. Helmet — HTTP security headers (X-Frame-Options, XSS Protection, etc.)
 * 2. CORS — Restricts origins to the frontend domain only
 * 3. ValidationPipe — Strips unknown fields, validates DTOs
 * 4. AllExceptionsFilter — Standardized error responses
 * 5. TransformInterceptor — Standardized success responses
 * 6. Rate Limiting — Configured via ThrottlerModule in AppModule
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // ── Security: Helmet ──
  app.use(helmet());

  // ── Security: CORS ──
  // In production, FRONTEND_URL must be set to the deployed frontend domain.
  // e.g. FRONTEND_URL="https://emailportal.bhu.ac.in"
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
  ].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  // ── Global API prefix ──
  app.setGlobalPrefix('api/v1');

  // ── Global Validation Pipe ──
  // whitelist: strips properties not in the DTO
  // forbidNonWhitelisted: throws error if unknown properties are sent
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Global Exception Filter ──
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Global Response Interceptor ──
  app.useGlobalInterceptors(new TransformInterceptor());

  // ── Swagger API Documentation ──
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('BHU Email Portal API')
      .setDescription('API documentation for the BHU Email Registration & Auto-Provisioning Portal')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
        'JWT-auth',
      )
      .addTag('Auth', 'Authentication & session management')
      .addTag('Applications', 'Email account application lifecycle')
      .addTag('Users', 'User management')
      .addTag('Workspace', 'Google Workspace provisioning')
      .addTag('Analytics', 'CC Admin dashboard metrics')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ── Start Server ──
  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 BHU Email Portal API running on http://localhost:${port}`);
  logger.log(`📄 Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
