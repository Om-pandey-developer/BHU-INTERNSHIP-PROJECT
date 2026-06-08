import { Module } from '@nestjs/common';
import { GoogleWorkspaceService } from './google-workspace.service';
import { GoogleWorkspaceController } from './google-workspace.controller';

@Module({
  controllers: [GoogleWorkspaceController],
  providers: [GoogleWorkspaceService],
  exports: [GoogleWorkspaceService],
})
export class GoogleWorkspaceModule {}
