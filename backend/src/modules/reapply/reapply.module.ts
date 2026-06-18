import { Module } from '@nestjs/common';
import { ReapplyController } from './reapply.controller';
import { ReapplyService } from './reapply.service';

@Module({
  controllers: [ReapplyController],
  providers: [ReapplyService],
  exports: [ReapplyService],
})
export class ReapplyModule {}
