import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { GoogleWorkspaceModule } from '../google-workspace/google-workspace.module';

@Module({
  imports: [PrismaModule, GoogleWorkspaceModule],
  providers: [TasksService],
})
export class TasksModule {}
