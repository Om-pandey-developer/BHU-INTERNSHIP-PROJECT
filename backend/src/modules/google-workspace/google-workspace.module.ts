import { Module } from '@nestjs/common';
import { GoogleWorkspaceService } from './google-workspace.service';
import { GoogleWorkspaceController } from './google-workspace.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [GoogleWorkspaceController],
  providers: [GoogleWorkspaceService],
  exports: [GoogleWorkspaceService],
})
export class GoogleWorkspaceModule {}
