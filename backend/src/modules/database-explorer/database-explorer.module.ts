import { Module } from '@nestjs/common';
import { DatabaseExplorerService } from './database-explorer.service';
import { DatabaseExplorerController } from './database-explorer.controller';

@Module({
  controllers: [DatabaseExplorerController],
  providers: [DatabaseExplorerService],
})
export class DatabaseExplorerModule {}
