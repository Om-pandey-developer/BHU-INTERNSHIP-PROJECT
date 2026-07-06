import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { GoogleWorkspaceModule } from './modules/google-workspace/google-workspace.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ReapplyModule } from './modules/reapply/reapply.module';
import { DatabaseExplorerModule } from './modules/database-explorer/database-explorer.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksModule } from './modules/tasks/tasks.module';

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
    ConfigModule.forRoot({ isGlobal: true }),
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
    DepartmentsModule,
    ApplicationsModule,
    GoogleWorkspaceModule,
    AnalyticsModule,
    ReapplyModule,
    DatabaseExplorerModule,
    ScheduleModule.forRoot(),
    TasksModule,
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
