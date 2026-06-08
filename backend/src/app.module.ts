import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { GoogleWorkspaceModule } from './modules/google-workspace/google-workspace.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

/**
 * AppModule — Root module of the BHU Email Portal backend.
 *
 * Imports:
 * - PrismaModule (Global): Database access via Prisma ORM
 * - ThrottlerModule: Rate limiting (10 req/min per IP by default)
 * - AuthModule: JWT authentication, login, refresh, logout
 * - UsersModule: User CRUD and role management
 * - ApplicationsModule: Application submission, HOD approval, status tracking
 * - GoogleWorkspaceModule: Account provisioning via Google Admin SDK
 * - AnalyticsModule: CC Admin dashboard metrics
 */
@Module({
  imports: [
    // ── Rate Limiting: 10 requests per 60 seconds per IP ──
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60', 10) * 1000,
        limit: parseInt(process.env.THROTTLE_LIMIT || '10', 10),
      },
    ]),

    // ── Database ──
    PrismaModule,

    // ── Feature Modules ──
    AuthModule,
    UsersModule,
    ApplicationsModule,
    GoogleWorkspaceModule,
    AnalyticsModule,
  ],
  providers: [
    // Apply ThrottlerGuard globally to all routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
